'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  location_id: string;
  menu_items: MenuItem[];
}

export default function LocationManagementWeekOverviewPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('Location Management');

  useEffect(() => {
    const fetchLocation = async () => {
      const { data: location } = await supabase
        .from('locations')
        .select('id, name')
        .eq('slug', 'location-management')
        .single();

      if (location) {
        setLocationId(location.id);
        setLocationName(location.name);
      }
    };
    fetchLocation();
  }, []);

  useEffect(() => {
    if (locationId) {
      fetchWeeklyMenu();
    }
  }, [currentWeekStart, locationId]);

  const fetchWeeklyMenu = async () => {
    if (!locationId) return;

    setLoading(true);
    const weekStartString = format(currentWeekStart, 'yyyy-MM-dd');

    const { data: menuData, error: menuError } = await supabase
      .from('weekly_menus')
      .select('*')
      .eq('week_start_date', weekStartString)
      .eq('location_id', locationId)
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

          // Fetch components
          const { data: warmVeggieComponents } = await supabase
            .from('warm_veggie_components')
            .select('percentage, component_dish:component_dish_id(id, name, category)')
            .eq('main_dish_id', item.dish_id);

          // Fetch salad components (new system)
          let saladComponents: any[] = [];
          let saladName: string | null = null;
          const { data: dishSaladLink } = await supabase
            .from('dish_salad_combinations')
            .select('salad_combination_id')
            .eq('main_dish_id', item.dish_id)
            .maybeSingle();

          if (dishSaladLink) {
            // Get salad combination name
            const { data: saladCombo } = await supabase
              .from('salad_combinations')
              .select('custom_name')
              .eq('id', dishSaladLink.salad_combination_id)
              .single();

            saladName = saladCombo?.custom_name || null;

            // Get salad items
            const { data: saladItems } = await supabase
              .from('salad_combination_items')
              .select('percentage, component_dish:component_dish_id(id, name, category)')
              .eq('salad_combination_id', dishSaladLink.salad_combination_id);

            saladComponents = saladItems || [];
          }

          // Fetch soup toppings (from dish_components table)
          const { data: toppingComponents } = await supabase
            .from('dish_components')
            .select('component_type, component_dish:dishes!component_dish_id(id, name, category)')
            .eq('main_dish_id', item.dish_id)
            .eq('component_type', 'topping');

          // Fetch carbs (from dish_components table)
          const { data: carbComponents } = await supabase
            .from('dish_components')
            .select('component_type, component_dish:dishes!component_dish_id(id, name, category)')
            .eq('main_dish_id', item.dish_id)
            .eq('component_type', 'carb');

          return {
            ...item,
            dish: {
              ...dishData,
              warm_veggie_components: warmVeggieComponents || [],
              salad_components: saladComponents || [],
              salad_name: saladName,
              topping_components: toppingComponents || [],
              carb_components: carbComponents || [],
            },
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

  const previousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const nextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper functions
  const getSoupToppings = (dish: any) => {
    if (!dish.topping_components) return [];
    return dish.topping_components.map((tc: any) => tc.component_dish?.name || '').filter(Boolean);
  };

  const getCarbs = (dish: any) => {
    if (!dish.carb_components) return [];
    return dish.carb_components.map((cc: any) => cc.component_dish?.name || '').filter(Boolean);
  };

  const getWarmVeggies = (dish: any) => {
    if (!dish.warm_veggie_components) return [];
    return dish.warm_veggie_components.map((wv: any) => wv.component_dish?.name || '').filter(Boolean);
  };

  const hasSalad = (dish: any) => {
    return dish.salad_components && dish.salad_components.length > 0;
  };

  const getAllergensForDish = (dish: any) => {
    const allergens: string[] = [];
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

  const getDietaryInfo = (dish: any) => {
    const dietary: string[] = [];
    if (dish.is_vegetarian) dietary.push('Veg');
    if (dish.is_vegan) dietary.push('Vegan');
    if (dish.contains_pork) dietary.push('Pork');
    if (dish.contains_beef) dietary.push('Beef');
    if (dish.contains_lamb) dietary.push('Lamb');
    if (dish.contains_chicken) dietary.push('Chicken');
    if (dish.contains_fish) dietary.push('Fish');
    if (dish.is_halal) dietary.push('Halal');
    return dietary;
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="min-h-screen bg-white">
      <AdminQuickNav />

      <UniversalHeader
        title="Week Overview"
        backPath="/location-management"
        locationLogo="/images/location-management-logo.png"
        locationName={locationName}
      />

      <main className="max-w-[1800px] mx-auto px-8 py-12">
        {/* Location-specific title */}
        <div className="text-center mb-8 print-only">
          <h1 className="text-[28px] font-semibold text-[#1D1D1F] mb-2">
            {locationName} - Week Overview
          </h1>
          <p className="text-[#1D1D1F] mb-1">
            {format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 4), 'MMMM d, yyyy')}
          </p>
          <p className="text-[#86868B]">Compass Group Dark Kitchen</p>
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
                <h3 className="text-apple-headline font-medium italic text-[#1D1D1F]">
                  {format(currentWeekStart, 'd MMM')} - {format(addDays(currentWeekStart, 4), 'd MMM yyyy')}
                </h3>
                <span className="text-apple-footnote font-medium italic tracking-wider text-[#6E6E73]">
                  (Week {format(currentWeekStart, 'w')})
                </span>
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
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-apple-subheadline font-medium text-[#1D1D1F] bg-white border border-[#D2D2D7] hover:bg-[#F5F5F7] rounded-sm transition-colors no-print"
                >
                  Print
                </button>
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
                  <tr className="bg-[#FAFAFA]">
                    <th className="py-5 px-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#D2D2D7]">
                      Meal
                    </th>
                    {daysOfWeek.map((day) => (
                      <th
                        key={day}
                        className="py-5 px-4 text-center text-[13px] font-semibold text-[#86868B] uppercase tracking-wide border-l border-b border-[#D2D2D7]"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
              {/* Soup Row */}
              <tr className="border-b border-[#D2D2D7]">
                <td className="py-6 px-4 font-medium text-[15px] text-[#1D1D1F] bg-[#FAFAFA] align-top">
                  Soup
                </td>
                {Array.from({ length: 5 }).map((_, dayIndex) => {
                  const soupItem = weeklyMenu.menu_items.find(
                    (item) => item.day_of_week === dayIndex && item.meal_type === 'soup'
                  );
                  return (
                    <td
                      key={dayIndex}
                      className="px-4 py-6 border-l border-[#D2D2D7] text-center bg-white align-top"
                    >
                      {soupItem ? (
                        <div className="space-y-1">
                          {/* Line 1-2: Dish Name (fixed height) */}
                          <h3 className="text-[16px] font-semibold text-[#1D1D1F] line-clamp-2 min-h-[2.5rem]">
                            {soupItem.dish.name}
                          </h3>

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
                            {getAllergensForDish(soupItem.dish).map((allergen) => (
                              <span key={allergen} className="text-[10px] font-medium px-1.5 py-0.5 bg-[#FF3B30]/10 text-[#FF3B30] rounded-sm">
                                {allergen}
                              </span>
                            ))}
                          </div>

                          {/* Line 8: Dietary Info */}
                          <div className="flex flex-nowrap gap-1 justify-center min-h-[1.25rem] overflow-hidden">
                            {getDietaryInfo(soupItem.dish).map((info) => (
                              <span key={info} className="text-[10px] font-medium px-1.5 py-0.5 bg-[#34C759]/10 text-[#34C759] rounded-sm whitespace-nowrap">
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

              {/* Hot Meat Row */}
              <tr className="border-b border-[#D2D2D7]">
                <td className="py-6 px-4 font-medium text-[15px] text-[#1D1D1F] bg-[#FAFAFA] align-top">
                  Hot Meat
                </td>
                {Array.from({ length: 5 }).map((_, dayIndex) => {
                  const meatItem = weeklyMenu.menu_items.find(
                    (item) => item.day_of_week === dayIndex && item.meal_type === 'hot_meat'
                  );
                  return (
                    <td
                      key={dayIndex}
                      className="px-4 py-6 border-l border-[#D2D2D7] text-center bg-white align-top"
                    >
                      {meatItem ? (
                        <div className="space-y-1">
                          {/* Line 1-2: Dish Name (fixed height) */}
                          <h3 className="text-[16px] font-semibold text-[#1D1D1F] line-clamp-2 min-h-[2.5rem]">
                            {meatItem.dish.name}
                          </h3>

                          {/* Line 3: Carbs (always visible) */}
                          <p className="text-[12px] text-[#1D1D1F] min-h-[1.25rem]">
                            {getCarbs(meatItem.dish).length > 0 ? (
                              <><span className="font-medium">Carbs:</span> {getCarbs(meatItem.dish).join(', ')}</>
                            ) : (
                              <span className="text-transparent">-</span>
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
                            {getAllergensForDish(meatItem.dish).map((allergen) => (
                              <span key={allergen} className="text-[10px] font-medium px-1.5 py-0.5 bg-[#FF3B30]/10 text-[#FF3B30] rounded-sm">
                                {allergen}
                              </span>
                            ))}
                          </div>

                          {/* Line 8: Dietary Info */}
                          <div className="flex flex-nowrap gap-1 justify-center min-h-[1.25rem] overflow-hidden">
                            {getDietaryInfo(meatItem.dish).map((info) => (
                              <span key={info} className="text-[10px] font-medium px-1.5 py-0.5 bg-[#34C759]/10 text-[#34C759] rounded-sm whitespace-nowrap">
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

              {/* Hot Veg Row */}
              <tr className="border-b border-[#D2D2D7]">
                <td className="py-6 px-4 font-medium text-[15px] text-[#1D1D1F] bg-[#FAFAFA] align-top">
                  Hot Veg
                </td>
                {Array.from({ length: 5 }).map((_, dayIndex) => {
                  const vegItem = weeklyMenu.menu_items.find(
                    (item) => item.day_of_week === dayIndex && item.meal_type === 'hot_veg'
                  );
                  return (
                    <td
                      key={dayIndex}
                      className="px-4 py-6 border-l border-[#D2D2D7] text-center bg-white align-top"
                    >
                      {vegItem ? (
                        <div className="space-y-1">
                          {/* Line 1-2: Dish Name (fixed height) */}
                          <h3 className="text-[16px] font-semibold text-[#1D1D1F] line-clamp-2 min-h-[2.5rem]">
                            {vegItem.dish.name}
                          </h3>

                          {/* Line 3: Carbs (always visible) */}
                          <p className="text-[12px] text-[#1D1D1F] min-h-[1.25rem]">
                            {getCarbs(vegItem.dish).length > 0 ? (
                              <><span className="font-medium">Carbs:</span> {getCarbs(vegItem.dish).join(', ')}</>
                            ) : (
                              <span className="text-transparent">-</span>
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
                            {getAllergensForDish(vegItem.dish).map((allergen) => (
                              <span key={allergen} className="text-[10px] font-medium px-1.5 py-0.5 bg-[#FF3B30]/10 text-[#FF3B30] rounded-sm">
                                {allergen}
                              </span>
                            ))}
                          </div>

                          {/* Line 8: Dietary Info */}
                          <div className="flex flex-nowrap gap-1 justify-center min-h-[1.25rem] overflow-hidden">
                            {getDietaryInfo(vegItem.dish).map((info) => (
                              <span key={info} className="text-[10px] font-medium px-1.5 py-0.5 bg-[#34C759]/10 text-[#34C759] rounded-sm whitespace-nowrap">
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
      </main>

      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          @page {
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  );
}
