'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, addDays, startOfWeek, getDay } from 'date-fns';
import type { UserProfile, Dish, Location, DishWithComponents } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';

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
  const [activeTab, setActiveTab] = useState<'main' | 'mep' | 'salad_bar'>('main');
  const [saladBarData, setSaladBarData] = useState<any[]>([]);
  const [mepData, setMepData] = useState<any[]>([]);
  const [headingPosition] = useState({ x: 0, y: 0 });
  const [tabsPosition] = useState({ x: 0, y: 0 });
  const router = useRouter();
  const supabase = createClient();

  // Helper function to abbreviate location names for display
  const getAbbreviatedLocationName = (locationName: string): string => {
    const abbreviations: Record<string, string> = {
      'SnapChat 119': 'Snap119',
      'Snapchat 119': 'Snap119',
      'SnapChat 165': 'Snap165',
      'Snapchat 165': 'Snap165',
      'Symphony': 'Symph',
      'Atlassian': 'Atlas',
      'Snowflake': 'Snow',
      'JAA Training': 'J.A.A.'
    };
    return abbreviations[locationName] || locationName;
  };

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
      fetchSaladBarData(selectedDate, locations);
    }
  }, [selectedDate]);

  // Generate MEP data whenever productionRows changes
  useEffect(() => {
    if (productionRows.length > 0) {
      generateMEPData();
    } else {
      setMepData([]);
    }
  }, [productionRows]);

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

    // Get salad components with percentages
    const { data: saladComponents } = await supabase
      .from('salad_components')
      .select('*, component_dish:dishes!component_dish_id(*)')
      .in('main_dish_id', dishIds);

    // Get warm veggie components with percentages
    const { data: warmVeggieComponents } = await supabase
      .from('warm_veggie_components')
      .select('*, component_dish:dishes!component_dish_id(*)')
      .in('main_dish_id', dishIds);

    console.log('Fetched dish components:', dishComponents?.length);
    console.log('Fetched salad components:', saladComponents?.length);
    console.log('Fetched warm veggie components:', warmVeggieComponents?.length);

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
      dishPortionSizes: Set<number>; // Track all unique portion sizes from contributing dishes
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

      // Aggregate NON-salad/NON-warm-veggie components from dish_components table
      // (e.g., carbs, toppings, condiments - things that don't use percentage breakdown)
      const components = dishComponents?.filter(dc => dc.main_dish_id === mainDish.id) || [];
      components.forEach((comp: any) => {
        if (comp.component_dish) {
          // SKIP salad and warm_veggie types - these MUST come from dedicated tables with percentages
          if (comp.component_type === 'salad' || comp.component_type === 'warm_veggie') {
            console.warn(
              `⚠️  WARNING: Found ${comp.component_type} in dish_components table for dish "${mainDish.name}".`,
              `This is the OLD way. Please migrate to ${comp.component_type}_components table with percentages.`,
              `Skipping this component to enforce new percentage-based system.`
            );
            return; // Skip - enforce new way only
          }

          // Process other component types (carb, topping, condiment, etc.)
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

          componentAggregation[key].mainDishIds.add(mainDish.id);

          Object.keys(locationOrders).forEach(locId => {
            componentAggregation[key].locationOrders[locId] =
              (componentAggregation[key].locationOrders[locId] || 0) + locationOrders[locId];
          });
          componentAggregation[key].totalPortions += totalPortions;
        }
      });

      // Process salad components with percentages
      const saladComps = saladComponents?.filter(sc => sc.main_dish_id === mainDish.id) || [];
      saladComps.forEach((comp: any) => {
        if (comp.component_dish) {
          const key = `${comp.component_dish.id}-salad`;

          if (!componentAggregation[key]) {
            componentAggregation[key] = {
              dish: comp.component_dish,
              locationOrders: {},
              totalPortions: 0,
              componentType: 'salad',
              mealType,
              percentage: comp.percentage,
              mainDishIds: new Set()
            };
          }

          componentAggregation[key].mainDishIds.add(mainDish.id);

          Object.keys(locationOrders).forEach(locId => {
            componentAggregation[key].locationOrders[locId] =
              (componentAggregation[key].locationOrders[locId] || 0) + locationOrders[locId];
          });
          componentAggregation[key].totalPortions += totalPortions;

          // Track total salad aggregation
          const mainDishTotalField = (mainDish as any).salad_total_portion_g;

          console.log(`[SALAD DEBUG] Processing salad component from ${mainDish.name} (${mealType}):`, {
            dishId: mainDish.id,
            componentName: comp.component_dish.name,
            percentage: comp.percentage,
            portionSize: mainDishTotalField,
            totalPortionsForThisDish: totalPortions
          });

          if (mainDishTotalField) {
            if (!totalAggregation['salad']) {
              console.log(`[SALAD DEBUG] Creating new total aggregation for salad, initial portion size: ${mainDishTotalField}g`);
              totalAggregation['salad'] = {
                locationOrders: {},
                totalPortions: 0,
                componentType: 'salad',
                mealType,
                mainDishTotalPortionG: mainDishTotalField,
                dishPortionSizes: new Set([mainDishTotalField])
              };
            } else {
              console.log(`[SALAD DEBUG] Adding to existing salad aggregation. Current portion sizes:`, Array.from(totalAggregation['salad'].dishPortionSizes), `Adding: ${mainDishTotalField}g`);

              totalAggregation['salad'].dishPortionSizes.add(mainDishTotalField);

              if (totalAggregation['salad'].dishPortionSizes.size > 1) {
                console.warn(
                  `WARNING: Multiple portion sizes detected for salad:`,
                  Array.from(totalAggregation['salad'].dishPortionSizes),
                  `Using smallest value: ${Math.min(...Array.from(totalAggregation['salad'].dishPortionSizes))}g`
                );
                totalAggregation['salad'].mainDishTotalPortionG = Math.min(...Array.from(totalAggregation['salad'].dishPortionSizes));
              }
            }

            Object.keys(locationOrders).forEach(locId => {
              totalAggregation['salad'].locationOrders[locId] =
                (totalAggregation['salad'].locationOrders[locId] || 0) + locationOrders[locId];
            });
            totalAggregation['salad'].totalPortions += totalPortions;

            componentAggregation[key].mainDishTotalPortionG = mainDishTotalField;
          }
        }
      });

      // Process warm veggie components with percentages
      const warmVeggieComps = warmVeggieComponents?.filter(wv => wv.main_dish_id === mainDish.id) || [];
      warmVeggieComps.forEach((comp: any) => {
        if (comp.component_dish) {
          const key = `${comp.component_dish.id}-warm_veggie`;

          if (!componentAggregation[key]) {
            componentAggregation[key] = {
              dish: comp.component_dish,
              locationOrders: {},
              totalPortions: 0,
              componentType: 'warm_veggie',
              mealType,
              percentage: comp.percentage,
              mainDishIds: new Set()
            };
          }

          componentAggregation[key].mainDishIds.add(mainDish.id);

          Object.keys(locationOrders).forEach(locId => {
            componentAggregation[key].locationOrders[locId] =
              (componentAggregation[key].locationOrders[locId] || 0) + locationOrders[locId];
          });
          componentAggregation[key].totalPortions += totalPortions;

          // Track total warm veggie aggregation
          const mainDishTotalField = (mainDish as any).warm_veggie_total_portion_g;

          console.log(`[WARM VEGGIE DEBUG] Processing warm veggie component from ${mainDish.name} (${mealType}):`, {
            dishId: mainDish.id,
            componentName: comp.component_dish.name,
            percentage: comp.percentage,
            portionSize: mainDishTotalField,
            totalPortionsForThisDish: totalPortions
          });

          if (mainDishTotalField) {
            if (!totalAggregation['warm_veggie']) {
              console.log(`[WARM VEGGIE DEBUG] Creating new total aggregation for warm_veggie, initial portion size: ${mainDishTotalField}g`);
              totalAggregation['warm_veggie'] = {
                locationOrders: {},
                totalPortions: 0,
                componentType: 'warm_veggie',
                mealType,
                mainDishTotalPortionG: mainDishTotalField,
                dishPortionSizes: new Set([mainDishTotalField])
              };
            } else {
              console.log(`[WARM VEGGIE DEBUG] Adding to existing warm_veggie aggregation. Current portion sizes:`, Array.from(totalAggregation['warm_veggie'].dishPortionSizes), `Adding: ${mainDishTotalField}g`);

              totalAggregation['warm_veggie'].dishPortionSizes.add(mainDishTotalField);

              if (totalAggregation['warm_veggie'].dishPortionSizes.size > 1) {
                console.warn(
                  `WARNING: Multiple portion sizes detected for warm_veggie:`,
                  Array.from(totalAggregation['warm_veggie'].dishPortionSizes),
                  `Using smallest value: ${Math.min(...Array.from(totalAggregation['warm_veggie'].dishPortionSizes))}g`
                );
                totalAggregation['warm_veggie'].mainDishTotalPortionG = Math.min(...Array.from(totalAggregation['warm_veggie'].dishPortionSizes));
              }
            }

            Object.keys(locationOrders).forEach(locId => {
              totalAggregation['warm_veggie'].locationOrders[locId] =
                (totalAggregation['warm_veggie'].locationOrders[locId] || 0) + locationOrders[locId];
            });
            totalAggregation['warm_veggie'].totalPortions += totalPortions;

            componentAggregation[key].mainDishTotalPortionG = mainDishTotalField;
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

    // Log final total aggregation values
    console.log('[SALAD DEBUG] Final total aggregation:', Object.keys(totalAggregation).map(key => ({
      type: key,
      totalPortions: totalAggregation[key].totalPortions,
      mainDishTotalPortionG: totalAggregation[key].mainDishTotalPortionG,
      allPortionSizes: Array.from(totalAggregation[key].dishPortionSizes),
      calculatedWeight: `${(totalAggregation[key].totalPortions * totalAggregation[key].mainDishTotalPortionG) / 1000}kg`
    })));

    setProductionRows(rows);
  };

  const fetchSaladBarData = async (date: Date, locs: Location[]) => {
    const dateStr = format(date, 'yyyy-MM-dd');

    // Fetch location settings for salad bar composition
    const { data: locationSettingsData } = await supabase
      .from('location_settings')
      .select('*');

    const settingsMap = new Map(
      (locationSettingsData || []).map(s => [s.location_id, s])
    );

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

    // Get salad bar orders for this date (meal_type = 'salad_bar')
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('portions, orders(location_id)')
      .eq('delivery_date', dateStr)
      .eq('meal_type', 'salad_bar');

    console.log('Fetched salad bar order items:', orderItems?.length);

    // Aggregate portions by location
    const locationPortions: Record<string, number> = {};
    locs.forEach(loc => {
      locationPortions[loc.id] = 0;
    });

    orderItems?.forEach((item: any) => {
      const locationId = item.orders?.location_id;
      if (locationId) {
        const mappedLocationId = locationIdMap[locationId] || locationId;
        if (locationPortions[mappedLocationId] !== undefined) {
          locationPortions[mappedLocationId] += item.portions || 0;
        }
      }
    });

    // Build salad bar ingredient breakdown
    const SALAD_BAR_INGREDIENTS = [
      { key: 'salad_leaves_percentage', label: 'Salad Leaves', defaultPercentage: 0.05 },
      { key: 'cucumber_percentage', label: 'Cucumber', defaultPercentage: 0.05 },
      { key: 'tomato_percentage', label: 'Tomato', defaultPercentage: 0.05 },
      { key: 'carrot_julienne_percentage', label: 'Carrot Julienne', defaultPercentage: 0.05 },
      { key: 'radish_julienne_percentage', label: 'Radish Julienne', defaultPercentage: 0.05 },
      { key: 'pickled_beetroot_percentage', label: 'Pickled Beetroot', defaultPercentage: 0.05 },
      { key: 'mixed_blanched_veg_percentage', label: 'Mixed Blanched Veg', defaultPercentage: 0.07 },
      { key: 'roasted_veg_1_percentage', label: 'Roasted Veg 1', defaultPercentage: 0.07 },
      { key: 'roasted_veg_2_percentage', label: 'Roasted Veg 2', defaultPercentage: 0.07 },
      { key: 'roasted_veg_3_percentage', label: 'Roasted Veg 3', defaultPercentage: 0.07 },
      { key: 'potato_salad_percentage', label: 'Potato Salad', defaultPercentage: 0.06 },
      { key: 'composed_salad_percentage', label: 'Composed Salad', defaultPercentage: 0.16 },
      { key: 'pasta_salad_percentage', label: 'Pasta Salad', defaultPercentage: 0.16 },
      { key: 'carb_percentage', label: 'Carb', defaultPercentage: 0.04 },
    ];

    const saladBarRows = SALAD_BAR_INGREDIENTS.map(ingredient => {
      const row: any = {
        ingredient: ingredient.label,
        locationWeights: {},
        totalWeight: 0
      };

      locs.forEach(loc => {
        const portions = locationPortions[loc.id] || 0;
        const settings = settingsMap.get(loc.id);
        const portionSizeG = settings?.salad_bar_portion_size_g || 240;
        const percentage = (settings?.[ingredient.key] as number) ?? ingredient.defaultPercentage;
        const weightG = portions * portionSizeG * percentage;

        row.locationWeights[loc.id] = weightG;
        row.totalWeight += weightG;
      });

      return row;
    });

    setSaladBarData(saladBarRows);
  };

  const generateMEPData = () => {
    console.log('MEP: Generating from production rows:', productionRows.length);

    const mepRows: any[] = [];

    // Group items by section
    const soupItems: any[] = [];
    const hotDishItems: any[] = [];
    const carbItems: any[] = [];
    const warmVeggieItems: any[] = [];
    const saladItems: any[] = [];
    const addOnItems: any[] = [];

    // Process each production row
    productionRows.forEach((row) => {
      // Skip total rows
      if (row.isTotalRow) return;

      const totalWeight = calculateRowWeight(row.totalPortions, row);
      const quantity = totalWeight.replace(/[a-z]+$/i, '').trim();
      const unit = totalWeight.match(/[a-z]+$/i)?.[0] || '-';

      const item = {
        name: row.dish.name,
        quantity,
        unit
      };

      // Add to appropriate section
      if (row.mealType === 'soup') {
        soupItems.push(item);
      } else if (row.mealType === 'hot_meat' || row.mealType === 'hot_fish' || row.mealType === 'hot_veg') {
        hotDishItems.push(item);
      } else if (row.isComponent) {
        if (row.componentType === 'carb') {
          carbItems.push(item);
        } else if (row.componentType === 'warm_veggie') {
          warmVeggieItems.push(item);
        } else if (row.componentType === 'salad') {
          saladItems.push(item);
        } else if (row.componentType === 'topping' || row.componentType === 'condiment') {
          addOnItems.push(item);
        }
      }
    });

    // Build final array with headers and items
    // 1. Soup section
    if (soupItems.length > 0) {
      mepRows.push({ isHeader: true, header: 'SOUP' });
      soupItems.forEach(item => {
        mepRows.push({ isHeader: false, ...item });
      });
    }

    // 2. Hot Dishes section (includes both meat/fish and vegetarian)
    if (hotDishItems.length > 0) {
      mepRows.push({ isHeader: true, header: 'HOT DISHES' });
      hotDishItems.forEach(item => {
        mepRows.push({ isHeader: false, ...item });
      });
    }

    // 3. Carbs subheader (only if there are carbs)
    if (carbItems.length > 0) {
      mepRows.push({ isSubheader: true, subheader: 'Carbs' });
      carbItems.forEach(item => {
        mepRows.push({ isHeader: false, ...item });
      });
    }

    // 4. Warm Vegetables subheader (only if there are warm veggies)
    if (warmVeggieItems.length > 0) {
      mepRows.push({ isSubheader: true, subheader: 'Warm Vegetables' });
      warmVeggieItems.forEach(item => {
        mepRows.push({ isHeader: false, ...item });
      });
    }

    // 5. Salad subheader (only if there are salads)
    if (saladItems.length > 0) {
      mepRows.push({ isSubheader: true, subheader: 'Salad' });
      saladItems.forEach(item => {
        mepRows.push({ isHeader: false, ...item });
      });
    }

    // 6. Add-Ons subheader (only if there are add-ons)
    if (addOnItems.length > 0) {
      mepRows.push({ isSubheader: true, subheader: 'Add-Ons' });
      addOnItems.forEach(item => {
        mepRows.push({ isHeader: false, ...item });
      });
    }

    console.log('MEP: Generated rows:', mepRows.length);

    setMepData(mepRows);
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
    // For total rows (salad/warm veggie totals), sum individual component weights
    // WORKAROUND: Don't use mainDishTotalPortionG as it may have cached wrong values
    // Instead, find all components of this type and sum their weights
    if (row.isTotalRow && row.componentType) {
      const componentType = row.componentType;
      const relevantComponents = productionRows.filter(
        r => r.isComponent && !r.isTotalRow && r.componentType === componentType
      );

      let totalGrams = 0;
      relevantComponents.forEach(comp => {
        if (comp.percentage && comp.mainDishTotalPortionG) {
          const componentPortions = locationId ? (comp.locationOrders[locationId] || 0) : comp.totalPortions;
          const componentGramsPerPortion = (comp.mainDishTotalPortionG * comp.percentage) / 100;
          totalGrams += componentPortions * componentGramsPerPortion;
        }
      });

      if (totalGrams >= 1000) {
        const kg = totalGrams / 1000;
        return `${Math.round(kg * 10) / 10}kg`;
      }
      return `${Math.round(totalGrams)}g`;
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
        <UniversalHeader
          title="Production Sheets"
          backPath="/dark-kitchen"
        />

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
                  className="flex flex-col items-center p-4 border-2 border-gray-200 hover:border-blue-600 hover:bg-slate-200 transition-all"
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
      <AdminQuickNav />

      <UniversalHeader
        title="Production Sheets"
        backPath="/dark-kitchen"
      />

      <main className="max-w-7xl mx-auto px-8 lg:px-12 py-8">
        {/* Date Heading */}
        <div
          className="mt-32 mb-6"
          style={{
            transform: `translate(${headingPosition.x}px, ${headingPosition.y}px)`,
            width: 'fit-content'
          }}
        >
          <h2 className="text-2xl font-extralight text-gray-800 tracking-wide">
            Production for {format(selectedDate!, 'EEEE, MMMM d, yyyy')}
          </h2>
        </div>

        {/* Tabs and Actions */}
        <div className="flex items-end justify-between border-b border-gray-200">
          <div
            className="flex gap-2"
            style={{
              transform: `translate(${tabsPosition.x}px, ${tabsPosition.y}px)`
            }}
          >
            <button
              onClick={() => setActiveTab('main')}
              className={`px-6 py-3 text-sm font-semibold transition-all ${
                activeTab === 'main'
                  ? 'text-[#4A7DB5] border-b-2 border-[#4A7DB5]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Main Production
            </button>
            <button
              onClick={() => setActiveTab('mep')}
              className={`px-6 py-3 text-sm font-semibold transition-all ${
                activeTab === 'mep'
                  ? 'text-[#D97706] border-b-2 border-[#D97706]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Main MEP
            </button>
            <button
              onClick={() => setActiveTab('salad_bar')}
              className={`px-6 py-3 text-sm font-semibold transition-all ${
                activeTab === 'salad_bar'
                  ? 'text-[#0F766E] border-b-2 border-[#0F766E]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Salad Bar
            </button>
          </div>
          {activeTab !== 'mep' && (
            <div className="flex gap-3 pb-3">
              <button
                onClick={() => setSelectedDate(null)}
                className="px-5 py-2 text-sm bg-slate-200 text-[#1D1D1F] hover:bg-slate-300 transition-colors rounded-lg font-semibold"
              >
                Change Date
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 text-sm bg-white border border-slate-300 text-[#1D1D1F] hover:bg-slate-50 transition-colors rounded-lg font-semibold"
              >
                Print
              </button>
            </div>
          )}
        </div>

        {/* Main Production Table */}
        {activeTab === 'main' && (
          <div>
            {productionRows.length === 0 ? (
              <div className="bg-white border border-black/10 shadow-sm rounded-lg p-8 text-center">
                <p className="text-gray-500">No production scheduled for this date</p>
              </div>
            ) : (
              <div className="border border-slate-700 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed border-separate" style={{borderSpacing: '0 0'}}>
                    <colgroup>
                      <col style={{width: '12%'}} />
                      <col style={{width: '28%'}} />
                      {locations.map(location => (
                        <col key={location.id} style={{width: `${60 / (locations.length + 1)}%`}} />
                      ))}
                      <col style={{width: `${60 / (locations.length + 1)}%`}} />
                    </colgroup>
                    <thead className="bg-[#4A7DB5]">
                      <tr>
                        <th className="px-3 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Category</th>
                        <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Item</th>
                        {locations.map(location => (
                          <th key={location.id} className="px-3 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                            {getAbbreviatedLocationName(location.name)}
                          </th>
                        ))}
                        <th className="px-3 py-4 text-center text-xs font-bold text-amber-50 uppercase tracking-wider bg-amber-900/30">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
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
                      const renderComponentSection = (components: ProductionRow[], type: string, label: string, startIdx: number, addThickBorder = false) => {
                        const filtered = getComponentsByType(components, type);
                        if (filtered.length === 0) return { rows: null, count: 0 };

                        const rows = (
                          <>
                            {filtered.map((row, idx) => {
                              const globalIdx = startIdx + idx + 1;
                              // Total rows get special styling (bold, slightly darker background)
                              const isTotalRow = row.isTotalRow;
                              const isEven = globalIdx % 2 === 0;
                              const isLastRow = idx === filtered.length - 1;
                              const borderClass = isLastRow && addThickBorder ? 'border-b-[2px] border-b-gray-400' : 'border-b border-gray-300';

                              // Calculate weight for each cell (handles both total and component rows)
                              const calculateCellWeight = (locationId?: string) => {
                                const portions = locationId ? (row.locationOrders[locationId] || 0) : row.totalPortions;
                                if (portions === 0) return '-';
                                return calculateRowWeight(portions, row, locationId);
                              };

                              return (
                                <tr
                                  key={`${type}-${idx}`}
                                  className={`${borderClass} transition-colors hover:bg-gray-100`}
                                >
                                  {idx === 0 && (
                                    <td rowSpan={filtered.length} className={`px-3 py-2 text-[11px] font-semibold text-blue-600 uppercase tracking-wide text-right ${borderClass} bg-white align-top`}>
                                      {label}
                                    </td>
                                  )}
                                  <td className={`px-8 py-2 text-sm border-r ${borderClass} font-medium text-gray-900 ${isEven ? 'bg-gray-200' : 'bg-white'}`}>
                                    {row.dish.name}
                                  </td>
                                  {locations.map(location => {
                                    return (
                                      <td key={location.id} className={`px-3 py-2 text-sm text-center border-r ${borderClass} text-gray-700 font-medium ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
                                        {calculateCellWeight(location.id)}
                                      </td>
                                    );
                                  })}
                                  <td className={`px-3 py-2 text-sm text-center font-bold ${borderClass} text-red-700 ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
                                    {calculateCellWeight()}
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        );

                        return { rows, count: filtered.length };
                      };

                      let rowCounter = 0;

                      return (
                        <>
                          {/* Soup Section */}
                          {soupRows.length > 0 && (
                            <>
                              {soupRows.map((row, idx) => {
                                rowCounter++;
                                const isEven = rowCounter % 2 === 0;
                                const isLastSoup = idx === soupRows.length - 1;
                                const hasNoComponents = soupComponents.length === 0;
                                const borderClass = isLastSoup && hasNoComponents ? 'border-b-[2px] border-b-gray-400' : 'border-b border-gray-300';
                                return (
                                  <tr
                                    key={`soup-main-${idx}`}
                                    className={borderClass}
                                  >
                                    {idx === 0 && (
                                      <td rowSpan={soupRows.length} className={`px-3 py-2.5 text-sm font-bold text-slate-700 uppercase tracking-wide text-center border-r ${borderClass} bg-slate-100 align-top`}>
                                        Soup
                                      </td>
                                    )}
                                    <td className={`px-5 py-2.5 text-sm font-bold text-gray-900 border-r ${borderClass} ${isEven ? 'bg-gray-200' : 'bg-white'}`}>
                                      {row.dish.name}
                                    </td>
                                    {locations.map(location => {
                                      const portions = row.locationOrders[location.id] || 0;
                                      return (
                                        <td key={location.id} className={`px-3 py-2.5 text-sm text-center text-gray-700 font-medium border-r ${borderClass} ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
                                          {portions > 0 ? calculateRowWeight(portions, row, location.id) : '-'}
                                        </td>
                                      );
                                    })}
                                    <td className={`px-3 py-2.5 text-sm text-center font-bold text-red-700 ${borderClass} ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
                                      {calculateRowWeight(row.totalPortions, row)}
                                    </td>
                                  </tr>
                                );
                              })}
                              {(() => {
                                const result = renderComponentSection(soupComponents, 'topping', 'Toppings', rowCounter, true);
                                rowCounter += result.count;
                                return result.rows;
                              })()}
                            </>
                          )}

                          {/* Hot Dish Section - Combined */}
                          {(hotMeatRows.length > 0 || hotVegRows.length > 0) && (
                            <>
                              {/* Hot Meat Dishes */}
                              {hotMeatRows.map((row, idx) => {
                                const isFirstHotDish = idx === 0;
                                const totalHotDishRows = hotMeatRows.length + hotVegRows.length;
                                rowCounter++;
                                const isEven = rowCounter % 2 === 0;
                                return (
                                  <tr
                                    key={`hot-meat-main-${idx}`}
                                    className="border-b border-gray-300"
                                  >
                                    {isFirstHotDish && (
                                      <td rowSpan={totalHotDishRows} className="px-3 py-2.5 text-sm font-bold text-slate-700 uppercase tracking-wide text-center border-r border-b border-gray-300 bg-slate-100 align-top">
                                        Hot Dishes
                                      </td>
                                    )}
                                    <td className={`px-5 py-2.5 text-sm font-bold text-gray-900 border-r border-b border-gray-300 ${isEven ? 'bg-gray-200' : 'bg-white'}`}>
                                      {row.dish.name}
                                    </td>
                                    {locations.map(location => {
                                      const portions = row.locationOrders[location.id] || 0;
                                      return (
                                        <td key={location.id} className={`px-3 py-2.5 text-sm text-center text-gray-700 font-medium border-r border-b border-gray-300 ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
                                          {portions > 0 ? calculateRowWeight(portions, row, location.id) : '-'}
                                        </td>
                                      );
                                    })}
                                    <td className={`px-3 py-2.5 text-sm text-center font-bold text-red-700 border-b border-gray-300 ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
                                      {calculateRowWeight(row.totalPortions, row)}
                                    </td>
                                  </tr>
                                );
                              })}
                              {/* Hot Veg Dishes */}
                              {hotVegRows.map((row, idx) => {
                                rowCounter++;
                                const isEven = rowCounter % 2 === 0;
                                return (
                                  <tr
                                    key={`hot-veg-main-${idx}`}
                                    className="border-b border-gray-300"
                                  >
                                    {/* No category cell - covered by Hot Dish rowspan */}
                                    <td className={`px-5 py-2.5 text-sm font-bold text-gray-900 border-r border-b border-gray-300 ${isEven ? 'bg-gray-200' : 'bg-white'}`}>
                                      {row.dish.name}
                                    </td>
                                    {locations.map(location => {
                                      const portions = row.locationOrders[location.id] || 0;
                                      return (
                                        <td key={location.id} className={`px-3 py-2.5 text-sm text-center text-gray-700 font-medium border-r border-b border-gray-300 ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
                                          {portions > 0 ? calculateRowWeight(portions, row, location.id) : '-'}
                                        </td>
                                      );
                                    })}
                                    <td className={`px-3 py-2.5 text-sm text-center font-bold text-red-700 border-b border-gray-300 ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
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
              </div>
            )}
          </div>
        )}

        {/* Main MEP Table */}
        {activeTab === 'mep' && (
          <div>
            {mepData.length === 0 ? (
              <div className="bg-white border border-black/10 shadow-sm rounded-lg p-8 text-center">
                <p className="text-gray-500">No MEP items for this date</p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                <div className="flex gap-3 mb-4 justify-end">
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="px-5 py-2 text-sm bg-slate-200 text-[#1D1D1F] hover:bg-slate-300 transition-colors rounded-lg font-semibold"
                  >
                    Change Date
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-5 py-2 text-sm bg-white border border-slate-300 text-[#1D1D1F] hover:bg-slate-50 transition-colors rounded-lg font-semibold"
                  >
                    Print
                  </button>
                </div>
                <div className="border border-slate-700 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-sm border-separate" style={{borderSpacing: '0 0'}}>
                  <colgroup>
                    <col style={{width: '8%'}} />
                    <col style={{width: '60%'}} />
                    <col style={{width: '18%'}} />
                    <col style={{width: '14%'}} />
                  </colgroup>
                  <thead className="bg-[#4A7DB5]">
                    <tr>
                      <th className="px-5 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">✓</th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Item</th>
                      <th className="px-5 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Quantity</th>
                      <th className="px-5 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                      {(() => {
                        let itemCounter = 0;
                        return mepData.map((row, idx) => {
                          if (row.isHeader) {
                            // Main section header row (SOUP, HOT DISHES)
                            return (
                              <tr key={idx} className="bg-slate-100">
                                <td colSpan={4} className="px-6 py-3 text-sm font-bold text-slate-700 uppercase tracking-wide border-b border-gray-300">
                                  {row.header}
                                </td>
                              </tr>
                            );
                          } else if (row.isSubheader) {
                            // Subheader row (Carbs, Warm Vegetables, Salad, Add-Ons)
                            return (
                              <tr key={idx} className="bg-white">
                                <td colSpan={4} className="px-7 py-2 text-[11px] font-semibold text-blue-600 uppercase tracking-wide border-b border-gray-300">
                                  {row.subheader}
                                </td>
                              </tr>
                            );
                          } else {
                            // Item row
                            itemCounter++;
                            const isEven = itemCounter % 2 === 0;
                            return (
                              <tr key={idx} className="border-b border-gray-300">
                                <td className={`px-5 py-2.5 text-center border-r border-b border-gray-300 w-12 ${isEven ? 'bg-gray-200' : 'bg-white'}`}>
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 border-2 border-gray-400 rounded cursor-pointer"
                                  />
                                </td>
                                <td className={`px-5 py-2.5 text-sm font-medium text-gray-900 border-r border-b border-gray-300 ${isEven ? 'bg-gray-200' : 'bg-white'}`}>
                                  {row.name}
                                </td>
                                <td className={`px-5 py-2.5 text-sm text-center font-bold text-gray-900 border-r border-b border-gray-300 w-32 ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
                                  {row.quantity}
                                </td>
                                <td className={`px-5 py-2.5 text-sm text-center text-gray-700 border-b border-gray-300 w-24 ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
                                  {row.unit}
                                </td>
                              </tr>
                            );
                          }
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Salad Bar Production Table */}
        {activeTab === 'salad_bar' && (
          <div>
            {saladBarData.length === 0 ? (
              <div className="bg-white border border-black/10 shadow-sm rounded-lg p-8 text-center">
                <p className="text-gray-500">No salad bar orders for this date</p>
              </div>
            ) : (
              <div className="border border-slate-700 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed border-separate" style={{borderSpacing: '0 0'}}>
                    <colgroup>
                      <col style={{width: '12%'}} />
                      <col style={{width: '28%'}} />
                      {locations.map(location => (
                        <col key={location.id} style={{width: `${60 / (locations.length + 1)}%`}} />
                      ))}
                      <col style={{width: `${60 / (locations.length + 1)}%`}} />
                    </colgroup>
                    <thead className="bg-[#4A7DB5]">
                      <tr>
                        <th className="px-3 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Category</th>
                        <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Item</th>
                        {locations.map(location => (
                          <th key={location.id} className="px-3 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                            {getAbbreviatedLocationName(location.name)}
                          </th>
                        ))}
                        <th className="px-3 py-4 text-center text-xs font-bold text-amber-50 uppercase tracking-wider bg-amber-900/30">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {saladBarData.map((row, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr key={idx} className="border-b border-gray-300">
                            {idx === 0 && (
                              <td rowSpan={saladBarData.length} className="px-3 py-2.5 text-sm font-bold text-slate-700 uppercase tracking-wide text-center border-r border-b border-gray-300 bg-slate-100 align-top">
                                Salad Bar
                              </td>
                            )}
                            <td className={`px-5 py-2.5 text-sm font-medium text-gray-900 border-r border-b border-gray-300 ${isEven ? 'bg-gray-200' : 'bg-white'}`}>
                              {row.ingredient}
                            </td>
                            {locations.map(location => {
                              const weightG = row.locationWeights[location.id] || 0;
                              const displayWeight = weightG >= 1000
                                ? `${(weightG / 1000).toFixed(1)}kg`
                                : `${Math.round(weightG)}g`;
                              return (
                                <td key={location.id} className={`px-3 py-2.5 text-sm text-center text-gray-700 font-medium border-r border-b border-gray-300 ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
                                  {weightG > 0 ? displayWeight : '-'}
                                </td>
                              );
                            })}
                            <td className={`px-3 py-2.5 text-sm text-center font-bold text-red-700 border-b border-gray-300 ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
                              {row.totalWeight >= 1000
                                ? `${(row.totalWeight / 1000).toFixed(1)}kg`
                                : `${Math.round(row.totalWeight)}g`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
