'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, addDays, addWeeks, startOfWeek, getWeek, subWeeks } from 'date-fns';
import Image from 'next/image';
import type { UserProfile } from '@/lib/types';
import HoverNumberInput from '@/components/HoverNumberInput';
import { createOrderItem, createOrderItemsBatch, updateOrderItem, ensureFourWeeksAhead, clearWeekOrders } from './actions';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';
import ConfirmDialog from '@/components/ConfirmDialog';

interface OrderWithItems {
  id: string;
  week_start_date: string;
  created_at: string;
  order_items: {
    id: string;
    delivery_date: string;
    portions: number;
    meal_type?: string;
    dishes: {
      name: string;
      category: string;
    };
  }[];
}

interface Dish {
  id: string;
  name: string;
  description?: string;
  category: string;
  allergen_gluten?: boolean;
  allergen_soy?: boolean;
  allergen_lactose?: boolean;
  allergen_sesame?: boolean;
  allergen_sulphites?: boolean;
  allergen_egg?: boolean;
  allergen_mustard?: boolean;
  allergen_celery?: boolean;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  contains_pork?: boolean;
  contains_beef?: boolean;
  contains_lamb?: boolean;
  topping_components?: ToppingComponent[];
  carb_components?: CarbComponent[];
  warm_veggie_components?: WarmVeggieComponent[];
  salad_components?: SaladComponent[];
  salad_name?: string | null;
}

interface ComponentDish {
  id: string;
  name: string;
  category?: string;
}

interface ToppingComponent {
  component_dish: ComponentDish;
  component_type: string;
}

interface CarbComponent {
  component_dish: ComponentDish;
  component_type: string;
}

interface WarmVeggieComponent {
  component_dish: ComponentDish;
  percentage: number;
}

interface SaladComponent {
  component_dish: ComponentDish;
  percentage: number;
}

interface MenuItem {
  id: string;
  menu_id: string;
  dish_id: string;
  day_of_week: number;
  meal_type: 'soup' | 'hot_meat' | 'hot_veg';
  dish: Dish;
}

interface WeeklyMenu {
  id: string;
  week_start_date: string;
  menu_items: MenuItem[];
}

interface OrdersPageContentProps {
  forcedLocation?: string;
}

