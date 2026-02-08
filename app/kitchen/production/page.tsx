'use client';

/**
 * PRODUCTION SHEETS PAGE - DESIGN LOCKED v1.0
 *
 * ⚠️ CRITICAL: This page follows the finalized Production Design System
 * Documentation: /compass-delivery/PRODUCTION_DESIGN_SYSTEM.md
 *
 * DO NOT MODIFY without reviewing the design system document:
 * - Layout structure (conditional MEP wrapper)
 * - Tab styling and colors
 * - Category column borders (NO horizontal borders)
 * - Total column (white background, no alternating)
 * - Column widths (10% category, 30% item)
 * - Spacing and margins (mt-24, mb-4, gap-6)
 * - Action buttons (visible on ALL tabs)
 *
 * Last Finalized: January 28, 2026
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, addDays, startOfWeek, getDay, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth } from 'date-fns';
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
  const [activeTab, setActiveTab] = useState<'main' | 'mep' | 'salad_bar' | 'recipes' | 'catering'>('main');
  const [saladBarData, setSaladBarData] = useState<any[]>([]);
  const [mepData, setMepData] = useState<any[]>([]);
  const [recipesData, setRecipesData] = useState<any[]>([]);
  const [cateringData, setCateringData] = useState<any[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printSections, setPrintSections] = useState({
    main: true,
    mep: true,
    salad: true,
    recipes: true,
  });
  const [headingPosition] = useState({ x: 0, y: 0 });
  const [tabsPosition] = useState({ x: 0, y: 0 });
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
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
          router.push('/home');
          return;
        }

        setProfile(profileData);

        // Get active locations - deduplicate by name and sort in custom order
        const { data: locationsData } = await supabase
          .from('locations')
          .select('*')
          .eq('is_active', true);

        // Deduplicate by name (keep first occurrence)
        const uniqueLocations = locationsData?.reduce((acc: Location[], loc) => {
          if (!acc.find(l => l.name === loc.name)) {
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
      fetchRecipesData(selectedDate);
      fetchCateringData(selectedDate);
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

    if (!weeklyMenu) {
      setProductionRows([]);
      return;
    }

    const dayOfWeek = (date.getDay() + 6) % 7; // Convert to Monday=0
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('dish_id, meal_type')
      .eq('menu_id', weeklyMenu.id)
      .eq('day_of_week', dayOfWeek);


    if (!menuItems || menuItems.length === 0) {
      setProductionRows([]);
      return;
    }

    const dishIds = menuItems.map(item => item.dish_id);

    // Get main dishes with salad/warm veggie total portion sizes
    const { data: dishes } = await supabase
      .from('dishes')
      .select('*, salad_total_portion_g, warm_veggie_total_portion_g')
      .in('id', dishIds);


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


    // Get orders for this date (all order items, we'll match by meal_type)
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('meal_type, portions, orders(location_id)')
      .eq('delivery_date', dateStr);


    // Build production rows with aggregated components
    const rows: ProductionRow[] = [];
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

          if (mainDishTotalField) {
            if (!totalAggregation['salad']) {
              totalAggregation['salad'] = {
                locationOrders: {},
                totalPortions: 0,
                componentType: 'salad',
                mealType,
                mainDishTotalPortionG: mainDishTotalField,
                dishPortionSizes: new Set([mainDishTotalField])
              };
            } else {

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

          if (mainDishTotalField) {
            if (!totalAggregation['warm_veggie']) {
              totalAggregation['warm_veggie'] = {
                locationOrders: {},
                totalPortions: 0,
                componentType: 'warm_veggie',
                mealType,
                mainDishTotalPortionG: mainDishTotalField,
                dishPortionSizes: new Set([mainDishTotalField])
              };
            } else {

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

    // Add Protein row for Snowflake only (at the bottom)
    const snowflakeLocation = locs.find(loc => loc.name === 'Snowflake');
    if (snowflakeLocation && locationPortions[snowflakeLocation.id] > 0) {
      const proteinRow: any = {
        ingredient: 'Protein (Chicken/Salmon/Tofu)',
        locationWeights: {},
        totalWeight: 0
      };

      locs.forEach(loc => {
        if (loc.id === snowflakeLocation.id) {
          const portions = locationPortions[loc.id] || 0;
          const settings = settingsMap.get(loc.id);
          const proteinPortionG = settings?.protein_salad_bar_portion_g || 80;
          const weightG = portions * proteinPortionG;

          proteinRow.locationWeights[loc.id] = weightG;
          proteinRow.totalWeight += weightG;
        } else {
          proteinRow.locationWeights[loc.id] = 0;
        }
      });

      saladBarRows.push(proteinRow);
    }

    setSaladBarData(saladBarRows);
  };

  const fetchRecipesData = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');


    // Get the weekly menu first
    const { data: weeklyMenu, error: weekError } = await supabase
      .from('weekly_menus')
      .select('id')
      .eq('week_start_date', weekStart)
      .single();

    if (weekError || !weeklyMenu) {
      console.error('[RECIPES] Error fetching weekly menu:', weekError);
      setRecipesData([]);
      return;
    }

    // Calculate day of week (Monday = 0)
    const dayOfWeek = (date.getDay() + 6) % 7;

    // Get menu items for this menu and day
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('dish_id, meal_type')
      .eq('menu_id', weeklyMenu.id)
      .eq('day_of_week', dayOfWeek);

    if (menuError) {
      console.error('[RECIPES] Error fetching menu items:', menuError);
      setRecipesData([]);
      return;
    }

    if (!menuItems || menuItems.length === 0) {
      setRecipesData([]);
      return;
    }

    // Get order items for this date (same as production sheet)
    const { data: orderItems, error: ordersError } = await supabase
      .from('order_items')
      .select('meal_type, portions')
      .eq('delivery_date', dateStr);

    if (ordersError) {
      console.error('[RECIPES] Error fetching order items:', ordersError);
    }


    // Calculate total portions per meal_type
    const portionsByMealType: Record<string, number> = {};
    (orderItems || []).forEach(item => {
      if (!portionsByMealType[item.meal_type]) {
        portionsByMealType[item.meal_type] = 0;
      }
      portionsByMealType[item.meal_type] += item.portions || 0;
    });


    // Map dish IDs to their meal types and portions
    const dishPortions: Record<string, { dishId: string; dishName: string; totalPortions: number; category: string }> = {};

    menuItems.forEach(item => {
      const mealType = item.meal_type;
      const totalPortions = portionsByMealType[mealType] || 0;

      if (totalPortions > 0 && !dishPortions[item.dish_id]) {
        dishPortions[item.dish_id] = {
          dishId: item.dish_id,
          dishName: '', // Will be filled from dish details
          totalPortions,
          category: ''
        };
      }
    });


    // Get unique dish IDs
    const dishIds = [...new Set(menuItems.map(item => item.dish_id))];

    // Fetch recipes for these dishes
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('*')
      .in('dish_id', dishIds);

    if (recipesError) {
      console.error('[RECIPES] Error fetching recipes:', recipesError);
      setRecipesData([]);
      return;
    }


    // Get dish details including portion sizes
    const { data: dishesWithPortionSizes } = await supabase
      .from('dishes')
      .select('id, name, category, default_portion_size_ml, default_portion_size_g, portion_size')
      .in('id', dishIds);

    const dishDetailsMap = new Map(
      (dishesWithPortionSizes || []).map(d => [d.id, d])
    );

    // Scale recipes to required quantities based on orders
    const scaledRecipes = (recipes || []).map(recipe => {
      const dishInfo = dishPortions[recipe.dish_id];
      const dishDetails = dishDetailsMap.get(recipe.dish_id);


      let requiredQuantity = recipe.base_quantity; // Default to recipe base quantity
      let requiredUnit = recipe.base_unit || 'kg';
      let totalPortions = 0;
      let dishName = recipe.name;
      let dishCategory = '';

      // If we have order info, calculate required quantity
      if (dishInfo && dishDetails) {
        totalPortions = dishInfo.totalPortions;
        dishName = dishInfo.dishName;
        dishCategory = dishInfo.category;

        // Check if dish uses ml (soups) or grams
        if (dishDetails.default_portion_size_ml) {
          const totalMl = totalPortions * dishDetails.default_portion_size_ml;
          requiredQuantity = totalMl / 1000; // Convert to liters
          requiredUnit = 'liters';
        } else if (dishDetails.default_portion_size_g) {
          const totalG = totalPortions * dishDetails.default_portion_size_g;
          requiredQuantity = totalG / 1000; // Convert to kg
          requiredUnit = 'kg';
        } else if (dishDetails.portion_size) {
          // Legacy field - check if it's a soup (use ml) or other (use grams)
          if (dishDetails.category === 'soup') {
            const totalMl = totalPortions * dishDetails.portion_size;
            requiredQuantity = totalMl / 1000; // Convert to liters
            requiredUnit = 'liters';
          } else {
            const totalG = totalPortions * dishDetails.portion_size;
            requiredQuantity = totalG / 1000; // Convert to kg
            requiredUnit = 'kg';
          }
        }
      } else {
      }


      return {
        ...recipe,
        dishName,
        dishCategory,
        totalPortions,
        requiredQuantity,
        // Override base_quantity and base_unit with calculated values
        base_quantity: requiredQuantity,
        base_unit: requiredUnit
      };
    });

    // Sort recipes by dish category (soups first, then hot dishes)
    const sortedRecipes = scaledRecipes.sort((a, b) => {
      const categoryOrder: Record<string, number> = {
        'soup': 1,
        'hot_dish_meat': 2,
        'hot_dish_fish': 3,
        'hot_dish_veg': 4
      };
      return (categoryOrder[a.dishCategory] || 99) - (categoryOrder[b.dishCategory] || 99);
    });

    setRecipesData(sortedRecipes);
  };

  const fetchCateringData = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');

    const { data: orders, error } = await supabase
      .from('catering_orders')
      .select(`
        *,
        locations(name, slug),
        catering_order_items(
          *,
          components(name)
        )
      `)
      .eq('delivery_date', dateStr)
      .eq('status', 'ready_for_production')
      .order('locations(name)');

    if (error) {
      console.error('[CATERING] Error fetching catering orders:', error);
      setCateringData([]);
      return;
    }

    setCateringData(orders || []);
  };

  const generateMEPData = () => {

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

      // Skip items with no portions
      if (row.totalPortions === 0) {
        return;
      }

      const totalWeight = calculateRowWeight(row.totalPortions, row);
      const quantity = totalWeight.replace(/[a-z]+$/i, '').trim();
      const unit = totalWeight.match(/[a-z]+$/i)?.[0] || '-';

      // Skip if quantity is 0 or invalid
      if (quantity === '0' || quantity === '-' || !quantity) {
        return;
      }

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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0078D4]"></div>
      </div>
    );
  }


  // Show date selector if no date is selected
  if (!selectedDate) {
    const today = new Date();
    const nextWeek = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      return date;
    });

    return (
      <div className="min-h-screen bg-white">
        <UniversalHeader
          title="Production Sheets"
          backPath="/kitchen/dashboard"
          locationLogo=""
          locationName="Kitchen"
          navItems={[
            { label: 'Week Overview', href: '/kitchen/week-overview', active: false },
            {
              label: 'Dishes',
              href: '/kitchen/dishes',
              active: false,
              subItems: [
                { label: 'Dish Library', href: '/kitchen/dishes', active: false },
                { label: 'Dish Cards', href: '/kitchen/dish-cards', active: false },
                { label: 'Allergens', href: '/kitchen/allergens', active: false },
              ]
            },
            { label: 'Menu Planner', href: '/kitchen/menus', active: false },
            { label: 'Recipes', href: '/kitchen/recipes', active: false },
            { label: 'Production', href: '/kitchen/production', active: true },
          ]}
        />

        <main className="max-w-4xl mx-auto px-6 lg:px-8 py-10">
          <div className="text-center mb-8">
            <h2 className="text-[28px] font-semibold text-[#1D1D1F] mb-3">Choose Date</h2>
            <p className="text-[15px] text-[#86868B]">Select a production date to view data</p>
          </div>

          <div className="bg-white border border-[#E8E8ED] shadow-sm rounded-xl p-8">
            <div className="grid grid-cols-7 gap-4">
              {nextWeek.map((date, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className="flex flex-col items-center p-4 border-2 border-[#D2D2D7] hover:border-[#0078D4] hover:bg-[#F5F5F7] rounded-sm transition-all"
                >
                  <div className="text-xs font-semibold text-[#86868B] uppercase mb-2">
                    {format(date, 'EEE')}
                  </div>
                  <div className="text-3xl font-bold text-[#1D1D1F]">
                    {format(date, 'd')}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-[#E8E8ED]">
              <button
                onClick={() => setShowCalendar(true)}
                className="w-full px-6 py-3 text-[15px] font-medium bg-[#0078D4] text-white hover:bg-[#0066B8] rounded-sm transition-colors"
              >
                Enter Custom Date
              </button>
            </div>
          </div>

          {/* Calendar Picker Modal */}
          {showCalendar && (() => {
            const monthStart = startOfMonth(calendarMonth);
            const monthEnd = endOfMonth(calendarMonth);
            const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
            const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
            const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
                onClick={() => setShowCalendar(false)}
              >
                <div
                  className="bg-white rounded-xl shadow-2xl border border-[#E8E8ED] p-6 max-w-md w-full mx-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header with navigation */}
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                      className="p-2 text-[#0078D4] hover:bg-[#F5F5F7] rounded-sm transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <h3 className="text-[22px] font-semibold text-[#1D1D1F]">
                      {format(calendarMonth, 'MMMM yyyy')}
                    </h3>

                    <button
                      onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                      className="p-2 text-[#0078D4] hover:bg-[#F5F5F7] rounded-sm transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => setShowCalendar(false)}
                    className="absolute top-4 right-4 text-[#86868B] hover:text-[#1D1D1F] text-[28px] leading-none"
                  >
                    ×
                  </button>

                  <div className="grid grid-cols-7 gap-2">
                    {/* Day headers */}
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} className="text-center text-[13px] font-semibold text-[#86868B] py-2">
                        {day}
                      </div>
                    ))}

                    {/* Calendar days */}
                    {calendarDays.map((date, i) => {
                      const isCurrentMonth = isSameMonth(date, calendarMonth);
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedDate(date);
                            setShowCalendar(false);
                          }}
                          className={`aspect-square flex items-center justify-center p-2 border rounded-sm transition-all ${
                            isCurrentMonth
                              ? 'border-[#D2D2D7] hover:border-[#0078D4] hover:bg-[#F5F5F7] text-[#1D1D1F]'
                              : 'border-transparent text-[#D2D2D7]'
                          }`}
                        >
                          <span className="text-[17px] font-semibold">
                            {format(date, 'd')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        @media print {
          /* Force everything to start on first page */
          * {
            box-sizing: border-box;
          }

          /* Hide sections that shouldn't be printed */
          .print-hide {
            display: none !important;
          }

          /* Hide navigation and UI elements */
          nav,
          button,
          .no-print,
          header,
          [class*="QuickNav"],
          [class*="UniversalHeader"] {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            position: absolute !important;
            visibility: hidden !important;
          }

          /* Reset page margins and background */
          html {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            height: auto !important;
          }

          /* Remove wrapper min-height and force position */
          .min-h-screen {
            min-height: 0 !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }

          /* Reset root container */
          #__next {
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Force page to start immediately */
          @page {
            margin: 8mm;
          }

          /* Page setup for Main Production (Landscape) */
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          .print-main {
            page: main-production;
          }

          @page main-production {
            size: A4 landscape;
            margin: 8mm;
          }

          /* Page setup for Main MEP (Portrait) */
          .print-mep {
            page: mep;
          }

          @page mep {
            size: A4 portrait;
            margin: 10mm;
          }

          /* Page setup for Salad Bar (Landscape) */
          .print-salad_bar {
            page: salad-bar;
          }

          @page salad-bar {
            size: A4 landscape;
            margin: 8mm;
          }

          /* Page setup for Recipes (Portrait) */
          .print-recipes {
            page: recipes;
          }

          @page recipes {
            size: A4 portrait;
            margin: 10mm;
          }

          /* Prevent page breaks */
          main {
            page-break-before: avoid !important;
            page-break-after: avoid !important;
          }

          table, tr, td, th {
            page-break-inside: avoid !important;
          }

          /* Remove any page breaks before content */
          main::before {
            page-break-before: avoid !important;
          }

          /* Main container adjustments - force to top of page */
          main {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            padding-top: 0 !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
          }

          /* Remove conditional wrapper for print */
          main > div {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Remove all spacing divs */
          main > div > div {
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide date heading */
          h2 {
            display: none !important;
          }

          /* Hide the entire tabs and actions row */
          .flex.items-center.justify-between {
            display: none !important;
          }

          /* Show only active tab title as heading */
          .print-main::before {
            content: 'Main Production';
            display: block;
            font-size: 18px;
            font-weight: 600;
            color: #1D1D1F;
            margin-bottom: 12px;
            text-align: center;
          }

          .print-mep::before {
            content: 'Main MEP';
            display: block;
            font-size: 18px;
            font-weight: 600;
            color: #1D1D1F;
            margin-bottom: 12px;
            text-align: center;
          }

          .print-salad_bar::before {
            content: 'Salad Bar';
            display: block;
            font-size: 18px;
            font-weight: 600;
            color: #1D1D1F;
            margin-bottom: 12px;
            text-align: center;
          }

          .print-recipes::before {
            content: 'Recipes';
            display: block;
            font-size: 18px;
            font-weight: 600;
            color: #1D1D1F;
            margin-bottom: 12px;
            text-align: center;
          }

          /* Main Production Table - Landscape optimized */
          .print-main table {
            width: 100%;
            font-size: 11px !important;
          }

          .print-main thead th {
            padding: 7px 4px !important;
            font-size: 10px !important;
          }

          .print-main tbody td {
            padding: 7px 4px !important;
            font-size: 11px !important;
          }

          /* Add top border to first row */
          .print-main tbody tr:first-child td {
            border-top: 1px solid #6B7280 !important;
          }

          /* Ensure bottom border matches outer border */
          .print-main tbody tr:last-child td {
            border-bottom: 1px solid #6B7280 !important;
          }

          /* Category column - left border and font */
          .print-main tbody td:first-child {
            font-size: 10px !important;
            border-left: 1px solid #6B7280 !important;
          }

          /* Item column */
          .print-main tbody td:nth-child(2) {
            font-size: 11px !important;
            padding-left: 5px !important;
          }

          /* Total column */
          .print-main tbody td:last-child {
            font-size: 11px !important;
            font-weight: 600 !important;
          }

          /* Main MEP Table - Portrait optimized */
          .print-mep table {
            width: 100%;
            font-size: 12px !important;
            max-width: 100% !important;
            margin: 0 auto !important;
          }

          .print-mep thead th {
            padding: 8px 5px !important;
            font-size: 11px !important;
          }

          .print-mep tbody td {
            padding: 8px 5px !important;
            font-size: 12px !important;
          }

          /* Add top border to first row */
          .print-mep tbody tr:first-child td {
            border-top: 1px solid #6B7280 !important;
          }

          /* Ensure bottom border matches outer border */
          .print-mep tbody tr:last-child td {
            border-bottom: 1px solid #6B7280 !important;
          }

          /* Item column - left border and font */
          .print-mep tbody td:first-child {
            font-size: 12px !important;
            border-left: 1px solid #6B7280 !important;
          }

          /* Quantity column */
          .print-mep tbody td:nth-child(2) {
            font-size: 12px !important;
          }

          /* Total column */
          .print-mep tbody td:last-child {
            font-size: 12px !important;
            font-weight: 600 !important;
          }

          /* Salad Bar Table - Landscape optimized */
          .print-salad_bar table {
            width: 100%;
            font-size: 11px !important;
          }

          .print-salad_bar thead th {
            padding: 7px 4px !important;
            font-size: 10px !important;
          }

          .print-salad_bar tbody td {
            padding: 7px 4px !important;
            font-size: 11px !important;
          }

          /* Add top border to first row */
          .print-salad_bar tbody tr:first-child td {
            border-top: 1px solid #6B7280 !important;
          }

          /* Ensure bottom border matches outer border */
          .print-salad_bar tbody tr:last-child td {
            border-bottom: 1px solid #6B7280 !important;
          }

          /* Checkbox column - left border */
          .print-salad_bar tbody td:first-child {
            padding: 6px !important;
            border-left: 1px solid #6B7280 !important;
          }

          /* Checkbox styling */
          .print-salad_bar input[type="checkbox"] {
            width: 16px !important;
            height: 16px !important;
            margin: 0 !important;
          }

          /* Item column */
          .print-salad_bar tbody td:nth-child(2) {
            font-size: 11px !important;
            padding-left: 5px !important;
          }

          /* Total column */
          .print-salad_bar tbody td:last-child {
            font-size: 11px !important;
            font-weight: 600 !important;
          }

          /* Total row */
          .print-salad_bar tr.bg-slate-100 td {
            font-size: 11px !important;
            font-weight: 700 !important;
            padding: 8px 5px !important;
          }

          /* Recipes section styling */
          .print-recipes {
            page-break-after: always;
          }

          .print-recipes > div {
            padding: 0 !important;
            margin: 0 !important;
          }

          .print-recipes .space-y-6 {
            gap: 20px !important;
          }

          .print-recipes .space-y-6 > div {
            page-break-inside: avoid;
            margin-bottom: 20px !important;
          }

          .print-recipes h3 {
            font-size: 16px !important;
            font-weight: 600 !important;
          }

          .print-recipes h4 {
            font-size: 12px !important;
            font-weight: 600 !important;
          }

          .print-recipes p,
          .print-recipes div {
            font-size: 11px !important;
          }

          /* Ensure single page */
          @page {
            orphans: 4;
            widows: 4;
          }

          /* Scale down if needed to fit */
          .overflow-x-auto {
            overflow: visible !important;
          }

          table {
            page-break-inside: avoid !important;
            border-collapse: collapse !important;
            border: 1px solid #6B7280 !important;
          }

          /* Remove borders on table container divs but keep table borders */
          .border-\[\#D2D2D7\], .rounded-sm, .shadow-sm {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .overflow-x-auto {
            border: none !important;
          }

          /* Optimize spacing - remove ALL margins */
          .mb-4, .mb-6, .mt-24, .mt-8, .mt-6 {
            margin: 0 !important;
          }

          /* Hide any extra spacing elements */
          .py-8 {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }

          /* Start content at top of page */
          .print-main::before,
          .print-mep::before,
          .print-salad_bar::before {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
        }
      `}</style>
      <AdminQuickNav />

      <UniversalHeader
        title="Production Sheets"
        backPath="/kitchen/dashboard"
        locationLogo=""
        locationName="Kitchen"
        navItems={[
          { label: 'Week Overview', href: '/kitchen/week-overview', active: false },
          {
            label: 'Dishes',
            href: '/kitchen/dishes',
            active: false,
            subItems: [
              { label: 'All Dishes', href: '/kitchen/dishes', active: false },
              { label: 'Dish Cards', href: '/kitchen/dish-cards', active: false },
              { label: 'Allergens', href: '/kitchen/allergens', active: false },
            ]
          },
          { label: 'Menu Planner', href: '/kitchen/menus', active: false },
          { label: 'Recipes', href: '/kitchen/recipes', active: false },
          { label: 'Production', href: '/kitchen/production', active: true },
        ]}
      />

      <main className={`max-w-7xl mx-auto px-8 lg:px-12 py-8 print-${activeTab}`}>
        <div className={activeTab === 'mep' ? 'max-w-3xl mx-auto' : ''}>
          {/* Date Heading */}
          <div
            className="mt-24 mb-6"
            style={{
              transform: `translate(${headingPosition.x}px, ${headingPosition.y}px)`,
              width: 'fit-content'
            }}
          >
            <h2 className="text-[22px] font-semibold text-[#1D1D1F]">
              Production for {format(selectedDate!, 'EEEE, MMMM d, yyyy')}
            </h2>
          </div>

          {/* Tabs and Actions */}
          <div className="flex items-center justify-between mb-4">
            <div
              className="flex gap-6"
              style={{
                transform: `translate(${tabsPosition.x}px, ${tabsPosition.y}px)`
              }}
            >
              <button
                onClick={() => setActiveTab('main')}
                className={`text-sm font-semibold transition-all ${
                  activeTab === 'main'
                    ? 'text-[#0078D4]'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                Main Production
              </button>
              <button
                onClick={() => setActiveTab('mep')}
                className={`text-sm font-semibold transition-all ${
                  activeTab === 'mep'
                    ? 'text-[#0078D4]'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                Main MEP
              </button>
              <button
                onClick={() => setActiveTab('salad_bar')}
                className={`text-sm font-semibold transition-all ${
                  activeTab === 'salad_bar'
                    ? 'text-[#0078D4]'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                Salad Bar
              </button>
              <button
                onClick={() => setActiveTab('recipes')}
                className={`text-sm font-semibold transition-all ${
                  activeTab === 'recipes'
                    ? 'text-[#0078D4]'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                Recipes
              </button>
              <button
                onClick={() => setActiveTab('catering')}
                className={`text-sm font-semibold transition-all ${
                  activeTab === 'catering'
                    ? 'text-[#0078D4]'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                Catering
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedDate(null)}
                className="px-5 py-2 text-sm bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E8E8ED] border border-[#D2D2D7] transition-colors rounded-sm font-semibold"
              >
                Change Date
              </button>
              <button
                onClick={() => setShowPrintModal(true)}
                className="px-5 py-2 text-sm bg-white border border-[#D2D2D7] text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors rounded-sm font-semibold"
              >
                Print
              </button>
            </div>
          </div>
        </div>

        {/* Main Production Table */}
        <div
          data-print-section="main"
          className={`print-main ${activeTab !== 'main' ? 'hidden print:block' : ''} ${!printSections.main ? 'print-hide' : ''}`}
        >
            {productionRows.length === 0 ? (
              <div className="bg-white border border-black/10 shadow-sm rounded-sm p-8 text-center">
                <p className="text-[#86868B]">No production scheduled for this date</p>
              </div>
            ) : (
              <div className="border border-[#D2D2D7] rounded-sm overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed border-separate" style={{borderSpacing: '0 0'}}>
                    <colgroup>
                      <col style={{width: '10%'}} />
                      <col style={{width: '22%'}} />
                      {locations.map(location => (
                        <col key={location.id} style={{width: `${68 / (locations.length + 1)}%`}} />
                      ))}
                      <col style={{width: `${68 / (locations.length + 1)}%`}} />
                    </colgroup>
                    <thead className="bg-[#0078D4]">
                      <tr>
                        <th className="px-3 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Category</th>
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
                      // Filter out rows with 0 portions
                      const soupRows = productionRows.filter(row => row.mealType === 'soup' && !row.isComponent && row.totalPortions > 0);
                      const soupComponents = productionRows.filter(row => row.mealType === 'soup' && row.isComponent && row.totalPortions > 0);

                      const hotMeatRows = productionRows.filter(row => row.mealType === 'hot_meat' && !row.isComponent && row.totalPortions > 0);
                      const hotMeatComponents = productionRows.filter(row => row.mealType === 'hot_meat' && row.isComponent && row.totalPortions > 0);

                      const hotVegRows = productionRows.filter(row => row.mealType === 'hot_veg' && !row.isComponent && row.totalPortions > 0);
                      const hotVegComponents = productionRows.filter(row => row.mealType === 'hot_veg' && row.isComponent && row.totalPortions > 0);

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

                        const categoryBorder = addThickBorder ? 'border-b-[2px] border-b-gray-400' : 'border-b border-gray-300';

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
                                    <td rowSpan={filtered.length} className={`px-3 py-2.5 text-[11px] font-semibold text-blue-600 uppercase tracking-wide text-left border-r border-gray-300 ${categoryBorder} bg-white align-top`}>
                                      {label}
                                    </td>
                                  )}
                                  <td className={`px-8 py-2.5 text-sm border-r border-gray-300 ${borderClass} font-medium text-gray-900 ${isEven ? 'bg-gray-200' : 'bg-white'}`}>
                                    {row.dish.name}
                                  </td>
                                  {locations.map(location => {
                                    return (
                                      <td key={location.id} className={`px-3 py-2.5 text-sm text-center border-r border-gray-300 ${borderClass} text-gray-700 font-medium ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
                                        {calculateCellWeight(location.id)}
                                      </td>
                                    );
                                  })}
                                  <td className={`px-3 py-2.5 text-sm text-center font-bold ${borderClass} text-red-700 bg-white`}>
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
                                      <td rowSpan={soupRows.length} className={`px-3 py-2.5 text-sm font-bold text-slate-700 uppercase tracking-wide text-left border-r border-gray-300 bg-slate-100 align-top`}>
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
                                    <td className={`px-3 py-2.5 text-sm text-center font-bold text-red-700 ${borderClass} bg-white`}>
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
                                      <td rowSpan={totalHotDishRows} className="px-3 py-2.5 text-sm font-bold text-slate-700 uppercase tracking-wide text-left border-r border-gray-300 bg-slate-100 align-top">
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
                                    <td className={`px-3 py-2.5 text-sm text-center font-bold text-red-700 border-b border-gray-300 bg-white`}>
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
                                    <td className={`px-3 py-2.5 text-sm text-center font-bold text-red-700 border-b border-gray-300 bg-white`}>
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

        {/* Main MEP Table */}
        <div
          data-print-section="mep"
          className={`print-mep ${activeTab !== 'mep' ? 'hidden print:block' : ''} ${!printSections.mep ? 'print-hide' : ''}`}
        >
            {mepData.length === 0 ? (
              <div className="bg-white border border-black/10 shadow-sm rounded-sm p-8 text-center">
                <p className="text-[#86868B]">No MEP items for this date</p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                <div className="border border-[#D2D2D7] rounded-sm overflow-hidden shadow-sm">
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
                              <tr key={idx} className="bg-[#F5F5F7]">
                                <td colSpan={4} className="px-6 py-3 text-sm font-bold text-[#1D1D1F] uppercase tracking-wide border-b border-[#D2D2D7]">
                                  {row.header}
                                </td>
                              </tr>
                            );
                          } else if (row.isSubheader) {
                            // Subheader row (Carbs, Warm Vegetables, Salad, Add-Ons)
                            return (
                              <tr key={idx} className="bg-white">
                                <td colSpan={4} className="px-7 py-2 text-[11px] font-semibold text-[#0078D4] uppercase tracking-wide border-b border-[#D2D2D7]">
                                  {row.subheader}
                                </td>
                              </tr>
                            );
                          } else {
                            // Item row
                            itemCounter++;
                            const isEven = itemCounter % 2 === 0;
                            return (
                              <tr key={idx} className="border-b border-[#D2D2D7]">
                                <td className={`px-5 py-2.5 text-center border-r border-b border-[#D2D2D7] w-12 ${isEven ? 'bg-[#F5F5F7]' : 'bg-white'}`}>
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 border-2 border-[#D2D2D7] rounded cursor-pointer"
                                  />
                                </td>
                                <td className={`px-5 py-2.5 text-sm font-medium text-[#1D1D1F] border-r border-b border-[#D2D2D7] ${isEven ? 'bg-[#F5F5F7]' : 'bg-white'}`}>
                                  {row.name}
                                </td>
                                <td className={`px-5 py-2.5 text-sm text-center font-bold text-[#1D1D1F] border-r border-b border-[#D2D2D7] w-32 ${isEven ? 'bg-[#F5F5F7]' : 'bg-white'}`}>
                                  {row.quantity}
                                </td>
                                <td className={`px-5 py-2.5 text-sm text-center text-[#6E6E73] border-b border-[#D2D2D7] w-24 ${isEven ? 'bg-[#F5F5F7]' : 'bg-white'}`}>
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

        {/* Salad Bar Production Table */}
        <div
          data-print-section="salad"
          className={`print-salad_bar ${activeTab !== 'salad_bar' ? 'hidden print:block' : ''} ${!printSections.salad ? 'print-hide' : ''}`}
        >
            {saladBarData.length === 0 ? (
              <div className="bg-white border border-black/10 shadow-sm rounded-sm p-8 text-center">
                <p className="text-[#86868B]">No salad bar orders for this date</p>
              </div>
            ) : (
              <div className="border border-[#D2D2D7] rounded-sm overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-fixed border-separate" style={{borderSpacing: '0 0'}}>
                    <colgroup>
                      <col style={{width: '10%'}} />
                      <col style={{width: '30%'}} />
                      {locations.map(location => (
                        <col key={location.id} style={{width: `${60 / (locations.length + 1)}%`}} />
                      ))}
                      <col style={{width: `${60 / (locations.length + 1)}%`}} />
                    </colgroup>
                    <thead className="bg-[#0078D4]">
                      <tr>
                        <th className="px-3 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Salad Bar</th>
                        <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Item</th>
                        {locations.map(location => (
                          <th key={location.id} className="px-3 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                            {getAbbreviatedLocationName(location.name)}
                          </th>
                        ))}
                        <th className="px-3 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {saladBarData.map((row, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr key={idx} className="border-b border-[#D2D2D7]">
                            <td className={`px-3 py-2.5 text-center border-r border-b border-[#D2D2D7] ${isEven ? 'bg-[#F5F5F7]' : 'bg-white'}`}>
                              <input
                                type="checkbox"
                                className="w-5 h-5 border-2 border-[#D2D2D7] rounded cursor-pointer"
                              />
                            </td>
                            <td className={`px-5 py-2.5 text-sm font-medium text-[#1D1D1F] border-r border-b border-[#D2D2D7] ${isEven ? 'bg-[#F5F5F7]' : 'bg-white'}`}>
                              {row.ingredient}
                            </td>
                            {locations.map(location => {
                              const weightG = row.locationWeights[location.id] || 0;
                              const displayWeight = weightG >= 1000
                                ? `${(weightG / 1000).toFixed(1)}kg`
                                : `${Math.round(weightG)}g`;
                              return (
                                <td key={location.id} className={`px-3 py-2.5 text-sm text-center text-[#6E6E73] font-medium border-r border-b border-[#D2D2D7] ${isEven ? 'bg-[#F5F5F7]' : 'bg-white'}`}>
                                  {weightG > 0 ? displayWeight : '-'}
                                </td>
                              );
                            })}
                            <td className={`px-3 py-2.5 text-sm text-center font-bold text-red-700 border-b border-[#D2D2D7] bg-white`}>
                              {row.totalWeight >= 1000
                                ? `${(row.totalWeight / 1000).toFixed(1)}kg`
                                : `${Math.round(row.totalWeight)}g`}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Total Row */}
                      <tr className="border-b-[2px] border-b-[#D2D2D7] bg-[#F5F5F7]">
                        <td className="px-3 py-3 text-center border-r border-[#D2D2D7]"></td>
                        <td className="px-5 py-3 text-sm font-bold text-[#1D1D1F] uppercase tracking-wide border-r border-[#D2D2D7]">
                          Total
                        </td>
                        {locations.map(location => {
                          const locationTotal = saladBarData.reduce((sum, row) => sum + (row.locationWeights[location.id] || 0), 0);
                          const displayWeight = locationTotal >= 1000
                            ? `${(locationTotal / 1000).toFixed(1)}kg`
                            : `${Math.round(locationTotal)}g`;
                          return (
                            <td key={location.id} className="px-3 py-3 text-sm text-center font-bold text-[#1D1D1F] border-r border-[#D2D2D7]">
                              {displayWeight}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-sm text-center font-bold text-red-700 bg-white">
                          {(() => {
                            const grandTotal = saladBarData.reduce((sum, row) => sum + row.totalWeight, 0);
                            return grandTotal >= 1000
                              ? `${(grandTotal / 1000).toFixed(1)}kg`
                              : `${Math.round(grandTotal)}g`;
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>

        {/* Recipes Tab */}
        <div
          data-print-section="recipes"
          className={`print-recipes ${activeTab !== 'recipes' ? 'hidden print:block' : ''} ${!printSections.recipes ? 'print-hide' : ''}`}
        >
            {recipesData.length === 0 ? (
              <div className="bg-white border border-black/10 shadow-sm rounded-sm p-8 text-center">
                <p className="text-[#86868B]">No recipes available for this date</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recipesData.map((recipe, idx) => {
                  // Helper function to convert units
                  const convertToBaseUnit = (value: number, unit: string, baseUnit: string): number => {
                    const unitLower = (unit || 'kg').toLowerCase().trim();
                    if (baseUnit === 'kg') {
                      if (unitLower.includes('gram') || unitLower === 'g') return value / 1000;
                      if (unitLower === 'kg') return value;
                      if (unitLower === 'liters' || unitLower === 'l') return value;
                      if (unitLower === 'ml') return value / 1000;
                    }
                    return value;
                  };

                  // Calculate gross weight
                  const grossWeight = (recipe.rows || []).reduce((sum: number, row: any) => {
                    if (row.type === 'ingredient') {
                      const multiplier = row.multiplier || 0;
                      const valueInIngredientUnit = multiplier * recipe.base_quantity;
                      const valueInBaseUnit = convertToBaseUnit(valueInIngredientUnit, row.unit || 'kg', recipe.base_unit);
                      return sum + valueInBaseUnit;
                    }
                    return sum;
                  }, 0);

                  const lossPercentage = recipe.cooking_loss_percentage || 0;
                  const lossWeight = grossWeight * (lossPercentage / 100);
                  const netWeight = grossWeight - lossWeight;

                  // Group ingredients by category
                  const vegIngredients: any[] = [];
                  const meatFishIngredients: any[] = [];
                  const dairyIngredients: any[] = [];
                  const dryStoreIngredients: any[] = [];

                  (recipe.rows || []).forEach((row: any) => {
                    if (row.type !== 'ingredient') return;

                    const multiplier = row.multiplier || 0;
                    let hardValue = multiplier * recipe.base_quantity;
                    let displayUnit = row.unit || 'kg';

                    // Convert units
                    const baseUnitLower = (recipe.base_unit || 'kg').toLowerCase();
                    const ingredientUnitLower = (row.unit || 'kg').toLowerCase();

                    if (baseUnitLower === 'kg' && ingredientUnitLower === 'gram') {
                      hardValue = hardValue * 1000;
                    } else if (baseUnitLower === 'liters' && ingredientUnitLower === 'ml') {
                      hardValue = hardValue * 1000;
                    }

                    // Smart unit conversion
                    if (displayUnit === 'gram' && hardValue >= 1000) {
                      hardValue = hardValue / 1000;
                      displayUnit = 'kg';
                    } else if (displayUnit === 'ml' && hardValue >= 1000) {
                      hardValue = hardValue / 1000;
                      displayUnit = 'ltrs';
                    }

                    const ingredient = { ...row, hardValue, displayUnit };

                    if (row.category === 'vegetable') {
                      vegIngredients.push(ingredient);
                    } else if (row.category === 'meat' || row.category === 'fish') {
                      meatFishIngredients.push(ingredient);
                    } else if (row.category === 'dairy') {
                      dairyIngredients.push(ingredient);
                    } else if (row.category === 'dry_store') {
                      dryStoreIngredients.push(ingredient);
                    } else {
                      vegIngredients.push(ingredient);
                    }
                  });

                  return (
                    <div key={idx} className="bg-white border border-[#10B981] rounded overflow-hidden shadow-sm">
                      {/* Recipe Header */}
                      <div className="bg-[#10B981] px-4 py-2">
                        <h3 className="text-base font-bold text-white">
                          {recipe.dishName || recipe.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-white/90">
                          <span>Required: {recipe.base_quantity.toFixed(2)} {recipe.base_unit}</span>
                          <span>•</span>
                          <span>Portions: {recipe.totalPortions}</span>
                          <span>•</span>
                          <span>Loss: {lossPercentage}%</span>
                        </div>
                      </div>

                      {/* Two-column layout */}
                      <div className="flex gap-0">
                        {/* LEFT: Recipe Table (75%) */}
                        <div className="flex-[3] p-3">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-[#F5F5F7] text-left">
                                <th className="px-2 py-1 text-xs font-semibold text-gray-600 uppercase border border-gray-300">
                                  Ingredient / Action
                                </th>
                                <th className="px-2 py-1 text-xs font-semibold text-gray-600 uppercase text-right border border-gray-300 w-24">
                                  Quantity
                                </th>
                                <th className="px-2 py-1 text-xs font-semibold text-gray-600 uppercase border border-gray-300 w-16">
                                  Unit
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Required Row */}
                              <tr className="bg-blue-50">
                                <td className="px-2 py-1 border border-gray-300 font-bold text-blue-600 text-sm">Required</td>
                                <td className="px-2 py-1 border border-gray-300 text-right font-bold text-blue-600 text-sm">{recipe.base_quantity.toFixed(2)}</td>
                                <td className="px-2 py-1 border border-gray-300 text-blue-600 text-sm">{recipe.base_unit}</td>
                              </tr>

                              {/* Rows */}
                              {(recipe.rows || []).map((row: any, rowIdx: number) => {
                                if (row.type === 'action') {
                                  return (
                                    <tr key={rowIdx} className="bg-gray-100">
                                      <td colSpan={3} className="px-2 py-1 border border-gray-300 font-bold text-xs">
                                        {row.text}
                                      </td>
                                    </tr>
                                  );
                                }

                                const multiplier = row.multiplier || 0;
                                let hardValue = multiplier * recipe.base_quantity;
                                let displayUnit = row.unit || 'kg';

                                const baseUnitLower = (recipe.base_unit || 'kg').toLowerCase();
                                const ingredientUnitLower = (row.unit || 'kg').toLowerCase();

                                if (baseUnitLower === 'kg' && ingredientUnitLower === 'gram') {
                                  hardValue = hardValue * 1000;
                                } else if (baseUnitLower === 'liters' && ingredientUnitLower === 'ml') {
                                  hardValue = hardValue * 1000;
                                }

                                return (
                                  <tr key={rowIdx} className="hover:bg-gray-50">
                                    <td className="px-2 py-1 border border-gray-300 text-xs">{row.text}</td>
                                    <td className="px-2 py-1 border border-gray-300 text-right font-mono text-xs">
                                      {hardValue > 0 ? hardValue.toFixed(2) : '0.00'}
                                    </td>
                                    <td className="px-2 py-1 border border-gray-300 text-xs text-gray-600">{displayUnit}</td>
                                  </tr>
                                );
                              })}

                              {/* Summary rows */}
                              <tr className="bg-gray-100">
                                <td className="px-2 py-1 border border-gray-300 font-semibold text-sm">Gross Weight</td>
                                <td className="px-2 py-1 border border-gray-300 text-right font-semibold font-mono text-sm">{grossWeight.toFixed(2)}</td>
                                <td className="px-2 py-1 border border-gray-300 text-gray-600 text-sm">{recipe.base_unit}</td>
                              </tr>
                              <tr className="bg-red-50">
                                <td className="px-2 py-1 border border-gray-300 font-semibold text-red-600 text-sm">Loss ({lossPercentage}%)</td>
                                <td className="px-2 py-1 border border-gray-300 text-right font-semibold font-mono text-red-600 text-sm">-{lossWeight.toFixed(2)}</td>
                                <td className="px-2 py-1 border border-gray-300 text-gray-600 text-sm">{recipe.base_unit}</td>
                              </tr>
                              <tr className="bg-green-50">
                                <td className="px-2 py-1 border border-gray-300 font-bold text-green-600 text-sm">Net Weight</td>
                                <td className="px-2 py-1 border border-gray-300 text-right font-bold font-mono text-green-600 text-sm">{netWeight.toFixed(2)}</td>
                                <td className="px-2 py-1 border border-gray-300 text-gray-600 text-sm">{recipe.base_unit}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* RIGHT: Ingredients Sidebar (25%) */}
                        <div className="flex-1 bg-gray-50 border-l-2 border-gray-300 p-2">
                          <h4 className="text-xs font-bold text-gray-700 mb-2">Ingredients</h4>
                          <div className="space-y-2">
                            {/* Veg */}
                            <div className="mb-1.5">
                              <div className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Veg</div>
                              {vegIngredients.length > 0 ? (
                                vegIngredients.map((ing, i) => (
                                  <div key={i} className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-gray-700 truncate flex-1">{ing.text}</span>
                                    <span className="text-gray-600 ml-1 font-mono whitespace-nowrap">
                                      {ing.hardValue > 0 ? ing.hardValue.toFixed(ing.displayUnit === 'kg' || ing.displayUnit === 'ltrs' ? 2 : 0) : '0'} {ing.displayUnit}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-[10px] text-gray-400 italic">None</div>
                              )}
                            </div>

                            {/* Meat/Fish */}
                            <div className="mb-1.5">
                              <div className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Meat/Fish</div>
                              {meatFishIngredients.length > 0 ? (
                                meatFishIngredients.map((ing, i) => (
                                  <div key={i} className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-gray-700 truncate flex-1">{ing.text}</span>
                                    <span className="text-gray-600 ml-1 font-mono whitespace-nowrap">
                                      {ing.hardValue > 0 ? ing.hardValue.toFixed(ing.displayUnit === 'kg' || ing.displayUnit === 'ltrs' ? 2 : 0) : '0'} {ing.displayUnit}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-[10px] text-gray-400 italic">None</div>
                              )}
                            </div>

                            {/* Dairy */}
                            <div className="mb-1.5">
                              <div className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Dairy</div>
                              {dairyIngredients.length > 0 ? (
                                dairyIngredients.map((ing, i) => (
                                  <div key={i} className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-gray-700 truncate flex-1">{ing.text}</span>
                                    <span className="text-gray-600 ml-1 font-mono whitespace-nowrap">
                                      {ing.hardValue > 0 ? ing.hardValue.toFixed(ing.displayUnit === 'kg' || ing.displayUnit === 'ltrs' ? 2 : 0) : '0'} {ing.displayUnit}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-[10px] text-gray-400 italic">None</div>
                              )}
                            </div>

                            {/* Dry Store */}
                            <div className="mb-1.5">
                              <div className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">Dry Store</div>
                              {dryStoreIngredients.length > 0 ? (
                                dryStoreIngredients.map((ing, i) => (
                                  <div key={i} className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-gray-700 truncate flex-1">{ing.text}</span>
                                    <span className="text-gray-600 ml-1 font-mono whitespace-nowrap">
                                      {ing.hardValue > 0 ? ing.hardValue.toFixed(ing.displayUnit === 'kg' || ing.displayUnit === 'ltrs' ? 2 : 0) : '0'} {ing.displayUnit}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-[10px] text-gray-400 italic">None</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>

        {/* Catering Orders Tab */}
        <div
          data-print-section="catering"
          className={`print-catering ${activeTab !== 'catering' ? 'hidden' : ''}`}
        >
            {cateringData.length === 0 ? (
              <div className="bg-white border border-black/10 shadow-sm rounded-sm p-8 text-center">
                <p className="text-[#86868B]">No catering orders ready for production on this date</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Big Red Warning */}
                <div className="bg-[#FF3B30] border-2 border-[#FF453A] rounded-xl p-6 shadow-lg">
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-[17px] font-bold text-white">INGREDIENT ORDERING REQUIRED</h3>
                      <p className="text-[13px] text-white mt-1">These are special off-menu orders. Check lead times and ensure all ingredients are ordered.</p>
                    </div>
                  </div>
                </div>

                {/* Catering Orders */}
                {cateringData.map((order: any) => (
                  <div key={order.id} className="bg-white border-2 border-[#D2D2D7] rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-[#F5F5F7] border-b border-[#D2D2D7] px-6 py-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-[17px] font-semibold text-[#1D1D1F]">{order.locations?.name || 'Unknown Location'}</h3>
                          <p className="text-[13px] text-[#86868B] mt-1">{order.description}</p>
                          {order.estimated_portions > 0 && (
                            <p className="text-[13px] text-[#86868B] mt-1">Estimated portions: {order.estimated_portions}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] text-[#86868B]">Total Cost</p>
                          <p className="text-[22px] font-semibold text-[#1D1D1F]">€ {order.total_cost.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Components Table */}
                    <div className="p-6">
                      {order.catering_order_items && order.catering_order_items.length > 0 ? (
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[#E8E8ED]">
                              <th className="text-left py-3 px-4 text-[13px] font-semibold text-[#86868B]">Component</th>
                              <th className="text-right py-3 px-4 text-[13px] font-semibold text-[#86868B]">Quantity</th>
                              <th className="text-right py-3 px-4 text-[13px] font-semibold text-[#86868B]">Cost/kg</th>
                              <th className="text-right py-3 px-4 text-[13px] font-semibold text-[#86868B]">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.catering_order_items.map((item: any) => (
                              <tr key={item.id} className="border-b border-[#E8E8ED] last:border-0">
                                <td className="py-3 px-4 text-[15px] text-[#1D1D1F]">{item.components?.name || 'Unknown'}</td>
                                <td className="py-3 px-4 text-[15px] text-right text-[#1D1D1F]">
                                  {(item.quantity_g / 1000).toFixed(2)} kg
                                </td>
                                <td className="py-3 px-4 text-[15px] text-right text-[#86868B]">
                                  € {item.cost_per_kg.toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-[15px] text-right font-semibold text-[#1D1D1F]">
                                  € {item.total_cost.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-[#D2D2D7]">
                              <td colSpan={3} className="py-3 px-4 text-[15px] font-semibold text-[#1D1D1F]">Food Cost</td>
                              <td className="py-3 px-4 text-[15px] text-right font-semibold text-[#1D1D1F]">
                                € {order.food_cost.toFixed(2)}
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={3} className="py-3 px-4 text-[15px] font-semibold text-[#1D1D1F]">Labor Cost</td>
                              <td className="py-3 px-4 text-[15px] text-right font-semibold text-[#1D1D1F]">
                                € {order.labor_cost.toFixed(2)}
                              </td>
                            </tr>
                            <tr className="border-t-2 border-[#D2D2D7]">
                              <td colSpan={3} className="py-3 px-4 text-[17px] font-bold text-[#1D1D1F]">Total Cost</td>
                              <td className="py-3 px-4 text-[17px] text-right font-bold text-[#1D1D1F]">
                                € {order.total_cost.toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      ) : (
                        <p className="text-[13px] text-[#86868B] text-center py-4">No components added</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </main>

      {/* Print Selection Modal */}
      {showPrintModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowPrintModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-[#E8E8ED]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#FAFAFA] px-6 py-4 border-b border-[#E8E8ED] rounded-t-2xl">
              <h3 className="text-[22px] font-semibold text-[#1D1D1F]">Print Production Sheets</h3>
              <p className="text-[13px] text-[#86868B] mt-1">Select which sheets to print</p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Print All Checkbox */}
              <label className="flex items-center gap-3 p-4 bg-[#F5F5F7] rounded-lg cursor-pointer hover:bg-[#E8E8ED] transition-colors">
                <input
                  type="checkbox"
                  checked={printSections.main && printSections.mep && printSections.salad && printSections.recipes}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPrintSections({
                      main: checked,
                      mep: checked,
                      salad: checked,
                      recipes: checked,
                    });
                  }}
                  className="w-5 h-5 text-[#0078D4] border-[#D2D2D7] rounded focus:ring-[#0078D4]/20 cursor-pointer"
                />
                <span className="text-[17px] font-semibold text-[#1D1D1F]">Print All!</span>
              </label>

              {/* Individual Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printSections.main}
                    onChange={(e) => setPrintSections({ ...printSections, main: e.target.checked })}
                    className="w-5 h-5 text-[#0078D4] border-[#D2D2D7] rounded focus:ring-[#0078D4]/20 cursor-pointer"
                  />
                  <span className="text-[15px] text-[#1D1D1F]">Main Production Sheet</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printSections.mep}
                    onChange={(e) => setPrintSections({ ...printSections, mep: e.target.checked })}
                    className="w-5 h-5 text-[#0078D4] border-[#D2D2D7] rounded focus:ring-[#0078D4]/20 cursor-pointer"
                  />
                  <span className="text-[15px] text-[#1D1D1F]">Main MEP</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printSections.salad}
                    onChange={(e) => setPrintSections({ ...printSections, salad: e.target.checked })}
                    className="w-5 h-5 text-[#0078D4] border-[#D2D2D7] rounded focus:ring-[#0078D4]/20 cursor-pointer"
                  />
                  <span className="text-[15px] text-[#1D1D1F]">Salad Bar</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printSections.recipes}
                    onChange={(e) => setPrintSections({ ...printSections, recipes: e.target.checked })}
                    className="w-5 h-5 text-[#0078D4] border-[#D2D2D7] rounded focus:ring-[#0078D4]/20 cursor-pointer"
                  />
                  <span className="text-[15px] text-[#1D1D1F]">Recipes</span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowPrintModal(false)}
                className="flex-1 px-4 py-3 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded-lg hover:bg-[#F5F5F7] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  // Give the modal time to close, then trigger print
                  setTimeout(() => {
                    window.print();
                  }, 100);
                }}
                className="flex-1 px-4 py-3 text-[15px] font-medium text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-lg transition-colors"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
