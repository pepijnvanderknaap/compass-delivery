'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Dish } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';

interface ComponentDish {
  id: string;
  name: string;
  category?: string;
}

interface WarmVeggieComponent {
  component_dish: ComponentDish;
  percentage: number;
}

interface SaladComponent {
  component_dish: ComponentDish;
  percentage: number;
}

interface ToppingComponent {
  component_dish: ComponentDish;
  component_type: string;
}

interface CarbComponent {
  component_dish: ComponentDish;
  component_type: string;
}

interface MenuItem {
  id: string;
  menu_id: string;
  dish_id: string;
  day_of_week: number;
  meal_type: 'soup' | 'hot_meat' | 'hot_veg';
  dish: Dish & {
    warm_veggie_components?: WarmVeggieComponent[];
    salad_components?: SaladComponent[];
    salad_name?: string | null;
    topping_components?: ToppingComponent[];
    carb_components?: CarbComponent[];
  };
}

interface WeeklyMenu {
  id: string;
  week_start_date: string;
  menu_items: MenuItem[];
}

interface NavItem {
  label: string;
  href: string;
  active: boolean;
  subItems?: Array<{ label: string; href: string; active: boolean }>;
}

interface WeekOverviewProps {
  locationSlug: string;
  locationName: string;
  locationLogo?: string;
  navItems: NavItem[];
  showPrintButton?: boolean;
}