export default function OrdersPageContent({ forcedLocation }: OrdersPageContentProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editedPortions, setEditedPortions] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [viewingMenuWeek, setViewingMenuWeek] = useState<string | null>(null);
  const [weeklyMenus, setWeeklyMenus] = useState<Record<string, WeeklyMenu | null>>({});
  const [loadingMenu, setLoadingMenu] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Location branding data
  const locationBranding: Record<string, { logo: string; name: string; subtitle?: string }> = {
    'symphony': {
      logo: '/locations/symphony-offices.png',
      name: 'Symphony Offices',
    },
    'atlassian': {
      logo: '/locations/atlassian-logo.png',
      name: 'Atlassian',
    },
    'snowflake': {
      logo: '/locations/snowflake-logo-v2.png',
      name: 'Snowflake',
    },
    'snapchat': {
      logo: '/locations/snapchat-logo.jpg',
      name: 'SnapChat',
    },
    'snapchat-119': {
      logo: '/locations/snapchat-logo.jpg',
      name: 'SnapChat',
      subtitle: 'Building 119',
    },
    'snapchat-165': {
      logo: '/locations/snapchat-logo.jpg',
      name: 'SnapChat',
      subtitle: 'Building 165',
    },
    'jaa': {
      logo: '/locations/jaa-logo.png',
      name: 'JAA Training',
    },
  };

  // Use forcedLocation if provided, otherwise use searchParams
  const locationParam = forcedLocation || searchParams.get('location');

  // State to hold the derived location slug for navigation
  const [navLocationSlug, setNavLocationSlug] = useState<string | null>(locationParam);

  // State for Snapchat building selection
  const [snapchatBuilding, setSnapchatBuilding] = useState<'119' | '165'>(() => {
    if (locationParam === 'snapchat-165') return '165';
    return '119'; // Default to 119 for 'snapchat' or 'snapchat-119'
  });

  // Use navLocationSlug for branding to ensure logo shows even after async load
  const currentLocation = navLocationSlug ? locationBranding[navLocationSlug] : null;

  // Map URL location params to database location names
  const locationParamMapping: Record<string, string> = {
    'symphony': 'Symphony',
    'atlassian': 'Atlassian',
    'snowflake': 'Snowflake',
    'snapchat': 'SnapChat 119',
    'snapchat-119': 'SnapChat 119',
    'snapchat-165': 'SnapChat 165',
    'jaa': 'JAA Training',
  };

  const handleEnsureFourWeeksAhead = async (locationId: string) => {
    const now = new Date();
    const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    const currentWeekStart = startOfWeek(localDate, { weekStartsOn: 1 });
    const weekDates = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = addWeeks(currentWeekStart, i);
      weekDates.push(format(weekStart, 'yyyy-MM-dd'));
    }

    const result = await ensureFourWeeksAhead(locationId, weekDates);

    if (!result.success) {
      console.error('Error ensuring four weeks ahead:', result.error);
      alert(`Failed to create weeks: ${result.error}`);
    } else if (result.created && result.created > 0) {
      console.log(`Successfully created ${result.created} weeks`);
    }
  };

  const syncOrdersWithMenu = async (ordersData: any[]) => {
    console.log('Auto-syncing orders with current menu...');

    let syncCount = 0;

    for (const order of ordersData) {
      const { data: menu } = await supabase
        .from('weekly_menus')
        .select('id')
        .eq('week_start_date', order.week_start_date)
        .single();

      if (!menu) continue;

      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('day_of_week, meal_type, dish_id')
        .eq('menu_id', menu.id);

      if (!menuItems) continue;

      const weekStart = new Date(order.week_start_date);
      const expectedDishes: Record<string, string> = {};

      menuItems.forEach(item => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + item.day_of_week);
        const dateStr = format(date, 'yyyy-MM-dd');
        const key = `${dateStr}-${item.meal_type}`;
        expectedDishes[key] = item.dish_id;
      });

      for (const orderItem of order.order_items) {
        const key = `${orderItem.delivery_date}-${orderItem.meal_type}`;
        const expectedDishId = expectedDishes[key];

        if (expectedDishId && orderItem.dish_id !== expectedDishId) {
          const { error } = await supabase
            .from('order_items')
            .update({ dish_id: expectedDishId })
            .eq('id', orderItem.id);

          if (!error) {
            syncCount++;
            console.log(`Synced order_item ${orderItem.id} to menu dish ${expectedDishId}`);
          }
        }
      }
    }

    if (syncCount > 0) {
      console.log(`✓ Auto-sync complete: ${syncCount} order items updated to match menu`);
    } else {
      console.log('✓ All orders already in sync with menu');
    }
  };

  const fetchOrders = async (locationId: string) => {
    console.log(`Fetching orders for location: ${locationId}`);

    await handleEnsureFourWeeksAhead(locationId);

    const { data: ordersData, error } = await supabase
      .from('orders')
      .select(`
        id,
        week_start_date,
        created_at,
        order_items (
          id,
          delivery_date,
          portions,
          meal_type,
          dish_id,
          dishes (
            name,
            category
          )
        )
      `)
      .eq('location_id', locationId)
      .order('week_start_date', { ascending: true });

    if (error) {
      console.error('Error fetching orders:', error);
      alert(`Failed to fetch orders: ${error.message}`);
      throw error;
    }

    console.log(`Fetched ${ordersData?.length || 0} orders for location ${locationId}`);

    // Sync removed for performance - should be done as background job or when menu changes
    // await syncOrdersWithMenu(ordersData || []);

    // Sort orders: current week first, then future weeks, then past weeks
    const now = new Date();
    const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    const currentWeekStart = format(startOfWeek(localDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const sortedOrders = (ordersData || []).sort((a, b) => {
      // Current week goes first
      if (a.week_start_date === currentWeekStart) return -1;
      if (b.week_start_date === currentWeekStart) return 1;

      // Separate future and past weeks
      const aIsFuture = a.week_start_date > currentWeekStart;
      const bIsFuture = b.week_start_date > currentWeekStart;

      // Future weeks come before past weeks
      if (aIsFuture && !bIsFuture) return -1;
      if (!aIsFuture && bIsFuture) return 1;

      // Within same category (both future or both past), sort by date ascending
      return a.week_start_date.localeCompare(b.week_start_date);
    });

    setOrders(sortedOrders as any || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login/location-management');
          return;
        }

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*, locations(name)')
          .eq('id', user.id)
          .single();

        if (profileData?.role !== 'manager' && profileData?.role !== 'admin') {
          router.push('/login/location-management');
          return;
        }

        setProfile(profileData);

        // Always fetch locations to support forcedLocation lookup
        const { data: locationsData } = await supabase
          .from('locations')
          .select('id, name')
          .neq('name', 'Dark Kitchen')
          .order('name');

        setLocations(locationsData || []);

        // Determine which location to show
        let targetLocationId = profileData.location_id;
        let derivedLocationSlug = locationParam;

        // If forcedLocation is provided, look up the location ID
        if (locationParam && locationsData) {
          const dbLocationName = locationParamMapping[locationParam];
          const location = locationsData.find(loc => loc.name === dbLocationName);
          if (location) {
            targetLocationId = location.id;
          }
        } else if (locationsData && targetLocationId) {
          // If no locationParam, derive the slug from the user's profile location
          const userLocation = locationsData.find(loc => loc.id === targetLocationId);
          if (userLocation) {
            // Find the reverse mapping (database name -> slug)
            const slugEntry = Object.entries(locationParamMapping).find(
              ([_, dbName]) => dbName === userLocation.name
            );
            if (slugEntry) {
              derivedLocationSlug = slugEntry[0];
            }
          }
        }

        setNavLocationSlug(derivedLocationSlug);
        setSelectedLocationId(targetLocationId);
        await fetchOrders(targetLocationId);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, router, forcedLocation]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  // Handle Snapchat building changes
  useEffect(() => {
    const handleBuildingChange = async () => {
      const isSnapchat = navLocationSlug?.startsWith('snapchat');
      if (!isSnapchat || !locations.length) return;

      const newSlug = `snapchat-${snapchatBuilding}`;
      const dbLocationName = locationParamMapping[newSlug];
      const location = locations.find(loc => loc.name === dbLocationName);

      if (location && location.id !== selectedLocationId) {
        setNavLocationSlug(newSlug);
        setSelectedLocationId(location.id);
        // Update URL to reflect the building change
        router.push(`/${newSlug}/orders`);
        await fetchOrders(location.id);
      }
    };

    handleBuildingChange();
  }, [snapchatBuilding]);

  const locationPresets: Record<string, number> = {
    'Snapchat 119': 75,
    'Snapchat 165': 25,
    'Symphony': 80,
    'Atlassian': 100,
    'Snowflake': 55,
    'JAA Training': 30
  };

  const handleEdit = (orderId: string, order: OrderWithItems) => {
    setEditingOrder(orderId);

    const portions: Record<string, Record<string, number>> = {};
    const locationName = (profile?.locations as any)?.name || '';
    const preset = locationPresets[locationName] || 0;

    const weekStart = new Date(order.week_start_date);
    for (let i = 0; i < 5; i++) {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      portions[dateStr] = {
        soup: 0,
        hot_dish_meat_fish: 0,
        hot_dish_veg: 0,
        salad_bar: 0
      };
    }

    order.order_items.forEach((item) => {
      if (portions[item.delivery_date] && item.dishes.category !== 'off_menu') {
        if (item.dishes.category === 'hot_dish_meat' || item.dishes.category === 'hot_dish_fish') {
          portions[item.delivery_date]['hot_dish_meat_fish'] = item.portions;
        } else {
          portions[item.delivery_date][item.dishes.category] = item.portions;
        }
      }
    });

    setEditedPortions({ ...editedPortions, [orderId]: portions });
  };

  const handleViewAndEdit = async (orderId: string, order: OrderWithItems, weekStartDate: string) => {
    // First, open the menu if it's not already open
    if (viewingMenuWeek !== weekStartDate) {
      if (!weeklyMenus[weekStartDate] && !loadingMenu[weekStartDate]) {
        await fetchWeeklyMenu(weekStartDate);
      }
      setViewingMenuWeek(weekStartDate);

      // Scroll to top smoothly after state updates
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }

    // Then, enter edit mode
    handleEdit(orderId, order);
  };

  const handleCopyFromLastWeek = async (orderId: string, order: OrderWithItems) => {
    // Find the previous week's order
    const currentWeekDate = new Date(order.week_start_date);
    const previousWeekDate = format(addDays(currentWeekDate, -7), 'yyyy-MM-dd');

    const previousWeekOrder = orders.find(o => o.week_start_date === previousWeekDate);

    if (!previousWeekOrder) {
      alert('No previous week found to copy from.');
      return;
    }

    if (previousWeekOrder.order_items.length === 0) {
      alert('Previous week has no orders to copy.');
      return;
    }

    const confirmed = window.confirm(`Copy all portions from ${formatWeekRange(previousWeekOrder.week_start_date)}?`);
    if (!confirmed) return;

    // Build portions object from previous week
    const portions: Record<string, Record<string, number>> = {};
    const weekStart = new Date(order.week_start_date);

    for (let i = 0; i < 5; i++) {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      portions[dateStr] = {
        soup: 0,
        hot_dish_meat_fish: 0,
        hot_dish_veg: 0,
        salad_bar: 0
      };
    }

    // Copy portions from previous week (matching by day of week, not absolute date)
    const previousWeekStart = new Date(previousWeekOrder.week_start_date);
    previousWeekOrder.order_items.forEach((item) => {
      if (item.dishes.category !== 'off_menu') {
        // Calculate which day of the week this item is for (0-4 for Mon-Fri)
        const itemDate = new Date(item.delivery_date);
        const dayOfWeek = Math.floor((itemDate.getTime() - new Date(previousWeekOrder.week_start_date).getTime()) / (1000 * 60 * 60 * 24));

        if (dayOfWeek >= 0 && dayOfWeek < 5) {
          // Map to the same day of week in the new week
          const targetDate = format(addDays(weekStart, dayOfWeek), 'yyyy-MM-dd');

          if (portions[targetDate]) {
            if (item.dishes.category === 'hot_dish_meat' || item.dishes.category === 'hot_dish_fish') {
              portions[targetDate]['hot_dish_meat_fish'] = item.portions;
            } else {
              portions[targetDate][item.dishes.category] = item.portions;
            }
          }
        }
      }
    });

    // Enter edit mode with the copied portions
    setEditingOrder(orderId);
    setEditedPortions({ ...editedPortions, [orderId]: portions });

    // Open menu if not already open
    if (viewingMenuWeek !== order.week_start_date) {
      if (!weeklyMenus[order.week_start_date] && !loadingMenu[order.week_start_date]) {
        await fetchWeeklyMenu(order.week_start_date);
      }
      setViewingMenuWeek(order.week_start_date);
    }
  };

  const handlePortionChange = (orderId: string, date: string, category: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value);
    const finalValue = isNaN(numValue) ? 0 : Math.max(0, numValue);

    setEditedPortions(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [date]: {
          ...prev[orderId]?.[date],
          [category]: finalValue
        }
      }
    }));
  };

  const handleSave = async (orderId: string, shouldRefresh: boolean = false) => {
    setSaving(true);
    try {
      const portions = editedPortions[orderId];
      console.log('Saving portions:', portions);

      const order = orders.find(o => o.id === orderId);
      if (!order) throw new Error('Order not found');

      const { data: menu, error: menuError } = await supabase
        .from('weekly_menus')
        .select('id')
        .eq('week_start_date', order.week_start_date)
        .single();

      if (menuError) throw menuError;
      if (!menu) throw new Error('No menu found for this week');

      const { data: menuItems, error: menuItemsError } = await supabase
        .from('menu_items')
        .select('day_of_week, meal_type, dish_id')
        .eq('menu_id', menu.id);

      if (menuItemsError) throw menuItemsError;

      const weekStart = new Date(order.week_start_date);
      const dishByDateAndMealType: Record<string, string> = {};

      menuItems?.forEach(item => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + item.day_of_week);
        const dateStr = format(date, 'yyyy-MM-dd');
        const key = `${dateStr}-${item.meal_type}`;
        dishByDateAndMealType[key] = item.dish_id;
      });

      console.log('Menu dishes by date and meal_type:', dishByDateAndMealType);

      const { data: saladBarDish } = await supabase
        .from('dishes')
        .select('id')
        .eq('category', 'salad_bar')
        .eq('is_active', true)
        .single();

      console.log('Salad bar dish:', saladBarDish);

      const updatePromises = [];
      const createPromises = [];

      for (const [date, categories] of Object.entries(portions)) {
        for (const [category, portionCount] of Object.entries(categories)) {
          let actualCategory = category;
          if (category === 'hot_dish_meat_fish') {
            const orderItems = orders.find(o => o.id === orderId)?.order_items || [];
            const existingMeat = orderItems.find(item =>
              item.delivery_date === date && item.dishes.category === 'hot_dish_meat'
            );
            const existingFish = orderItems.find(item =>
              item.delivery_date === date && item.dishes.category === 'hot_dish_fish'
            );

            actualCategory = existingMeat ? 'hot_dish_meat' : (existingFish ? 'hot_dish_fish' : 'hot_dish_meat');
          }

          let matchMealType = category;
          if (category === 'hot_dish_meat_fish' || actualCategory === 'hot_dish_meat' || actualCategory === 'hot_dish_fish') {
            matchMealType = 'hot_meat';
          } else if (actualCategory === 'hot_dish_veg') {
            matchMealType = 'hot_veg';
          } else if (actualCategory === 'soup') {
            matchMealType = 'soup';
          } else if (actualCategory === 'salad_bar') {
            matchMealType = 'salad_bar';
          }

          const orderItem = orders
            .find(o => o.id === orderId)
            ?.order_items.find((item: any) =>
              item.delivery_date === date && item.meal_type === matchMealType
            );

          if (orderItem) {
            console.log(`Queuing update: ${actualCategory} for ${date}: ${orderItem.portions} -> ${portionCount}`);
            updatePromises.push(
              updateOrderItem({
                id: orderItem.id,
                portions: portionCount
              })
            );
          } else if (portionCount > 0) {
            let mealType = category;
            if (category === 'hot_dish_meat_fish' || actualCategory === 'hot_dish_meat' || actualCategory === 'hot_dish_fish') {
              mealType = 'hot_meat';
            } else if (actualCategory === 'hot_dish_veg') {
              mealType = 'hot_veg';
            } else if (actualCategory === 'soup') {
              mealType = 'soup';
            } else if (actualCategory === 'salad_bar') {
              mealType = 'salad_bar';
            }

            let dishId: string | undefined;
            if (mealType === 'salad_bar') {
              dishId = saladBarDish?.id;
              if (!dishId) {
                console.warn(`No salad_bar dish found in database. Skipping creation.`);
                continue;
              }
            } else {
              const menuKey = `${date}-${mealType}`;
              dishId = dishByDateAndMealType[menuKey];
              if (!dishId) {
                console.warn(`No menu dish found for ${date} ${mealType}. Skipping creation.`);
                continue;
              }
            }

            console.log(`Queuing create: ${mealType} for ${date}: ${portionCount} portions (dish ${mealType === 'salad_bar' ? 'from database' : 'from menu'})`);

            createPromises.push(
              createOrderItem({
                order_id: orderId,
                dish_id: dishId,
                delivery_date: date,
                portions: portionCount,
                meal_type: mealType
              })
            );
          }
        }
      }

      console.log(`Executing ${updatePromises.length} updates and ${createPromises.length} creates in parallel...`);
      const [updateResults, createResults] = await Promise.all([
        Promise.all(updatePromises),
        Promise.all(createPromises)
      ]);

      const updateErrors = updateResults.filter(r => r.error);
      const createErrors = createResults.filter(r => r.error);

      if (updateErrors.length > 0) {
        console.error('Update errors:', updateErrors);
        throw new Error(`Failed to update ${updateErrors.length} items`);
      }

      if (createErrors.length > 0) {
        console.error('Create errors:', createErrors);
        console.error('Detailed error messages:', createErrors.map(e => e.error));
        throw new Error(`Failed to create ${createErrors.length} items: ${createErrors.map(e => e.error).join(', ')}`);
      }

      console.log(`Save complete: ${updateResults.length} updated, ${createResults.length} created`);

      if (selectedLocationId) {
        console.log('Refreshing orders...');
        await fetchOrders(selectedLocationId);
        console.log('Orders refreshed');
      }

      if (shouldRefresh) {
        setEditingOrder(null);
      }
    } catch (err) {
      console.error('Error saving order:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDone = async (orderId: string) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
      setAutoSaveTimeout(null);
    }

    await handleSave(orderId, true);

    // Close the menu after saving
    setViewingMenuWeek(null);
  };

  const handleClearWeek = async (orderId: string, weekRange: string) => {
    const confirmed = window.confirm(`Are you sure you want to clear all orders for ${weekRange}? This will delete all portions.`);

    if (!confirmed) return;

    const result = await clearWeekOrders(orderId);

    if (result.error) {
      alert(`Failed to clear week: ${result.error}`);
    } else {
      if (selectedLocationId) {
        await fetchOrders(selectedLocationId);
      }
    }
  };

  const fetchWeeklyMenu = async (weekStartDate: string) => {
    setLoadingMenu({ ...loadingMenu, [weekStartDate]: true });

    const { data: menuData, error: menuError } = await supabase
      .from('weekly_menus')
      .select('*')
      .eq('week_start_date', weekStartDate)
      .maybeSingle();

    if (menuError || !menuData) {
      console.error('Error fetching menu:', menuError);
      setWeeklyMenus({ ...weeklyMenus, [weekStartDate]: null });
      setLoadingMenu({ ...loadingMenu, [weekStartDate]: false });
      return;
    }

    // Fetch menu items
    const { data: itemsData, error: itemsError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('menu_id', menuData.id)
      .order('day_of_week')
      .order('meal_type');

    if (itemsError) {
      console.error('Error fetching menu items:', itemsError);
      setLoadingMenu({ ...loadingMenu, [weekStartDate]: false });
      return;
    }

    // Fetch dish details for each menu item
    const itemsWithDishes = await Promise.all(
      (itemsData || []).map(async (item: any) => {
        const { data: dishData } = await supabase
          .from('dishes')
          .select('*')
          .eq('id', item.dish_id)
          .single();

        // Fetch components
        const { data: warmVeggieComponents } = await supabase
          .from('warm_veggie_components')
          .select('percentage, component_dish:component_dish_id(id, name, category)')
          .eq('main_dish_id', item.dish_id);

        // Fetch salad combination name (new system)
        let saladComponents: any[] = [];
        let saladName: string | null = null;
        const { data: dishSaladLink } = await supabase
          .from('dish_salad_combinations')
          .select('salad_combination_id')
          .eq('main_dish_id', item.dish_id)
          .maybeSingle();

        if (dishSaladLink) {
          // Get salad combination name
          const { data: saladCombo } = await supabase
            .from('salad_combinations')
            .select('custom_name')
            .eq('id', dishSaladLink.salad_combination_id)
            .single();

          saladName = saladCombo?.custom_name || null;

          // Get salad items
          const { data: saladItems } = await supabase
            .from('salad_combination_items')
            .select('percentage, component_dish:component_dish_id(id, name, category)')
            .eq('salad_combination_id', dishSaladLink.salad_combination_id);

          saladComponents = saladItems || [];
        }

        const { data: toppingComponents } = await supabase
          .from('dish_components')
          .select('component_type, component_dish:dishes!component_dish_id(id, name, category)')
          .eq('main_dish_id', item.dish_id)
          .eq('component_type', 'topping');

        const { data: carbComponents } = await supabase
          .from('dish_components')
          .select('component_type, component_dish:dishes!component_dish_id(id, name, category)')
          .eq('main_dish_id', item.dish_id)
          .eq('component_type', 'carb');

        return {
          ...item,
          dish: {
            ...dishData,
            warm_veggie_components: warmVeggieComponents || [],
            salad_components: saladComponents || [],
            salad_name: saladName,
            topping_components: toppingComponents || [],
            carb_components: carbComponents || [],
          },
        };
      })
    );

    setWeeklyMenus({
      ...weeklyMenus,
      [weekStartDate]: {
        ...menuData,
        menu_items: itemsWithDishes,
      },
    });
    setLoadingMenu({ ...loadingMenu, [weekStartDate]: false });
  };

  const handleToggleMenu = async (weekStartDate: string) => {
    if (viewingMenuWeek === weekStartDate) {
      // Close menu
      setViewingMenuWeek(null);
    } else {
      // Open menu - fetch if not already loaded
      if (!weeklyMenus[weekStartDate] && !loadingMenu[weekStartDate]) {
        await fetchWeeklyMenu(weekStartDate);
      }
      setViewingMenuWeek(weekStartDate);

      // Scroll to top smoothly after state updates
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const getAllergensForDish = (dish: Dish) => {
    const allergens = [];
    if (dish.allergen_gluten) allergens.push('Gluten');
    if (dish.allergen_soy) allergens.push('Soy');
    if (dish.allergen_lactose) allergens.push('Lactose');
    if (dish.allergen_sesame) allergens.push('Sesame');
    if (dish.allergen_sulphites) allergens.push('Sulphites');
    if (dish.allergen_egg) allergens.push('Egg');
    if (dish.allergen_mustard) allergens.push('Mustard');
    if (dish.allergen_celery) allergens.push('Celery');
    return allergens;
  };

  const getDietaryInfo = (dish: Dish) => {
    const info = [];
    if (dish.is_vegetarian) info.push('🌱 Vegetarian');
    if (dish.is_vegan) info.push('🌿 Vegan');
    if (dish.contains_pork) info.push('Pork');
    if (dish.contains_beef) info.push('Beef');
    if (dish.contains_lamb) info.push('Lamb');
    return info;
  };

  const getSoupToppings = (dish: Dish) => {
    if (!dish.topping_components) return [];
    return dish.topping_components.map(tc => tc.component_dish.name);
  };

  const getCarbs = (dish: Dish) => {
    if (!dish.carb_components) return [];
    return dish.carb_components.map(cc => cc.component_dish.name);
  };

  const getWarmVeggies = (dish: Dish) => {
    if (!dish.warm_veggie_components) return [];
    return dish.warm_veggie_components.map(wvc => wvc.component_dish.name);
  };

  const hasSalad = (dish: Dish) => {
    if (!dish.salad_components) return false;
    return dish.salad_components.length > 0;
  };

  const formatWeekRange = (weekStartDate: string) => {
    const startDate = new Date(weekStartDate);
    const endDate = addDays(startDate, 4);

    const startDay = format(startDate, 'd');
    const startMonth = format(startDate, 'MMM');
    const endDay = format(endDate, 'd');
    const endMonth = format(endDate, 'MMM');

    if (startMonth === endMonth) {
      return `Mon ${startDay} - Fri ${endDay} ${startMonth}`;
    } else {
      return `Mon ${startDay} ${startMonth} - Fri ${endDay} ${endMonth}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-apple">
      <AdminQuickNav />

      <UniversalHeader
        title=""
        backPath=""
        locationLogo={currentLocation?.logo || ""}
        locationName={currentLocation?.name || ""}
        locationSubtitle={navLocationSlug?.startsWith('snapchat') ? `Building ${snapchatBuilding}` : currentLocation?.subtitle}
        navItems={navLocationSlug ? [
          { label: 'Menu Overview', href: `/${navLocationSlug}/week-overview`, active: false },
          { label: 'Orders', href: `/${navLocationSlug}/orders`, active: true },
          { label: 'Soup & Salad Bar', href: `/${navLocationSlug}/soup-salad-bar`, active: false },
          { label: navLocationSlug === 'symphony' ? 'Banqueting' : 'Catering', href: navLocationSlug === 'symphony' ? `/admin/banqueting` : `/${navLocationSlug}/catering`, active: false },
          { label: 'Settings', href: `/${navLocationSlug}/settings`, active: false },
          ...(navLocationSlug !== 'symphony' ? [{ label: 'Cost & Billing', href: `/${navLocationSlug}/cost-billing`, active: false }] : []),
        ] : undefined}
      />

      {selectedLocationId && !viewingMenuWeek && navLocationSlug?.startsWith('snapchat') && (
        <div className="max-w-6xl mx-auto px-8 lg:px-12 pt-16 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[15px] text-[#6E6E73]">Building:</span>
            <div className="flex bg-[#F5F5F7] rounded-lg p-1">
              <button
                onClick={() => setSnapchatBuilding('119')}
                className={`px-4 py-1.5 text-[15px] font-medium rounded-md transition-colors ${
                  snapchatBuilding === '119'
                    ? 'bg-white text-[#1D1D1F] shadow-sm'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                119
              </button>
              <button
                onClick={() => setSnapchatBuilding('165')}
                className={`px-4 py-1.5 text-[15px] font-medium rounded-md transition-colors ${
                  snapchatBuilding === '165'
                    ? 'bg-white text-[#1D1D1F] shadow-sm'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                165
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={`max-w-6xl mx-auto px-8 lg:px-12 ${viewingMenuWeek ? 'py-4' : 'pt-24 pb-10'}`}>
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-apple-body text-slate-600 mb-4">No orders found</p>
            <button
              onClick={() => router.push('/orders/new')}
              className="px-6 py-3 text-apple-subheadline font-medium text-white bg-apple-blue hover:bg-apple-blue-hover rounded-sm transition-colors"
            >
              Create New Order
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {orders
              .filter(order => {
                if (viewingMenuWeek) {
                  return order.week_start_date === viewingMenuWeek;
                }

                // Show only current week + 3 future weeks (4 weeks total)
                const now = new Date();
                const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
                const currentWeek = startOfWeek(localDate, { weekStartsOn: 1 });
                const threeWeeksAhead = addWeeks(currentWeek, 3);
                const orderWeek = new Date(order.week_start_date);

                return orderWeek >= currentWeek && orderWeek <= threeWeeksAhead;
              })
              .map((order) => {
              const isEditing = editingOrder === order.id;
              const groupedItems: Record<string, Record<string, number>> = {};

              const weekStart = new Date(order.week_start_date);
              const allDates: string[] = [];
              for (let i = 0; i < 5; i++) {
                const date = addDays(weekStart, i);
                const dateStr = format(date, 'yyyy-MM-dd');
                allDates.push(dateStr);
                groupedItems[dateStr] = {
                  soup: 0,
                  hot_dish_meat_fish: 0,
                  hot_dish_veg: 0,
                  salad_bar: 0
                };
              }

              const offMenuItems: Record<string, Record<string, number>> = {};

              order.order_items.forEach((item) => {
                if (item.dishes.category === 'off_menu') {
                  const dishName = item.dishes.name;
                  if (!offMenuItems[dishName]) {
                    offMenuItems[dishName] = {};
                    allDates.forEach(date => offMenuItems[dishName][date] = 0);
                  }
                  offMenuItems[dishName][item.delivery_date] = item.portions;
                } else if (groupedItems[item.delivery_date]) {
                  if (item.dishes.category === 'hot_dish_meat' || item.dishes.category === 'hot_dish_fish') {
                    groupedItems[item.delivery_date]['hot_dish_meat_fish'] = item.portions;
                  } else if (item.dishes.category === 'salad_bar') {
                    groupedItems[item.delivery_date]['salad_bar'] = item.portions;
                  } else {
                    groupedItems[item.delivery_date][item.dishes.category] = item.portions;
                  }
                }
              });

              const currentPortions = isEditing ? editedPortions[order.id] : groupedItems;
              const hasOffMenuItems = Object.keys(offMenuItems).length > 0;

              const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
              const orderWeekStart = startOfWeek(new Date(order.week_start_date), { weekStartsOn: 1 });
              const isCurrentWeek = format(orderWeekStart, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd');

              return (
                <div key={order.id}>
                  <div className="py-2 flex items-center">
                    <div className="flex items-center gap-3">
                      <h3 className="text-apple-headline font-medium italic text-slate-700">
                        {formatWeekRange(order.week_start_date)}
                      </h3>
                      <span className="text-apple-footnote font-medium italic tracking-wider text-slate-500">
                        (Week {getWeek(new Date(order.week_start_date), { weekStartsOn: 1 })})
                      </span>
                    </div>
                    <div className="flex-1 flex justify-end gap-2 items-center">
                      {isEditing ? (
                        <>
                          {saving && (
                            <span className="text-apple-subheadline text-slate-500 italic">
                              Saving...
                            </span>
                          )}
                          <button
                            onClick={() => handleDone(order.id)}
                            disabled={saving}
                            className="px-3 py-1.5 text-apple-subheadline font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-sm transition-colors disabled:opacity-50"
                          >
                            Done
                          </button>
                        </>
                      ) : (
                        <>
                          {(() => {
                            // Check if there's a previous week to copy from
                            const currentWeekDate = new Date(order.week_start_date);
                            const previousWeekDate = format(addDays(currentWeekDate, -7), 'yyyy-MM-dd');
                            const previousWeekOrder = orders.find(o => o.week_start_date === previousWeekDate);
                            const hasPreviousWeek = previousWeekOrder && previousWeekOrder.order_items.length > 0;

                            return hasPreviousWeek && (
                              <button
                                onClick={() => handleCopyFromLastWeek(order.id, order)}
                                title="Copy last week's orders"
                                className="px-3 py-1.5 text-apple-subheadline font-medium text-[#0078D4] bg-white border border-slate-300 hover:bg-slate-50 rounded-sm transition-colors"
                              >
                                Copy
                              </button>
                            );
                          })()}
                          {order.order_items.length > 0 && (
                            <button
                              onClick={() => handleClearWeek(order.id, formatWeekRange(order.week_start_date))}
                              className="px-3 py-1.5 text-apple-subheadline font-medium text-red-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-sm transition-colors"
                            >
                              Clear
                            </button>
                          )}
                          <button
                            onClick={() => handleViewAndEdit(order.id, order, order.week_start_date)}
                            className="px-3 py-1.5 text-apple-subheadline font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-sm transition-colors"
                          >
                            View & Edit
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Weekly Menu Display */}
                  {viewingMenuWeek === order.week_start_date && (
                    <div className="mb-6">
                      {loadingMenu[order.week_start_date] ? (
                        <div className="text-center py-12 text-[#86868B]">Loading menu...</div>
                      ) : !weeklyMenus[order.week_start_date] ? (
                        <div className="bg-white border border-[#E8E8ED] rounded-sm p-12 text-center">
                          <p className="text-[15px] text-[#86868B]">No menu found for this week.</p>
                        </div>
                      ) : (
                        <div className={`bg-white border border-[#D2D2D7] rounded-sm overflow-hidden shadow-sm ${!isCurrentWeek ? 'opacity-60' : ''}`}>
                          <table className="w-full border-separate" style={{borderSpacing: '0 0'}}>
                            <colgroup>
                              <col className="w-48" />
                              {Array.from({ length: 5 }).map((_, i) => (
                                <col key={i} className="w-44" />
                              ))}
                            </colgroup>
                            <thead>
                              <tr className="bg-[#0078D4]">
                                <th className="px-5 py-4 text-left text-apple-footnote font-medium text-white border-r border-white/20">
                                  Menu
                                </th>
                                {Array.from({ length: 5 }, (_, i) => addDays(new Date(order.week_start_date), i)).map((day, dayIndex) => (
                                  <th key={dayIndex} className={`py-4 ${dayIndex < 4 ? 'border-r border-white/20' : ''}`}>
                                    <div className="flex items-baseline justify-center gap-1">
                                      <span className="text-apple-footnote font-medium text-white">
                                        {format(day, 'EEE')}
                                      </span>
                                      <span className="text-apple-footnote font-medium text-white">
                                        {format(day, 'd MMM')}
                                      </span>
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                          {/* Soup Row */}
                          <tr className="border-b border-[#D2D2D7]">
                            <td className="px-5 py-6 bg-gray-200 border-r border-[#D2D2D7] align-top">
                              <div className="text-[15px] font-medium text-[#1D1D1F]">Soup</div>
                            </td>
                            {Array.from({ length: 5 }).map((_, dayIndex) => {
                              const soupItem = weeklyMenus[order.week_start_date]?.menu_items.find(
                                (item) => item.day_of_week === dayIndex && item.meal_type === 'soup'
                              );
                              const isEven = dayIndex % 2 === 0;
                              return (
                                <td
                                  key={dayIndex}
                                  className="px-4 py-6 border-r border-[#D2D2D7] last:border-r-0 text-center align-top"
                                  style={{ backgroundColor: isEven ? '#FFFFFF' : '#E2E8F0' }}
                                >
                                  {soupItem ? (
                                    <div className="space-y-1">
                                      {/* Line 1-2: Dish Name (fixed height) */}
                                      <div className="h-[3rem]">
                                        <h3 className="text-[16px] leading-[1.5] font-medium text-[#1D1D1F] line-clamp-2">
                                          {soupItem.dish.name}
                                        </h3>
                                      </div>

                                      {/* Line 3-4-5: Toppings (3 lines) */}
                                      <p className="text-[12px] text-[#1D1D1F] min-h-[3.75rem]">
                                        {getSoupToppings(soupItem.dish).length > 0 ? (
                                          <><span className="font-medium">Toppings:</span> {getSoupToppings(soupItem.dish).join(', ')}</>
                                        ) : (
                                          <span className="text-transparent">-</span>
                                        )}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-[13px] text-[#86868B] italic">Not available</p>
                                  )}
                                </td>
                              );
                            })}
                          </tr>

                          {/* Meat/Fish Row */}
                          <tr className="border-b border-[#D2D2D7]">
                            <td className="px-5 py-6 bg-gray-200 border-r border-[#D2D2D7] align-top">
                              <div className="text-[15px] font-medium text-[#1D1D1F]">Hot Dish Meat/Fish</div>
                            </td>
                            {Array.from({ length: 5 }).map((_, dayIndex) => {
                              const meatItem = weeklyMenus[order.week_start_date]?.menu_items.find(
                                (item) => item.day_of_week === dayIndex && item.meal_type === 'hot_meat'
                              );
                              const isEven = dayIndex % 2 === 0;
                              return (
                                <td
                                  key={dayIndex}
                                  className="px-4 py-6 border-r border-[#D2D2D7] last:border-r-0 text-center align-top"
                                  style={{ backgroundColor: isEven ? '#FFFFFF' : '#E2E8F0' }}
                                >
                                  {meatItem ? (
                                    <div className="space-y-1">
                                      {/* Line 1-2: Dish Name (fixed height) */}
                                      <div className="h-[3rem]">
                                        <h3 className="text-[16px] leading-[1.5] font-medium text-[#1D1D1F] line-clamp-2">
                                          {meatItem.dish.name}
                                        </h3>
                                      </div>

                                      {/* Line 3: Carbs (always visible) */}
                                      <p className="text-[12px] text-[#1D1D1F] min-h-[1.25rem]">
                                        {getCarbs(meatItem.dish).length > 0 ? (
                                          <><span className="font-medium">Carbs:</span> {getCarbs(meatItem.dish).join(', ')}</>
                                        ) : (
                                          <><span className="font-medium">Carbs:</span> <span className="text-[#86868B] italic">n.a.</span></>
                                        )}
                                      </p>

                                      {/* Line 4-5: Veg (2 lines) */}
                                      <p className="text-[12px] text-[#1D1D1F] min-h-[2.5rem]">
                                        {(getWarmVeggies(meatItem.dish).length > 0 || hasSalad(meatItem.dish)) ? (
                                          <>
                                            <span className="font-medium">Veg:</span>{' '}
                                            {[
                                              ...getWarmVeggies(meatItem.dish),
                                              ...(hasSalad(meatItem.dish) ? [meatItem.dish.salad_name || 'Salad'] : [])
                                            ].join(', ')}
                                          </>
                                        ) : (
                                          <span className="text-transparent">-</span>
                                        )}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-[13px] text-[#86868B] italic">Not available</p>
                                  )}
                                </td>
                              );
                            })}
                          </tr>

                          {/* Veg Row */}
                          <tr>
                            <td className="px-5 py-6 bg-gray-200 border-r border-[#D2D2D7] align-top">
                              <div className="text-[15px] font-medium text-[#1D1D1F]">Hot Dish Veg</div>
                            </td>
                            {Array.from({ length: 5 }).map((_, dayIndex) => {
                              const vegItem = weeklyMenus[order.week_start_date]?.menu_items.find(
                                (item) => item.day_of_week === dayIndex && item.meal_type === 'hot_veg'
                              );
                              const isEven = dayIndex % 2 === 0;
                              return (
                                <td
                                  key={dayIndex}
                                  className="px-4 py-6 border-r border-[#D2D2D7] last:border-r-0 text-center align-top"
                                  style={{ backgroundColor: isEven ? '#FFFFFF' : '#E2E8F0' }}
                                >
                                  {vegItem ? (
                                    <div className="space-y-1">
                                      {/* Line 1-2: Dish Name (fixed height) */}
                                      <div className="h-[3rem]">
                                        <h3 className="text-[16px] leading-[1.5] font-medium text-[#1D1D1F] line-clamp-2">
                                          {vegItem.dish.name}
                                        </h3>
                                      </div>

                                      {/* Line 3: Carbs (always visible) */}
                                      <p className="text-[12px] text-[#1D1D1F] min-h-[1.25rem]">
                                        {getCarbs(vegItem.dish).length > 0 ? (
                                          <><span className="font-medium">Carbs:</span> {getCarbs(vegItem.dish).join(', ')}</>
                                        ) : (
                                          <><span className="font-medium">Carbs:</span> <span className="text-[#86868B] italic">n.a.</span></>
                                        )}
                                      </p>

                                      {/* Line 4-5: Veg (2 lines) */}
                                      <p className="text-[12px] text-[#1D1D1F] min-h-[2.5rem]">
                                        {(getWarmVeggies(vegItem.dish).length > 0 || hasSalad(vegItem.dish)) ? (
                                          <>
                                            <span className="font-medium">Veg:</span>{' '}
                                            {[
                                              ...getWarmVeggies(vegItem.dish),
                                              ...(hasSalad(vegItem.dish) ? [vegItem.dish.salad_name || 'Salad'] : [])
                                            ].join(', ')}
                                          </>
                                        ) : (
                                          <span className="text-transparent">-</span>
                                        )}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-[13px] text-[#86868B] italic">Not available</p>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`border border-[#D2D2D7] rounded-sm overflow-hidden ${isCurrentWeek ? 'shadow-md' : 'shadow-sm opacity-60'}`}>
                    <table className="w-full border-separate" style={{borderSpacing: '0 0'}}>
                      <colgroup>
                        <col className="w-48" />
                        {Object.keys(currentPortions || {}).map((date) => (
                          <col key={date} className="w-44" />
                        ))}
                      </colgroup>
                      <thead>
                        <tr className="bg-[#0078D4]">
                          <th className="px-5 py-4 text-left text-apple-footnote font-medium text-white border-r border-white/20">
                            Item
                          </th>
                          {Object.entries(currentPortions || {})
                            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                            .map(([date], index, array) => (
                              <th key={date} className={`py-4 ${index < array.length - 1 ? 'border-r border-white/20' : ''}`}>
                                <div className="flex items-baseline justify-center gap-1 text-white">
                                  <span className="text-apple-footnote font-medium">
                                    {format(new Date(date), 'EEE')}
                                  </span>
                                  <span className="text-apple-footnote font-medium">
                                    {format(new Date(date), 'd MMM')}
                                  </span>
                                </div>
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'soup', label: 'Soup' },
                          { key: 'salad_bar', label: 'Salad Bar' },
                          { key: 'hot_dish_meat_fish', label: 'Hot Dish Meat/Fish' },
                          { key: 'hot_dish_veg', label: 'Hot Dish Veg' }
                        ].map(({ key, label }) => (
                          <tr key={key} className="border-b border-[#D2D2D7]">
                            <td className="px-5 py-4 bg-gray-200 border-r border-[#D2D2D7] text-apple-subheadline font-medium text-[#1D1D1F]">
                              {label}
                            </td>
                            {Object.entries(currentPortions || {})
                              .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                              .map(([date, items], dayIndex, array) => {
                                const isEven = dayIndex % 2 === 0;
                                return (
                                  <td
                                    key={date}
                                    className={`py-4 text-center border-r border-[#D2D2D7] last:border-r-0`}
                                    style={{ backgroundColor: isEven ? '#FFFFFF' : '#E2E8F0' }}
                                  >
                                    {isEditing ? (
                                      <div className="flex justify-center">
                                        <HoverNumberInput
                                          value={items[key] || 0}
                                          onChange={(newValue) => handlePortionChange(order.id, date, key, String(newValue))}
                                        />
                                      </div>
                                    ) : (
                                      <span className="text-apple-subheadline text-[#1D1D1F]">{items[key] || 0}</span>
                                    )}
                                  </td>
                                );
                              })}
                          </tr>
                        ))}
                        {hasOffMenuItems && Object.entries(offMenuItems).map(([dishName, portions]) => (
                          <tr key={dishName} className="border-b border-[#D2D2D7] last:border-b-0">
                            <td className="px-5 py-4 bg-gray-200 border-r border-[#D2D2D7] text-apple-subheadline font-medium text-[#1D1D1F] italic">
                              {dishName}
                            </td>
                            {Object.entries(currentPortions || {})
                              .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                              .map(([date], dayIndex, array) => {
                                const isEven = dayIndex % 2 === 0;
                                return (
                                  <td
                                    key={date}
                                    className="py-4 text-center border-r border-[#D2D2D7] last:border-r-0"
                                    style={{ backgroundColor: isEven ? '#FFFFFF' : '#E2E8F0' }}
                                  >
                                    <span className="text-apple-subheadline text-[#1D1D1F]">{portions[date] || 0}</span>
                                  </td>
                                );
                              })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
