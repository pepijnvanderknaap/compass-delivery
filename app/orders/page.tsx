'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, addDays, startOfWeek } from 'date-fns';
import Image from 'next/image';
import type { UserProfile } from '@/lib/types';
import HoverNumberInput from '@/components/HoverNumberInput';
import { createOrderItem, createOrderItemsBatch } from './actions';

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
  const router = useRouter();
  const supabase = createClient();

  const fetchOrders = async (profileData: UserProfile) => {
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
      .eq('location_id', profileData.location_id)
      .order('week_start_date', { ascending: true });

    if (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }

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
        await fetchOrders(profileData);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, router]);

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
        salad_bar: 0,
        hot_dish_meat: 0,
        hot_dish_vegetarian: 0
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
    const numValue = parseInt(value) || 0;
    setEditedPortions(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [date]: {
          ...prev[orderId]?.[date],
          [category]: Math.max(0, numValue)
        }
      }
    }));
  };

  const handleSave = async (orderId: string) => {
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

      let updatedCount = 0;
      let createdCount = 0;

      // Collect all updates and inserts
      const updates: Promise<any>[] = [];
      const itemsToCreate: Array<{
        order_id: string;
        dish_id: string;
        delivery_date: string;
        portions: number;
      }> = [];

      // Process each order item
      for (const [date, categories] of Object.entries(portions)) {
        for (const [category, portionCount] of Object.entries(categories)) {
          const orderItem = orders
            .find(o => o.id === orderId)
            ?.order_items.find(item =>
              item.delivery_date === date && item.dishes.category === category
            );

          if (orderItem) {
            // Queue update for existing order item
            console.log(`Updating ${category} for ${date}: ${orderItem.portions} -> ${portionCount}`);
            updates.push(
              supabase
                .from('order_items')
                .update({ portions: portionCount })
                .eq('id', orderItem.id)
            );
            updatedCount++;
          } else if (dishByCategory[category]) {
            // Queue item for batch creation
            console.log(`Queuing ${category} for ${date}: ${portionCount} portions`);
            itemsToCreate.push({
              order_id: orderId,
              dish_id: dishByCategory[category],
              delivery_date: date,
              portions: portionCount
            });
          }
        }
      }

      // Execute all updates in parallel
      if (updates.length > 0) {
        const results = await Promise.all(updates);
        for (const result of results) {
          if (result.error) throw result.error;
        }
      }

      // Batch create all new items
      if (itemsToCreate.length > 0) {
        console.log(`Creating ${itemsToCreate.length} items in batch`);
        const result = await createOrderItemsBatch(itemsToCreate);

        if (result.error) {
          console.error('Batch insert error:', result.error);
          throw new Error(result.error);
        }
        console.log('Created items:', result.data);
        createdCount = itemsToCreate.length;
      }

      console.log(`Save complete: ${updatedCount} updated, ${createdCount} created`);

      // Refresh orders
      if (profile) {
        console.log('Refreshing orders...');
        await fetchOrders(profile);
        console.log('Orders refreshed');
      }

      setEditingOrder(null);
    } catch (err) {
      console.error('Error saving order:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingOrder(null);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Colored header banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 py-6">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h1 className="text-5xl font-extralight text-white tracking-[0.3em] uppercase" style={{ fontFamily: "'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, sans-serif" }}>
            DELIVERY
          </h1>
        </div>
      </div>

      {/* White navigation bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="text-2xl font-light text-gray-700">
              Orders {profile?.locations ? `· ${(profile.locations as any).name}` : ''}
            </div>
            <button
              onClick={() => router.push('/location-management')}
              className="px-6 py-2 text-sm font-medium bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-10">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No orders found</p>
            <button
              onClick={() => router.push('/orders/new')}
              className="px-6 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors"
            >
              Create New Order
            </button>
          </div>
        ) : (
          <div className="space-y-6">
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
                // Initialize with 0 for all categories
                groupedItems[dateStr] = {
                  soup: 0,
                  salad_bar: 0,
                  hot_dish_meat: 0,
                  hot_dish_vegetarian: 0
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
                  groupedItems[item.delivery_date][item.dishes.category] = item.portions;
                }
              });

              const currentPortions = isEditing ? editedPortions[order.id] : groupedItems;
              const hasOffMenuItems = Object.keys(offMenuItems).length > 0;

              // Check if this order is for the current week
              const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
              const orderWeekStart = startOfWeek(new Date(order.week_start_date), { weekStartsOn: 1 });
              const isCurrentWeek = format(orderWeekStart, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd');

              return (
                <div key={order.id} className={`bg-white rounded-2xl overflow-hidden ${isCurrentWeek ? 'border-2 border-teal-500 shadow-lg' : 'border border-black/10'}`}>
                  <div className={`px-6 py-4 border-b flex justify-between items-center ${isCurrentWeek ? 'bg-gradient-to-r from-teal-600 to-teal-700 border-teal-600' : 'bg-black/[0.02] border-black/5'}`}>
                    <div>
                      <h2 className={`text-lg font-semibold flex items-center gap-3 ${isCurrentWeek ? 'text-white' : 'text-gray-900'}`}>
                        {isCurrentWeek && <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">Current Week</span>}
                        {formatWeekRange(order.week_start_date)}
                      </h2>
                      <p className={`text-sm ${isCurrentWeek ? 'text-white/80' : 'text-gray-600'}`}>
                        Ordered on {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleCancel()}
                            disabled={saving}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSave(order.id)}
                            disabled={saving}
                            className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEdit(order.id, order)}
                          className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-black/5">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-black/50 uppercase">
                            Item
                          </th>
                          {Object.entries(currentPortions || {})
                            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                            .map(([date]) => (
                              <th key={date} className="px-4 py-3 text-center">
                                <div className="text-xs font-semibold text-black/90">
                                  {format(new Date(date), 'EEE')}
                                </div>
                                <div className="text-xs text-black/40 font-normal mt-0.5">
                                  {format(new Date(date), 'MMM d')}
                                </div>
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'soup', label: 'Soup' },
                          { key: 'salad_bar', label: 'Salad Bar' },
                          { key: 'hot_dish_meat', label: 'Hot Dish Meat' },
                          { key: 'hot_dish_vegetarian', label: 'Hot Dish Veg' }
                        ].map(({ key, label }) => (
                          <tr key={key} className="border-b border-black/5">
                            <td className="px-4 py-3 text-sm font-medium text-black/70">
                              {label}
                            </td>
                            {Object.entries(currentPortions || {})
                              .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                              .map(([date, items]) => (
                                <td key={date} className="px-4 py-3 text-center">
                                  {isEditing ? (
                                    <div className="flex justify-center">
                                      <HoverNumberInput
                                        value={items[key] || 0}
                                        onChange={(newValue) => handlePortionChange(order.id, date, key, String(newValue))}
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-sm text-black/60">{items[key] || 0}</span>
                                  )}
                                </td>
                              ))}
                          </tr>
                        ))}
                        {hasOffMenuItems && Object.entries(offMenuItems).map(([dishName, portions]) => (
                          <tr key={dishName} className="border-b border-black/5 last:border-0 bg-amber-50/30">
                            <td className="px-4 py-3 text-sm font-medium text-black/70 italic">
                              {dishName}
                            </td>
                            {Object.entries(currentPortions || {})
                              .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                              .map(([date]) => (
                                <td key={date} className="px-4 py-3 text-center">
                                  <span className="text-sm text-black/60">{portions[date] || 0}</span>
                                </td>
                              ))}
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
