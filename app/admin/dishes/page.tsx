'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Dish, UserProfile, DishComponent, DishWithComponents } from '@/lib/types';
import MainDishForm from './MainDishForm';
import ComponentForm from './ComponentForm';

// Grid layout with component management - v2
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
    { key: 'soup', label: 'Soups' },
    { key: 'hot_dish_meat', label: 'Hot Dish - Meat' },
    { key: 'hot_dish_fish', label: 'Hot Dish - Fish' },
    { key: 'hot_dish_veg', label: 'Hot Dish - Veg' },
  ];

  const subcategories = [
    { key: 'topping', label: 'Soup Toppings' },
    { key: 'carb', label: 'Carbs' },
    { key: 'warm_veggie', label: 'Warm Veggies' },
    { key: 'salad', label: 'Salads' },
    { key: 'condiment', label: 'Hot Dish Add-ons' },
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
    // First, get all dish IDs that are currently in use in menu_items
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('dish_id');

    if (menuError) {
      console.error('Error fetching menu items:', menuError);
      return;
    }

    // Get unique dish IDs that are in use
    const dishIdsInUse = new Set(menuItems?.map(item => item.dish_id) || []);

    // Also get components that are linked to main dishes via dish_components
    const { data: dishComponents, error: componentsError } = await supabase
      .from('dish_components')
      .select('component_dish_id');

    if (componentsError) {
      console.error('Error fetching dish components:', componentsError);
    } else {
      // Add component IDs to the set
      dishComponents?.forEach(comp => dishIdsInUse.add(comp.component_dish_id));
    }

    // Now fetch only dishes that are in use
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .in('id', Array.from(dishIdsInUse))
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
    // Show all in-use dishes (no limit)
    return filtered;
  };

  const getFilteredComponentDishes = (subcategoryKey: string) => {
    let filtered = componentDishes.filter(d => d.subcategory === subcategoryKey);
    const searchKey = categorySearchTerms[subcategoryKey] || '';
    if (searchKey) {
      filtered = filtered.filter(d => d.name.toLowerCase().includes(searchKey.toLowerCase()));
    }
    // Show all in-use components (no limit)
    return filtered;
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
      {/* Colored header banner */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 py-6">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h1 className="text-5xl font-extralight text-white tracking-[0.3em] uppercase" style={{ fontFamily: "'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, sans-serif" }}>
            DELIVERY
          </h1>
        </div>
      </div>

      {/* White navigation bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="text-2xl font-light text-gray-700">
              Dish Dashboard
            </div>
            <button
              onClick={() => router.push('/dark-kitchen')}
              className="px-6 py-2 text-sm font-medium bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Add Button */}
        <div className="mb-8 flex justify-between items-center">
          <p className="text-gray-600">
            Showing dishes and components currently in use
          </p>
          <button
            onClick={() => {
              setEditingDish(null);
              setShowMainDishForm(true);
            }}
            className="px-8 py-3 bg-blue-800 text-white rounded-md hover:bg-blue-900 font-medium shadow-sm transition-colors"
          >
            + Add New
          </button>
        </div>

        {/* Main Categories Section - Grid Layout */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">Main Dishes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mainCategories.map(category => {
              const dishes = getFilteredMainDishes(category.key);
              const totalCount = mainDishes.filter(d => d.category === category.key).length;

              return (
                <div key={category.key} className="bg-white rounded-lg border border-black/10">
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-800 to-blue-900 rounded-t-lg">
                    <h3 className="text-sm font-semibold text-white flex items-center justify-between">
                      <span className="font-medium">{category.label}</span>
                      <span className="text-xs text-blue-100 font-normal">({totalCount})</span>
                    </h3>
                  </div>
                  <div className="p-3 pt-4">
                    {/* Individual search bar */}
                    <input
                      type="text"
                      placeholder="Search..."
                      value={categorySearchTerms[category.key] || ''}
                      onChange={(e) => setCategorySearchTerms({ ...categorySearchTerms, [category.key]: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-black/10 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {dishes.length === 0 ? (
                      <p className="text-gray-400 text-sm py-4 text-center">No dishes in use</p>
                    ) : (
                      <div className="space-y-1">
                        {dishes.map(dish => (
                          <div key={dish.id} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg text-sm group">
                            <span className="text-gray-900 truncate flex-1 font-medium">{dish.name}</span>
                            <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditMainDish(dish)}
                                className="px-3 py-1 text-xs bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteDish(dish.id)}
                                className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                              >
                                Delete
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
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">Component Library</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {subcategories.map(subcategory => {
              const dishes = getFilteredComponentDishes(subcategory.key);
              const totalCount = componentDishes.filter(d => d.subcategory === subcategory.key).length;

              return (
                <div key={subcategory.key} className="bg-white rounded-lg border border-black/10">
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-800 to-blue-900 rounded-t-lg">
                    <h3 className="text-sm font-semibold text-white flex items-center justify-between">
                      <span className="font-medium">{subcategory.label}</span>
                      <span className="text-xs text-blue-100 font-normal">({totalCount})</span>
                    </h3>
                  </div>
                  <div className="p-3 pt-4">
                    {/* Individual search bar */}
                    <input
                      type="text"
                      placeholder="Search..."
                      value={categorySearchTerms[subcategory.key] || ''}
                      onChange={(e) => setCategorySearchTerms({ ...categorySearchTerms, [subcategory.key]: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-black/10 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {dishes.length === 0 ? (
                      <p className="text-gray-400 text-sm py-4 text-center">No components in use</p>
                    ) : (
                      <div className="space-y-1">
                        {dishes.map(dish => (
                          <div key={dish.id} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg text-sm group">
                            <span className="text-gray-900 truncate flex-1 font-medium">{dish.name}</span>
                            <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditComponent(dish)}
                                className="px-3 py-1 text-xs bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteDish(dish.id)}
                                className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                              >
                                Delete
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
