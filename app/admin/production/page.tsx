'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, addDays, startOfWeek } from 'date-fns';
import type { UserProfile, Dish, Location } from '@/lib/types';

interface OrderSummary {
  location_id: string;
  location_name: string;
  portions: number;
}

interface DishProduction {
  dish: Dish;
  orders: OrderSummary[];
  totalPortions: number;
}

export default function ProductionSheetsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [production, setProduction] = useState<DishProduction[]>([]);
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
        await fetchProductionData(selectedDate);
      } catch (err) {
        console.error('Error initializing page:', err);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [supabase, router]);

  useEffect(() => {
    if (profile) {
      fetchProductionData(selectedDate);
    }
  }, [selectedDate]);

  const fetchProductionData = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    // Get menu for the week
    const { data: weeklyMenu } = await supabase
      .from('weekly_menus')
      .select('id')
      .eq('week_start_date', weekStart)
      .single();

    if (!weeklyMenu) {
      setProduction([]);
      return;
    }

    // Get menu items for this date
    const dayOfWeek = (date.getDay() + 6) % 7; // Convert to Monday = 0
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('dish_id, meal_type')
      .eq('menu_id', weeklyMenu.id)
      .eq('day_of_week', dayOfWeek);

    if (!menuItems || menuItems.length === 0) {
      setProduction([]);
      return;
    }

    const dishIds = menuItems.map(item => item.dish_id);

    // Get dishes
    const { data: dishes } = await supabase
      .from('dishes')
      .select('*')
      .in('id', dishIds);

    // Get orders for this date
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('dish_id, portions, orders(location_id, locations(name))')
      .eq('delivery_date', dateStr)
      .in('dish_id', dishIds);

    // Get locations
    const { data: locations } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true);

    // Organize production data
    const productionMap = new Map<string, DishProduction>();

    dishes?.forEach(dish => {
      const dishOrders: OrderSummary[] = [];
      let totalPortions = 0;

      // Get orders for this dish
      const dishOrderItems = orderItems?.filter(item => item.dish_id === dish.id) || [];

      dishOrderItems.forEach((item: any) => {
        const location = item.orders?.locations;
        if (location) {
          dishOrders.push({
            location_id: item.orders.location_id,
            location_name: location.name,
            portions: item.portions
          });
          totalPortions += item.portions;
        }
      });

      productionMap.set(dish.id, {
        dish,
        orders: dishOrders,
        totalPortions
      });
    });

    setProduction(Array.from(productionMap.values()));
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
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 py-6">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h1 className="text-5xl font-extralight text-white tracking-[0.3em] uppercase" style={{ fontFamily: "'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, sans-serif" }}>
            DELIVERY
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
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

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        {/* Date Picker */}
        <div className="mb-8 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Production Date:</label>
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-4 py-2 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => window.print()}
            className="ml-auto px-6 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors"
          >
            Print
          </button>
        </div>

        {/* Production Summary */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Production for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h2>

          {production.length === 0 ? (
            <div className="bg-white rounded-xl border border-black/10 p-8 text-center">
              <p className="text-gray-500">No production scheduled for this date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {production.map(({ dish, orders, totalPortions }) => (
                <div key={dish.id} className="bg-white rounded-xl border border-black/10 overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-500/90 to-blue-600/90">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">{dish.name}</h3>
                      <span className="px-4 py-1 bg-white/20 rounded-lg text-white font-semibold">
                        Total: {totalPortions} portions
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    {orders.length === 0 ? (
                      <p className="text-gray-500 text-sm">No orders for this dish</p>
                    ) : (
                      <div className="space-y-3">
                        {orders.map((order) => (
                          <div key={order.location_id} className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-900">{order.location_name}</span>
                            <span className="text-gray-700">{order.portions} portions</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {dish.default_portion_size_ml && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          Total volume: <span className="font-semibold">{totalPortions * dish.default_portion_size_ml} ml</span>
                        </p>
                      </div>
                    )}
                    {dish.default_portion_size_g && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          Total weight: <span className="font-semibold">{totalPortions * dish.default_portion_size_g} g</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
