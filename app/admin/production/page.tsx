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
  mealType?: string;
  componentType?: string;
  isSubHeader?: boolean;
  subHeaderLabel?: string;
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

        // Get active locations - deduplicate by name and sort in custom order
        const { data: locationsData } = await supabase
          .from('locations')
          .select('*')
          .eq('is_active', true);

        // Deduplicate by name (keep first occurrence) and custom sort
        const uniqueLocations = locationsData?.reduce((acc: Location[], loc) => {
          if (!acc.find(l => l.name === loc.name)) {
            acc.push(loc);
          }
          return acc;
        }, []) || [];

        // Custom sort order
        const sortOrder = ['SnapChat 119', 'SnapChat 165', 'Symphonys', 'Atlasian', 'Snowflake', 'JAA Training'];
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
        await fetchProductionData(selectedDate, uniqueLocations);
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

    // Build production rows with aggregated components
    const rows: ProductionRow[] = [];
    const componentAggregation: Record<string, {
      dish: Dish;
      locationOrders: LocationOrders;
      totalPortions: number;
      componentType: string;
      mealType?: string;
    }> = {};

    dishes?.forEach(mainDish => {
      // Get meal type for this dish from menu items
      const mealType = menuItems?.find(item => item.dish_id === mainDish.id)?.meal_type;

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
        totalPortions,
        mealType
      });

      // Aggregate components by dish name and type
      const components = dishComponents?.filter(dc => dc.main_dish_id === mainDish.id) || [];
      components.forEach((comp: any) => {
        if (comp.component_dish) {
          const key = `${comp.component_dish.id}-${comp.component_type}-${mealType}`;

          if (!componentAggregation[key]) {
            componentAggregation[key] = {
              dish: comp.component_dish,
              locationOrders: {},
              totalPortions: 0,
              componentType: comp.component_type,
              mealType
            };
          }

          // Add to aggregated component
          Object.keys(locationOrders).forEach(locId => {
            componentAggregation[key].locationOrders[locId] =
              (componentAggregation[key].locationOrders[locId] || 0) + locationOrders[locId];
          });
          componentAggregation[key].totalPortions += totalPortions;
        }
      });
    });

    // Add aggregated components to rows, grouped by meal type and component type
    Object.values(componentAggregation).forEach(comp => {
      rows.push({
        dish: comp.dish,
        isComponent: true,
        locationOrders: comp.locationOrders,
        totalPortions: comp.totalPortions,
        mealType: comp.mealType,
        componentType: comp.componentType
      });
    });

    setProductionRows(rows);
  };

  const calculateWeight = (portions: number, dish: Dish) => {
    // Just show portions instead of converting to weight/volume
    return `${portions} portions`;
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
        <div className="bg-white rounded-xl border border-black/10 overflow-hidden shadow-sm">
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
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">Item</th>
                    {locations.map(location => (
                      <th key={location.id} className="px-4 py-4 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">
                        {location.name}
                      </th>
                    ))}
                    <th className="px-4 py-4 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-4 text-center text-xs font-bold text-gray-800 uppercase tracking-wider">Weight/Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const soupRows = productionRows.filter(row => row.mealType === 'soup' && !row.isComponent);
                    const soupComponents = productionRows.filter(row => row.mealType === 'soup' && row.isComponent);

                    const hotMeatRows = productionRows.filter(row => row.mealType === 'hot_meat' && !row.isComponent);
                    const hotMeatComponents = productionRows.filter(row => row.mealType === 'hot_meat' && row.isComponent);

                    const hotVegRows = productionRows.filter(row => row.mealType === 'hot_veg' && !row.isComponent);
                    const hotVegComponents = productionRows.filter(row => row.mealType === 'hot_veg' && row.isComponent);

                    // Helper to get components by type
                    const getComponentsByType = (components: ProductionRow[], type: string) =>
                      components.filter(c => c.componentType === type);

                    // Helper to render component section
                    const renderComponentSection = (components: ProductionRow[], type: string, label: string) => {
                      const filtered = getComponentsByType(components, type);
                      if (filtered.length === 0) return null;

                      return (
                        <>
                          <tr className="bg-gray-100/50">
                            <td colSpan={locations.length + 3} className="px-8 py-2">
                              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</h4>
                            </td>
                          </tr>
                          {filtered.map((row, idx) => (
                            <tr
                              key={`${type}-${idx}`}
                              className={`border-b border-gray-100 transition-colors hover:bg-orange-50/20 ${
                                idx % 2 === 0 ? 'bg-orange-50/30' : 'bg-orange-50/15'
                              }`}
                            >
                              <td className="px-8 py-3 text-sm font-medium text-gray-900">
                                <span className="text-orange-500 mr-2">↳</span>
                                {row.dish.name}
                              </td>
                              {locations.map(location => (
                                <td key={location.id} className="px-4 py-3 text-sm text-center text-gray-700 font-medium">
                                  {row.locationOrders[location.id] || '-'}
                                </td>
                              ))}
                              <td className="px-4 py-3 text-sm text-center font-bold text-gray-900">
                                {row.totalPortions}
                              </td>
                              <td className="px-4 py-3 text-sm text-center text-blue-700 font-semibold">
                                {calculateWeight(row.totalPortions, row.dish)}
                              </td>
                            </tr>
                          ))}
                        </>
                      );
                    };

                    return (
                      <>
                        {/* Soup Section */}
                        {soupRows.length > 0 && (
                          <>
                            <tr className="bg-gradient-to-r from-amber-100 to-amber-50">
                              <td colSpan={locations.length + 3} className="px-6 py-3">
                                <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wide">Soup</h3>
                              </td>
                            </tr>
                            {soupRows.map((row, idx) => (
                              <tr
                                key={`soup-main-${idx}`}
                                className={`border-b border-gray-100 transition-colors hover:bg-amber-50/30 ${
                                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                }`}
                              >
                                <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                                  {row.dish.name}
                                </td>
                                {locations.map(location => (
                                  <td key={location.id} className="px-4 py-3.5 text-sm text-center text-gray-700 font-medium">
                                    {row.locationOrders[location.id] || '-'}
                                  </td>
                                ))}
                                <td className="px-4 py-3.5 text-sm text-center font-bold text-gray-900">
                                  {row.totalPortions}
                                </td>
                                <td className="px-4 py-3.5 text-sm text-center text-blue-700 font-semibold">
                                  {calculateWeight(row.totalPortions, row.dish)}
                                </td>
                              </tr>
                            ))}
                            {renderComponentSection(soupComponents, 'topping', 'Soup Toppings')}
                          </>
                        )}

                        {/* Hot Dish - Meat */}
                        {hotMeatRows.length > 0 && (
                          <>
                            <tr className="bg-gradient-to-r from-orange-100 to-orange-50">
                              <td colSpan={locations.length + 3} className="px-6 py-3">
                                <h3 className="text-sm font-bold text-orange-900 uppercase tracking-wide">Hot Dish - Meat</h3>
                              </td>
                            </tr>
                            {hotMeatRows.map((row, idx) => (
                              <tr
                                key={`hot-meat-main-${idx}`}
                                className={`border-b border-gray-100 transition-colors hover:bg-orange-50/30 ${
                                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                }`}
                              >
                                <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                                  {row.dish.name}
                                </td>
                                {locations.map(location => (
                                  <td key={location.id} className="px-4 py-3.5 text-sm text-center text-gray-700 font-medium">
                                    {row.locationOrders[location.id] || '-'}
                                  </td>
                                ))}
                                <td className="px-4 py-3.5 text-sm text-center font-bold text-gray-900">
                                  {row.totalPortions}
                                </td>
                                <td className="px-4 py-3.5 text-sm text-center text-blue-700 font-semibold">
                                  {calculateWeight(row.totalPortions, row.dish)}
                                </td>
                              </tr>
                            ))}
                            {renderComponentSection(hotMeatComponents, 'carb', 'Carbs')}
                            {renderComponentSection(hotMeatComponents, 'warm_veggie', 'Warm Vegetables')}
                            {renderComponentSection(hotMeatComponents, 'salad', 'Salad')}
                            {renderComponentSection(hotMeatComponents, 'condiment', 'Add-ons')}
                          </>
                        )}

                        {/* Hot Dish - Veg */}
                        {hotVegRows.length > 0 && (
                          <>
                            <tr className="bg-gradient-to-r from-orange-100 to-orange-50">
                              <td colSpan={locations.length + 3} className="px-6 py-3">
                                <h3 className="text-sm font-bold text-orange-900 uppercase tracking-wide">Hot Dish - Veg</h3>
                              </td>
                            </tr>
                            {hotVegRows.map((row, idx) => (
                              <tr
                                key={`hot-veg-main-${idx}`}
                                className={`border-b border-gray-100 transition-colors hover:bg-orange-50/30 ${
                                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                }`}
                              >
                                <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                                  {row.dish.name}
                                </td>
                                {locations.map(location => (
                                  <td key={location.id} className="px-4 py-3.5 text-sm text-center text-gray-700 font-medium">
                                    {row.locationOrders[location.id] || '-'}
                                  </td>
                                ))}
                                <td className="px-4 py-3.5 text-sm text-center font-bold text-gray-900">
                                  {row.totalPortions}
                                </td>
                                <td className="px-4 py-3.5 text-sm text-center text-blue-700 font-semibold">
                                  {calculateWeight(row.totalPortions, row.dish)}
                                </td>
                              </tr>
                            ))}
                            {renderComponentSection(hotVegComponents, 'carb', 'Carbs')}
                            {renderComponentSection(hotVegComponents, 'warm_veggie', 'Warm Vegetables')}
                            {renderComponentSection(hotVegComponents, 'salad', 'Salad')}
                            {renderComponentSection(hotVegComponents, 'condiment', 'Add-ons')}
                          </>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
