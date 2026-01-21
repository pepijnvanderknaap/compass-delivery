'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, startOfWeek, addDays, addWeeks } from 'date-fns';
import type { Dish, UserProfile } from '@/lib/types';
import DishCommandPalette from '../menu-planner/components/DishCommandPalette';

export default function AdminMenusPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuData, setMenuData] = useState<Record<string, Record<string, string | null>>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [paletteState, setPaletteState] = useState<{
    isOpen: boolean;
    category: string;
    weekIndex: number;
    dayIndex: number;
    slot: string;
  } | null>(null);
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

  // Map slot names to dish categories
  const getSlotCategory = (slot: string): string => {
    if (slot === 'soup') return 'soup';
    if (slot === 'hot_meat') return 'hot_dish_meat'; // Will match meat OR fish in the palette
    if (slot === 'hot_veg') return 'hot_dish_veg';
    return 'soup';
  };

  // Open command palette for a specific slot
  const openPalette = (weekIndex: number, dayIndex: number, slot: string) => {
    setPaletteState({
      isOpen: true,
      category: getSlotCategory(slot),
      weekIndex,
      dayIndex,
      slot,
    });
  };

  // Handle dish selection from palette
  const handleDishSelect = (dishId: string) => {
    if (!paletteState) return;

    const { weekIndex, dayIndex, slot } = paletteState;
    const dateKey = format(addDays(weeks[weekIndex], dayIndex), 'yyyy-MM-dd');

    // Update state and trigger auto-save
    setMenuData(prev => {
      const updated = {
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [slot]: dishId
        }
      };

      setTimeout(() => autoSaveWithData(updated), 500);
      return updated;
    });

    // Refetch dishes to show newly created dish if any
    fetchDishes();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 font-apple">
      {/* Sophisticated Apple-style header with glass effect */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="text-apple-title font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                DELIVERY
              </div>
              <div className="h-6 w-px bg-apple-gray5"></div>
              <h1 className="text-apple-body text-apple-gray2">
                Menu Planner
              </h1>
            </div>
            <button
              onClick={() => router.push('/dark-kitchen')}
              className="px-5 py-2 text-apple-subheadline font-semibold text-white bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
            >
              Back
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-full mx-auto px-6 lg:px-8 py-10">
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-apple-subheadline ${message.type === 'success' ? 'bg-apple-green/10 text-apple-green border border-apple-green/20' : 'bg-apple-red/10 text-apple-red border border-apple-red/20'}`}>
            {message.text}
          </div>
        )}

        {/* Command Palette */}
        {paletteState && (
          <DishCommandPalette
            category={paletteState.category}
            onSelect={handleDishSelect}
            onClose={() => setPaletteState(null)}
            isOpen={paletteState.isOpen}
          />
        )}

        {/* 4-week calendar grid - now full width */}
        <div className="space-y-6">
            {weeks.map((weekStart, weekIndex) => {
              const isCurrent = isCurrentWeek(weekStart);
              return (
              <div key={weekIndex} className={`bg-white/90 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ${isCurrent ? 'ring-2 ring-blue-500 shadow-blue-100' : 'border border-white/60'}`}>
                <div className={`px-6 py-5 ${isCurrent ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-slate-100 to-slate-50'} border-b ${isCurrent ? 'border-blue-400/30' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    {isCurrent && (
                      <span className="bg-white/20 backdrop-blur-sm text-white text-apple-caption font-semibold px-3 py-1 rounded-full shadow-sm">
                        Current Week
                      </span>
                    )}
                    <div>
                      <div className={`text-apple-footnote font-semibold uppercase tracking-wider ${isCurrent ? 'text-blue-100' : 'text-slate-500'}`}>
                        Week {weekIndex + 1}
                      </div>
                      <h3 className={`text-apple-headline font-semibold ${isCurrent ? 'text-white' : 'text-slate-800'}`}>
                        {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 4), 'MMM d, yyyy')}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead>
                      <tr className="border-b border-apple-gray5">
                        <th className="w-40 px-6 py-4 text-left text-apple-footnote font-semibold text-apple-gray3 uppercase tracking-wide">
                          Meal Type
                        </th>
                        {days.map((day, dayIndex) => (
                          <th key={day} className="px-4 py-4 text-center">
                            <div className="text-apple-footnote font-semibold text-apple-gray1">{day}</div>
                            <div className="text-apple-caption text-apple-gray3 font-normal mt-0.5">
                              {format(addDays(weekStart, dayIndex), 'MMM d')}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-apple-gray5">
                      {/* Soup Row */}
                      <tr>
                        <td className="px-6 py-4 text-apple-subheadline font-medium text-apple-gray1">Soup</td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.soup;
                          const dish = getDishById(dishId);

                          return (
                            <td key={dayIndex} className="px-3 py-4">
                              <button
                                onClick={() => openPalette(weekIndex, dayIndex, 'soup')}
                                className="w-full h-20 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-2 hover:border-blue-400 hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center justify-center cursor-pointer"
                              >
                                {dish ? (
                                  <div className="relative group w-full h-full bg-gradient-to-br from-white to-blue-50/30 border border-blue-200/50 rounded-lg p-2 flex items-center justify-center shadow-sm">
                                    <div className="text-apple-subheadline font-semibold text-slate-800 text-center line-clamp-2">{dish.name}</div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearSlot(weekIndex, dayIndex, 'soup');
                                      }}
                                      className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-apple-subheadline text-slate-400 font-medium">+ Add dish</div>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Hot Dish Meat/Fish Row */}
                      <tr>
                        <td className="px-6 py-4 text-apple-subheadline font-medium text-apple-gray1">Hot Dish Meat/Fish</td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.hot_meat;
                          const dish = getDishById(dishId);

                          return (
                            <td key={dayIndex} className="px-3 py-4">
                              <button
                                onClick={() => openPalette(weekIndex, dayIndex, 'hot_meat')}
                                className="w-full h-20 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-2 hover:border-blue-400 hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center justify-center cursor-pointer"
                              >
                                {dish ? (
                                  <div className="relative group w-full h-full bg-gradient-to-br from-white to-blue-50/30 border border-blue-200/50 rounded-lg p-2 flex items-center justify-center shadow-sm">
                                    <div className="text-apple-subheadline font-semibold text-slate-800 text-center line-clamp-2">{dish.name}</div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearSlot(weekIndex, dayIndex, 'hot_meat');
                                      }}
                                      className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-apple-subheadline text-slate-400 font-medium">+ Add dish</div>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Hot Dish Vegetarian Row */}
                      <tr>
                        <td className="px-6 py-4 text-apple-subheadline font-medium text-apple-gray1">Hot Dish Vegetarian</td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.hot_veg;
                          const dish = getDishById(dishId);

                          return (
                            <td key={dayIndex} className="px-3 py-4">
                              <button
                                onClick={() => openPalette(weekIndex, dayIndex, 'hot_veg')}
                                className="w-full h-20 bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-2 hover:border-blue-400 hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center justify-center cursor-pointer"
                              >
                                {dish ? (
                                  <div className="relative group w-full h-full bg-gradient-to-br from-white to-blue-50/30 border border-blue-200/50 rounded-lg p-2 flex items-center justify-center shadow-sm">
                                    <div className="text-apple-subheadline font-semibold text-slate-800 text-center line-clamp-2">{dish.name}</div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearSlot(weekIndex, dayIndex, 'hot_veg');
                                      }}
                                      className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-apple-subheadline text-slate-400 font-medium">+ Add dish</div>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="h-4"></div>
              </div>
            );
          })}

          {/* Auto-save status */}
            <div className="flex justify-end items-center gap-3 mt-6">
              {saving && (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800"></div>
                  <span className="text-sm">Saving...</span>
                </div>
              )}
              <button
                onClick={saveMenuData}
                disabled={saving}
                className="px-8 py-3 bg-blue-800 text-white rounded-md hover:bg-blue-900 font-medium shadow-sm disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save 4-Week Menu'}
              </button>
            </div>
          </div>
      </main>
    </div>
  );
}
