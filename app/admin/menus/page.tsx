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
  const router = useRouter();
  const supabase = createClient();

  // Generate 4 weeks starting from next Monday
  const startDate = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);
  const weeks = Array.from({ length: 4 }, (_, i) => addWeeks(startDate, i));
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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
        fetchDishes();
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
      .order('name');

    if (error) {
      console.error('Error fetching dishes:', error);
      return;
    }

    setDishes(data || []);
  };

  const filteredDishes = dishes.filter(dish => {
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || dish.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDragStart = (e: React.DragEvent, dishId: string) => {
    e.dataTransfer.setData('dishId', dishId);
  };

  const handleDrop = (e: React.DragEvent, weekIndex: number, dayIndex: number, slot: string) => {
    e.preventDefault();
    const dishId = e.dataTransfer.getData('dishId');
    const dateKey = format(addDays(weeks[weekIndex], dayIndex), 'yyyy-MM-dd');

    setMenuData(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [slot]: dishId
      }
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getDishById = (dishId: string | null) => {
    if (!dishId) return null;
    return dishes.find(d => d.id === dishId);
  };

  const clearSlot = (weekIndex: number, dayIndex: number, slot: string) => {
    const dateKey = format(addDays(weeks[weekIndex], dayIndex), 'yyyy-MM-dd');
    setMenuData(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [slot]: null
      }
    }));
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
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">4-Week Menu Planner</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar with dishes */}
          <div className="col-span-3 bg-white rounded-xl shadow-md p-6 h-fit sticky top-8">
            <h2 className="text-lg font-bold mb-4">Available Dishes</h2>

            {/* Search */}
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500"
            />

            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="soup">Soup</option>
              <option value="hot_dish_meat">Hot Dish Meat/Fish</option>
              <option value="hot_dish_vegetarian">Hot Dish Vegetarian</option>
            </select>

            {/* Dish list */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredDishes.map(dish => (
                <div
                  key={dish.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, dish.id)}
                  className="p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-move hover:bg-gray-100 hover:border-indigo-300 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900">{dish.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{dish.category.replace('_', ' ')}</div>
                </div>
              ))}
              {filteredDishes.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No dishes found
                </div>
              )}
            </div>
          </div>

          {/* 4-week calendar grid */}
          <div className="col-span-9 space-y-8">
            {weeks.map((weekStart, weekIndex) => (
              <div key={weekIndex} className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-indigo-600 text-white p-4">
                  <h3 className="text-lg font-bold">
                    Week {weekIndex + 1}: {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 4), 'MMM d, yyyy')}
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Meal</th>
                        {days.map((day, dayIndex) => (
                          <th key={day} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            {day}
                            <div className="text-gray-400 font-normal normal-case">
                              {format(addDays(weekStart, dayIndex), 'MMM d')}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {/* Soup Row */}
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">Soup</td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.soup;
                          const dish = getDishById(dishId);

                          return (
                            <td
                              key={dayIndex}
                              onDrop={(e) => handleDrop(e, weekIndex, dayIndex, 'soup')}
                              onDragOver={handleDragOver}
                              className="px-2 py-2"
                            >
                              <div className="min-h-[60px] border-2 border-dashed border-gray-300 rounded-lg p-2 hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                                {dish ? (
                                  <div className="relative group">
                                    <div className="text-xs font-medium text-gray-900">{dish.name}</div>
                                    <button
                                      onClick={() => clearSlot(weekIndex, dayIndex, 'soup')}
                                      className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400 text-center">Drop here</div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Hot Dish Meat/Fish Row */}
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">Hot Dish Meat/Fish</td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.hot_meat;
                          const dish = getDishById(dishId);

                          return (
                            <td
                              key={dayIndex}
                              onDrop={(e) => handleDrop(e, weekIndex, dayIndex, 'hot_meat')}
                              onDragOver={handleDragOver}
                              className="px-2 py-2"
                            >
                              <div className="min-h-[60px] border-2 border-dashed border-gray-300 rounded-lg p-2 hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                                {dish ? (
                                  <div className="relative group">
                                    <div className="text-xs font-medium text-gray-900">{dish.name}</div>
                                    <button
                                      onClick={() => clearSlot(weekIndex, dayIndex, 'hot_meat')}
                                      className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400 text-center">Drop here</div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Hot Dish Vegetarian Row */}
                      <tr>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">Hot Dish Vegetarian</td>
                        {days.map((_, dayIndex) => {
                          const dateKey = format(addDays(weekStart, dayIndex), 'yyyy-MM-dd');
                          const dishId = menuData[dateKey]?.hot_veg;
                          const dish = getDishById(dishId);

                          return (
                            <td
                              key={dayIndex}
                              onDrop={(e) => handleDrop(e, weekIndex, dayIndex, 'hot_veg')}
                              onDragOver={handleDragOver}
                              className="px-2 py-2"
                            >
                              <div className="min-h-[60px] border-2 border-dashed border-gray-300 rounded-lg p-2 hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                                {dish ? (
                                  <div className="relative group">
                                    <div className="text-xs font-medium text-gray-900">{dish.name}</div>
                                    <button
                                      onClick={() => clearSlot(weekIndex, dayIndex, 'hot_veg')}
                                      className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400 text-center">Drop here</div>
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
            ))}

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setMessage({ type: 'success', text: 'Menu saved! (Save functionality coming next)' })}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-lg"
              >
                Save 4-Week Menu
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
