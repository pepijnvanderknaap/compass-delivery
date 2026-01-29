'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Dish, UserProfile, DishComponent, DishWithComponents } from '@/lib/types';
import MainDishForm from './MainDishForm';
import ComponentForm from './ComponentForm';
import SaladEditModal from './SaladEditModal';
import WarmVeggieEditModal from './WarmVeggieEditModal';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';

// Grid layout with component management - v2
interface SaladMixComponent {
  component_id: string;
  component_name: string;
  percentage: number;
}

interface SaladMix {
  id: string;
  category: string;
  name: string;
  description: string | null;
  component_count: number;
  components: SaladMixComponent[];
}

interface WarmVeggieMixComponent {
  component_id: string;
  component_name: string;
  percentage: number;
}

interface WarmVeggieMix {
  id: string;
  category: string;
  name: string;
  description: string | null;
  component_count: number;
  components: WarmVeggieMixComponent[];
}

export default function AdminDishesPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mainDishes, setMainDishes] = useState<Dish[]>([]);
  const [componentDishes, setComponentDishes] = useState<Dish[]>([]);
  const [saladMixes, setSaladMixes] = useState<SaladMix[]>([]);
  const [warmVeggieMixes, setWarmVeggieMixes] = useState<WarmVeggieMix[]>([]);
  const [expandedSaladId, setExpandedSaladId] = useState<string | null>(null);
  const [expandedWarmVeggieId, setExpandedWarmVeggieId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categorySearchTerms, setCategorySearchTerms] = useState<Record<string, string>>({});
  const [editingDish, setEditingDish] = useState<DishWithComponents | null>(null);
  const [showMainDishForm, setShowMainDishForm] = useState(false);
  const [showComponentForm, setShowComponentForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Salad edit modal state
  const [editingSalad, setEditingSalad] = useState<SaladMix | null>(null);
  const [showSaladEditModal, setShowSaladEditModal] = useState(false);

  // Warm veggie edit modal state
  const [editingWarmVeggie, setEditingWarmVeggie] = useState<WarmVeggieMix | null>(null);
  const [showWarmVeggieEditModal, setShowWarmVeggieEditModal] = useState(false);

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
    { key: 'warm_veggie', label: 'Warm Vegetables' },
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
        await fetchSaladMixes();
        await fetchWarmVeggieMixes();
      } catch (err) {
        console.error('Error initializing page:', err);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [supabase, router]);

  const fetchDishes = async () => {
    // Fetch all dishes, sorted alphabetically
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .order('name', { ascending: true });

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

  const fetchSaladMixes = async () => {
    console.log('[fetchSaladMixes] Starting fetch...');

    // Fetch salad combinations from the view with components
    const { data, error } = await supabase
      .from('v_salad_combinations_full')
      .select('id, category, name, description, component_count, components')
      .order('category')
      .order('name');

    console.log('[fetchSaladMixes] Result:', { data, error, count: data?.length });

    if (error) {
      console.error('[fetchSaladMixes] Error fetching salad mixes:', error);
      return;
    }

    if (data) {
      console.log('[fetchSaladMixes] Setting salad mixes:', data);
      setSaladMixes(data as SaladMix[]);
    }
  };

  const fetchWarmVeggieMixes = async () => {
    console.log('[fetchWarmVeggieMixes] Starting fetch...');

    // Fetch warm veggie combinations from the view with components
    const { data, error } = await supabase
      .from('v_warm_veggie_combinations_full')
      .select('id, category, name, description, component_count, components')
      .order('category')
      .order('name');

    console.log('[fetchWarmVeggieMixes] Result:', { data, error, count: data?.length });

    if (error) {
      console.error('[fetchWarmVeggieMixes] Error fetching warm veggie mixes:', error);
      return;
    }

    if (data) {
      console.log('[fetchWarmVeggieMixes] Setting warm veggie mixes:', data);
      setWarmVeggieMixes(data as WarmVeggieMix[]);
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

  const handleDeleteSalad = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salad? This will also remove it from any dishes using it.')) return;

    try {
      // Step 1: Delete from dish_salad_combinations (dishes using this salad)
      const { error: dishSaladError } = await supabase
        .from('dish_salad_combinations')
        .delete()
        .eq('salad_combination_id', id);

      if (dishSaladError) {
        console.error('Error removing salad from dishes:', dishSaladError);
        throw new Error(`Failed to remove salad from dishes: ${dishSaladError.message}`);
      }

      // Step 2: Delete all salad_combination_items for this salad
      const { error: itemsError } = await supabase
        .from('salad_combination_items')
        .delete()
        .eq('salad_combination_id', id);

      if (itemsError) {
        console.error('Error deleting salad items:', itemsError);
        throw new Error(`Failed to delete salad components: ${itemsError.message}`);
      }

      // Step 3: Delete the salad combination itself
      const { error: saladError } = await supabase
        .from('salad_combinations')
        .delete()
        .eq('id', id);

      if (saladError) {
        console.error('Error deleting salad:', saladError);
        throw new Error(`Failed to delete salad: ${saladError.message}`);
      }

      setMessage({ type: 'success', text: 'Salad deleted successfully' });
      fetchSaladMixes();
    } catch (err: any) {
      console.error('Error deleting salad:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to delete salad' });
    }
  };

  const handleDeleteWarmVeggie = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warm veggie? This will also remove it from any dishes using it.')) return;

    try {
      // Step 1: Delete from dish_warm_veggie_combinations (dishes using this warm veggie)
      const { error: dishWarmVeggieError } = await supabase
        .from('dish_warm_veggie_combinations')
        .delete()
        .eq('warm_veggie_combination_id', id);

      if (dishWarmVeggieError) {
        console.error('Error removing warm veggie from dishes:', dishWarmVeggieError);
        throw new Error(`Failed to remove warm veggie from dishes: ${dishWarmVeggieError.message}`);
      }

      // Step 2: Delete all warm_veggie_combination_items for this warm veggie
      const { error: itemsError } = await supabase
        .from('warm_veggie_combination_items')
        .delete()
        .eq('warm_veggie_combination_id', id);

      if (itemsError) {
        console.error('Error deleting warm veggie items:', itemsError);
        throw new Error(`Failed to delete warm veggie components: ${itemsError.message}`);
      }

      // Step 3: Delete the warm veggie combination itself
      const { error: warmVeggieError } = await supabase
        .from('warm_veggie_combinations')
        .delete()
        .eq('id', id);

      if (warmVeggieError) {
        console.error('Error deleting warm veggie:', warmVeggieError);
        throw new Error(`Failed to delete warm veggie: ${warmVeggieError.message}`);
      }

      setMessage({ type: 'success', text: 'Warm veggie deleted successfully' });
      fetchWarmVeggieMixes();
    } catch (err: any) {
      console.error('Error deleting warm veggie:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to delete warm veggie' });
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
      <AdminQuickNav />

      <UniversalHeader
        title="Dishes"
        backPath="/dark-kitchen"
      />

      <main className="max-w-7xl mx-auto px-8 lg:px-12 py-24">
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-sm text-[15px] ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}
        {/* Soups Section */}
        <div className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-[22px] font-semibold text-slate-700">
              Soups
            </h2>
            <button
              onClick={() => {
                setEditingDish(null);
                setShowMainDishForm(true);
              }}
              className="px-6 py-2.5 text-[15px] font-medium bg-white border-2 border-slate-300 text-slate-900 hover:bg-slate-50 rounded-sm transition-colors"
            >
              + Add New
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Soups */}
            <div className="border border-slate-300 rounded-sm overflow-hidden shadow-sm">
              <table className="w-full border-separate" style={{borderSpacing: '0 0'}}>
                <thead className="bg-[#4A7DB5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[15px] font-semibold text-white">
                      <div className="flex items-center justify-between">
                        <span>Soups</span>
                        <span className="text-[13px] font-normal opacity-70">
                          ({mainDishes.filter(d => d.category === 'soup').length})
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="bg-slate-50 p-3">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={categorySearchTerms['soup'] || ''}
                        onChange={(e) => setCategorySearchTerms({ ...categorySearchTerms, soup: e.target.value })}
                        className="w-full px-3 py-2 text-[15px] border border-slate-300 rounded-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                      {getFilteredMainDishes('soup').length === 0 ? (
                        <p className="text-slate-400 text-[15px] py-4 text-center">No soups</p>
                      ) : (
                        <div className="space-y-1">
                          {getFilteredMainDishes('soup').slice(0, 3).map(dish => (
                            <div key={dish.id} className="py-2 px-2 hover:bg-slate-100 rounded-sm text-[15px]">
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
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Soup Toppings */}
            <div className="border border-slate-300 rounded-sm overflow-hidden shadow-sm">
              <table className="w-full border-separate" style={{borderSpacing: '0 0'}}>
                <thead className="bg-[#4A7DB5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[15px] font-semibold text-white">
                      <div className="flex items-center justify-between">
                        <span>Soup Toppings</span>
                        <span className="text-[13px] font-normal opacity-70">
                          ({componentDishes.filter(d => d.subcategory === 'topping').length})
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="bg-slate-50 p-3">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={categorySearchTerms['topping'] || ''}
                        onChange={(e) => setCategorySearchTerms({ ...categorySearchTerms, topping: e.target.value })}
                        className="w-full px-3 py-2 text-[15px] border border-slate-300 rounded-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                      {getFilteredComponentDishes('topping').length === 0 ? (
                        <p className="text-slate-400 text-[15px] py-4 text-center">No toppings</p>
                      ) : (
                        <div className="space-y-1">
                          {getFilteredComponentDishes('topping').slice(0, 3).map(dish => (
                            <div key={dish.id} className="py-2 px-2 hover:bg-slate-100 rounded-sm text-[15px]">
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
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Hot Dishes Section */}
        <div className="mb-12">
          <h2 className="text-[22px] font-semibold mb-6 text-slate-700">
            Hot Dishes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Meat */}
            <div className="border border-slate-300 rounded-sm overflow-hidden shadow-sm">
              <table className="w-full border-separate" style={{borderSpacing: '0 0'}}>
                <thead className="bg-[#4A7DB5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[15px] font-semibold text-white">
                      <div className="flex items-center justify-between">
                        <span>Meat</span>
                        <span className="text-[13px] font-normal opacity-70">
                          ({mainDishes.filter(d => d.category === 'hot_dish_meat').length})
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="bg-slate-50 p-3">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={categorySearchTerms['hot_dish_meat'] || ''}
                        onChange={(e) => setCategorySearchTerms({ ...categorySearchTerms, hot_dish_meat: e.target.value })}
                        className="w-full px-3 py-2 text-[15px] border border-slate-300 rounded-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                      {getFilteredMainDishes('hot_dish_meat').length === 0 ? (
                        <p className="text-slate-400 text-[15px] py-4 text-center">No meat dishes</p>
                      ) : (
                        <div className="space-y-1">
                          {getFilteredMainDishes('hot_dish_meat').slice(0, 3).map(dish => (
                            <div key={dish.id} className="py-2 px-2 hover:bg-slate-100 rounded-sm text-[15px]">
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
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Fish */}
            <div className="border border-slate-300 rounded-sm overflow-hidden shadow-sm">
              <table className="w-full border-separate" style={{borderSpacing: '0 0'}}>
                <thead className="bg-[#4A7DB5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[15px] font-semibold text-white">
                      <div className="flex items-center justify-between">
                        <span>Fish</span>
                        <span className="text-[13px] font-normal opacity-70">
                          ({mainDishes.filter(d => d.category === 'hot_dish_fish').length})
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="bg-slate-50 p-3">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={categorySearchTerms['hot_dish_fish'] || ''}
                        onChange={(e) => setCategorySearchTerms({ ...categorySearchTerms, hot_dish_fish: e.target.value })}
                        className="w-full px-3 py-2 text-[15px] border border-slate-300 rounded-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                      {getFilteredMainDishes('hot_dish_fish').length === 0 ? (
                        <p className="text-slate-400 text-[15px] py-4 text-center">No fish dishes</p>
                      ) : (
                        <div className="space-y-1">
                          {getFilteredMainDishes('hot_dish_fish').slice(0, 3).map(dish => (
                            <div key={dish.id} className="py-2 px-2 hover:bg-slate-100 rounded-sm text-[15px]">
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
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Veg */}
            <div className="border border-slate-300 rounded-sm overflow-hidden shadow-sm">
              <table className="w-full border-separate" style={{borderSpacing: '0 0'}}>
                <thead className="bg-[#4A7DB5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[15px] font-semibold text-white">
                      <div className="flex items-center justify-between">
                        <span>Veg</span>
                        <span className="text-[13px] font-normal opacity-70">
                          ({mainDishes.filter(d => d.category === 'hot_dish_veg').length})
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="bg-slate-50 p-3">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={categorySearchTerms['hot_dish_veg'] || ''}
                        onChange={(e) => setCategorySearchTerms({ ...categorySearchTerms, hot_dish_veg: e.target.value })}
                        className="w-full px-3 py-2 text-[15px] border border-slate-300 rounded-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                      {getFilteredMainDishes('hot_dish_veg').length === 0 ? (
                        <p className="text-slate-400 text-[15px] py-4 text-center">No veg dishes</p>
                      ) : (
                        <div className="space-y-1">
                          {getFilteredMainDishes('hot_dish_veg').slice(0, 3).map(dish => (
                            <div key={dish.id} className="py-2 px-2 hover:bg-slate-100 rounded-sm text-[15px]">
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
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Components Section */}
        <div>
          <h2 className="text-[22px] font-semibold mb-6 text-slate-700">
            Components
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Carbs */}
            <div className="border border-slate-300 rounded-sm overflow-hidden shadow-sm">
              <table className="w-full border-separate" style={{borderSpacing: '0 0'}}>
                <thead className="bg-[#4A7DB5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[15px] font-semibold text-white">
                      <div className="flex items-center justify-between">
                        <span>Carbs</span>
                        <span className="text-[13px] font-normal opacity-70">
                          ({componentDishes.filter(d => d.subcategory === 'carb').length})
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="bg-slate-50 p-3">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={categorySearchTerms['carb'] || ''}
                        onChange={(e) => setCategorySearchTerms({ ...categorySearchTerms, carb: e.target.value })}
                        className="w-full px-3 py-2 text-[15px] border border-slate-300 rounded-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                      {getFilteredComponentDishes('carb').length === 0 ? (
                        <p className="text-slate-400 text-[15px] py-4 text-center">No carbs</p>
                      ) : (
                        <div className="space-y-1">
                          {getFilteredComponentDishes('carb').slice(0, 3).map(dish => (
                            <div key={dish.id} className="py-2 px-2 hover:bg-slate-100 rounded-sm text-[15px]">
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
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Warm Vegetables */}
            <div className="border border-slate-300 rounded-sm overflow-hidden shadow-sm">
              <table className="w-full border-separate" style={{borderSpacing: '0 0'}}>
                <thead className="bg-[#4A7DB5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[15px] font-semibold text-white">
                      <div className="flex items-center justify-between">
                        <span>Warm Vegetables</span>
                        <span className="text-[13px] font-normal opacity-70">
                          ({componentDishes.filter(d => d.subcategory === 'warm_veggie').length})
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="bg-slate-50 p-3">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={categorySearchTerms['warm_veggie'] || ''}
                        onChange={(e) => setCategorySearchTerms({ ...categorySearchTerms, warm_veggie: e.target.value })}
                        className="w-full px-3 py-2 text-[15px] border border-slate-300 rounded-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                      {getFilteredComponentDishes('warm_veggie').length === 0 ? (
                        <p className="text-slate-400 text-[15px] py-4 text-center">No warm vegetables</p>
                      ) : (
                        <div className="space-y-1">
                          {getFilteredComponentDishes('warm_veggie').slice(0, 3).map(dish => (
                            <div key={dish.id} className="py-2 px-2 hover:bg-slate-100 rounded-sm text-[15px]">
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
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Hot Dish Add-ons */}
            <div className="border border-slate-300 rounded-sm overflow-hidden shadow-sm">
              <table className="w-full border-separate" style={{borderSpacing: '0 0'}}>
                <thead className="bg-[#4A7DB5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-[15px] font-semibold text-white">
                      <div className="flex items-center justify-between">
                        <span>Hot Dish Add-ons</span>
                        <span className="text-[13px] font-normal opacity-70">
                          ({componentDishes.filter(d => d.subcategory === 'condiment').length})
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="bg-slate-50 p-3">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={categorySearchTerms['condiment'] || ''}
                        onChange={(e) => setCategorySearchTerms({ ...categorySearchTerms, condiment: e.target.value })}
                        className="w-full px-3 py-2 text-[15px] border border-slate-300 rounded-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                      {getFilteredComponentDishes('condiment').length === 0 ? (
                        <p className="text-slate-400 text-[15px] py-4 text-center">No add-ons</p>
                      ) : (
                        <div className="space-y-1">
                          {getFilteredComponentDishes('condiment').slice(0, 3).map(dish => (
                            <div key={dish.id} className="py-2 px-2 hover:bg-slate-100 rounded-sm text-[15px]">
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
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Salad Mixes Section */}
        <div className="mt-12">
          <h2 className="text-[22px] font-semibold mb-6 text-slate-700">
            Salad Mixes
          </h2>
          {saladMixes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-slate-400 text-center">
                <div className="text-[17px] font-medium mb-2">No salad mixes yet</div>
                <div className="text-[13px]">Create a new salad mix to get started</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {saladMixes.map(salad => (
                <div
                  key={salad.id}
                  className="p-5 rounded-sm border-2 border-[#D2D2D7] bg-white hover:border-[#0071E3] hover:shadow-md transition-all group"
                >
                  {/* Salad Name */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-[17px] font-semibold text-[#1D1D1F]">
                      {salad.name}
                    </h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingSalad(salad);
                          setShowSaladEditModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-[#0071E3] hover:bg-slate-100 rounded-sm transition-colors"
                        title="Edit salad"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteSalad(salad.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-sm transition-colors"
                        title="Delete salad"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Components List */}
                  <div className="space-y-1.5">
                    {salad.components.map((comp, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[13px]">
                        <span className="text-[#6E6E73]">• {comp.component_name}</span>
                        <span className="text-[#1D1D1F] font-medium">{comp.percentage}%</span>
                      </div>
                    ))}
                  </div>

                  {/* Description (if exists) */}
                  {salad.description && (
                    <div className="mt-3 pt-3 border-t border-[#E8E8ED]">
                      <p className="text-[12px] text-[#86868B] italic">{salad.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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

      {/* Salad Edit Modal */}
      {showSaladEditModal && editingSalad && (
        <SaladEditModal
          isOpen={showSaladEditModal}
          saladId={editingSalad.id}
          currentName={editingSalad.name}
          currentCategory={editingSalad.category as 'leafy' | 'vegetable' | 'coleslaw'}
          currentDescription={editingSalad.description}
          onClose={() => {
            setShowSaladEditModal(false);
            setEditingSalad(null);
          }}
          onSave={() => {
            fetchSaladMixes();
            setMessage({ type: 'success', text: 'Salad updated successfully!' });
          }}
        />
      )}

      {/* Warm Veggie Edit Modal */}
      {showWarmVeggieEditModal && editingWarmVeggie && (
        <WarmVeggieEditModal
          isOpen={showWarmVeggieEditModal}
          warmVeggieId={editingWarmVeggie.id}
          currentName={editingWarmVeggie.name}
          currentCategory={editingWarmVeggie.category as 'root' | 'green' | 'other'}
          currentDescription={editingWarmVeggie.description}
          onClose={() => {
            setShowWarmVeggieEditModal(false);
            setEditingWarmVeggie(null);
          }}
          onSave={() => {
            fetchWarmVeggieMixes();
            setMessage({ type: 'success', text: 'Warm veggie updated successfully!' });
          }}
        />
      )}
    </div>
  );
}
