'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Dish } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
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
    // Get current week's start date (Monday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const weekStartDate = monday.toISOString().split('T')[0];

    // Fetch this week's menu
    const { data: menuData } = await supabase
      .from('weekly_menus')
      .select('*, soup:dishes!soup_id(*), hot_dish_meat:dishes!hot_dish_meat_id(*), hot_dish_veg:dishes!hot_dish_veg_id(*)')
      .eq('week_start_date', weekStartDate)
      .single();

    if (menuData) {
      const dishes: Dish[] = [];
      if (menuData.soup) dishes.push(menuData.soup);
      if (menuData.hot_dish_meat) dishes.push(menuData.hot_dish_meat);
      if (menuData.hot_dish_veg) dishes.push(menuData.hot_dish_veg);
      setCurrentMenuDishes(dishes);
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
    <div className="min-h-screen bg-gray-50 font-apple">
      <UniversalHeader title="Dish Cards" backPath="/dark-kitchen" />

      <main className="max-w-7xl mx-auto px-8 lg:px-12 py-10">
        <div className="mb-8">
          <h2 className="text-apple-title text-apple-gray1 mb-2">Dish Cards for Printing</h2>
          <p className="text-apple-subheadline text-apple-gray2">
            Create professional dish cards with photos, components, allergens, and dietary information for printing or iPad display.
          </p>
        </div>

        {/* Current Week's Menu */}
        {currentMenuDishes.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-apple-headline font-semibold text-apple-gray1">This Week's Menu</h3>
              <span className="px-3 py-1 text-apple-caption font-medium rounded-full bg-apple-blue text-white">
                Quick Access
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentMenuDishes.map((dish) => (
                <button
                  key={dish.id}
                  onClick={() => setSelectedDish(dish)}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-sm p-6 hover:border-apple-blue hover:shadow-lg transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-apple-headline font-semibold text-apple-gray1 flex-1">
                      {dish.name}
                    </h3>
                    {dish.photo_url && (
                      <div className="ml-2 text-apple-blue">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <span className="inline-block px-3 py-1 text-apple-footnote font-medium rounded-full bg-blue-200 text-blue-900">
                      {dish.category === 'soup' && 'Soup'}
                      {dish.category === 'hot_dish_meat' && 'Hot Dish - Meat'}
                      {dish.category === 'hot_dish_fish' && 'Hot Dish - Fish'}
                      {dish.category === 'hot_dish_veg' && 'Hot Dish - Veg'}
                    </span>
                  </div>

                  {dish.description && (
                    <p className="text-apple-footnote text-apple-gray2 line-clamp-2">
                      {dish.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-slate-300 rounded-sm p-6 mb-6">
          <div className="flex gap-4 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-apple-gray4 rounded-sm text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="min-w-[200px]">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-3 border border-apple-gray4 rounded-sm text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
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

        {/* All Dishes Grid */}
        {loading ? (
          <div className="text-center py-12 text-apple-gray2">Loading dishes...</div>
        ) : filteredDishes.length === 0 ? (
          <div className="bg-white border border-slate-300 rounded-sm p-12 text-center">
            <p className="text-apple-subheadline text-apple-gray2">No dishes found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDishes.map((dish) => (
              <button
                key={dish.id}
                onClick={() => setSelectedDish(dish)}
                className="bg-white border border-slate-300 rounded-sm p-6 hover:border-apple-blue hover:shadow-md transition-all text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-apple-headline font-semibold text-apple-gray1 flex-1">
                    {dish.name}
                  </h3>
                  {dish.photo_url && (
                    <div className="ml-2 text-apple-blue">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <span className="inline-block px-3 py-1 text-apple-footnote font-medium rounded-full bg-blue-50 text-blue-700">
                    {dish.category === 'soup' && 'Soup'}
                    {dish.category === 'hot_dish_meat' && 'Hot Dish - Meat'}
                    {dish.category === 'hot_dish_fish' && 'Hot Dish - Fish'}
                    {dish.category === 'hot_dish_veg' && 'Hot Dish - Veg'}
                  </span>
                </div>

                {dish.description && (
                  <p className="text-apple-footnote text-apple-gray2 line-clamp-2">
                    {dish.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
