'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, addDays } from 'date-fns';

export default function FixOrdersPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fixOrders = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('Starting to fix existing orders...');

      // Get all orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, week_start_date, location_id, locations(name)');

      if (ordersError) {
        throw new Error(`Error fetching orders: ${ordersError.message}`);
      }

      console.log(`Found ${orders?.length || 0} orders to fix`);

      // Get dishes for each category
      const { data: dishes, error: dishesError } = await supabase
        .from('dishes')
        .select('id, category')
        .eq('is_active', true);

      if (dishesError) {
        throw new Error(`Error fetching dishes: ${dishesError.message}`);
      }

      const dishByCategory: Record<string, string> = {};
      dishes?.forEach(dish => {
        if (!dishByCategory[dish.category]) {
          dishByCategory[dish.category] = dish.id;
        }
      });

      // Location-based presets
      const locationPresets: Record<string, number> = {
        'Snapchat 119': 75,
        'Snapchat 165': 25,
        'Symphony': 80,
        'Atlassian': 100,
        'Snowflake': 55,
        'JAA Training': 30
      };

      const categories = ['soup', 'hot_dish_meat', 'hot_dish_fish', 'hot_dish_veg'];
      const resultsList = [];

      for (const order of orders || []) {
        const locationName = (order.locations as any)?.name || '';
        const defaultPortions = locationPresets[locationName] || 75;

        console.log(`Processing order ${order.id} - ${locationName} (${defaultPortions} portions)`);

        // Check existing order items
        const { data: existingItems } = await supabase
          .from('order_items')
          .select('id, delivery_date, dishes(category)')
          .eq('order_id', order.id);

        // Create order items for all 5 days and 4 categories
        const orderItems = [];
        for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
          const deliveryDate = format(addDays(new Date(order.week_start_date), dayIndex), 'yyyy-MM-dd');

          for (const category of categories) {
            // Check if order item already exists
            const exists = existingItems?.some(
              item => item.delivery_date === deliveryDate && (item.dishes as any)?.category === category
            );

            if (!exists && dishByCategory[category]) {
              orderItems.push({
                order_id: order.id,
                dish_id: dishByCategory[category],
                delivery_date: deliveryDate,
                portions: defaultPortions,
              });
            }
          }
        }

        if (orderItems.length > 0) {
          console.log(`Creating ${orderItems.length} missing order items`);
          const { error: insertError } = await supabase
            .from('order_items')
            .insert(orderItems);

          if (insertError) {
            resultsList.push({
              orderId: order.id,
              location: locationName,
              week: order.week_start_date,
              status: 'error',
              error: insertError.message
            });
          } else {
            resultsList.push({
              orderId: order.id,
              location: locationName,
              week: order.week_start_date,
              status: 'success',
              itemsCreated: orderItems.length
            });
          }
        } else {
          resultsList.push({
            orderId: order.id,
            location: locationName,
            week: order.week_start_date,
            status: 'skipped',
            reason: 'all items exist'
          });
        }
      }

      setResults({
        totalOrders: orders?.length || 0,
        results: resultsList
      });

    } catch (err: any) {
      console.error('Error fixing orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-sm shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Fix Existing Orders</h1>
          <p className="text-gray-600 mb-6">
            This tool will add missing order items to all existing orders with default portion values based on location.
          </p>

          <button
            onClick={fixOrders}
            disabled={loading}
            className="px-6 py-3 bg-teal-600 text-white rounded-sm hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Fix All Orders'}
          </button>

          <button
            onClick={() => router.push('/orders')}
            className="ml-4 px-6 py-3 bg-gray-200 text-gray-700 rounded-sm hover:bg-gray-300 transition-colors"
          >
            Back to Orders
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-sm">
              <p className="text-red-900 font-medium">Error:</p>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {results && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Results: {results.totalOrders} orders processed
              </h2>
              <div className="space-y-2">
                {results.results.map((result: any, index: number) => (
                  <div
                    key={index}
                    className={`p-4 rounded-sm border ${
                      result.status === 'success'
                        ? 'bg-green-50 border-green-200'
                        : result.status === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {result.location} - Week of {result.week}
                        </p>
                        <p className="text-sm text-gray-600">
                          {result.status === 'success' && `Created ${result.itemsCreated} order items`}
                          {result.status === 'skipped' && result.reason}
                          {result.status === 'error' && result.error}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          result.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : result.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {result.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
