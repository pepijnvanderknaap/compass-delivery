'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, addDays, subDays } from 'date-fns';
import type { OrderItem, UserProfile } from '@/lib/types';

interface DailyOrderItem extends OrderItem {
  dishes: { name: string; description: string | null };
  orders: {
    locations: { name: string };
  };
}

export default function KitchenDailyOverviewPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [orderItems, setOrderItems] = useState<DailyOrderItem[]>([]);
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

        if (profileData?.role !== 'kitchen') {
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

  useEffect(() => {
    const fetchDailyOrders = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          dishes(name, description),
          orders(locations(name))
        `)
        .eq('delivery_date', dateStr)
        .order('dishes(name)');

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      setOrderItems(data || []);
    };

    if (!loading) {
      fetchDailyOrders();
    }
  }, [selectedDate, loading, supabase]);

  const groupedByDish = orderItems.reduce((acc, item) => {
    const dishName = item.dishes.name;
    if (!acc[dishName]) {
      acc[dishName] = {
        dish: item.dishes,
        items: [],
        totalPortions: 0,
      };
    }
    acc[dishName].items.push(item);
    acc[dishName].totalPortions += item.portions;
    return acc;
  }, {} as Record<string, { dish: any; items: DailyOrderItem[]; totalPortions: number }>);

  const totalPortions = orderItems.reduce((sum, item) => sum + item.portions, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">Kitchen Daily Overview</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
            >
              ← Previous Day
            </button>
            
            <div className="text-center">
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="text-2xl font-bold text-gray-900 border-0 text-center"
              />
              <p className="text-gray-600 mt-1">
                Total: {totalPortions} portions
              </p>
            </div>

            <button
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
            >
              Next Day →
            </button>
          </div>
        </div>

        {Object.keys(groupedByDish).length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No orders for this date</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDish).map(([dishName, data]) => (
              <div key={dishName} className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-indigo-600 text-white p-4">
                  <h2 className="text-2xl font-bold">{dishName}</h2>
                  {data.dish.description && (
                    <p className="text-indigo-100 mt-1">{data.dish.description}</p>
                  )}
                  <p className="text-indigo-200 mt-2 font-semibold">
                    Total Portions: {data.totalPortions}
                  </p>
                </div>

                <div className="p-4">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Portions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-3 px-4">{item.orders.locations.name}</td>
                          <td className="py-3 px-4 text-right font-medium">{item.portions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
