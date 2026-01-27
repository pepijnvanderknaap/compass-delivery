'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, startOfWeek, addDays, addWeeks, getWeek } from 'date-fns';
import type { Dish, UserProfile, DishWithComponents } from '@/lib/types';
import DishCommandPalette from '../menu-planner/components/DishCommandPalette';
import DishDetailModal from '../menu-planner/components/DishDetailModal';
import MainDishForm from '../dishes/MainDishForm';
import UniversalHeader from '@/components/UniversalHeader';

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
    <div className="min-h-screen bg-white font-apple">
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

      <UniversalHeader
        title="Menu Planner"
        backPath="/dark-kitchen"
      />

      <main className="max-w-7xl mx-auto py-24">
        {message && (
          <div className={`mb-6 mx-8 lg:mx-12 px-4 py-3 rounded-xl text-apple-subheadline ${message.type === 'success' ? 'bg-apple-green/10 text-apple-green border border-apple-green/20' : 'bg-apple-red/10 text-apple-red border border-apple-red/20'}`}>
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

        {/* 4-week calendar grid - refined and constrained */}
        <div className="space-y-8 px-8 lg:px-12 -ml-[15px] -mr-[15px]">
            {weeks.map((weekStart, weekIndex) => {
              const isCurrent = isCurrentWeek(weekStart);
              return (
              <div key={weekIndex} className={weekIndex % 2 === 1 ? 'print-page-break' : ''}>
                {/* Floating header text above the box */}
                <div className="px-5 py-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-apple-headline font-medium italic text-slate-700">
                      {format(weekStart, 'd MMM')} - {format(addDays(weekStart, 4), 'd MMM yyyy')}
                    </h3>
                    <span className="text-apple-footnote font-medium italic tracking-wider text-slate-500">
                      (Week {getWeek(weekStart, { weekStartsOn: 1 })})
                    </span>
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 text-apple-subheadline font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors ml-auto no-print"
                    >
                      Print
                    </button>
                  </div>
                </div>

                {/* Container for amber header and data table with tiny gap */}
                <div className="space-y-2">
                  {/* Amber header box - separate and detached */}
                  <div className={`border border-slate-300 rounded-lg overflow-hidden ${isCurrent ? "bg-[#4A7DB5]" : "bg-slate-200"}`}>
                    <table className="w-full border-separate" style={{borderSpacing: '0 0'}}>
                      <colgroup>
                        <col className="w-40" />
                        <col className="w-8" />
                        {days.map((day) => (
                          <col key={day} className="w-48" />
                        ))}
                      </colgroup>
                      <thead>
                        <tr>
                          <th className={`px-5 py-4 text-left text-apple-footnote font-semibold uppercase tracking-wide ${isCurrent ? 'text-white' : 'text-slate-500'}`}>
                            Meal
                          </th>
                          <th></th>
                          {days.map((day, dayIndex) => (
                            <th key={day} className="py-4">
                              <div className={`flex items-baseline justify-center gap-1 ${isCurrent ? 'text-white' : 'text-slate-700'}`}>
                                <span className="text-apple-footnote font-medium uppercase tracking-wide">{day.substring(0, 3).toUpperCase()}</span>
                                <span className={`text-apple-caption font-light ${isCurrent ? 'text-white/70' : 'text-slate-400'}`}>
                                  {format(addDays(weekStart, dayIndex), 'd MMM')}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                    </table>
                  </div>

                  {/* Data table box - separate with tiny gap */}
                  <div className="overflow-hidden bg-slate-100 pb-4 border border-slate-300 rounded-xl">
                    <table className="w-full bg-slate-100 border-separate" style={{borderSpacing: '0 0'}}>
                      <colgroup>
                        <col className="w-40" />
                        <col className="w-8" />
                        {days.map((day) => (
                          <col key={day} className="w-48" />
                        ))}
                      </colgroup>
                    <tbody className="divide-y divide-slate-100">
                      {/* Soup Row */}
                      <tr>
                        <td className="px-5 py-4 text-apple-subheadline font-medium text-slate-700">Soup</td>
                        <td></td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.soup;
                          const dish = getDishById(dishId);

                          return (
                            <td key={dayIndex} className="px-2 py-3">
                              <button
                                onClick={() => openPalette(weekIndex, dayIndex, 'soup')}
                                className="w-full h-16 border border-slate-300/50 rounded-lg p-2 hover:border-slate-400 hover:shadow-sm transition-all duration-200 flex items-center justify-center cursor-pointer"
                              >
                                {dish ? (
                                  <div className="relative group w-full h-full rounded-md p-2 flex items-center justify-center">
                                    <div className="text-apple-body text-slate-800 text-center line-clamp-2">{dish.name}</div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearSlot(weekIndex, dayIndex, 'soup');
                                      }}
                                      className="absolute -top-1.5 -right-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-apple-subheadline text-slate-400">+ Add</div>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Hot Dish Meat/Fish Row */}
                      <tr>
                        <td className="px-5 py-4 text-apple-subheadline font-medium text-slate-700">Hot Dish Meat/Fish</td>
                        <td></td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.hot_meat;
                          const dish = getDishById(dishId);

                          return (
                            <td key={dayIndex} className="px-2 py-3">
                              <button
                                onClick={() => openPalette(weekIndex, dayIndex, 'hot_meat')}
                                className="w-full h-16 border border-slate-300/50 rounded-lg p-2 hover:border-slate-400 hover:shadow-sm transition-all duration-200 flex items-center justify-center cursor-pointer"
                              >
                                {dish ? (
                                  <div className="relative group w-full h-full rounded-md p-2 flex items-center justify-center">
                                    <div className="text-apple-body text-slate-800 text-center line-clamp-2">{dish.name}</div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearSlot(weekIndex, dayIndex, 'hot_meat');
                                      }}
                                      className="absolute -top-1.5 -right-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-apple-subheadline text-slate-400">+ Add</div>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Hot Dish Vegetarian Row */}
                      <tr>
                        <td className="px-5 py-4 text-apple-subheadline font-medium text-slate-700">Hot Dish Vegetarian</td>
                        <td></td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.hot_veg;
                          const dish = getDishById(dishId);

                          return (
                            <td key={dayIndex} className="px-2 py-3">
                              <button
                                onClick={() => openPalette(weekIndex, dayIndex, 'hot_veg')}
                                className="w-full h-16 border border-slate-300/50 rounded-lg p-2 hover:border-slate-400 hover:shadow-sm transition-all duration-200 flex items-center justify-center cursor-pointer"
                              >
                                {dish ? (
                                  <div className="relative group w-full h-full rounded-md p-2 flex items-center justify-center">
                                    <div className="text-apple-body text-slate-800 text-center line-clamp-2">{dish.name}</div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearSlot(weekIndex, dayIndex, 'hot_veg');
                                      }}
                                      className="absolute -top-1.5 -right-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all duration-200"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-apple-subheadline text-slate-400">+ Add</div>
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
