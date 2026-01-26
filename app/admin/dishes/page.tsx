'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Dish, UserProfile, DishComponent, DishWithComponents } from '@/lib/types';
import MainDishForm from './MainDishForm';
import ComponentForm from './ComponentForm';
import UniversalHeader from '@/components/UniversalHeader';

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
    { key: 'hot_dish_meat', label: 'Hot Dish - Meat/Fish' },
    { key: 'hot_dish_veg', label: 'Hot Dish - Veg' },
  ];

  const subcategories = [
    { key: 'topping', label: 'Soup Toppings' },
    { key: 'carb', label: 'Carbs' },
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
    return filtered;
  };

  const getFilteredComponentDishes = (subcategoryKey: string) => {
    let filtered = componentDishes.filter(d => d.subcategory === subcategoryKey);
    const searchKey = categorySearchTerms[subcategoryKey] || '';
    if (searchKey) {
      filtered = filtered.filter(d => d.name.toLowerCase().includes(searchKey.toLowerCase()));
    }
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
    <div className="min-h-screen bg-white font-apple">
      <UniversalHeader
        title="Dishes"
        backPath="/dark-kitchen"
      />

      <main className="max-w-7xl mx-auto px-8 lg:px-12 py-24">
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-[15px] ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="mb-8">
          <p className="text-[15px] text-slate-600">
            Showing dishes and components currently in use
          </p>
        </div>

        {/* Main Categories Section */}
        <div className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-[22px] font-semibold text-slate-700">
              Main Dishes
            </h2>
            <button
              onClick={() => {
                setEditingDish(null);
                setShowMainDishForm(true);
              }}
              className="px-6 py-2.5 text-[15px] font-medium bg-white border-2 border-slate-300 text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
            >
              + Add New
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mainCategories.map(category => {
              const dishes = getFilteredMainDishes(category.key);
              const totalCount = mainDishes.filter(d => d.category === category.key).length;

              return (
                <div key={category.key} className="space-y-3">
                  <div className="px-4 py-3 bg-[#4A7DB5] border border-[#3A6D9F] rounded-lg">
                    <h3 className="text-[15px] font-semibold text-white flex items-center justify-between">
                      <span className="font-medium">{category.label}</span>
                      <span className="text-[13px] font-normal opacity-70">({totalCount})</span>
                    </h3>
                  </div>
                  <div className="bg-slate-50 rounded-lg border border-slate-300 p-3">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={categorySearchTerms[category.key] || ''}
                      onChange={(e) => setCategorySearchTerms({ ...categorySearchTerms, [category.key]: e.target.value })}
                      className="w-full px-3 py-2 text-[15px] border border-slate-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    />
                    {dishes.length === 0 ? (
                      <p className="text-slate-400 text-[15px] py-4 text-center">
                        No dishes in use
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {dishes.map(dish => (
                          <div key={dish.id} className="py-2 px-2 hover:bg-slate-100 rounded-lg text-[15px]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-700 flex-1 font-medium break-words">{dish.name}</span>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => handleEditMainDish(dish)}
                                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 border border-slate-300 text-slate-700 rounded hover:bg-slate-200 transition-colors whitespace-nowrap"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteDish(dish.id)}
                                  className="px-3 py-1.5 text-xs font-medium bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors whitespace-nowrap"
                                >
                                  Delete
                                </button>
                              </div>
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

        {/* Subcategories Section */}
        <div>
          <h2 className="text-[22px] font-semibold mb-6 text-slate-700">
            Component Library
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subcategories.map(subcategory => {
              const dishes = getFilteredComponentDishes(subcategory.key);
              const totalCount = componentDishes.filter(d => d.subcategory === subcategory.key).length;

              return (
                <div key={subcategory.key} className="space-y-3">
                  <div className="px-4 py-3 bg-[#4A7DB5] border border-[#3A6D9F] rounded-lg">
                    <h3 className="text-[15px] font-semibold text-white flex items-center justify-between">
                      <span className="font-medium">{subcategory.label}</span>
                      <span className="text-[13px] font-normal opacity-70">({totalCount})</span>
                    </h3>
                  </div>
                  <div className="bg-slate-50 rounded-lg border border-slate-300 p-3">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={categorySearchTerms[subcategory.key] || ''}
                      onChange={(e) => setCategorySearchTerms({ ...categorySearchTerms, [subcategory.key]: e.target.value })}
                      className="w-full px-3 py-2 text-[15px] border border-slate-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    />
                    {dishes.length === 0 ? (
                      <p className="text-slate-400 text-[15px] py-4 text-center">No components in use</p>
                    ) : (
                      <div className="space-y-1">
                        {dishes.map(dish => (
                          <div key={dish.id} className="py-2 px-2 hover:bg-slate-100 rounded-lg text-[15px]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-700 flex-1 font-medium break-words">{dish.name}</span>
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => handleEditComponent(dish)}
                                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 border border-slate-300 text-slate-700 rounded hover:bg-slate-200 transition-colors whitespace-nowrap"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteDish(dish.id)}
                                  className="px-3 py-1.5 text-xs font-medium bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors whitespace-nowrap"
                                >
                                  Delete
                                </button>
                              </div>
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
