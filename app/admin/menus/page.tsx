'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, startOfWeek, addDays, addWeeks, getWeek } from 'date-fns';
import type { Dish, UserProfile, DishWithComponents } from '@/lib/types';
import DishCommandPalette from '../menu-planner/components/DishCommandPalette';
import DishDetailModal from '../menu-planner/components/DishDetailModal';
import MainDishForm from '../dishes/MainDishForm';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';

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
  const [dishDetailState, setDishDetailState] = useState<{
    isOpen: boolean;
    dishId: string;
    category: string;
    weekIndex: number;
    dayIndex: number;
    slot: string;
  } | null>(null);
  const [editDishState, setEditDishState] = useState<{
    isOpen: boolean;
    dish: DishWithComponents | null;
    category: string;
    weekIndex: number;
    dayIndex: number;
    slot: string;
  } | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

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
    // Prevent concurrent saves
    if (isSavingRef.current) {
      console.log('Save already in progress, skipping...');
      return;
    }

    isSavingRef.current = true;
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
      isSavingRef.current = false;
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

    // Update state and trigger debounced auto-save
    setMenuData(prev => {
      const updated = {
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [slot]: null
        }
      };

      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule new save
      saveTimeoutRef.current = setTimeout(() => {
        autoSaveWithData(updated);
      }, 500);

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
    // Check if there's already a dish in this slot
    const dateKey = format(addDays(weeks[weekIndex], dayIndex), 'yyyy-MM-dd');
    const existingDishId = menuData[dateKey]?.[slot];

    if (existingDishId) {
      // Show detail modal for existing dish
      setDishDetailState({
        isOpen: true,
        dishId: existingDishId,
        category: getSlotCategory(slot),
        weekIndex,
        dayIndex,
        slot,
      });
    } else {
      // Show command palette for empty slot
      setPaletteState({
        isOpen: true,
        category: getSlotCategory(slot),
        weekIndex,
        dayIndex,
        slot,
      });
    }
  };

  // Handle dish selection from palette
  const handleDishSelect = (dishId: string) => {
    if (!paletteState && !dishDetailState) return;

    const state = paletteState || dishDetailState;
    if (!state) return;

    const { weekIndex, dayIndex, slot } = state;
    const dateKey = format(addDays(weeks[weekIndex], dayIndex), 'yyyy-MM-dd');

    // Update state and trigger debounced auto-save
    setMenuData(prev => {
      const updated = {
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [slot]: dishId
        }
      };

      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule new save
      saveTimeoutRef.current = setTimeout(() => {
        autoSaveWithData(updated);
      }, 500);

      return updated;
    });

    // Refetch dishes to show newly created dish if any
    fetchDishes();
  };

  // Handle edit dish from detail modal
  const handleEditDish = (dish: DishWithComponents) => {
    if (!dishDetailState) return;

    // Close detail modal and open edit form
    setEditDishState({
      isOpen: true,
      dish,
      category: dishDetailState.category,
      weekIndex: dishDetailState.weekIndex,
      dayIndex: dishDetailState.dayIndex,
      slot: dishDetailState.slot,
    });
    setDishDetailState(null);
  };

  // Handle replace dish from detail modal
  const handleReplaceDish = () => {
    if (!dishDetailState) return;

    // Close detail modal and open command palette
    setPaletteState({
      isOpen: true,
      category: dishDetailState.category,
      weekIndex: dishDetailState.weekIndex,
      dayIndex: dishDetailState.dayIndex,
      slot: dishDetailState.slot,
    });
    setDishDetailState(null);
  };

  // Handle save from edit form
  const handleSaveEdit = () => {
    // Close edit form and refetch dishes
    setEditDishState(null);
    fetchDishes();
    loadMenuData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AdminQuickNav />

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 1cm;
          }
          nav, .no-print {
            display: none !important;
          }
          .print-page-break {
            page-break-after: always;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Clean Apple-style header */}
      <header className="bg-white border-b border-[#D2D2D7] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dark-kitchen')}
              className="text-[#0071E3] hover:text-[#0077ED] font-medium text-[15px] transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-[28px] font-semibold text-[#1D1D1F] tracking-tight">
              Menu Planner
            </h1>
          </div>
          {saving && (
            <div className="text-[13px] text-[#86868B]">
              Saving...
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12">
        {message && (
          <div className={`mb-8 mx-8 px-5 py-4 rounded-xl text-[15px] ${message.type === 'success' ? 'bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20' : 'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20'}`}>
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

        {/* Dish Detail Modal */}
        {dishDetailState && (
          <DishDetailModal
            dishId={dishDetailState.dishId}
            isOpen={dishDetailState.isOpen}
            onClose={() => setDishDetailState(null)}
            onEdit={handleEditDish}
            onReplace={handleReplaceDish}
          />
        )}

        {/* Edit Dish Form */}
        {editDishState && (
          <MainDishForm
            dish={editDishState.dish}
            onClose={() => setEditDishState(null)}
            onSave={handleSaveEdit}
          />
        )}

        {/* 4-week calendar grid */}
        <div className="space-y-8 px-8">
            {weeks.map((weekStart, weekIndex) => {
              const isCurrent = isCurrentWeek(weekStart);
              return (
              <div
                key={weekIndex}
                className={`bg-white border ${isCurrent ? 'border-2 border-[#0071E3]' : 'border border-[#E8E8ED]'} rounded-xl shadow-sm overflow-hidden ${weekIndex % 2 === 1 ? 'print-page-break' : ''}`}
              >
                {/* Week header with subtle gray fill */}
                <div className="bg-[#FAFAFA] py-5 px-6 border-b border-[#E8E8ED]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                          Week {getWeek(weekStart, { weekStartsOn: 1 })}
                        </div>
                        <div className="text-[17px] font-semibold text-[#1D1D1F] mt-1">
                          {format(weekStart, 'd MMM')} - {format(addDays(weekStart, 4), 'd MMM yyyy')}
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="bg-[#0071E3] text-white text-[12px] font-medium px-3 py-1 rounded-full">
                          Current Week
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded-lg hover:bg-[#F5F5F7] transition-colors no-print"
                    >
                      Print
                    </button>
                  </div>
                </div>

                {/* Data table */}
                <div>
                  <div
                    className="bg-[#FAFAFA] border-b border-[#E8E8ED]"
                  >
                    <table className="w-full">
                      <colgroup>
                        <col className="w-44" />
                        {days.map((day) => (
                          <col key={day} />
                        ))}
                      </colgroup>
                      <thead>
                        <tr>
                          <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                            Meal Type
                          </th>
                          {days.map((day, dayIndex) => (
                            <th key={day} className="py-4">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[15px] font-medium text-[#1D1D1F]">{day.substring(0, 3)}</span>
                                <span className="text-[12px] text-[#86868B]">
                                  {format(addDays(weekStart, dayIndex), 'd MMM')}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                    </table>
                  </div>

                  {/* Data table */}
                  <div className="bg-white">
                    <table className="w-full">
                      <colgroup>
                        <col className="w-44" />
                        {days.map((day) => (
                          <col key={day} />
                        ))}
                      </colgroup>
                    <tbody>
                      {/* Soup Row */}
                      <tr className="border-b border-[#E8E8ED]">
                        <td className="px-6 py-4 text-[15px] font-medium text-[#1D1D1F]">Soup</td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.soup;
                          const dish = getDishById(dishId);

                          return (
                            <td key={dayIndex} className="p-3">
                              <button
                                onClick={() => openPalette(weekIndex, dayIndex, 'soup')}
                                className={`w-full min-h-[80px] rounded-lg p-3 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                                  dish
                                    ? 'bg-white border border-[#E8E8ED] hover:border-[#0071E3] hover:shadow-sm'
                                    : 'border-2 border-dashed border-[#D2D2D7] hover:border-[#0071E3] hover:bg-[#F5F5F7]'
                                }`}
                              >
                                {dish ? (
                                  <div className="relative group w-full h-full flex items-center justify-center">
                                    <div className="text-center line-clamp-2 text-[15px] font-medium text-[#1D1D1F]">
                                      {dish.name}
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearSlot(weekIndex, dayIndex, 'soup');
                                      }}
                                      className="absolute -top-1 -right-1 bg-[#FF3B30] hover:bg-[#FF453A] text-white rounded-md w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-center text-[13px] text-[#86868B]">
                                    + Add Dish
                                  </div>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Hot Dish Meat/Fish Row */}
                      <tr className="border-b border-[#E8E8ED]">
                        <td className="px-6 py-4 text-[15px] font-medium text-[#1D1D1F]">Hot Dish Meat/Fish</td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.hot_meat;
                          const dish = getDishById(dishId);

                          return (
                            <td key={dayIndex} className="p-3">
                              <button
                                onClick={() => openPalette(weekIndex, dayIndex, 'hot_meat')}
                                className={`w-full min-h-[80px] rounded-lg p-3 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                                  dish
                                    ? 'bg-white border border-[#E8E8ED] hover:border-[#0071E3] hover:shadow-sm'
                                    : 'border-2 border-dashed border-[#D2D2D7] hover:border-[#0071E3] hover:bg-[#F5F5F7]'
                                }`}
                              >
                                {dish ? (
                                  <div className="relative group w-full h-full flex items-center justify-center">
                                    <div className="text-center line-clamp-2 text-[15px] font-medium text-[#1D1D1F]">
                                      {dish.name}
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearSlot(weekIndex, dayIndex, 'hot_meat');
                                      }}
                                      className="absolute -top-1 -right-1 bg-[#FF3B30] hover:bg-[#FF453A] text-white rounded-md w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-center text-[13px] text-[#86868B]">
                                    + Add Dish
                                  </div>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Hot Dish Vegetarian Row */}
                      <tr>
                        <td className="px-6 py-4 text-[15px] font-medium text-[#1D1D1F]">Hot Dish Vegetarian</td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.hot_veg;
                          const dish = getDishById(dishId);

                          return (
                            <td key={dayIndex} className="p-3">
                              <button
                                onClick={() => openPalette(weekIndex, dayIndex, 'hot_veg')}
                                className={`w-full min-h-[80px] rounded-lg p-3 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                                  dish
                                    ? 'bg-white border border-[#E8E8ED] hover:border-[#0071E3] hover:shadow-sm'
                                    : 'border-2 border-dashed border-[#D2D2D7] hover:border-[#0071E3] hover:bg-[#F5F5F7]'
                                }`}
                              >
                                {dish ? (
                                  <div className="relative group w-full h-full flex items-center justify-center">
                                    <div className="text-center line-clamp-2 text-[15px] font-medium text-[#1D1D1F]">
                                      {dish.name}
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearSlot(weekIndex, dayIndex, 'hot_veg');
                                      }}
                                      className="absolute -top-1 -right-1 bg-[#FF3B30] hover:bg-[#FF453A] text-white rounded-md w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-center text-[13px] text-[#86868B]">
                                    + Add Dish
                                  </div>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}

          </div>
      </main>
    </div>
  );
}
