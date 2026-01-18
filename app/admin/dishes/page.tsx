'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Dish, UserProfile } from '@/lib/types';

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

  const categories = [
    { key: 'soup', label: 'Soups', icon: '🍲' },
    { key: 'hot_dish_beef', label: 'Hot Dish - Beef', icon: '🥩' },
    { key: 'hot_dish_chicken', label: 'Hot Dish - Chicken', icon: '🍗' },
    { key: 'hot_dish_pork', label: 'Hot Dish - Pork', icon: '🥓' },
    { key: 'hot_dish_fish', label: 'Hot Dish - Fish', icon: '🐟' },
    { key: 'hot_dish_vega', label: 'Hot Dish - Vega', icon: '🥗' },
    { key: 'salad_bar', label: 'Salad Bar', icon: '🥬' },
    { key: 'off_menu', label: 'Off Menu / Bespoke', icon: '✨' },
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
      .order('category, name');

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
      setFormData({
        name: '',
        description: '',
        category: undefined,
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
      fetchDishes();
    } catch (err: any) {
      console.error('Error saving dish:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save dish' });
    }
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
    return dishes.filter(dish =>
      dish.category === categoryKey &&
      (searchTerm === '' || dish.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">Manage Dishes</h1>
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
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Top Bar with Search and Add Button */}
        <div className="mb-8 flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search dishes by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({
                name: '',
                description: '',
                category: undefined,
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
            }}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium whitespace-nowrap"
          >
            {showForm ? 'Cancel' : '+ Add Dish'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Edit Dish' : 'New Dish'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.key} value={cat.key}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Allergens
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: 'allergen_gluten', label: 'Gluten' },
                      { key: 'allergen_soy', label: 'Soy' },
                      { key: 'allergen_lactose', label: 'Lactose' },
                      { key: 'allergen_sesame', label: 'Sesame' },
                      { key: 'allergen_sulphites', label: 'Sulphites' },
                      { key: 'allergen_egg', label: 'Egg' },
                      { key: 'allergen_mustard', label: 'Mustard' },
                      { key: 'allergen_celery', label: 'Celery' },
                    ].map(allergen => (
                      <div key={allergen.key} className="flex items-center">
                        <input
                          type="checkbox"
                          id={allergen.key}
                          checked={(formData as any)[allergen.key] || false}
                          onChange={(e) => setFormData({ ...formData, [allergen.key]: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={allergen.key} className="ml-2 block text-sm text-gray-700">
                          {allergen.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Dishes organized by category */}
        <div className="space-y-8">
          {categories.map(category => {
            const categoryDishes = getDishesByCategory(category.key);
            if (categoryDishes.length === 0 && searchTerm === '') return null;

            return (
              <div key={category.key} className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>{category.icon}</span>
                    <span>{category.label}</span>
                    <span className="ml-2 text-sm font-normal opacity-90">({categoryDishes.length})</span>
                  </h2>
                </div>

                {categoryDishes.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No dishes found matching "{searchTerm}"
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {categoryDishes.map(dish => {
                      const allergens = getAllergensList(dish);
                      return (
                        <div
                          key={dish.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="mb-2">
                            <h3 className="font-bold text-gray-900">{dish.name}</h3>
                          </div>

                          {dish.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{dish.description}</p>
                          )}

                          {allergens.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-medium text-gray-700 mb-1">Allergens:</div>
                              <div className="flex flex-wrap gap-1">
                                {allergens.map(allergen => (
                                  <span key={allergen} className="px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800">
                                    {allergen}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => handleEdit(dish)}
                              className="flex-1 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(dish.id)}
                              className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
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
      </main>
    </div>
  );
}
