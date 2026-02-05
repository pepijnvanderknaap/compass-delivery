'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import type { Dish } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';
import DishCardView from './DishCardView';

export default function DishCardsPage() {
  const supabase = createClient();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [currentMenuDishes, setCurrentMenuDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDishes();
    fetchCurrentMenuDishes();
  }, []);

  const fetchCurrentMenuDishes = async () => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // Skip if weekend (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setCurrentMenuDishes([]);
      return;
    }

    // Get week start date (Monday) using date-fns, same as menu planner
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    const weekStartDate = format(monday, 'yyyy-MM-dd');

    // Calculate day index (0 = Monday, 4 = Friday)
    const todayDayIndex = dayOfWeek - 1;

    // First, get the weekly menu
    const { data: menuData } = await supabase
      .from('weekly_menus')
      .select('*')
      .eq('week_start_date', weekStartDate)
      .maybeSingle();

    if (!menuData) {
      setCurrentMenuDishes([]);
      return;
    }

    // Then fetch today's menu items
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('dish_id')
      .eq('menu_id', menuData.id)
      .eq('day_of_week', todayDayIndex);

    if (menuItems && menuItems.length > 0) {
      // Get full dish details
      const dishIds = menuItems.map(item => item.dish_id);
      const { data: dishes } = await supabase
        .from('dishes')
        .select('*')
        .in('id', dishIds);

      if (dishes) {
        setCurrentMenuDishes(dishes);
      }
    } else {
      setCurrentMenuDishes([]);
    }
  };

  const fetchDishes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('dishes')
      .select('*')
      .in('category', ['soup', 'hot_dish_meat', 'hot_dish_fish', 'hot_dish_veg'])
      .eq('is_active', true)
      .order('name');

    if (data) setDishes(data);
    setLoading(false);
  };

  const filteredDishes = dishes.filter((dish) => {
    const matchesCategory = filterCategory === 'all' || dish.category === filterCategory;
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (selectedDish) {
    return (
      <DishCardView
        dish={selectedDish}
        onClose={() => setSelectedDish(null)}
        onUpdate={fetchDishes}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white font-apple">
      <AdminQuickNav />
      <UniversalHeader
        title=""
        backPath=""
        locationLogo=""
        locationName="Kitchen"
        navItems={[
          { label: 'Week Overview', href: '/kitchen/week-overview', active: false },
          {
            label: 'Dishes',
            href: '/kitchen/dishes',
            active: true,
            subItems: [
              { label: 'Dish Library', href: '/kitchen/dishes', active: false },
              { label: 'Dish Cards', href: '/kitchen/dish-cards', active: true },
              { label: 'Allergens', href: '/kitchen/allergens', active: false },
            ]
          },
          { label: 'Menu Planner', href: '/kitchen/menus', active: false },
          { label: 'Recipes', href: '/kitchen/recipes', active: false },
          { label: 'Production', href: '/kitchen/production', active: false },
        ]}      />

      <main className="max-w-7xl mx-auto px-8 lg:px-12 pt-24 pb-10">
        <div className="mb-8">
          <h2 className="text-[22px] font-semibold text-[#1D1D1F] mb-2">Dish Cards for Printing</h2>
          <p className="text-[15px] text-[#6E6E73]">
            Create professional dish cards with photos, components, allergens, and dietary information for printing or iPad display.
          </p>
        </div>

        {/* Today's Menu */}
        {currentMenuDishes.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-[17px] font-semibold text-[#1D1D1F]">Today's Menu</h3>
              <span className="px-3 py-1 text-[12px] font-medium rounded-full bg-[#0078D4] text-white">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentMenuDishes.map((dish) => {
                // Get allergens
                const allergens = [
                  dish.allergen_gluten && 'Gluten',
                  dish.allergen_soy && 'Soy',
                  dish.allergen_lactose && 'Lactose',
                  dish.allergen_sesame && 'Sesame',
                  dish.allergen_sulphites && 'Sulphites',
                  dish.allergen_egg && 'Egg',
                  dish.allergen_mustard && 'Mustard',
                  dish.allergen_celery && 'Celery',
                ].filter(Boolean);

                // Get dietary info
                const dietaryInfo = [
                  dish.contains_pork && 'Pork',
                  dish.contains_beef && 'Beef',
                  dish.contains_lamb && 'Lamb',
                  dish.is_vegetarian && 'Vegetarian',
                  dish.is_vegan && 'Vegan',
                ].filter(Boolean);

                return (
                  <button
                    key={dish.id}
                    onClick={() => setSelectedDish(dish)}
                    className="bg-white border border-[#D2D2D7] rounded-lg overflow-hidden hover:shadow-lg hover:border-[#0078D4] transition-all text-left"
                  >
                    {/* Photo */}
                    {dish.photo_url ? (
                      <div className="w-full h-40 bg-[#F5F5F7] overflow-hidden">
                        <img
                          src={dish.photo_url}
                          alt={dish.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-40 bg-gradient-to-br from-[#F5F5F7] to-[#E8E8ED] flex items-center justify-center">
                        <svg className="w-16 h-16 text-[#D2D2D7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-4">
                      {/* Category Badge */}
                      <div className="mb-2">
                        <span className="inline-block px-2 py-1 text-[11px] font-medium rounded-full bg-[#0078D4]/10 text-[#0078D4]">
                          {dish.category === 'soup' && 'Soup'}
                          {dish.category === 'hot_dish_meat' && 'Meat/Fish'}
                          {dish.category === 'hot_dish_fish' && 'Meat/Fish'}
                          {dish.category === 'hot_dish_veg' && 'Vegetarian'}
                        </span>
                      </div>

                      {/* Name */}
                      <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-2 line-clamp-2">
                        {dish.name}
                      </h3>

                      {/* Description */}
                      {dish.description && (
                        <p className="text-[12px] text-[#6E6E73] mb-3 line-clamp-2">
                          {dish.description}
                        </p>
                      )}

                      {/* Allergens & Dietary */}
                      {(allergens.length > 0 || dietaryInfo.length > 0) && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {allergens.slice(0, 3).map((allergen) => (
                            <span key={allergen} className="text-[9px] font-medium px-1.5 py-0.5 bg-[#FF3B30]/10 text-[#FF3B30] rounded">
                              {allergen}
                            </span>
                          ))}
                          {allergens.length > 3 && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 bg-[#FF3B30]/10 text-[#FF3B30] rounded">
                              +{allergens.length - 3}
                            </span>
                          )}
                          {dietaryInfo.slice(0, 2).map((info) => (
                            <span key={info} className="text-[9px] font-medium px-1.5 py-0.5 bg-[#34C759]/10 text-[#34C759] rounded">
                              {info}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Click to view hint */}
                      <div className="mt-3 pt-3 border-t border-[#E8E8ED]">
                        <p className="text-[11px] text-[#0078D4] font-medium">
                          Click to view full card →
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[#D2D2D7] my-8 pt-8">
          <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-2">All Dishes</h3>
          <p className="text-[13px] text-[#6E6E73] mb-6">
            Search and print dish cards for advance planning or specific requests.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-[#D2D2D7] rounded-sm p-6 mb-6 shadow-sm">
          <div className="flex gap-4 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20 outline-none transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="min-w-[200px]">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20 outline-none transition-all"
              >
                <option value="all">All Categories</option>
                <option value="soup">Soup</option>
                <option value="hot_dish_meat">Hot Dish - Meat</option>
                <option value="hot_dish_fish">Hot Dish - Fish</option>
                <option value="hot_dish_veg">Hot Dish - Veg</option>
              </select>
            </div>
          </div>
        </div>

        {/* All Dishes Grid - Only show when searching/filtering */}
        {(searchTerm || filterCategory !== 'all') && (
          <>
            {loading ? (
              <div className="text-center py-12 text-[#6E6E73]">Loading dishes...</div>
            ) : filteredDishes.length === 0 ? (
              <div className="bg-white border border-[#D2D2D7] rounded-sm p-12 text-center shadow-sm">
                <p className="text-[15px] text-[#6E6E73]">No dishes found matching your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDishes.map((dish) => (
                  <button
                    key={dish.id}
                    onClick={() => setSelectedDish(dish)}
                    className="bg-white border border-[#D2D2D7] rounded-sm p-6 hover:border-[#0078D4] hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-[17px] font-semibold text-[#1D1D1F] flex-1">
                        {dish.name}
                      </h3>
                      {dish.photo_url && (
                        <div className="ml-2 text-[#0078D4]">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <span className="inline-block px-3 py-1 text-[13px] font-medium rounded-full bg-[#F5F5F7] text-[#1D1D1F]">
                        {dish.category === 'soup' && 'Soup'}
                        {dish.category === 'hot_dish_meat' && 'Hot Dish - Meat'}
                        {dish.category === 'hot_dish_fish' && 'Hot Dish - Fish'}
                        {dish.category === 'hot_dish_veg' && 'Hot Dish - Veg'}
                      </span>
                    </div>

                    {dish.description && (
                      <p className="text-[13px] text-[#6E6E73] line-clamp-2">
                        {dish.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
