'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import * as XLSX from 'xlsx';
import type { Order, OrderItem, UserProfile } from '@/lib/types';

interface OrderWithItems extends Order {
  locations: { name: string };
  order_items: Array<OrderItem & { dishes: { name: string; base_price: number } }>;
}

export default function InvoicingPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
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
      } catch (err) {
        console.error('Error initializing page:', err);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [supabase, router]);

  useEffect(() => {
    const fetchOrders = async () => {
      const weekStart = format(selectedWeek, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          locations(name),
          order_items(*, dishes(name, base_price))
        `)
        .eq('week_start_date', weekStart)
        .order('locations(name)');

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      setOrders(data || []);
    };

    if (!loading) {
      fetchOrders();
    }
  }, [selectedWeek, loading, supabase]);

  const calculateOrderTotal = (order: OrderWithItems): number => {
    return order.order_items.reduce((sum, item) => {
      return sum + (item.portions * item.dishes.base_price);
    }, 0);
  };

  const calculateGrandTotal = (): number => {
    return orders.reduce((sum, order) => sum + calculateOrderTotal(order), 0);
  };

  const exportToExcel = () => {
    const data = orders.flatMap(order =>
      order.order_items.map(item => ({
        'Location': order.locations.name,
        'Week Starting': format(new Date(order.week_start_date), 'MMM d, yyyy'),
        'Delivery Date': format(new Date(item.delivery_date), 'MMM d, yyyy'),
        'Dish': item.dishes.name,
        'Portions': item.portions,
        'Price per Portion': item.dishes.base_price,
        'Total': item.portions * item.dishes.base_price,
      }))
    );

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');

    // Auto-size columns
    const maxWidth = data.reduce((w: any, r: any) => {
      return Object.keys(r).reduce((w2, key) => {
        const val = r[key]?.toString() || '';
        w2[key] = Math.max(w2[key] || 10, val.length);
        return w2;
      }, w);
    }, {});

    ws['!cols'] = Object.keys(maxWidth).map(key => ({ wch: maxWidth[key] + 2 }));

    XLSX.writeFile(wb, `orders-${format(selectedWeek, 'yyyy-MM-dd')}.xlsx`);
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
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">Invoicing</h1>
            <button
              onClick={() => router.push('/regional-management')}
              className="text-blue-700 hover:text-blue-900"
            >
              Back
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week Starting
              </label>
              <input
                type="date"
                value={format(selectedWeek, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedWeek(new Date(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-2">Grand Total</div>
              <div className="text-3xl font-bold text-gray-900">
                ${calculateGrandTotal().toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={exportToExcel}
            disabled={orders.length === 0}
            className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export to Excel
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No orders found for this week</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">{order.locations.name}</h2>
                    <p className="text-indigo-100">
                      Week of {format(new Date(order.week_start_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-indigo-200">Order Total</div>
                    <div className="text-2xl font-bold">
                      ${calculateOrderTotal(order).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Delivery Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Dish</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Portions</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Price/Portion</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.order_items.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-3 px-4">
                            {format(new Date(item.delivery_date), 'EEE, MMM d')}
                          </td>
                          <td className="py-3 px-4">{item.dishes.name}</td>
                          <td className="py-3 px-4 text-right">{item.portions}</td>
                          <td className="py-3 px-4 text-right">
                            ${item.dishes.base_price.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            ${(item.portions * item.dishes.base_price).toFixed(2)}
                          </td>
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
