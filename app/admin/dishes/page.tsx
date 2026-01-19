'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Dish, UserProfile, DishComponent, DishWithComponents } from '@/lib/types';
import MainDishForm from './MainDishForm';
import ComponentForm from './ComponentForm';

export default function AdminDishesPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mainDishes, setMainDishes] = useState<Dish[]>([]);
  const [componentDishes, setComponentDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categorySearchTerms, setCategorySearchTerms] = useState<Record<string, string>>({});
  const [editingDish, setEditingDish] = useState<DishWithComponents | null>(null);
  const [showMainDishForm, setShowMainDishForm] = useState(false);
  const [showComponentForm, setShowComponentForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const mainCategories = [
    { key: 'soup', label: 'Soups', icon: '🍲' },
    { key: 'hot_dish_meat', label: 'Hot Dish - Meat', icon: '🥩' },
    { key: 'hot_dish_fish', label: 'Hot Dish - Fish', icon: '🐟' },
    { key: 'hot_dish_veg', label: 'Hot Dish - Veg', icon: '🌱' },
    { key: 'off_menu', label: 'Off Menu / Bespoke', icon: '✨' },
  ];

  const subcategories = [
    { key: 'topping', label: 'Toppings', icon: '🌿' },
    { key: 'carb', label: 'Carbs', icon: '🍚' },
    { key: 'warm_veggie', label: 'Warm Veggies', icon: '🥕' },
    { key: 'salad', label: 'Salads', icon: '🥗' },
    { key: 'condiment', label: 'Condiments', icon: '🧂' },
  ];

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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching dishes:', error);
      return;
    }

    if (data) {
      // Separate main dishes from component dishes
      const main = data.filter(d => !d.subcategory);
      const components = data.filter(d => d.subcategory);
      setMainDishes(main);
      setComponentDishes(components);
    }
  };

  const fetchDishWithComponents = async (dishId: string): Promise<DishWithComponents | null> => {
    // Get the dish
    const { data: dish, error: dishError } = await supabase
      .from('dishes')
      .select('*')
      .eq('id', dishId)
      .single();

    if (dishError || !dish) {
      console.error('Error fetching dish:', dishError);
      return null;
    }

    // Get linked components
    const { data: components, error: componentsError } = await supabase
      .from('dish_components')
      .select('*, component_dish:dishes!component_dish_id(*)')
      .eq('main_dish_id', dishId);

    if (componentsError) {
      console.error('Error fetching components:', componentsError);
      return dish as DishWithComponents;
    }

    // Organize components by type
    const dishWithComponents: DishWithComponents = {
      ...dish,
      components: {
        topping: [],
        carb: [],
        warm_veggie: [],
        salad: [],
        condiment: [],
      }
    };

    if (components) {
      components.forEach((comp: any) => {
        const componentType = comp.component_type as 'topping' | 'carb' | 'warm_veggie' | 'salad' | 'condiment';
        const componentDish = comp.component_dish as Dish;
        if (componentDish && dishWithComponents.components) {
          const arr = dishWithComponents.components[componentType];
          if (arr) {
            arr.push(componentDish);
          }
        }
      });
    }

    return dishWithComponents;
  };

  const handleEditMainDish = async (dish: Dish) => {
    const dishWithComponents = await fetchDishWithComponents(dish.id);
    setEditingDish(dishWithComponents);
    setShowMainDishForm(true);
  };

  const handleEditComponent = (dish: Dish) => {
    setEditingDish(dish as DishWithComponents);
    setShowComponentForm(true);
  };

  const handleDeleteDish = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dish?')) return;

    try {
      const { error } = await supabase
        .from('dishes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Dish deleted successfully' });
      fetchDishes();
    } catch (err: any) {
      console.error('Error deleting dish:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to delete dish' });
    }
  };

  const getFilteredMainDishes = (categoryKey: string) => {
    let filtered = mainDishes.filter(d => d.category === categoryKey);
    const searchKey = categorySearchTerms[categoryKey] || '';
    if (searchKey) {
      filtered = filtered.filter(d => d.name.toLowerCase().includes(searchKey.toLowerCase()));
    }
    return filtered.slice(0, 10);
  };

  const getFilteredComponentDishes = (subcategoryKey: string) => {
    let filtered = componentDishes.filter(d => d.subcategory === subcategoryKey);
    const searchKey = categorySearchTerms[subcategoryKey] || '';
    if (searchKey) {
      filtered = filtered.filter(d => d.name.toLowerCase().includes(searchKey.toLowerCase()));
    }
    return filtered.slice(0, 10);
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
      {/* Header */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">Dish Management</h1>
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
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {/* Add Button */}
        <div className="mb-8 flex justify-end">
          <button
            onClick={() => {
              setEditingDish(null);
              setShowMainDishForm(true);
            }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + Add New
          </button>
        </div>

        {/* Main Categories Section - Grid Layout */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Main Dishes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mainCategories.map(category => {
              const dishes = getFilteredMainDishes(category.key);
              const totalCount = mainDishes.filter(d => d.category === category.key).length;

              return (
                <div key={category.key} className="bg-white rounded-lg shadow">
                  <div className="px-4 py-3 border-b bg-indigo-50">
                    <h3 className="text-base font-semibold text-indigo-900 flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span>{category.label}</span>
                      <span className="text-sm text-indigo-600">({totalCount})</span>
                    </h3>
                  </div>
                  <div className="p-3">
                    {/* Individual search bar */}
                    <input
                      type="text"
                      placeholder="Search..."
                      value={categorySearchTerms[category.key] || ''}
                      onChange={(e) => setCategorySearchTerms({ ...categorySearchTerms, [category.key]: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-indigo-500"
                    />
                    {dishes.length === 0 ? (
                      <p className="text-gray-400 text-sm py-2 text-center">No dishes found</p>
                    ) : (
                      <div className="space-y-1">
                        {dishes.map(dish => (
                          <div key={dish.id} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded text-sm">
                            <span className="text-gray-900 truncate flex-1">{dish.name}</span>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => handleEditMainDish(dish)}
                                className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteDish(dish.id)}
                                className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                              >
                                Del
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subcategories Section - Grid Layout */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Component Library</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subcategories.map(subcategory => {
              const dishes = getFilteredComponentDishes(subcategory.key);
              const totalCount = componentDishes.filter(d => d.subcategory === subcategory.key).length;

              return (
                <div key={subcategory.key} className="bg-white rounded-lg shadow">
                  <div className="px-4 py-3 border-b bg-green-50">
                    <h3 className="text-base font-semibold text-green-900 flex items-center gap-2">
                      <span>{subcategory.icon}</span>
                      <span>{subcategory.label}</span>
                      <span className="text-sm text-green-600">({totalCount})</span>
                    </h3>
                  </div>
                  <div className="p-3">
                    {/* Individual search bar */}
                    <input
                      type="text"
                      placeholder="Search..."
                      value={categorySearchTerms[subcategory.key] || ''}
                      onChange={(e) => setCategorySearchTerms({ ...categorySearchTerms, [subcategory.key]: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-green-500"
                    />
                    {dishes.length === 0 ? (
                      <p className="text-gray-400 text-sm py-2 text-center">No components found</p>
                    ) : (
                      <div className="space-y-1">
                        {dishes.map(dish => (
                          <div key={dish.id} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded text-sm">
                            <span className="text-gray-900 truncate flex-1">{dish.name}</span>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => handleEditComponent(dish)}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteDish(dish.id)}
                                className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                              >
                                Del
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Main Dish Form Modal */}
      {showMainDishForm && (
        <MainDishForm
          dish={editingDish}
          onClose={() => {
            setShowMainDishForm(false);
            setEditingDish(null);
          }}
          onSave={() => {
            fetchDishes();
            setMessage({ type: 'success', text: 'Dish saved successfully!' });
          }}
        />
      )}

      {/* Component Form Modal */}
      {showComponentForm && (
        <ComponentForm
          component={editingDish}
          onClose={() => {
            setShowComponentForm(false);
            setEditingDish(null);
          }}
          onSave={() => {
            fetchDishes();
            setMessage({ type: 'success', text: 'Component saved successfully!' });
          }}
        />
      )}
    </div>
  );
}
