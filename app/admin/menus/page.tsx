'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, startOfWeek, addDays, addWeeks } from 'date-fns';
import type { Dish, WeeklyMenu, MenuItem, UserProfile } from '@/lib/types';

interface MenuItemForm {
  dish_id: string;
  day_of_week: number;
}

export default function AdminMenusPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Date>(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1));
  const [menuItems, setMenuItems] = useState<MenuItemForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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
        
        const { data: dishesData } = await supabase
          .from('dishes')
          .select('*')
          .eq('is_active', true)
          .order('name');

        setDishes(dishesData || []);
        fetchMenus();
      } catch (err) {
        console.error('Error initializing page:', err);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [supabase, router]);

  const fetchMenus = async () => {
    const { data, error } = await supabase
      .from('weekly_menus')
      .select(\`
        *,
        menu_items(*, dishes(name))
      \`)
      .order('week_start_date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching menus:', error);
      return;
    }

    setMenus(data || []);
  };

  useEffect(() => {
    const loadMenuForWeek = async () => {
      const weekStart = format(selectedWeek, 'yyyy-MM-dd');
      const { data } = await supabase
        .from('weekly_menus')
        .select('*, menu_items(*)')
        .eq('week_start_date', weekStart)
        .single();

      if (data?.menu_items) {
        setMenuItems(
          (data.menu_items as MenuItem[]).map(item => ({
            dish_id: item.dish_id,
            day_of_week: item.day_of_week,
          }))
        );
      } else {
        setMenuItems([]);
      }
    };

    if (!loading) {
      loadMenuForWeek();
    }
  }, [selectedWeek, loading, supabase]);

  const handleAddMenuItem = () => {
    setMenuItems([...menuItems, { dish_id: '', day_of_week: 0 }]);
  };

  const handleRemoveMenuItem = (index: number) => {
    setMenuItems(menuItems.filter((_, i) => i !== index));
  };

  const handleMenuItemChange = (index: number, field: keyof MenuItemForm, value: string | number) => {
    const newItems = [...menuItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setMenuItems(newItems);
  };

  const handleSaveMenu = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const weekStart = format(selectedWeek, 'yyyy-MM-dd');

      // Check if menu exists
      const { data: existingMenu } = await supabase
        .from('weekly_menus')
        .select('id')
        .eq('week_start_date', weekStart)
        .single();

      let menuId: string;

      if (existingMenu) {
        menuId = existingMenu.id;
        
        // Delete existing menu items
        await supabase
          .from('menu_items')
          .delete()
          .eq('menu_id', menuId);
      } else {
        // Create new menu
        const { data: newMenu, error: menuError } = await supabase
          .from('weekly_menus')
          .insert({
            week_start_date: weekStart,
            created_by: profile?.id,
          })
          .select()
          .single();

        if (menuError) throw menuError;
        menuId = newMenu.id;
      }

      // Insert menu items
      const itemsToInsert = menuItems
        .filter(item => item.dish_id && item.day_of_week >= 0)
        .map(item => ({
          menu_id: menuId,
          dish_id: item.dish_id,
          day_of_week: item.day_of_week,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('menu_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      setMessage({ type: 'success', text: 'Menu saved successfully!' });
      fetchMenus();
    } catch (err: any) {
      console.error('Error saving menu:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save menu' });
    } finally {
      setSaving(false);
    }
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">Weekly Menus</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={\`mb-6 p-4 rounded-lg \${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}\`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">Create/Edit Menu</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Week Starting
                </label>
                <input
                  type="date"
                  value={format(selectedWeek, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedWeek(new Date(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-4 mb-6">
                {menuItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Day
                      </label>
                      <select
                        value={item.day_of_week}
                        onChange={(e) => handleMenuItemChange(index, 'day_of_week', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        {daysOfWeek.map((day, i) => (
                          <option key={i} value={i}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dish
                      </label>
                      <select
                        value={item.dish_id}
                        onChange={(e) => handleMenuItemChange(index, 'dish_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select dish</option>
                        {dishes.map((dish) => (
                          <option key={dish.id} value={dish.id}>
                            {dish.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveMenuItem(index)}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleAddMenuItem}
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  + Add Menu Item
                </button>
                <button
                  type="button"
                  onClick={handleSaveMenu}
                  disabled={saving}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Menu'}
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold mb-4">Recent Menus</h3>
              <div className="space-y-3">
                {menus.map((menu) => (
                  <div
                    key={menu.id}
                    className="p-3 border border-gray-200 rounded-lg hover:border-indigo-300 cursor-pointer"
                    onClick={() => setSelectedWeek(new Date(menu.week_start_date))}
                  >
                    <div className="font-medium text-gray-900">
                      Week of {format(new Date(menu.week_start_date), 'MMM d, yyyy')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {(menu.menu_items as MenuItem[])?.length || 0} items
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
