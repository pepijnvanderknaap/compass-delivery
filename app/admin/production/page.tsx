'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, addDays, startOfWeek } from 'date-fns';
import type { UserProfile, Dish, Location, DishWithComponents } from '@/lib/types';

interface LocationOrders {
  [locationId: string]: number; // portions
}

interface ProductionRow {
  dish: Dish;
  isComponent: boolean;
  parentDish?: string;
  locationOrders: LocationOrders;
  totalPortions: number;
  mealType?: string;
  componentType?: string;
  isSubHeader?: boolean;
  subHeaderLabel?: string;
  isTotalRow?: boolean; // For salad/warm veggie total rows
  percentage?: number; // Component percentage (0-100)
  mainDishTotalPortionG?: number; // Total portion size from main dish
  mainDishIds?: string[]; // Track which main dishes contribute to this component
}

export default function ProductionSheetsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [productionRows, setProductionRows] = useState<ProductionRow[]>([]);
  const [locationSettingsMap, setLocationSettingsMap] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const initializePage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData?.role !== 'admin') {
          router.push('/dashboard');
          return;
        }

        setProfile(profileData);

        // Get active locations - deduplicate by name and sort in custom order
        const { data: locationsData } = await supabase
          .from('locations')
          .select('*')
          .eq('is_active', true);

        // Deduplicate by name (keep first occurrence) and filter out Dark Kitchen
        const uniqueLocations = locationsData?.reduce((acc: Location[], loc) => {
          if (!acc.find(l => l.name === loc.name) && loc.name !== 'Dark Kitchen') {
            acc.push(loc);
          }
          return acc;
        }, []) || [];

        // Custom sort order (matching Excel sheet order)
        const sortOrder = ['SnapChat 119', 'SnapChat 165', 'Symphony', 'Atlassian', 'Snowflake', 'JAA Training'];
        uniqueLocations.sort((a, b) => {
          const indexA = sortOrder.findIndex(name => a.name.includes(name.split(' ')[0]));
          const indexB = sortOrder.findIndex(name => b.name.includes(name.split(' ')[0]));

          if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;

          // For SnapChat, sort by number
          if (a.name.includes('SnapChat') && b.name.includes('SnapChat')) {
            return a.name.localeCompare(b.name);
          }

          return indexA - indexB;
        });

        setLocations(uniqueLocations);
        // Don't fetch production data yet - wait for date selection
      } catch (err) {
        console.error('Error initializing page:', err);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [supabase, router]);

  useEffect(() => {
    if (profile && locations.length > 0 && selectedDate) {
      fetchProductionData(selectedDate, locations);
    }
  }, [selectedDate]);

  const fetchProductionData = async (date: Date, locs: Location[]) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    // Fetch location settings for custom portion sizes
    const { data: locationSettingsData } = await supabase
      .from('location_settings')
      .select('*');

    const settingsMap = new Map(
      (locationSettingsData || []).map(s => [s.location_id, s])
    );
    setLocationSettingsMap(settingsMap);

    // Get ALL active locations (including duplicates) to fetch orders
    const { data: allLocations } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true);

    // Create a map from any location ID to the deduplicated display location
    const locationIdMap: Record<string, string> = {};
    allLocations?.forEach(loc => {
      const displayLoc = locs.find(l => l.name === loc.name);
      if (displayLoc) {
        locationIdMap[loc.id] = displayLoc.id;
      }
    });

    // Get menu for the week (optional - will fallback to order items if no menu)
    const { data: weeklyMenu } = await supabase
      .from('weekly_menus')
      .select('id')
      .eq('week_start_date', weekStart)
      .single();

    // NEW LOGIC: Get dishes from MENU, match with order portions by meal_type
    console.log('Fetching menu for date:', dateStr);

    if (!weeklyMenu) {
      console.log('No menu found for this week');
      setProductionRows([]);
      return;
    }

    const dayOfWeek = (date.getDay() + 6) % 7; // Convert to Monday=0
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('dish_id, meal_type')
      .eq('menu_id', weeklyMenu.id)
      .eq('day_of_week', dayOfWeek);

    console.log('Menu items for this day:', menuItems?.length);

    if (!menuItems || menuItems.length === 0) {
      console.log('No menu items found for this day');
      setProductionRows([]);
      return;
    }

    const dishIds = menuItems.map(item => item.dish_id);

    // Get main dishes with salad/warm veggie total portion sizes
    const { data: dishes } = await supabase
      .from('dishes')
      .select('*, salad_total_portion_g, warm_veggie_total_portion_g')
      .in('id', dishIds);

    console.log('Fetched dishes:', dishes?.length);

    // Get components for each main dish with percentage data
    const { data: dishComponents } = await supabase
      .from('dish_components')
      .select('*, component_dish:dishes!component_dish_id(*)')
      .in('main_dish_id', dishIds);

    // Get orders for this date (all order items, we'll match by meal_type)
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('meal_type, portions, orders(location_id)')
      .eq('delivery_date', dateStr);

    console.log('Fetched order items:', orderItems?.length);
    console.log('Locations being displayed:', locs.map(l => l.name));

    // Build production rows with aggregated components
    const rows: ProductionRow[] = [];
    console.log('Building rows for', dishes?.length, 'dishes');
    const componentAggregation: Record<string, {
      dish: Dish;
      locationOrders: LocationOrders;
      totalPortions: number;
      componentType: string;
      mealType?: string;
      percentage?: number;
      mainDishTotalPortionG?: number;
      mainDishIds: Set<string>;
    }> = {};

    // Track total rows for salads and warm veggies
    const totalAggregation: Record<string, {
      locationOrders: LocationOrders;
      totalPortions: number;
      componentType: 'salad' | 'warm_veggie';
      mealType: string;
      mainDishTotalPortionG: number;
    }> = {};

    dishes?.forEach(mainDish => {
      // Get meal type for this dish from menu items
      const mealType = menuItems?.find(item => item.dish_id === mainDish.id)?.meal_type;

      if (!mealType) {
        console.warn('No meal_type found for dish:', mainDish.name);
        return; // Skip dishes without meal_type in menu
      }

      // Get orders for this meal_type grouped by deduplicated location
      const locationOrders: LocationOrders = {};
      let totalPortions = 0;

      const dishOrderItems = orderItems?.filter((item: any) => item.meal_type === mealType) || [];
      dishOrderItems.forEach((item: any) => {
        if (item.orders?.location_id) {
          // Map to deduplicated location ID
          const displayLocationId = locationIdMap[item.orders.location_id] || item.orders.location_id;
          locationOrders[displayLocationId] = (locationOrders[displayLocationId] || 0) + item.portions;
          totalPortions += item.portions;
        }
      });

      // Add main dish row
      rows.push({
        dish: mainDish,
        isComponent: false,
        locationOrders,
        totalPortions,
        mealType
      });

      // Aggregate components by dish name and type
      const components = dishComponents?.filter(dc => dc.main_dish_id === mainDish.id) || [];
      components.forEach((comp: any) => {
        if (comp.component_dish) {
          // Aggregate all components by component dish + type only (no meal type)
          // This ensures same component used in multiple dishes appears once
          const key = `${comp.component_dish.id}-${comp.component_type}`;

          if (!componentAggregation[key]) {
            componentAggregation[key] = {
              dish: comp.component_dish,
              locationOrders: {},
              totalPortions: 0,
              componentType: comp.component_type,
              mealType,
              percentage: comp.percentage,
              mainDishIds: new Set()
            };
          }

          // Track which main dishes use this component
          componentAggregation[key].mainDishIds.add(mainDish.id);

          // Add to aggregated component
          Object.keys(locationOrders).forEach(locId => {
            componentAggregation[key].locationOrders[locId] =
              (componentAggregation[key].locationOrders[locId] || 0) + locationOrders[locId];
          });
          componentAggregation[key].totalPortions += totalPortions;

          // Track total rows for salad and warm_veggie types
          if (comp.component_type === 'salad' || comp.component_type === 'warm_veggie') {
            // Aggregate totals by component type only (no meal type)
            const totalKey = comp.component_type;
            const mainDishTotalField = comp.component_type === 'salad'
              ? (mainDish as any).salad_total_portion_g
              : (mainDish as any).warm_veggie_total_portion_g;

            if (mainDishTotalField) {
              if (!totalAggregation[totalKey]) {
                totalAggregation[totalKey] = {
                  locationOrders: {},
                  totalPortions: 0,
                  componentType: comp.component_type,
                  mealType,
                  mainDishTotalPortionG: mainDishTotalField
                };
              }

              // Add to total aggregation
              Object.keys(locationOrders).forEach(locId => {
                totalAggregation[totalKey].locationOrders[locId] =
                  (totalAggregation[totalKey].locationOrders[locId] || 0) + locationOrders[locId];
              });
              totalAggregation[totalKey].totalPortions += totalPortions;

              // Store the total portion size for weight calculation
              componentAggregation[key].mainDishTotalPortionG = mainDishTotalField;
            }
          }
        }
      });
    });

    // Add aggregated components to rows, grouped by component type only
    // For salads and warm veggies, add total row first, then component rows
    const componentsByType: Record<string, typeof componentAggregation[string][]> = {};

    Object.values(componentAggregation).forEach(comp => {
      const typeKey = comp.componentType; // Group by type only, not meal type
      if (!componentsByType[typeKey]) {
        componentsByType[typeKey] = [];
      }
      componentsByType[typeKey].push(comp);
    });

    // Add rows in order: main dishes, then for each component type (total first if applicable)
    Object.entries(componentsByType).forEach(([componentType, components]) => {
      // For salad and warm_veggie, add total row first
      if ((componentType === 'salad' || componentType === 'warm_veggie') && totalAggregation[componentType]) {
        const total = totalAggregation[componentType];
        rows.push({
          dish: { name: `Total ${componentType === 'salad' ? 'Salad' : 'Warm Veggies'}` } as Dish,
          isComponent: true,
          isTotalRow: true,
          locationOrders: total.locationOrders,
          totalPortions: total.totalPortions,
          mealType: total.mealType,
          componentType: total.componentType,
          mainDishTotalPortionG: total.mainDishTotalPortionG
        });
      }

      // Then add individual component rows
      components.forEach(comp => {
        rows.push({
          dish: comp.dish,
          isComponent: true,
          locationOrders: comp.locationOrders,
          totalPortions: comp.totalPortions,
          mealType: comp.mealType,
          componentType: comp.componentType,
          percentage: comp.percentage,
          mainDishTotalPortionG: comp.mainDishTotalPortionG
        });
      });
    });

    console.log('Total production rows built:', rows.length);
    console.log('Sample row:', rows[0]);
    setProductionRows(rows);
  };

  // Calculate weight with 1 decimal place for kg/L
  // Uses location-specific portion sizes when available
  const calculateWeight = (portions: number, dish: Dish, locationId?: string) => {
    // If portion_unit is "pieces", show as pieces
    if (dish.portion_unit === 'pieces') {
      return `${portions} pcs`;
    }

    // Check for location-specific portion size overrides
    let portionSizeMl = dish.default_portion_size_ml;
    let portionSizeG = dish.default_portion_size_g;

    if (locationId && locationSettingsMap.size > 0) {
      const locationSettings = locationSettingsMap.get(locationId);

      // Override soup portion size if location has custom setting
      if (locationSettings?.soup_portion_size_ml && dish.category === 'soup') {
        portionSizeMl = locationSettings.soup_portion_size_ml;
      }

      // Note: salad_bar is not a dish category in the current schema
      // Salad bar items use subcategory 'salad' with category 'component'
    }

    // Calculate using portion size (location-specific or default)
    if (portionSizeMl) {
      const ml = portions * portionSizeMl;
      if (ml >= 1000) {
        const liters = ml / 1000;
        return `${Math.round(liters * 10) / 10}L`;
      }
      return `${Math.round(ml)}ml`;
    }
    if (portionSizeG) {
      const grams = portions * portionSizeG;
      if (grams >= 1000) {
        const kg = grams / 1000;
        return `${Math.round(kg * 10) / 10}kg`;
      }
      return `${Math.round(grams)}g`;
    }

    // Fallback to portion_size field (legacy field)
    if (dish.portion_size) {
      const grams = portions * dish.portion_size;
      if (grams >= 1000) {
        const kg = grams / 1000;
        return `${Math.round(kg * 10) / 10}kg`;
      }
      return `${Math.round(grams)}g`;
    }

    return `${portions} portions`;
  };

  // Calculate weight for a production row (handles percentage-based components)
  const calculateRowWeight = (portions: number, row: ProductionRow, locationId?: string) => {
    // For total rows (salad/warm veggie totals), calculate from mainDishTotalPortionG
    if (row.isTotalRow && row.mainDishTotalPortionG) {
      const grams = portions * row.mainDishTotalPortionG;
      if (grams >= 1000) {
        const kg = grams / 1000;
        return `${Math.round(kg * 10) / 10}kg`;
      }
      return `${Math.round(grams)}g`;
    }

    // For percentage-based components (salad/warm veggie components)
    if (row.percentage && row.mainDishTotalPortionG) {
      const componentGrams = (row.mainDishTotalPortionG * row.percentage) / 100;
      const totalGrams = portions * componentGrams;
      if (totalGrams >= 1000) {
        const kg = totalGrams / 1000;
        return `${Math.round(kg * 10) / 10}kg`;
      }
      return `${Math.round(totalGrams)}g`;
    }

    // Otherwise use the regular calculateWeight function
    return calculateWeight(portions, row.dish, locationId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  console.log('[RENDER] productionRows state:', productionRows.length, 'rows');

  // Show date selector if no date is selected
  if (!selectedDate) {
    const today = new Date();
    const nextWeek = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      return date;
    });

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-900 py-6">
          <div className="max-w-full mx-auto px-6 lg:px-8">
            <h1 className="text-5xl font-extralight text-white tracking-[0.3em] uppercase" style={{ fontFamily: "'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, sans-serif" }}>
              DELIVERY
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-full mx-auto px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="text-2xl font-light text-gray-700">
                Production Sheets
              </div>
              <button
                onClick={() => router.push('/dark-kitchen')}
                className="px-6 py-2 text-sm font-medium bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto px-6 lg:px-8 py-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extralight text-gray-800 mb-4">Choose Date</h2>
            <p className="text-gray-600">Select a production date to view the sheet</p>
          </div>

          <div className="bg-white border border-black/10 shadow-sm p-8">
            <div className="grid grid-cols-7 gap-4">
              {nextWeek.map((date, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className="flex flex-col items-center p-4 border-2 border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-all"
                >
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    {format(date, 'EEE')}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {format(date, 'd')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(date, 'MMM yyyy')}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  const dateStr = window.prompt('Enter custom date (YYYY-MM-DD):');
                  if (dateStr) {
                    const customDate = new Date(dateStr);
                    if (!isNaN(customDate.getTime())) {
                      setSelectedDate(customDate);
                    }
                  }
                }}
                className="w-full px-6 py-3 bg-gray-600 text-white hover:bg-gray-700 transition-colors"
              >
                Enter Custom Date
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 py-6">
        <div className="max-w-full mx-auto px-6 lg:px-8">
          <h1 className="text-5xl font-extralight text-white tracking-[0.3em] uppercase" style={{ fontFamily: "'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, sans-serif" }}>
            DELIVERY
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-full mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="text-2xl font-light text-gray-700">
              Production Sheets
            </div>
            <button
              onClick={() => router.push('/dark-kitchen')}
              className="px-6 py-2 text-sm font-medium bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-full mx-auto px-6 lg:px-8 py-10">
        {/* Date and Actions */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-extralight text-gray-800 tracking-wide">
            Production for {format(selectedDate!, 'EEEE, MMMM d, yyyy')}
          </h2>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedDate(null)}
              className="px-6 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors"
            >
              Change Date
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-2 bg-blue-800 text-white hover:bg-blue-900 transition-colors"
            >
              Print
            </button>
          </div>
        </div>

        {/* Production Table */}
        <div className="mb-6">
          <div className="bg-white border border-black/10 overflow-hidden shadow-sm">
            {productionRows.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No production scheduled for this date</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-700 to-gray-800 border-b-2 border-gray-900">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Item</th>
                      {locations.map(location => (
                        <th key={location.id} className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                          {location.name}
                        </th>
                      ))}
                      <th className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const soupRows = productionRows.filter(row => row.mealType === 'soup' && !row.isComponent);
                      const soupComponents = productionRows.filter(row => row.mealType === 'soup' && row.isComponent);

                      const hotMeatRows = productionRows.filter(row => row.mealType === 'hot_meat' && !row.isComponent);
                      const hotMeatComponents = productionRows.filter(row => row.mealType === 'hot_meat' && row.isComponent);

                      const hotVegRows = productionRows.filter(row => row.mealType === 'hot_veg' && !row.isComponent);
                      const hotVegComponents = productionRows.filter(row => row.mealType === 'hot_veg' && row.isComponent);

                      // Combine all hot dish components and aggregate by dish name
                      const allHotComponents = [...hotMeatComponents, ...hotVegComponents];

                      // Aggregate components by dish ID to combine duplicates
                      const aggregatedHotComponents: Record<string, ProductionRow> = {};
                      allHotComponents.forEach(comp => {
                        const key = `${comp.dish.id}-${comp.componentType}`;
                        if (!aggregatedHotComponents[key]) {
                          aggregatedHotComponents[key] = { ...comp };
                        } else {
                          // Merge location orders
                          Object.keys(comp.locationOrders).forEach(locId => {
                            aggregatedHotComponents[key].locationOrders[locId] =
                              (aggregatedHotComponents[key].locationOrders[locId] || 0) + comp.locationOrders[locId];
                          });
                          aggregatedHotComponents[key].totalPortions += comp.totalPortions;
                        }
                      });

                      const aggregatedHotComponentsList = Object.values(aggregatedHotComponents);

                      // Helper to get components by type
                      const getComponentsByType = (components: ProductionRow[], type: string) =>
                        components.filter(c => c.componentType === type);

                      // Helper to render component section with alternating row colors
                      const renderComponentSection = (components: ProductionRow[], type: string, label: string, startIdx: number) => {
                        const filtered = getComponentsByType(components, type);
                        if (filtered.length === 0) return { rows: null, count: 0 };

                        const rows = (
                          <>
                            <tr className="bg-gray-200/80">
                              <td colSpan={locations.length + 2} className="px-8 py-2">
                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</h4>
                              </td>
                            </tr>
                            {filtered.map((row, idx) => {
                              const globalIdx = startIdx + idx + 1;
                              // Total rows get special styling (bold, slightly darker background)
                              const isTotalRow = row.isTotalRow;
                              return (
                                <tr
                                  key={`${type}-${idx}`}
                                  className={`border-b border-gray-200 transition-colors hover:bg-gray-100 ${
                                    isTotalRow
                                      ? 'bg-blue-50 font-semibold'
                                      : globalIdx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                  }`}
                                >
                                  <td className={`px-10 py-3 text-sm ${isTotalRow ? 'font-bold text-blue-900' : 'font-medium text-gray-900'}`}>
                                    {row.dish.name}
                                  </td>
                                  {locations.map(location => {
                                    const portions = row.locationOrders[location.id] || 0;
                                    return (
                                      <td key={location.id} className={`px-4 py-3 text-sm text-center ${isTotalRow ? 'font-bold text-blue-900' : 'text-gray-700 font-medium'}`}>
                                        {portions > 0 ? calculateRowWeight(portions, row, location.id) : '-'}
                                      </td>
                                    );
                                  })}
                                  <td className={`px-4 py-3 text-sm text-center font-bold ${isTotalRow ? 'text-blue-900' : 'text-gray-900'}`}>
                                    {calculateRowWeight(row.totalPortions, row)}
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        );

                        return { rows, count: filtered.length + 1 };
                      };

                      let rowCounter = 0;

                      return (
                        <>
                          {/* Soup Section */}
                          {soupRows.length > 0 && (
                            <>
                              <tr className="bg-gradient-to-r from-slate-200 to-slate-100">
                                <td colSpan={locations.length + 2} className="px-6 py-3">
                                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Soup</h3>
                                </td>
                              </tr>
                              {soupRows.map((row, idx) => {
                                rowCounter++;
                                return (
                                  <tr
                                    key={`soup-main-${idx}`}
                                    className={`border-b border-gray-200 transition-colors hover:bg-gray-100 ${
                                      rowCounter % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                    }`}
                                  >
                                    <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                                      {row.dish.name}
                                    </td>
                                    {locations.map(location => {
                                      const portions = row.locationOrders[location.id] || 0;
                                      return (
                                        <td key={location.id} className="px-4 py-3.5 text-sm text-center text-gray-700 font-medium">
                                          {portions > 0 ? calculateRowWeight(portions, row, location.id) : '-'}
                                        </td>
                                      );
                                    })}
                                    <td className="px-4 py-3.5 text-sm text-center font-bold text-gray-900">
                                      {calculateRowWeight(row.totalPortions, row)}
                                    </td>
                                  </tr>
                                );
                              })}
                              {(() => {
                                const result = renderComponentSection(soupComponents, 'topping', 'Soup Toppings', rowCounter);
                                rowCounter += result.count;
                                return result.rows;
                              })()}
                            </>
                          )}

                          {/* Hot Dish Section - Combined */}
                          {(hotMeatRows.length > 0 || hotVegRows.length > 0) && (
                            <>
                              <tr className="bg-gradient-to-r from-slate-200 to-slate-100">
                                <td colSpan={locations.length + 2} className="px-6 py-3">
                                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Hot Dish</h3>
                                </td>
                              </tr>
                              {/* Hot Meat Dishes */}
                              {hotMeatRows.map((row, idx) => {
                                rowCounter++;
                                return (
                                  <tr
                                    key={`hot-meat-main-${idx}`}
                                    className={`border-b border-gray-200 transition-colors hover:bg-gray-100 ${
                                      rowCounter % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                    }`}
                                  >
                                    <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                                      {row.dish.name}
                                    </td>
                                    {locations.map(location => {
                                      const portions = row.locationOrders[location.id] || 0;
                                      return (
                                        <td key={location.id} className="px-4 py-3.5 text-sm text-center text-gray-700 font-medium">
                                          {portions > 0 ? calculateRowWeight(portions, row, location.id) : '-'}
                                        </td>
                                      );
                                    })}
                                    <td className="px-4 py-3.5 text-sm text-center font-bold text-gray-900">
                                      {calculateRowWeight(row.totalPortions, row)}
                                    </td>
                                  </tr>
                                );
                              })}
                              {/* Hot Veg Dishes */}
                              {hotVegRows.map((row, idx) => {
                                rowCounter++;
                                return (
                                  <tr
                                    key={`hot-veg-main-${idx}`}
                                    className={`border-b border-gray-200 transition-colors hover:bg-gray-100 ${
                                      rowCounter % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                    }`}
                                  >
                                    <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                                      {row.dish.name}
                                    </td>
                                    {locations.map(location => {
                                      const portions = row.locationOrders[location.id] || 0;
                                      return (
                                        <td key={location.id} className="px-4 py-3.5 text-sm text-center text-gray-700 font-medium">
                                          {portions > 0 ? calculateRowWeight(portions, row, location.id) : '-'}
                                        </td>
                                      );
                                    })}
                                    <td className="px-4 py-3.5 text-sm text-center font-bold text-gray-900">
                                      {calculateRowWeight(row.totalPortions, row)}
                                    </td>
                                  </tr>
                                );
                              })}
                              {/* Components in order: Carbs, Warm Veggies/Salad, Add-ons - using aggregated components */}
                              {(() => {
                                const carbResult = renderComponentSection(aggregatedHotComponentsList, 'carb', 'Carbs', rowCounter);
                                rowCounter += carbResult.count;
                                return carbResult.rows;
                              })()}
                              {(() => {
                                const warmVeggieResult = renderComponentSection(aggregatedHotComponentsList, 'warm_veggie', 'Warm Vegetables', rowCounter);
                                rowCounter += warmVeggieResult.count;
                                return warmVeggieResult.rows;
                              })()}
                              {(() => {
                                const saladResult = renderComponentSection(aggregatedHotComponentsList, 'salad', 'Salad', rowCounter);
                                rowCounter += saladResult.count;
                                return saladResult.rows;
                              })()}
                              {(() => {
                                const condimentResult = renderComponentSection(aggregatedHotComponentsList, 'condiment', 'Add-ons', rowCounter);
                                rowCounter += condimentResult.count;
                                return condimentResult.rows;
                              })()}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
