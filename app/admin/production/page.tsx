'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, addDays, startOfWeek } from 'date-fns';
import type { UserProfile, Dish, Location, DishWithComponents } from '@/lib/types';

interface LocationOrders {
  [locationId: string]: number; // portions
}

interface ProductionRow {
  dish: Dish;
  isComponent: boolean;
  parentDish?: string;
  locationOrders: LocationOrders;
  totalPortions: number;
}

export default function ProductionSheetsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [locations, setLocations] = useState<Location[]>([]);
  const [productionRows, setProductionRows] = useState<ProductionRow[]>([]);
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

        // Get active locations
        const { data: locationsData } = await supabase
          .from('locations')
          .select('*')
          .eq('is_active', true)
          .order('name');

        setLocations(locationsData || []);
        await fetchProductionData(selectedDate, locationsData || []);
      } catch (err) {
        console.error('Error initializing page:', err);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [supabase, router]);

  useEffect(() => {
    if (profile && locations.length > 0) {
      fetchProductionData(selectedDate, locations);
    }
  }, [selectedDate]);

  const fetchProductionData = async (date: Date, locs: Location[]) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');

    // Get menu for the week
    const { data: weeklyMenu } = await supabase
      .from('weekly_menus')
      .select('id')
      .eq('week_start_date', weekStart)
      .single();

    if (!weeklyMenu) {
      setProductionRows([]);
      return;
    }

    // Get menu items for this date
    const dayOfWeek = (date.getDay() + 6) % 7;
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

    // Get main dishes with components
    const { data: dishes } = await supabase
      .from('dishes')
      .select('*')
      .in('id', dishIds);

    // Get components for each main dish
    const { data: dishComponents } = await supabase
      .from('dish_components')
      .select('*, component_dish:dishes!component_dish_id(*)')
      .in('main_dish_id', dishIds);

    // Get orders for this date
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('dish_id, portions, orders(location_id)')
      .eq('delivery_date', dateStr)
      .in('dish_id', dishIds);

    // Build production rows
    const rows: ProductionRow[] = [];

    dishes?.forEach(mainDish => {
      // Get orders for this main dish grouped by location
      const locationOrders: LocationOrders = {};
      let totalPortions = 0;

      const dishOrderItems = orderItems?.filter(item => item.dish_id === mainDish.id) || [];
      dishOrderItems.forEach((item: any) => {
        if (item.orders?.location_id) {
          locationOrders[item.orders.location_id] = (locationOrders[item.orders.location_id] || 0) + item.portions;
          totalPortions += item.portions;
        }
      });

      // Add main dish row
      rows.push({
        dish: mainDish,
        isComponent: false,
        locationOrders,
        totalPortions
      });

      // Add component rows
      const components = dishComponents?.filter(dc => dc.main_dish_id === mainDish.id) || [];
      components.forEach((comp: any) => {
        if (comp.component_dish) {
          rows.push({
            dish: comp.component_dish,
            isComponent: true,
            parentDish: mainDish.name,
            locationOrders: locationOrders, // Components have same distribution as main dish
            totalPortions: totalPortions
          });
        }
      });
    });

    setProductionRows(rows);
  };

  const calculateWeight = (portions: number, dish: Dish) => {
    if (dish.default_portion_size_ml) {
      const liters = (portions * dish.default_portion_size_ml) / 1000;
      return `${liters.toFixed(2)}L`;
    }
    if (dish.default_portion_size_g) {
      const kg = (portions * dish.default_portion_size_g) / 1000;
      return `${kg.toFixed(2)}kg`;
    }
    return '-';
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
        <div className="max-w-full mx-auto px-6 lg:px-8">
          <h1 className="text-5xl font-extralight text-white tracking-[0.3em] uppercase" style={{ fontFamily: "'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, sans-serif" }}>
            DELIVERY
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-full mx-auto px-6 lg:px-8">
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

      <main className="max-w-full mx-auto px-6 lg:px-8 py-10">
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

        {/* Production Table */}
        <div className="bg-white rounded-xl border border-black/10 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-500/90 to-blue-600/90">
            <h2 className="text-xl font-semibold text-white">
              Production for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h2>
          </div>

          {productionRows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No production scheduled for this date</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item</th>
                    {locations.map(location => (
                      <th key={location.id} className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                        {location.name}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Total</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Weight/Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productionRows.map((row, idx) => (
                    <tr key={idx} className={row.isComponent ? 'bg-blue-50/30' : 'bg-white'}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {row.isComponent && <span className="text-gray-500 mr-2">↳</span>}
                        {row.dish.name}
                      </td>
                      {locations.map(location => (
                        <td key={location.id} className="px-6 py-4 text-sm text-center text-gray-700">
                          {row.locationOrders[location.id] || '-'}
                        </td>
                      ))}
                      <td className="px-6 py-4 text-sm text-center font-semibold text-gray-900">
                        {row.totalPortions}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-700 font-medium">
                        {calculateWeight(row.totalPortions, row.dish)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
