'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, addDays, addWeeks, startOfWeek, getWeek } from 'date-fns';
import Image from 'next/image';
import type { UserProfile } from '@/lib/types';
import HoverNumberInput from '@/components/HoverNumberInput';
import { createOrderItem, createOrderItemsBatch, updateOrderItem, ensureFourWeeksAhead, clearWeekOrders } from './actions';
import UniversalHeader from '@/components/UniversalHeader';
import SetDefaultWeekModal from './components/SetDefaultWeekModal';

interface OrderWithItems {
  id: string;
  week_start_date: string;
  created_at: string;
  order_items: {
    id: string;
    delivery_date: string;
    portions: number;
    dishes: {
      name: string;
      category: string;
    };
  }[];
}

export default function OrdersPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editedPortions, setEditedPortions] = useState<Record<string, Record<string, Record<string, number>>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showDefaultWeekModal, setShowDefaultWeekModal] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleEnsureFourWeeksAhead = async (locationId: string) => {
    // Calculate week dates on client side to avoid timezone issues
    // Use noon to avoid timezone boundary issues
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

  const fetchOrders = async (locationId: string) => {
    console.log(`Fetching orders for location: ${locationId}`);

    // First ensure 4 weeks ahead exist
    await handleEnsureFourWeeksAhead(locationId);

    // Then fetch all orders
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
    setOrders(ordersData as any || []);
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

        // Fetch all locations if admin (exclude Dark Kitchen - production only)
        if (profileData.role === 'admin') {
          const { data: locationsData } = await supabase
            .from('locations')
            .select('id, name')
            .neq('name', 'Dark Kitchen')
            .order('name');

          setLocations(locationsData || []);
        }

        // Set initial selected location
        setSelectedLocationId(profileData.location_id);
        await fetchOrders(profileData.location_id);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  // Location-based presets
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

    // Initialize edited portions from current order
    const portions: Record<string, Record<string, number>> = {};
    const locationName = (profile?.locations as any)?.name || '';
    const preset = locationPresets[locationName] || 0;

    // Get all dates for the week and initialize with 0
    const weekStart = new Date(order.week_start_date);
    for (let i = 0; i < 5; i++) {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      portions[dateStr] = {
        soup: 0,
        hot_dish_meat: 0,
        hot_dish_fish: 0,
        hot_dish_veg: 0
      };
    }

    // Fill in actual values from order items
    order.order_items.forEach((item) => {
      if (portions[item.delivery_date] && item.dishes.category !== 'off_menu') {
        // Always use the existing value from the database
        portions[item.delivery_date][item.dishes.category] = item.portions;
      }
    });

    setEditedPortions({ ...editedPortions, [orderId]: portions });
  };

  const handlePortionChange = (orderId: string, date: string, category: string, value: string) => {
    // Allow empty string, otherwise parse to number
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

    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Set new timeout for autosave (1.5 seconds after user stops typing)
    const timeout = setTimeout(() => {
      handleSave(orderId);
    }, 1500);

    setAutoSaveTimeout(timeout);
  };

  const handleSave = async (orderId: string, shouldRefresh: boolean = false) => {
    setSaving(true);
    try {
      const portions = editedPortions[orderId];
      console.log('Saving portions:', portions);

      // Get all active dishes by category
      const { data: dishes, error: dishesError } = await supabase
        .from('dishes')
        .select('id, category')
        .eq('is_active', true);

      if (dishesError) throw dishesError;

      const dishByCategory: Record<string, string> = {};
      dishes?.forEach(dish => {
        if (!dishByCategory[dish.category]) {
          dishByCategory[dish.category] = dish.id;
        }
      });

      console.log('Available dishes by category:', dishByCategory);

      // Collect all operations to batch them
      const updatePromises = [];
      const createPromises = [];

      for (const [date, categories] of Object.entries(portions)) {
        for (const [category, portionCount] of Object.entries(categories)) {
          // Handle combined meat_fish category
          let actualCategory = category;
          if (category === 'hot_dish_meat_fish') {
            // Check if there's an existing meat or fish item for this date
            const orderItems = orders.find(o => o.id === orderId)?.order_items || [];
            const existingMeat = orderItems.find(item =>
              item.delivery_date === date && item.dishes.category === 'hot_dish_meat'
            );
            const existingFish = orderItems.find(item =>
              item.delivery_date === date && item.dishes.category === 'hot_dish_fish'
            );

            // Use whichever exists, or default to meat
            actualCategory = existingMeat ? 'hot_dish_meat' : (existingFish ? 'hot_dish_fish' : 'hot_dish_meat');
          }

          const orderItem = orders
            .find(o => o.id === orderId)
            ?.order_items.find(item =>
              item.delivery_date === date && item.dishes.category === actualCategory
            );

          if (orderItem) {
            // Collect update operation
            console.log(`Queuing update: ${actualCategory} for ${date}: ${orderItem.portions} -> ${portionCount}`);
            updatePromises.push(
              updateOrderItem({
                id: orderItem.id,
                portions: portionCount
              })
            );
          } else if (portionCount > 0) {
            if (!dishByCategory[actualCategory]) {
              console.warn(`No active dish found for category: ${actualCategory}. Skipping creation.`);
              continue;
            }

            // Collect create operation
            console.log(`Queuing create: ${actualCategory} for ${date}: ${portionCount} portions`);
            createPromises.push(
              createOrderItem({
                order_id: orderId,
                dish_id: dishByCategory[actualCategory],
                delivery_date: date,
                portions: portionCount
              })
            );
          }
        }
      }

      // Execute all operations in parallel
      console.log(`Executing ${updatePromises.length} updates and ${createPromises.length} creates in parallel...`);
      const [updateResults, createResults] = await Promise.all([
        Promise.all(updatePromises),
        Promise.all(createPromises)
      ]);

      // Check for errors
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

      // Only refresh orders if requested (when clicking Done, not during autosave)
      if (shouldRefresh && selectedLocationId) {
        console.log('Refreshing orders...');
        await fetchOrders(selectedLocationId);
        console.log('Orders refreshed');
        setEditingOrder(null); // Exit edit mode after manual save
      }

      // Don't refresh or exit edit mode during autosave - user is still editing
    } catch (err) {
      console.error('Error saving order:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDone = async (orderId: string) => {
    // Clear any pending autosave
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
      setAutoSaveTimeout(null);
    }

    // Do final save with refresh to exit edit mode cleanly
    await handleSave(orderId, true);
  };

  const handleClearWeek = async (orderId: string, weekRange: string) => {
    const confirmed = window.confirm(`Are you sure you want to clear all orders for ${weekRange}? This will delete all portions.`);

    if (!confirmed) return;

    const result = await clearWeekOrders(orderId);

    if (result.error) {
      alert(`Failed to clear week: ${result.error}`);
    } else {
      // Refresh orders to show the cleared week
      if (selectedLocationId) {
        await fetchOrders(selectedLocationId);
      }
    }
  };

  const handleLocationChange = async (newLocationId: string) => {
    setSelectedLocationId(newLocationId);
    setLoading(true);
    try {
      await fetchOrders(newLocationId);
    } catch (err) {
      console.error('Error switching location:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatWeekRange = (weekStartDate: string) => {
    const startDate = new Date(weekStartDate);
    const endDate = addDays(startDate, 4); // Friday

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

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  return (
    <div className="min-h-screen bg-white font-apple">
      <UniversalHeader
        title="Orders"
        backPath="/location-management"
      />

      {/* Location Switcher for Admins */}
      {profile?.role === 'admin' && locations.length > 0 && (
        <div className="max-w-6xl mx-auto px-8 lg:px-12 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label htmlFor="location-select" className="text-apple-subheadline text-slate-600">
                Viewing orders for:
              </label>
              <select
                id="location-select"
                value={selectedLocationId}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="px-4 py-2 text-apple-subheadline font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue/20 focus:border-apple-blue bg-white text-slate-700"
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowDefaultWeekModal(true)}
              className="px-4 py-2 text-apple-footnote text-apple-blue hover:text-apple-blue-hover transition-colors"
            >
              Set Default Week
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-8 lg:px-12 py-10">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-apple-body text-slate-600 mb-4">No orders found</p>
            <button
              onClick={() => router.push('/orders/new')}
              className="px-6 py-3 text-apple-subheadline font-medium text-white bg-apple-blue hover:bg-apple-blue-hover rounded-lg transition-colors"
            >
              Create New Order
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order) => {
              const isEditing = editingOrder === order.id;
              const groupedItems: Record<string, Record<string, number>> = {};

              // Get all dates for the week
              const weekStart = new Date(order.week_start_date);
              const allDates: string[] = [];
              for (let i = 0; i < 5; i++) {
                const date = addDays(weekStart, i);
                const dateStr = format(date, 'yyyy-MM-dd');
                allDates.push(dateStr);
                // Initialize with 0 for all categories (meat_fish is combined)
                groupedItems[dateStr] = {
                  soup: 0,
                  hot_dish_meat_fish: 0,
                  hot_dish_veg: 0
                };
              }

              // Collect off-menu items
              const offMenuItems: Record<string, Record<string, number>> = {};

              // Fill in actual values
              order.order_items.forEach((item) => {
                if (item.dishes.category === 'off_menu') {
                  const dishName = item.dishes.name;
                  if (!offMenuItems[dishName]) {
                    offMenuItems[dishName] = {};
                    allDates.forEach(date => offMenuItems[dishName][date] = 0);
                  }
                  offMenuItems[dishName][item.delivery_date] = item.portions;
                } else if (groupedItems[item.delivery_date]) {
                  // Combine meat and fish into hot_dish_meat_fish
                  if (item.dishes.category === 'hot_dish_meat' || item.dishes.category === 'hot_dish_fish') {
                    groupedItems[item.delivery_date]['hot_dish_meat_fish'] = item.portions;
                  } else {
                    groupedItems[item.delivery_date][item.dishes.category] = item.portions;
                  }
                }
              });

              const currentPortions = isEditing ? editedPortions[order.id] : groupedItems;
              const hasOffMenuItems = Object.keys(offMenuItems).length > 0;

              // Check if this order is for the current week
              const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
              const orderWeekStart = startOfWeek(new Date(order.week_start_date), { weekStartsOn: 1 });
              const isCurrentWeek = format(orderWeekStart, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd');

              return (
                <div key={order.id}>
                  {/* Floating header text above the box */}
                  <div className="px-5 py-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-apple-headline font-medium italic text-slate-700">
                        {formatWeekRange(order.week_start_date)}
                      </h3>
                      <span className="text-apple-footnote font-medium italic tracking-wider text-slate-500">
                        (Week {getWeek(new Date(order.week_start_date), { weekStartsOn: 1 })})
                      </span>
                      <div className="flex gap-2 ml-auto items-center">
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
                              className="px-3 py-1.5 text-apple-subheadline font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Done
                            </button>
                          </>
                        ) : (
                          <>
                            {order.order_items.length > 0 && (
                              <button
                                onClick={() => handleClearWeek(order.id, formatWeekRange(order.week_start_date))}
                                className="px-3 py-1.5 text-apple-subheadline font-medium text-red-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                              >
                                Clear
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(order.id, order)}
                              className="px-3 py-1.5 text-apple-subheadline font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Container for teal header and data table with tiny gap */}
                  <div className="space-y-2">
                    {/* Teal header box - separate and detached */}
                    <div className={`border rounded-lg overflow-hidden ${isCurrentWeek ? "border-[#0d9488] border-2 bg-[#0d9488]" : "border-slate-300 bg-slate-200"}`}>
                      <table className="w-full border-separate" style={{borderSpacing: '0 0'}}>
                        <colgroup>
                          <col className="w-48" />
                          <col className="w-16" />
                          {Object.keys(currentPortions || {}).map((date) => (
                            <col key={date} className="w-32" />
                          ))}
                        </colgroup>
                        <thead>
                          <tr>
                            <th className={`px-5 py-4 text-left text-apple-footnote font-semibold uppercase tracking-wide ${isCurrentWeek ? 'text-white' : 'text-slate-600'}`}>
                              Item
                            </th>
                            <th></th>
                            {Object.entries(currentPortions || {})
                              .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                              .map(([date]) => (
                                <th key={date} className="py-4">
                                  <div className={`flex items-baseline justify-center gap-1 ${isCurrentWeek ? 'text-white' : 'text-slate-600'}`}>
                                    <span className="text-apple-footnote font-medium uppercase tracking-wide">
                                      {format(new Date(date), 'EEE')}
                                    </span>
                                    <span className={`text-apple-caption font-light ${isCurrentWeek ? 'text-white/70' : 'text-slate-400'}`}>
                                      {format(new Date(date), 'd MMM')}
                                    </span>
                                  </div>
                                </th>
                              ))}
                          </tr>
                        </thead>
                      </table>
                    </div>

                  {/* Data table box - separate with tiny gap */}
                  <div className="overflow-hidden bg-slate-100 pb-4 border border-slate-300 rounded-xl">
                    <table className="w-full bg-slate-100 border-separate" style={{borderSpacing: '0 0'}}>
                      <colgroup>
                        <col className="w-48" />
                        <col className="w-16" />
                        {Object.keys(currentPortions || {}).map((date, i) => (
                          <col key={date} className="w-32" />
                        ))}
                      </colgroup>
                      <tbody className="divide-y divide-slate-100">
                        {[
                          { key: 'soup', label: 'Soup' },
                          { key: 'hot_dish_meat_fish', label: 'Hot Dish Meat/Fish' },
                          { key: 'hot_dish_veg', label: 'Hot Dish Veg' }
                        ].map(({ key, label }) => (
                          <tr key={key} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4 text-apple-subheadline font-medium text-slate-700">
                              {label}
                            </td>
                            <td></td>
                            {Object.entries(currentPortions || {})
                              .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                              .map(([date, items]) => (
                                <td key={date} className="py-4 text-center">
                                  {isEditing ? (
                                    <div className="flex justify-center">
                                      <HoverNumberInput
                                        value={items[key] || 0}
                                        onChange={(newValue) => handlePortionChange(order.id, date, key, String(newValue))}
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-apple-subheadline text-slate-600">{items[key] || 0}</span>
                                  )}
                                </td>
                              ))}
                          </tr>
                        ))}
                        {hasOffMenuItems && Object.entries(offMenuItems).map(([dishName, portions]) => (
                          <tr key={dishName} className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                            <td className="px-5 py-4 text-apple-subheadline font-medium text-slate-700 italic">
                              {dishName}
                            </td>
                            <td></td>
                            {Object.entries(currentPortions || {})
                              .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                              .map(([date]) => (
                                <td key={date} className="py-4 text-center">
                                  <span className="text-apple-subheadline text-slate-600">{portions[date] || 0}</span>
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Set Default Week Modal */}
      {selectedLocationId && (
        <SetDefaultWeekModal
          locationId={selectedLocationId}
          locationName={locations.find(l => l.id === selectedLocationId)?.name || ''}
          isOpen={showDefaultWeekModal}
          onClose={() => setShowDefaultWeekModal(false)}
        />
      )}
    </div>
  );
}
