'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, startOfWeek, addDays, addWeeks } from 'date-fns';
import type { Dish, UserProfile } from '@/lib/types';

export default function AdminMenusPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [menuData, setMenuData] = useState<Record<string, Record<string, string | null>>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Generate 4 weeks starting from current Monday
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weeks = Array.from({ length: 4 }, (_, i) => addWeeks(startDate, i));
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Determine which week is current (this week)
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const isCurrentWeek = (weekStart: Date) => format(weekStart, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd');

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
        await fetchDishes();
        await loadMenuData();
      } catch (err) {
        console.error('Error initializing page:', err);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [supabase, router]);

  const fetchDishes = async () => {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .eq('is_active', true)
      .neq('category', 'salad_bar')
      .neq('category', 'component')
      .order('name');

    if (error) {
      console.error('Error fetching dishes:', error);
      return;
    }

    setDishes(data || []);
  };

  const loadMenuData = async () => {
    try {
      // Load menu data for all 4 weeks
      const menuDataTemp: Record<string, Record<string, string | null>> = {};

      for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
        const weekStart = format(weeks[weekIndex], 'yyyy-MM-dd');

        // Get or create weekly menu
        let { data: weeklyMenu, error: menuError } = await supabase
          .from('weekly_menus')
          .select('*')
          .eq('week_start_date', weekStart)
          .maybeSingle();

        if (menuError) {
          console.error('Error fetching weekly menu:', menuError);
          continue;
        }

        // If this is week 4 and it doesn't exist, try to copy from week 1 (4 weeks ago)
        if (!weeklyMenu && weekIndex === 3) {
          await copyPreviousWeek();

          // Try to fetch again after copying
          const { data: newMenu } = await supabase
            .from('weekly_menus')
            .select('*')
            .eq('week_start_date', weekStart)
            .maybeSingle();

          weeklyMenu = newMenu;
        }

        if (weeklyMenu) {
          // Load menu items for this week
          const { data: menuItems, error: itemsError } = await supabase
            .from('menu_items')
            .select('*, dishes(*)')
            .eq('menu_id', weeklyMenu.id);

          if (itemsError) {
            console.error('Error fetching menu items:', itemsError);
            continue;
          }

          if (menuItems && menuItems.length > 0) {
            // Organize items by date and meal type
            menuItems.forEach((item: any) => {
              const itemDate = format(addDays(weeks[weekIndex], item.day_of_week), 'yyyy-MM-dd');

              if (!menuDataTemp[itemDate]) {
                menuDataTemp[itemDate] = { soup: null, hot_meat: null, hot_veg: null };
              }

              // Map meal_type to slot name
              if (item.meal_type === 'soup') {
                menuDataTemp[itemDate].soup = item.dish_id;
              } else if (item.meal_type === 'hot_meat') {
                menuDataTemp[itemDate].hot_meat = item.dish_id;
              } else if (item.meal_type === 'hot_veg') {
                menuDataTemp[itemDate].hot_veg = item.dish_id;
              }
            });
          }
        }
      }

      setMenuData(menuDataTemp);
    } catch (err) {
      console.error('Error loading menu data:', err);
    }
  };

  const copyPreviousWeek = async () => {
    try {
      // Get the date 4 weeks ago from the new week we're creating
      const fourWeeksAgo = format(addWeeks(weeks[0], -4), 'yyyy-MM-dd');

      // Get the menu from 4 weeks ago
      const { data: oldMenu } = await supabase
        .from('weekly_menus')
        .select('*, menu_items(*)')
        .eq('week_start_date', fourWeeksAgo)
        .single();

      if (!oldMenu || !oldMenu.menu_items || oldMenu.menu_items.length === 0) {
        return; // Nothing to copy
      }

      // Create new menu for week 4
      const newWeekStart = format(weeks[3], 'yyyy-MM-dd');
      const { data: { user } } = await supabase.auth.getUser();

      const { data: newMenu, error: createError } = await supabase
        .from('weekly_menus')
        .insert({
          week_start_date: newWeekStart,
          created_by: user?.id
        })
        .select()
        .single();

      if (createError || !newMenu) {
        console.error('Error creating new menu:', createError);
        return;
      }

      // Copy menu items
      const itemsToCopy = oldMenu.menu_items.map((item: any) => ({
        menu_id: newMenu.id,
        dish_id: item.dish_id,
        day_of_week: item.day_of_week,
        meal_type: item.meal_type
      }));

      const { error: copyError } = await supabase
        .from('menu_items')
        .insert(itemsToCopy);

      if (copyError) {
        console.error('Error copying menu items:', copyError);
      }
    } catch (err) {
      console.error('Error copying previous week:', err);
    }
  };

  const autoSaveWithData = async (dataToSave: Record<string, Record<string, string | null>>) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Save each week's menu
      for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
        const weekStart = format(weeks[weekIndex], 'yyyy-MM-dd');

        // Get or create weekly menu
        let { data: weeklyMenu, error: menuError } = await supabase
          .from('weekly_menus')
          .select('*')
          .eq('week_start_date', weekStart)
          .maybeSingle();

        if (menuError) {
          console.error('Error fetching weekly menu:', menuError);
          continue;
        }

        if (!weeklyMenu) {
          const { data: newMenu, error: createError } = await supabase
            .from('weekly_menus')
            .insert({
              week_start_date: weekStart,
              created_by: user?.id
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating menu:', createError);
            continue;
          }
          weeklyMenu = newMenu;
        }

        // Delete existing menu items for this week
        const { error: deleteError } = await supabase
          .from('menu_items')
          .delete()
          .eq('menu_id', weeklyMenu.id);

        if (deleteError) {
          console.error('Error deleting old menu items:', deleteError);
        }

        // Insert new menu items
        const itemsToInsert = [];

        for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
          const dateKey = format(addDays(weeks[weekIndex], dayIndex), 'yyyy-MM-dd');
          const dayData = dataToSave[dateKey];

          if (dayData) {
            if (dayData.soup) {
              itemsToInsert.push({
                menu_id: weeklyMenu.id,
                dish_id: dayData.soup,
                day_of_week: dayIndex,
                meal_type: 'soup'
              });
            }
            if (dayData.hot_meat) {
              itemsToInsert.push({
                menu_id: weeklyMenu.id,
                dish_id: dayData.hot_meat,
                day_of_week: dayIndex,
                meal_type: 'hot_meat'
              });
            }
            if (dayData.hot_veg) {
              itemsToInsert.push({
                menu_id: weeklyMenu.id,
                dish_id: dayData.hot_veg,
                day_of_week: dayIndex,
                meal_type: 'hot_veg'
              });
            }
          }
        }

        if (itemsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('menu_items')
            .insert(itemsToInsert);

          if (insertError) {
            console.error('Error inserting menu items:', insertError);
            return;
          }
        }
      }
    } catch (err) {
      console.error('Error saving menu:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveMenuData = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Save each week's menu
      for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
        const weekStart = format(weeks[weekIndex], 'yyyy-MM-dd');

        // Get or create weekly menu
        let { data: weeklyMenu, error: menuError } = await supabase
          .from('weekly_menus')
          .select('*')
          .eq('week_start_date', weekStart)
          .maybeSingle();

        if (menuError) {
          console.error('Error fetching weekly menu:', menuError);
          continue;
        }

        if (!weeklyMenu) {
          const { data: newMenu, error: createError } = await supabase
            .from('weekly_menus')
            .insert({
              week_start_date: weekStart,
              created_by: user?.id
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating menu:', createError);
            continue;
          }
          weeklyMenu = newMenu;
        }

        // Delete existing menu items for this week
        const { error: deleteError } = await supabase
          .from('menu_items')
          .delete()
          .eq('menu_id', weeklyMenu.id);

        if (deleteError) {
          console.error('Error deleting old menu items:', deleteError);
        }

        // Insert new menu items
        const itemsToInsert = [];

        for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
          const dateKey = format(addDays(weeks[weekIndex], dayIndex), 'yyyy-MM-dd');
          const dayData = menuData[dateKey];

          if (dayData) {
            if (dayData.soup) {
              itemsToInsert.push({
                menu_id: weeklyMenu.id,
                dish_id: dayData.soup,
                day_of_week: dayIndex,
                meal_type: 'soup'
              });
            }
            if (dayData.hot_meat) {
              itemsToInsert.push({
                menu_id: weeklyMenu.id,
                dish_id: dayData.hot_meat,
                day_of_week: dayIndex,
                meal_type: 'hot_meat'
              });
            }
            if (dayData.hot_veg) {
              itemsToInsert.push({
                menu_id: weeklyMenu.id,
                dish_id: dayData.hot_veg,
                day_of_week: dayIndex,
                meal_type: 'hot_veg'
              });
            }
          }
        }

        if (itemsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('menu_items')
            .insert(itemsToInsert);

          if (insertError) {
            console.error('Error inserting menu items:', insertError);
            setMessage({ type: 'error', text: `Database error: ${insertError.message}` });
            setTimeout(() => setMessage(null), 5000);
            return;
          }
        }
      }

      setMessage({ type: 'success', text: 'Menu saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error saving menu:', err);
      setMessage({ type: 'error', text: 'Failed to save menu. Please try again.' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const filteredDishes = dishes.filter(dish => {
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' ||
                           dish.category === selectedCategory ||
                           (selectedCategory === 'hot_dish' && dish.category.startsWith('hot_dish_'));
    return matchesSearch && matchesCategory;
  });

  const handleDragStart = (e: React.DragEvent, dishId: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', dishId);
  };

  const handleDrop = async (e: React.DragEvent, weekIndex: number, dayIndex: number, slot: string) => {
    e.preventDefault();
    e.stopPropagation();
    const dishId = e.dataTransfer.getData('text/plain');
    if (!dishId) return;

    const dateKey = format(addDays(weeks[weekIndex], dayIndex), 'yyyy-MM-dd');

    // Update state and trigger auto-save with the new data
    setMenuData(prev => {
      const updated = {
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [slot]: dishId
        }
      };

      // Auto-save after a short delay with the updated data
      setTimeout(() => autoSaveWithData(updated), 500);

      return updated;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getDishById = (dishId: string | null) => {
    if (!dishId) return null;
    return dishes.find(d => d.id === dishId);
  };

  const clearSlot = async (weekIndex: number, dayIndex: number, slot: string) => {
    const dateKey = format(addDays(weeks[weekIndex], dayIndex), 'yyyy-MM-dd');

    // Update state and trigger auto-save with the new data
    setMenuData(prev => {
      const updated = {
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [slot]: null
        }
      };

      // Auto-save after a short delay with the updated data
      setTimeout(() => autoSaveWithData(updated), 500);

      return updated;
    });
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
      <div className="bg-gradient-to-r from-blue-700 to-blue-800 py-6">
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
              4-Week Menu Planner
            </div>
            <button
              onClick={() => router.push('/dark-kitchen')}
              className="px-6 py-2 text-sm font-medium bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-full mx-auto px-6 lg:px-8 py-10">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar with dishes */}
          <div className="col-span-3 bg-white rounded-lg border border-black/10 p-6 h-fit sticky top-24">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Dishes</h2>

            {/* Search */}
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 border border-black/10 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />

            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2.5 border border-black/10 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Dishes</option>
              <option value="soup">Soups</option>
              <option value="hot_dish">Hot Dishes</option>
            </select>

            {/* Dish list */}
            <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
              {filteredDishes.map(dish => (
                <div
                  key={dish.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, dish.id)}
                  className="p-3 bg-gray-50 border border-black/10 rounded-lg cursor-move hover:bg-blue-50 hover:border-blue-400 hover:shadow-sm transition-all"
                >
                  <div className="font-medium text-sm text-gray-900">{dish.name}</div>
                </div>
              ))}
              {filteredDishes.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No dishes found
                </div>
              )}
            </div>
          </div>

          {/* 4-week calendar grid */}
          <div className="col-span-9 space-y-6">
            {weeks.map((weekStart, weekIndex) => {
              const isCurrent = isCurrentWeek(weekStart);
              return (
              <div key={weekIndex} className={`bg-white rounded-lg overflow-hidden ${isCurrent ? 'border-2 border-blue-500 shadow-lg' : 'border border-black/10'}`}>
                <div className={`px-6 py-4 border-b ${isCurrent ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-600' : 'bg-black/[0.02] border-black/5'}`}>
                  <h3 className={`text-lg font-semibold flex items-center gap-3 ${isCurrent ? 'text-white' : 'text-gray-900'}`}>
                    {isCurrent && <span className="px-3 py-1 bg-white/20 rounded-md text-xs font-medium">Current Week</span>}
                    Week {weekIndex + 1}: {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 4), 'MMM d, yyyy')}
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead className="bg-black/[0.02] border-b border-black/5">
                      <tr>
                        <th className="w-40 px-4 py-3 text-left text-xs font-semibold text-black/50 uppercase">Meal Type</th>
                        {days.map((day, dayIndex) => (
                          <th key={day} className="px-4 py-3 text-center">
                            <div className="text-xs font-semibold text-black/90">{day}</div>
                            <div className="text-xs text-black/40 font-normal mt-0.5">
                              {format(addDays(weekStart, dayIndex), 'MMM d')}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {/* Soup Row */}
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-black/70">Soup</td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.soup;
                          const dish = getDishById(dishId);

                          return (
                            <td
                              key={dayIndex}
                              onDrop={(e) => handleDrop(e, weekIndex, dayIndex, 'soup')}
                              onDragOver={handleDragOver}
                              className="px-2 py-3"
                            >
                              <div className="h-[70px] border-2 border-dashed border-black/10 rounded-lg p-2 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center">
                                {dish ? (
                                  <div className="relative group w-full h-full bg-white border border-black/10 rounded-lg p-2 flex items-center justify-center">
                                    <div className="text-xs font-medium text-gray-900 text-center line-clamp-2">{dish.name}</div>
                                    <button
                                      onClick={() => clearSlot(weekIndex, dayIndex, 'soup')}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-md w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-xs text-black/30">Drop dish here</div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Hot Dish Meat/Fish Row */}
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-black/70">Hot Dish Meat/Fish</td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.hot_meat;
                          const dish = getDishById(dishId);

                          return (
                            <td
                              key={dayIndex}
                              onDrop={(e) => handleDrop(e, weekIndex, dayIndex, 'hot_meat')}
                              onDragOver={handleDragOver}
                              className="px-2 py-3"
                            >
                              <div className="h-[70px] border-2 border-dashed border-black/10 rounded-lg p-2 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center">
                                {dish ? (
                                  <div className="relative group w-full h-full bg-white border border-black/10 rounded-lg p-2 flex items-center justify-center">
                                    <div className="text-xs font-medium text-gray-900 text-center line-clamp-2">{dish.name}</div>
                                    <button
                                      onClick={() => clearSlot(weekIndex, dayIndex, 'hot_meat')}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-md w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-xs text-black/30">Drop dish here</div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Hot Dish Vegetarian Row */}
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-black/70">Hot Dish Vegetarian</td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.hot_veg;
                          const dish = getDishById(dishId);

                          return (
                            <td
                              key={dayIndex}
                              onDrop={(e) => handleDrop(e, weekIndex, dayIndex, 'hot_veg')}
                              onDragOver={handleDragOver}
                              className="px-2 py-3"
                            >
                              <div className="h-[70px] border-2 border-dashed border-black/10 rounded-lg p-2 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center">
                                {dish ? (
                                  <div className="relative group w-full h-full bg-white border border-black/10 rounded-lg p-2 flex items-center justify-center">
                                    <div className="text-xs font-medium text-gray-900 text-center line-clamp-2">{dish.name}</div>
                                    <button
                                      onClick={() => clearSlot(weekIndex, dayIndex, 'hot_veg')}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-md w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-xs text-black/30">Drop dish here</div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
            })}

            {/* Auto-save status */}
            <div className="flex justify-end items-center gap-3 mt-6">
              {saving && (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                  <span className="text-sm">Saving...</span>
                </div>
              )}
              <button
                onClick={saveMenuData}
                disabled={saving}
                className="px-8 py-3 bg-blue-700 text-white rounded-md hover:bg-blue-800 font-medium shadow-sm disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save 4-Week Menu'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
