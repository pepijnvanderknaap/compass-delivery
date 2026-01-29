'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Dish } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';

interface MenuItem {
  id: string;
  menu_id: string;
  dish_id: string;
  day_of_week: number;
  meal_type: 'soup' | 'hot_meat' | 'hot_veg';
  dish: Dish;
}

interface WeeklyMenu {
  id: string;
  week_start_date: string;
  menu_items: MenuItem[];
}

export default function WeeklyMenuPreviewPage() {
  const supabase = createClient();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyMenu();
  }, [currentWeekStart]);

  const fetchWeeklyMenu = async () => {
    setLoading(true);
    const weekStartString = format(currentWeekStart, 'yyyy-MM-dd');

    const { data: menuData, error: menuError } = await supabase
      .from('weekly_menus')
      .select('*')
      .eq('week_start_date', weekStartString)
      .maybeSingle();

    if (menuError) {
      console.error('Error fetching menu:', menuError);
    }

    if (menuData) {
      // Fetch menu items
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('menu_id', menuData.id)
        .order('day_of_week')
        .order('meal_type');

      if (itemsError) {
        console.error('Error fetching menu items:', itemsError);
      }

      // Fetch dish details for each menu item
      const itemsWithDishes = await Promise.all(
        (itemsData || []).map(async (item: any) => {
          const { data: dishData } = await supabase
            .from('dishes')
            .select('*')
            .eq('id', item.dish_id)
            .single();

          return {
            ...item,
            dish: dishData,
          };
        })
      );

      setWeeklyMenu({
        ...menuData,
        menu_items: itemsWithDishes,
      });
    } else {
      setWeeklyMenu(null);
    }

    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const previousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const nextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const daysOfWeek = Array.from({ length: 5 }, (_, i) => addDays(currentWeekStart, i));

  const getMenuForDay = (dayIndex: number, mealType: string) => {
    if (!weeklyMenu) return null;
    return weeklyMenu.menu_items.find(
      (item) => item.day_of_week === dayIndex && item.meal_type === mealType
    );
  };

  const getAllergensForDish = (dish: Dish) => {
    const allergens = [];
    if (dish.allergen_gluten) allergens.push('Gluten');
    if (dish.allergen_soy) allergens.push('Soy');
    if (dish.allergen_lactose) allergens.push('Lactose');
    if (dish.allergen_sesame) allergens.push('Sesame');
    if (dish.allergen_sulphites) allergens.push('Sulphites');
    if (dish.allergen_egg) allergens.push('Egg');
    if (dish.allergen_mustard) allergens.push('Mustard');
    if (dish.allergen_celery) allergens.push('Celery');
    return allergens;
  };

  const getDietaryInfo = (dish: Dish) => {
    const info = [];
    if (dish.is_vegetarian) info.push('🌱 Vegetarian');
    if (dish.is_vegan) info.push('🌿 Vegan');
    if (dish.contains_pork) info.push('Pork');
    if (dish.contains_beef) info.push('Beef');
    if (dish.contains_lamb) info.push('Lamb');
    return info;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-apple">
      <AdminQuickNav />

      {/* Header - Hidden when printing */}
      <div className="no-print">
        <UniversalHeader title="Weekly Menu Preview" backPath="/dark-kitchen" />

        <div className="max-w-7xl mx-auto px-8 lg:px-12 py-4">
          <div className="flex items-center justify-center gap-8 mb-6">
            <button
              onClick={previousWeek}
              className="p-2 text-slate-700 hover:text-slate-900 rounded-sm transition-colors"
              title="Previous Week"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-center">
              <p className="text-apple-title font-semibold text-slate-700">Week {format(currentWeekStart, 'w')}</p>
              <p className="text-apple-subheadline text-slate-500">
                {format(currentWeekStart, 'd MMM')} - {format(addDays(currentWeekStart, 4), 'd MMM yyyy')}
              </p>
            </div>

            <button
              onClick={nextWeek}
              className="p-2 text-slate-700 hover:text-slate-900 rounded-sm transition-colors"
              title="Next Week"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex justify-center mb-6">
            <button
              onClick={handlePrint}
              className="px-6 py-2 text-apple-subheadline font-medium text-white bg-apple-blue hover:bg-apple-blue-hover rounded-sm transition-colors"
            >
              Print Menu
            </button>
          </div>

          {/* Update Photo Button */}
          <div className="flex justify-center mb-6">
            <button className="px-6 py-3 bg-slate-200 hover:bg-slate-300 rounded-sm text-apple-subheadline font-medium text-slate-700 transition-colors">
              Adjust Photo
            </button>
          </div>

          {/* Color Palette Reference */}
          <div className="flex justify-center gap-3 mb-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-700 rounded-sm mb-2"></div>
              <p className="text-apple-caption text-slate-500">Logo</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-800 rounded-sm mb-2"></div>
              <p className="text-apple-caption text-slate-500">DK</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-sm mb-2" style={{backgroundColor: '#0d9488'}}></div>
              <p className="text-apple-caption text-slate-500">LM</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-sm mb-2"></div>
              <p className="text-apple-caption text-slate-500">RM</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-sm mb-2" style={{backgroundColor: '#E5944A'}}></div>
              <p className="text-apple-caption text-slate-500">Universal</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-200 rounded-sm mb-2 border border-slate-300"></div>
              <p className="text-apple-caption text-slate-500">Light BG</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-sm mb-2" style={{backgroundColor: '#0071E3'}}></div>
              <p className="text-apple-caption text-slate-500">Buttons</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 lg:px-12 py-2 print:px-4">
        {/* Print Header */}
        <div className="hidden print:block mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Weekly Menu</h1>
          <p className="text-xl text-slate-600 mb-1">
            {format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 4), 'MMMM d, yyyy')}
          </p>
          <p className="text-slate-500">Compass Group Dark Kitchen</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 no-print">Loading menu...</div>
        ) : !weeklyMenu ? (
          <div className="bg-white border border-slate-300 rounded-sm p-12 text-center no-print">
            <p className="text-apple-subheadline text-slate-500">No menu found for this week.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-300 rounded-sm overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="grid grid-cols-6 border-b border-[#C8965D]" style={{backgroundColor: '#E5944A'}}>
              <div className="px-4 py-3 text-apple-footnote font-semibold text-white uppercase tracking-wide">
                Day
              </div>
              <div className="px-4 py-3 text-apple-footnote font-semibold text-white uppercase tracking-wide col-span-5 grid grid-cols-3 gap-4">
                <div>Soup</div>
                <div>Meat/Fish Option</div>
                <div>Veg Option</div>
              </div>
            </div>

            {/* Table Body */}
            {daysOfWeek.map((day, dayIndex) => {
              const soupItem = getMenuForDay(dayIndex, 'soup');
              const meatItem = getMenuForDay(dayIndex, 'hot_meat');
              const vegItem = getMenuForDay(dayIndex, 'hot_veg');

              return (
                <div key={dayIndex} className="grid grid-cols-6 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors">
                  {/* Day Column */}
                  <div className="px-4 py-6 border-r border-slate-200">
                    <div className="text-apple-headline font-semibold text-slate-700">
                      {format(day, 'EEEE')}
                    </div>
                    <div className="text-apple-footnote text-slate-500 mt-1">
                      {format(day, 'MMM d')}
                    </div>
                  </div>

                  {/* Dishes Columns */}
                  <div className="col-span-5 px-4 py-6 grid grid-cols-3 gap-4">
                    {/* Soup */}
                    <div className="pr-4 border-r border-slate-200">
                      {soupItem ? (
                        <div>
                          <h3 className="text-apple-subheadline font-medium text-slate-700 mb-2">
                            {soupItem.dish.name}
                          </h3>
                          {soupItem.dish.description && (
                            <p className="text-apple-caption text-slate-500 line-clamp-2 mb-2">
                              {soupItem.dish.description}
                            </p>
                          )}
                          {/* Allergens */}
                          {getAllergensForDish(soupItem.dish).length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {getAllergensForDish(soupItem.dish).map((allergen) => (
                                <span key={allergen} className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
                                  {allergen}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Dietary */}
                          {getDietaryInfo(soupItem.dish).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {getDietaryInfo(soupItem.dish).map((info) => (
                                <span key={info} className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
                                  {info}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-apple-caption text-slate-400 italic">No soup</p>
                      )}
                    </div>

                    {/* Meat/Fish */}
                    <div className="pr-4 border-r border-slate-200">
                      {meatItem ? (
                        <div>
                          <h3 className="text-apple-subheadline font-medium text-slate-700 mb-2">
                            {meatItem.dish.name}
                          </h3>
                          {meatItem.dish.description && (
                            <p className="text-apple-caption text-slate-500 line-clamp-2 mb-2">
                              {meatItem.dish.description}
                            </p>
                          )}
                          {/* Allergens */}
                          {getAllergensForDish(meatItem.dish).length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {getAllergensForDish(meatItem.dish).map((allergen) => (
                                <span key={allergen} className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
                                  {allergen}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Dietary */}
                          {getDietaryInfo(meatItem.dish).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {getDietaryInfo(meatItem.dish).map((info) => (
                                <span key={info} className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
                                  {info}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-apple-caption text-slate-400 italic">No meat/fish</p>
                      )}
                    </div>

                    {/* Veg */}
                    <div>
                      {vegItem ? (
                        <div>
                          <h3 className="text-apple-subheadline font-medium text-slate-700 mb-2">
                            {vegItem.dish.name}
                          </h3>
                          {vegItem.dish.description && (
                            <p className="text-apple-caption text-slate-500 line-clamp-2 mb-2">
                              {vegItem.dish.description}
                            </p>
                          )}
                          {/* Allergens */}
                          {getAllergensForDish(vegItem.dish).length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {getAllergensForDish(vegItem.dish).map((allergen) => (
                                <span key={allergen} className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
                                  {allergen}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Dietary */}
                          {getDietaryInfo(vegItem.dish).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {getDietaryInfo(vegItem.dish).map((info) => (
                                <span key={info} className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
                                  {info}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-apple-caption text-slate-400 italic">No veg option</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500 print:mt-12">
          <p>For allergen information and dietary requirements, please consult with our kitchen staff.</p>
          <p className="mt-1">Menu subject to availability and may change without notice.</p>
        </div>
      </main>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid;
          }
          @page {
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  );
}
