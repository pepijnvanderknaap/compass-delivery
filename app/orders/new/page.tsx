'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { startOfWeek, addDays, format, addWeeks } from 'date-fns';
import Image from 'next/image';
import type { UserProfile } from '@/lib/types';

interface WeeklyOrderData {
  soup: number[];
  hot_dish_fish: number[];
  hot_dish_meat: number[];
  hot_dish_veg: number[];
  off_menu: number[];
}

interface OffMenuItem {
  id: string;
  label: string;
  unit: string;
  portions: number[];
}

export default function NewOrderPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<Date>(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1));
  const [orderData, setOrderData] = useState<WeeklyOrderData>({
    soup: [0, 0, 0, 0, 0],
    hot_dish_fish: [0, 0, 0, 0, 0],
    hot_dish_meat: [0, 0, 0, 0, 0],
    hot_dish_veg: [0, 0, 0, 0, 0],
    off_menu: [0, 0, 0, 0, 0],
  });
  const [offMenuItems, setOffMenuItems] = useState<OffMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dishCategories = [
    { key: 'soup' as const, label: 'Soup', unit: 'portions' },
    { key: 'hot_dish_fish' as const, label: 'Salad Bar', unit: 'portions' },
    { key: 'hot_dish_meat' as const, label: 'Hot Dish Meat/Fish', unit: 'portions' },
    { key: 'hot_dish_veg' as const, label: 'Hot Dish Vegetarian', unit: 'portions' },
  ];

  const addOffMenuItem = () => {
    const newItem: OffMenuItem = {
      id: `off_menu_${Date.now()}`,
      label: '',
      unit: 'portions',
      portions: [0, 0, 0, 0, 0]
    };
    setOffMenuItems([...offMenuItems, newItem]);
  };

  const updateOffMenuLabel = (id: string, label: string) => {
    setOffMenuItems(items =>
      items.map(item => item.id === id ? { ...item, label } : item)
    );
  };

  const updateOffMenuUnit = (id: string, unit: string) => {
    setOffMenuItems(items =>
      items.map(item => item.id === id ? { ...item, unit } : item)
    );
  };

  const updateOffMenuPortion = (id: string, dayIndex: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setOffMenuItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, portions: item.portions.map((v, i) => i === dayIndex ? Math.max(0, numValue) : v) }
          : item
      )
    );
  };

  const removeOffMenuItem = (id: string) => {
    setOffMenuItems(items => items.filter(item => item.id !== id));
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
          .select('*, locations(name)')
          .eq('id', user.id)
          .single();

        if (profileData?.role !== 'manager') {
          router.push('/dashboard');
          return;
        }

        setProfile(profileData);
      } catch (err) {
        console.error('Error initializing page:', err);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [supabase, router]);

  const handlePortionChange = (category: keyof WeeklyOrderData, dayIndex: number, value: string) => {
    const numValue = parseInt(value) || 0;
    setOrderData(prev => ({
      ...prev,
      [category]: prev[category].map((v, i) => i === dayIndex ? Math.max(0, numValue) : v)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      console.log('Starting order submission...');

      if (!profile?.location_id) {
        throw new Error('No location associated with your account');
      }

      const weekStart = format(selectedWeek, 'yyyy-MM-dd');
      console.log('Week start:', weekStart);

      // Check if order already exists
      console.log('Checking for existing order...');
      const { data: existingOrder, error: checkError } = await supabase
        .from('orders')
        .select('id')
        .eq('location_id', profile.location_id)
        .eq('week_start_date', weekStart)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing order:', checkError);
        throw checkError;
      }

      if (existingOrder) {
        console.log('Order already exists');
        setMessage({ type: 'error', text: 'An order for this week already exists' });
        setSubmitting(false);
        return;
      }

      // Create order
      console.log('Creating new order...');
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          location_id: profile.location_id,
          week_start_date: weekStart,
          created_by: profile.id,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw orderError;
      }
      console.log('Order created:', order);

      // Get dish IDs for each category
      const { data: dishes } = await supabase
        .from('dishes')
        .select('id, category')
        .eq('is_active', true);

      if (!dishes) throw new Error('No dishes found');

      const dishByCategory: Record<string, string> = {};
      dishes.forEach(dish => {
        if (!dishByCategory[dish.category]) {
          dishByCategory[dish.category] = dish.id;
        }
      });

      // Create order items for each day and category
      const orderItems = [];
      for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
        const deliveryDate = format(addDays(selectedWeek, dayIndex), 'yyyy-MM-dd');

        dishCategories.forEach(({ key }) => {
          const portions = orderData[key][dayIndex];
          // Always create order items, even with 0 portions
          if (dishByCategory[key]) {
            orderItems.push({
              order_id: order.id,
              dish_id: dishByCategory[key],
              delivery_date: deliveryDate,
              portions: portions,
            });
          }
        });

        // Handle bespoke items
        for (const offMenuItem of offMenuItems) {
          if (offMenuItem.portions[dayIndex] > 0 && offMenuItem.label.trim()) {
            // Create a bespoke dish with unit info in name
            const dishName = `${offMenuItem.label} [${offMenuItem.unit}]`;
            const { data: offMenuDish, error: dishError } = await supabase
              .from('dishes')
              .insert({
                name: dishName,
                category: 'off_menu',
                is_active: true
              })
              .select()
              .single();

            if (dishError) throw dishError;

            orderItems.push({
              order_id: order.id,
              dish_id: offMenuDish.id,
              delivery_date: deliveryDate,
              portions: offMenuItem.portions[dayIndex],
            });
          }
        }
      }

      if (orderItems.length > 0) {
        console.log('Inserting order items:', orderItems);
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      console.log('Order submitted successfully, redirecting...');
      router.push('/dashboard?success=order_submitted');

    } catch (err: any) {
      console.error('Error submitting order:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to submit order' });
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen bg-white">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-end gap-8">
              <Image src="/compass-logo.svg" alt="Compass Group" width={600} height={600} className="h-64 w-auto" priority />
              <div className="border-l-2 border-gray-300 pl-8 pb-20">
                <h1 className="text-xl font-semibold text-gray-900">New Order</h1>
                {profile?.locations && (
                  <p className="text-sm text-gray-600">{(profile.locations as any).name}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => router.push('/orders')}
              className="px-6 py-2 text-sm font-medium bg-teal-600 text-white rounded-sm hover:bg-teal-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-10">
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-sm ${message.type === 'success' ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'} text-sm font-medium`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-black/60 mb-2">
              Week Starting
            </label>
            <input
              type="date"
              value={format(selectedWeek, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedWeek(new Date(e.target.value))}
              className="px-4 py-2.5 border border-black/10 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
            />
          </div>

          <div className="bg-white border border-black/10 rounded-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-black/[0.02]">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-black/50 uppercase tracking-wide">
                    Item
                  </th>
                  {weekDays.map((day, index) => (
                    <th key={day} className="px-4 py-4 text-center">
                      <div className="text-xs font-semibold text-black/90">{day}</div>
                      <div className="text-xs text-black/40 font-normal mt-0.5">
                        {format(addDays(selectedWeek, index), 'MMM d')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {dishCategories.map(({ key, label }) => (
                  <tr key={key} className="hover:bg-black/[0.01] transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-black/70">
                      {label}
                    </td>
                    {[0, 1, 2, 3, 4].map((dayIndex) => (
                      <td key={dayIndex} className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={orderData[key][dayIndex] || ''}
                          onChange={(e) => handlePortionChange(key, dayIndex, e.target.value)}
                          className="w-full px-3 py-2 text-center text-sm border border-black/10 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          placeholder="0"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {offMenuItems.map((item) => (
                  <tr key={item.id} className="hover:bg-black/[0.01] transition-colors bg-amber-50/30">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateOffMenuLabel(item.id, e.target.value)}
                          placeholder="Bespoke Item..."
                          className="flex-1 px-3 py-1.5 text-sm border border-black/10 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => updateOffMenuUnit(item.id, e.target.value)}
                          className="px-3 py-1.5 text-sm border border-black/10 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          <option value="portions">Portions</option>
                          <option value="kilograms">Kilograms</option>
                          <option value="liters">Liters</option>
                          <option value="pieces">Pieces</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeOffMenuItem(item.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                    {[0, 1, 2, 3, 4].map((dayIndex) => (
                      <td key={dayIndex} className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={item.portions[dayIndex] || ''}
                          onChange={(e) => updateOffMenuPortion(item.id, dayIndex, e.target.value)}
                          className="w-full px-3 py-2 text-center text-sm border border-black/10 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          placeholder="0"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td colSpan={6} className="px-6 py-3">
                    <button
                      type="button"
                      onClick={addOffMenuItem}
                      className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 transition-colors"
                    >
                      <span className="text-lg">+</span> Add Bespoke Item
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-teal-600 text-white text-sm font-medium rounded-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {submitting ? 'Submitting...' : 'Submit Order'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
