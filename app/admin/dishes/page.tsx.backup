'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Dish, UserProfile, DishSubcategory } from '@/lib/types';

export default function AdminDishesPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<Dish>>({
    name: '',
    description: '',
    category: undefined,
    subcategory: undefined,
    is_active: true,
    allergen_gluten: false,
    allergen_soy: false,
    allergen_lactose: false,
    allergen_sesame: false,
    allergen_sulphites: false,
    allergen_egg: false,
    allergen_mustard: false,
    allergen_celery: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const mainCategories = [
    {
      key: 'soup',
      label: 'Soups',
      icon: '🍲',
      color: 'from-orange-500 to-orange-600',
      subcategories: [
        { key: 'topping', label: 'Toppings', icon: '🌿' }
      ]
    },
    {
      key: 'hot_dish_meat',
      label: 'Hot Dish - Meat',
      icon: '🥩',
      color: 'from-red-500 to-red-600',
      subcategories: [
        { key: 'carb', label: 'Carbs', icon: '🍚' },
        { key: 'warm_veggie', label: 'Warm Veggies', icon: '🥕' },
        { key: 'salad', label: 'Salads', icon: '🥗' },
        { key: 'condiment', label: 'Condiments', icon: '🧂' }
      ]
    },
    {
      key: 'hot_dish_veg',
      label: 'Hot Dish - Veg',
      icon: '🌱',
      color: 'from-green-500 to-green-600',
      subcategories: [
        { key: 'carb', label: 'Carbs', icon: '🍚' },
        { key: 'warm_veggie', label: 'Warm Veggies', icon: '🥕' },
        { key: 'salad', label: 'Salads', icon: '🥗' },
        { key: 'condiment', label: 'Condiments', icon: '🧂' }
      ]
    },
    {
      key: 'off_menu',
      label: 'Off Menu / Bespoke',
      icon: '✨',
      color: 'from-purple-500 to-purple-600',
      subcategories: []
    },
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching dishes:', error);
      return;
    }

    setDishes(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('dishes')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Dish updated successfully' });
      } else {
        const { error } = await supabase
          .from('dishes')
          .insert([formData]);

        if (error) throw error;
        setMessage({ type: 'success', text: 'Dish created successfully' });
      }

      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchDishes();
    } catch (err: any) {
      console.error('Error saving dish:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save dish' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: undefined,
      subcategory: undefined,
      is_active: true,
      allergen_gluten: false,
      allergen_soy: false,
      allergen_lactose: false,
      allergen_sesame: false,
      allergen_sulphites: false,
      allergen_egg: false,
      allergen_mustard: false,
      allergen_celery: false,
    });
  };

  const handleEdit = (dish: Dish) => {
    setFormData(dish);
    setEditingId(dish.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
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

  const getDishesByCategory = (categoryKey: string) => {
    return dishes.filter(dish => dish.category === categoryKey);
  };

  const getDishesBySubcategory = (categoryKey: string, subcategoryKey: string | null) => {
    return dishes.filter(dish =>
      dish.category === categoryKey &&
      dish.subcategory === subcategoryKey
    );
  };

  const getRecentDishes = (categoryKey: string, subcategoryKey: string | null = null, limit: number = 10) => {
    let filtered = dishes.filter(dish => dish.category === categoryKey);

    if (subcategoryKey !== null) {
      filtered = filtered.filter(dish => dish.subcategory === subcategoryKey);
    } else {
      // For main category, only show dishes without subcategory
      filtered = filtered.filter(dish => !dish.subcategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(dish =>
        dish.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.slice(0, limit);
  };

  const getAllergensList = (dish: Dish) => {
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

  const getAvailableSubcategories = () => {
    if (!formData.category) return [];
    const category = mainCategories.find(cat => cat.key === formData.category);
    return category?.subcategories || [];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dish Management</h1>
              <p className="text-sm text-gray-500">Organize and manage your menu items</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Top Bar with Search and Add Button */}
        <div className="mb-8 flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="🔍 Search dishes by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-6 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-lg"
            />
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              resetForm();
            }}
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 font-semibold shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
          >
            {showForm ? '✕ Cancel' : '+ Add New Dish'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {editingId ? '✏️ Edit Dish' : '➕ Create New Dish'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Dish Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Tomato Soup"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Main Category *
                  </label>
                  <select
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any, subcategory: undefined })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Select main category</option>
                    {mainCategories.map(cat => (
                      <option key={cat.key} value={cat.key}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>

                {getAvailableSubcategories().length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subcategory (Optional)
                    </label>
                    <select
                      value={formData.subcategory || ''}
                      onChange={(e) => setFormData({ ...formData, subcategory: (e.target.value || undefined) as any })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">None (Main Dish)</option>
                      {getAvailableSubcategories().map(subcat => (
                        <option key={subcat.key} value={subcat.key}>{subcat.icon} {subcat.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Describe this dish..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Allergens
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: 'allergen_gluten', label: 'Gluten', icon: '🌾' },
                      { key: 'allergen_soy', label: 'Soy', icon: '🫘' },
                      { key: 'allergen_lactose', label: 'Lactose', icon: '🥛' },
                      { key: 'allergen_sesame', label: 'Sesame', icon: '🫘' },
                      { key: 'allergen_sulphites', label: 'Sulphites', icon: '🍷' },
                      { key: 'allergen_egg', label: 'Egg', icon: '🥚' },
                      { key: 'allergen_mustard', label: 'Mustard', icon: '🌭' },
                      { key: 'allergen_celery', label: 'Celery', icon: '🥬' },
                    ].map(allergen => (
                      <label key={allergen.key} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData as any)[allergen.key] || false}
                          onChange={(e) => setFormData({ ...formData, [allergen.key]: e.target.checked })}
                          className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {allergen.icon} {allergen.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-medium shadow-lg"
                >
                  {editingId ? 'Update Dish' : 'Create Dish'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Main Categories with Subcategories */}
        <div className="space-y-8">
          {mainCategories.map(category => {
            const mainDishes = getRecentDishes(category.key, null);
            const hasDishes = mainDishes.length > 0 || category.subcategories.some(sub =>
              getRecentDishes(category.key, sub.key).length > 0
            );

            if (!hasDishes && searchTerm === '') return null;

            return (
              <div key={category.key} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
                {/* Category Header */}
                <div className={`bg-gradient-to-r ${category.color} px-6 py-5`}>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="text-3xl">{category.icon}</span>
                    <span>{category.label}</span>
                    <span className="ml-2 text-lg font-normal opacity-90">
                      ({getDishesByCategory(category.key).length} total)
                    </span>
                  </h2>
                </div>

                {/* Main Category Dishes */}
                {mainDishes.length > 0 && (
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                      Main Dishes (Last 10)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      {mainDishes.map(dish => {
                        const allergens = getAllergensList(dish);
                        return (
                          <div
                            key={dish.id}
                            className="border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-indigo-300 transition-all bg-white"
                          >
                            <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{dish.name}</h3>
                            {dish.description && (
                              <p className="text-xs text-gray-600 mb-3 line-clamp-2">{dish.description}</p>
                            )}
                            {allergens.length > 0 && (
                              <div className="mb-3">
                                <div className="flex flex-wrap gap-1">
                                  {allergens.map(allergen => (
                                    <span key={allergen} className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 font-medium">
                                      {allergen}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleEdit(dish)}
                                className="flex-1 px-3 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(dish.id)}
                                className="px-3 py-2 text-xs border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Subcategories */}
                {category.subcategories.map(subcategory => {
                  const subDishes = getRecentDishes(category.key, subcategory.key);
                  if (subDishes.length === 0 && searchTerm === '') return null;

                  return (
                    <div key={subcategory.key} className="p-6 border-b border-gray-100 last:border-b-0">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <span className="text-lg">{subcategory.icon}</span>
                        {subcategory.label} (Last 10)
                      </h3>
                      {subDishes.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          No {subcategory.label.toLowerCase()} found matching "{searchTerm}"
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                          {subDishes.map(dish => {
                            const allergens = getAllergensList(dish);
                            return (
                              <div
                                key={dish.id}
                                className="border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-indigo-300 transition-all bg-gradient-to-br from-white to-gray-50"
                              >
                                <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{dish.name}</h3>
                                {dish.description && (
                                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">{dish.description}</p>
                                )}
                                {allergens.length > 0 && (
                                  <div className="mb-3">
                                    <div className="flex flex-wrap gap-1">
                                      {allergens.map(allergen => (
                                        <span key={allergen} className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 font-medium">
                                          {allergen}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => handleEdit(dish)}
                                    className="flex-1 px-3 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(dish.id)}
                                    className="px-3 py-2 text-xs border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {dishes.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No dishes yet</h3>
            <p className="text-gray-500">Click "Add New Dish" to create your first dish</p>
          </div>
        )}
      </main>
    </div>
  );
}