export default function WeekOverview({
  locationSlug,
  locationName,
  locationLogo = '',
  navItems,
  showPrintButton = true,
}: WeekOverviewProps) {
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
      // Fetch menu items with nested data in ONE query
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select(`
          *,
          dish:dishes!dish_id(*)
        `)
        .eq('menu_id', menuData.id)
        .order('day_of_week')
        .order('meal_type');

      if (itemsError) {
        console.error('Error fetching menu items:', itemsError);
      }

      // Fetch ALL components for ALL dishes in parallel (just 4 queries total)
      const dishIds = (itemsData || []).map((item: any) => item.dish_id);

      const [
        { data: allWarmVeggieComponents },
        { data: allDishSaladLinks },
        { data: allToppingComponents },
        { data: allCarbComponents }
      ] = await Promise.all([
        supabase
          .from('warm_veggie_components')
          .select('main_dish_id, percentage, component_dish:component_dish_id(id, name, category)')
          .in('main_dish_id', dishIds),
        supabase
          .from('dish_salad_combinations')
          .select('main_dish_id, salad_combination:salad_combinations!salad_combination_id(id, custom_name, salad_combination_items(percentage, component_dish:component_dish_id(id, name, category)))')
          .in('main_dish_id', dishIds),
        supabase
          .from('dish_components')
          .select('main_dish_id, component_type, component_dish:dishes!component_dish_id(id, name, category)')
          .in('main_dish_id', dishIds)
          .eq('component_type', 'topping'),
        supabase
          .from('dish_components')
          .select('main_dish_id, component_type, component_dish:dishes!component_dish_id(id, name, category)')
          .in('main_dish_id', dishIds)
          .eq('component_type', 'carb')
      ]);

      // Build lookup maps for fast access
      const warmVeggieMap = new Map<string, any[]>();
      (allWarmVeggieComponents || []).forEach((item: any) => {
        if (!warmVeggieMap.has(item.main_dish_id)) {
          warmVeggieMap.set(item.main_dish_id, []);
        }
        warmVeggieMap.get(item.main_dish_id)?.push(item);
      });

      const saladMap = new Map<string, { name: string | null; components: any[] }>();
      (allDishSaladLinks || []).forEach((link: any) => {
        if (link.salad_combination) {
          saladMap.set(link.main_dish_id, {
            name: link.salad_combination.custom_name || null,
            components: link.salad_combination.salad_combination_items || []
          });
        }
      });

      const toppingMap = new Map<string, any[]>();
      (allToppingComponents || []).forEach((item: any) => {
        if (!toppingMap.has(item.main_dish_id)) {
          toppingMap.set(item.main_dish_id, []);
        }
        toppingMap.get(item.main_dish_id)?.push(item);
      });

      const carbMap = new Map<string, any[]>();
      (allCarbComponents || []).forEach((item: any) => {
        if (!carbMap.has(item.main_dish_id)) {
          carbMap.set(item.main_dish_id, []);
        }
        carbMap.get(item.main_dish_id)?.push(item);
      });

      // Combine data using lookup maps
      const itemsWithDishes = (itemsData || []).map((item: any) => {
        const saladData = saladMap.get(item.dish_id);
        return {
          ...item,
          dish: {
            ...item.dish,
            warm_veggie_components: warmVeggieMap.get(item.dish_id) || [],
            salad_components: saladData?.components || [],
            salad_name: saladData?.name || null,
            topping_components: toppingMap.get(item.dish_id) || [],
            carb_components: carbMap.get(item.dish_id) || [],
          },
        };
      });

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

  const getSoupToppings = (dish: Dish & { topping_components?: ToppingComponent[] }) => {
    if (!dish.topping_components) return [];
    return dish.topping_components.map(tc => tc.component_dish.name);
  };

  const getCarbs = (dish: Dish & { carb_components?: CarbComponent[] }) => {
    if (!dish.carb_components) return [];
    return dish.carb_components.map(cc => cc.component_dish.name);
  };

  const getWarmVeggies = (dish: Dish & { warm_veggie_components?: WarmVeggieComponent[] }) => {
    if (!dish.warm_veggie_components) return [];
    return dish.warm_veggie_components.map(wvc => wvc.component_dish.name);
  };

  const hasSalad = (dish: Dish & { salad_components?: SaladComponent[] }) => {
    if (!dish.salad_components) return false;
    return dish.salad_components.length > 0;
  };

  return (
    <div className="min-h-screen bg-white font-apple">
      <AdminQuickNav />

      {/* Header - Hidden when printing */}
      <div className="no-print">
        <UniversalHeader
          title=""
          backPath=""
          locationLogo={locationLogo}
          locationName={locationName}
          navItems={navItems}
        />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 lg:px-12 pt-24 pb-8 print:px-4">
        {/* Print Header */}
        <div className="hidden print:block mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#1D1D1F] mb-2">Weekly Menu</h1>
          <p className="text-xl text-[#6E6E73] mb-1">
            {format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 4), 'MMMM d, yyyy')}
          </p>
          <p className="text-[#86868B]">{locationName}</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#86868B] no-print">Loading menu...</div>
        ) : !weeklyMenu ? (
          <div className="bg-white border border-[#E8E8ED] rounded-sm p-12 text-center no-print">
            <p className="text-[15px] text-[#86868B]">No menu found for this week.</p>
          </div>
        ) : (
          <div>
            {/* Floating header text above the table */}
            <div className="mt-5 py-2 flex items-center">
              <div className="flex-1"></div>
              <div className="flex items-center gap-3">
                <button
                  onClick={previousWeek}
                  className="p-1.5 text-[#6E6E73] hover:text-[#1D1D1F] rounded-sm transition-colors no-print"
                  title="Previous Week"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h3 className="text-apple-headline font-medium italic text-[#6E6E73]">
                  Week {format(currentWeekStart, 'w')}
                </h3>
                <button
                  onClick={nextWeek}
                  className="p-1.5 text-[#6E6E73] hover:text-[#1D1D1F] rounded-sm transition-colors no-print"
                  title="Next Week"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 flex justify-end">
                {showPrintButton && (
                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 text-apple-subheadline font-medium text-[#1D1D1F] bg-white border border-[#D2D2D7] hover:bg-[#F5F5F7] rounded-sm transition-colors no-print"
                  >
                    Print
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-[#D2D2D7] rounded-sm overflow-hidden shadow-sm">
              <table className="w-full border-separate" style={{borderSpacing: '0 0'}}>
                <colgroup>
                  <col className="w-48" />
                  {daysOfWeek.map((_, i) => (
                    <col key={i} className="w-44" />
                  ))}
                </colgroup>
                <thead>
                  <tr className="bg-[#0078D4]">
                    <th className="px-5 py-4 text-left text-apple-footnote font-medium text-white">
                      Menu
                    </th>
                    {daysOfWeek.map((day, dayIndex) => (
                      <th key={dayIndex} className="py-4">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-apple-footnote font-medium text-white">
                            {format(day, 'EEE')}
                          </span>
                          <span className="text-apple-footnote font-medium text-white">
                            {format(day, 'd MMM')}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
              {/* Soup Row */}
              <tr className="border-b border-[#D2D2D7]">
                <td className="px-5 pt-5 pb-3 bg-gray-200 border-r border-[#D2D2D7] align-top">
                  <div className="text-[15px] font-medium text-[#1D1D1F]">Soup</div>
                </td>
                {daysOfWeek.map((day, dayIndex) => {
                  const soupItem = getMenuForDay(dayIndex, 'soup');
                  // Monday (0), Wednesday (2), Friday (4) = white
                  // Tuesday (1), Thursday (3) = light blue
                  const isEven = dayIndex % 2 === 0;
                  return (
                    <td
                      key={dayIndex}
                      className="px-4 pt-5 pb-3 border-r border-[#D2D2D7] last:border-r-0 text-center align-top h-[210px]"
                      style={{ backgroundColor: isEven ? '#FFFFFF' : '#E2E8F0' }}
                    >
                    {soupItem ? (
                      <div className="space-y-0.5">
                        {/* Line 1-2: Dish Name (fixed height) */}
                        <div className="h-[3rem]">
                          <h3 className="text-[16px] leading-[1.5] font-medium text-[#1D1D1F] line-clamp-2">
                            {soupItem.dish.name}
                          </h3>
                        </div>

                        {/* Line 3-4-5: Toppings (3 lines) */}
                        <p className="text-[12px] text-[#1D1D1F] min-h-[3.75rem]">
                          {getSoupToppings(soupItem.dish).length > 0 ? (
                            <><span className="font-medium">Toppings:</span> {getSoupToppings(soupItem.dish).join(', ')}</>
                          ) : (
                            <span className="text-transparent">-</span>
                          )}
                        </p>

                        {/* Line 6-7: Allergens (2 lines) */}
                        <div className="flex flex-wrap gap-1 justify-center min-h-[2.5rem]">
                          {getAllergensForDish(soupItem.dish).length > 0 ? (
                            getAllergensForDish(soupItem.dish).map((allergen) => (
                              <span key={allergen} className="text-[10px] font-medium px-1.5 py-0.5 text-[#FF3B30] rounded-sm">
                                {allergen}
                              </span>
                            ))
                          ) : (
                            <span className="text-[12px] text-[#86868B] italic">No allergens</span>
                          )}
                        </div>

                        {/* Line 8: Dietary Info */}
                        <div className="flex flex-nowrap gap-1 justify-center min-h-[1.25rem] overflow-hidden">
                          {getDietaryInfo(soupItem.dish).map((info) => (
                            <span key={info} className="text-[10px] font-medium px-1.5 py-0.5 text-[#34C759] rounded-sm whitespace-nowrap">
                              {info}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[13px] text-[#86868B] italic">Not available</p>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Meat/Fish Row */}
            <tr className="border-b border-[#D2D2D7]">
              <td className="px-5 py-3 bg-gray-200 border-r border-[#D2D2D7] align-top">
                <div className="text-[15px] font-medium text-[#1D1D1F]">Hot Dish Meat/Fish</div>
              </td>
              {daysOfWeek.map((day, dayIndex) => {
                const meatItem = getMenuForDay(dayIndex, 'hot_meat');
                const isEven = dayIndex % 2 === 0;
                return (
                  <td
                    key={dayIndex}
                    className="px-4 py-3 border-r border-[#D2D2D7] last:border-r-0 text-center align-top h-[210px]"
                    style={{ backgroundColor: isEven ? '#FFFFFF' : '#E2E8F0' }}
                  >
                    {meatItem ? (
                      <div className="space-y-0.5">
                        {/* Line 1-2: Dish Name (fixed height) */}
                        <div className="h-[3rem]">
                          <h3 className="text-[16px] leading-[1.5] font-medium text-[#1D1D1F] line-clamp-2">
                            {meatItem.dish.name}
                          </h3>
                        </div>

                        {/* Line 3: Carbs (always visible) */}
                        <p className="text-[12px] text-[#1D1D1F] min-h-[1.25rem]">
                          {getCarbs(meatItem.dish).length > 0 ? (
                            <><span className="font-medium">Carbs:</span> {getCarbs(meatItem.dish).join(', ')}</>
                          ) : (
                            <><span className="font-medium">Carbs:</span> <span className="text-[#86868B] italic">n.a.</span></>
                          )}
                        </p>

                        {/* Line 4-5: Veg (2 lines) */}
                        <p className="text-[12px] text-[#1D1D1F] min-h-[2.5rem]">
                          {(getWarmVeggies(meatItem.dish).length > 0 || hasSalad(meatItem.dish)) ? (
                            <>
                              <span className="font-medium">Veg:</span>{' '}
                              {[
                                ...getWarmVeggies(meatItem.dish),
                                ...(hasSalad(meatItem.dish) ? [meatItem.dish.salad_name || 'Salad'] : [])
                              ].join(', ')}
                            </>
                          ) : (
                            <span className="text-transparent">-</span>
                          )}
                        </p>

                        {/* Line 6-7: Allergens (2 lines) */}
                        <div className="flex flex-wrap gap-1 justify-center min-h-[2.5rem]">
                          {getAllergensForDish(meatItem.dish).length > 0 ? (
                            getAllergensForDish(meatItem.dish).map((allergen) => (
                              <span key={allergen} className="text-[10px] font-medium px-1.5 py-0.5 text-[#FF3B30] rounded-sm">
                                {allergen}
                              </span>
                            ))
                          ) : (
                            <span className="text-[12px] text-[#86868B] italic">No allergens</span>
                          )}
                        </div>

                        {/* Line 8: Dietary Info */}
                        <div className="flex flex-nowrap gap-1 justify-center min-h-[1.25rem] overflow-hidden">
                          {getDietaryInfo(meatItem.dish).map((info) => (
                            <span key={info} className="text-[10px] font-medium px-1.5 py-0.5 text-[#34C759] rounded-sm whitespace-nowrap">
                              {info}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[13px] text-[#86868B] italic">Not available</p>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Veg Row */}
            <tr>
              <td className="px-5 py-3 bg-gray-200 border-r border-[#D2D2D7] align-top">
                <div className="text-[15px] font-medium text-[#1D1D1F]">Hot Dish Veg</div>
              </td>
              {daysOfWeek.map((day, dayIndex) => {
                const vegItem = getMenuForDay(dayIndex, 'hot_veg');
                const isEven = dayIndex % 2 === 0;
                return (
                  <td
                    key={dayIndex}
                    className="px-4 py-3 border-r border-[#D2D2D7] last:border-r-0 text-center align-top h-[210px]"
                    style={{ backgroundColor: isEven ? '#FFFFFF' : '#E2E8F0' }}
                  >
                    {vegItem ? (
                      <div className="space-y-0.5">
                        {/* Line 1-2: Dish Name (fixed height) */}
                        <div className="h-[3rem]">
                          <h3 className="text-[16px] leading-[1.5] font-medium text-[#1D1D1F] line-clamp-2">
                            {vegItem.dish.name}
                          </h3>
                        </div>

                        {/* Line 3: Carbs (always visible) */}
                        <p className="text-[12px] text-[#1D1D1F] min-h-[1.25rem]">
                          {getCarbs(vegItem.dish).length > 0 ? (
                            <><span className="font-medium">Carbs:</span> {getCarbs(vegItem.dish).join(', ')}</>
                          ) : (
                            <><span className="font-medium">Carbs:</span> <span className="text-[#86868B] italic">n.a.</span></>
                          )}
                        </p>

                        {/* Line 4-5: Veg (2 lines) */}
                        <p className="text-[12px] text-[#1D1D1F] min-h-[2.5rem]">
                          {(getWarmVeggies(vegItem.dish).length > 0 || hasSalad(vegItem.dish)) ? (
                            <>
                              <span className="font-medium">Veg:</span>{' '}
                              {[
                                ...getWarmVeggies(vegItem.dish),
                                ...(hasSalad(vegItem.dish) ? [vegItem.dish.salad_name || 'Salad'] : [])
                              ].join(', ')}
                            </>
                          ) : (
                            <span className="text-transparent">-</span>
                          )}
                        </p>

                        {/* Line 6-7: Allergens (2 lines) */}
                        <div className="flex flex-wrap gap-1 justify-center min-h-[2.5rem]">
                          {getAllergensForDish(vegItem.dish).length > 0 ? (
                            getAllergensForDish(vegItem.dish).map((allergen) => (
                              <span key={allergen} className="text-[10px] font-medium px-1.5 py-0.5 text-[#FF3B30] rounded-sm">
                                {allergen}
                              </span>
                            ))
                          ) : (
                            <span className="text-[12px] text-[#86868B] italic">No allergens</span>
                          )}
                        </div>

                        {/* Line 8: Dietary Info */}
                        <div className="flex flex-nowrap gap-1 justify-center min-h-[1.25rem] overflow-hidden">
                          {getDietaryInfo(vegItem.dish).map((info) => (
                            <span key={info} className="text-[10px] font-medium px-1.5 py-0.5 text-[#34C759] rounded-sm whitespace-nowrap">
                              {info}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[13px] text-[#86868B] italic">Not available</p>
                    )}
                  </td>
                );
              })}
            </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-[13px] text-[#86868B] print:mt-12">
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
