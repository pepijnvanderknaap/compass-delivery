'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import UniversalHeader from '@/components/UniversalHeader';
import * as XLSX from 'xlsx';

interface RecipeRow {
  id: string;
  type: 'action' | 'ingredient';
  text: string;
  hardValue?: number;
  multiplier?: number;
  unit?: string;
  category?: 'vegetable' | 'meat' | 'fish' | 'dairy' | 'dry_store';
}

interface Recipe {
  id: string;
  dish_id: string;
  name: string;
  base_quantity: number;
  base_unit: string;
  rows: RecipeRow[];
  cooking_loss_percentage: number;
  final_steps: string[];
  created_at: string;
  dishes?: {
    id: string;
    name: string;
    category: string;
  };
}

interface Dish {
  id: string;
  name: string;
  category: string;
}

export default function DarkKitchenRecipesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [quickViewRecipe, setQuickViewRecipe] = useState<Recipe | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    dish_id: '',
    base_quantity: 25,
    base_unit: 'kg',
    cooking_loss_percentage: 8,
  });

  const [rows, setRows] = useState<RecipeRow[]>([]);
  const [finalSteps, setFinalSteps] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login/dark-kitchen');
      return;
    }
    fetchRecipes();
    fetchDishes();
  };

  const fetchRecipes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('recipes')
      .select('*, dishes(id, name, category)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recipes:', error);
      setMessage({ type: 'error', text: 'Failed to load recipes' });
    } else {
      setRecipes(data || []);
    }
    setLoading(false);
  };

  const fetchDishes = async () => {
    const { data, error } = await supabase
      .from('dishes')
      .select('id, name, category')
      .in('category', ['soup', 'hot_dish_meat', 'hot_dish_fish', 'hot_dish_veg'])
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching dishes:', error);
    } else {
      setDishes(data || []);
    }
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      dish_id: recipe.dish_id,
      base_quantity: recipe.base_quantity || 25,
      base_unit: recipe.base_unit || 'kg',
      cooking_loss_percentage: recipe.cooking_loss_percentage,
    });

    const rowsWithHardValues = (recipe.rows || []).map(row => {
      if (row.type === 'ingredient' && row.multiplier !== undefined) {
        return {
          ...row,
          hardValue: row.multiplier * (recipe.base_quantity || 25)
        };
      }
      return row;
    });

    setRows(rowsWithHardValues);
    setFinalSteps(recipe.final_steps || []);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting recipe:', error);
      setMessage({ type: 'error', text: 'Failed to delete recipe' });
    } else {
      setMessage({ type: 'success', text: 'Recipe deleted successfully!' });
      fetchRecipes();
    }
  };

  const handleDuplicate = async (recipe: Recipe) => {
    const newName = prompt('Enter name for duplicated recipe:', `${recipe.name} (Copy)`);
    if (!newName) return;

    const { error } = await supabase
      .from('recipes')
      .insert({
        dish_id: recipe.dish_id,
        name: newName,
        base_quantity: recipe.base_quantity,
        base_unit: recipe.base_unit,
        rows: recipe.rows,
        cooking_loss_percentage: recipe.cooking_loss_percentage,
        final_steps: recipe.final_steps,
      });

    if (error) {
      console.error('Error duplicating recipe:', error);
      setMessage({ type: 'error', text: 'Failed to duplicate recipe' });
    } else {
      setMessage({ type: 'success', text: 'Recipe duplicated successfully!' });
      fetchRecipes();
    }
  };

  // Filter recipes based on search term
  const filteredRecipes = recipes.filter(recipe => {
    if (!searchTerm.trim()) return true; // Show all if no search term
    const searchLower = searchTerm.toLowerCase();
    return recipe.name.toLowerCase().includes(searchLower);
  });

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <UniversalHeader title="Recipes" backPath="/dark-kitchen" />

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* Search Box - Prominent at top */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search recipes... (e.g., Cauliflower, Tomato, etc.)"
              className="w-full px-6 py-4 text-[17px] border-2 border-[#D2D2D7] rounded-xl focus:outline-none focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/20 transition-all"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F] text-[24px] leading-none"
              >
                ×
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-3 px-2">
            <p className="text-[13px] text-[#86868B]">
              {searchTerm ? `${filteredRecipes.length} of ${recipes.length} recipes` : `${recipes.length} total recipes`}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 text-[13px] font-medium text-[#0071E3] hover:text-[#0077ED] transition-colors"
            >
              + Add Recipe
            </button>
          </div>
        </div>

        {/* Filtered Recipes Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-[#86868B]">Loading recipes...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="bg-white border border-[#D2D2D7] rounded-lg p-12 text-center">
            <p className="text-[#86868B] text-[15px]">
              No recipes yet. Add your first recipe!
            </p>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="bg-white border border-[#D2D2D7] rounded-lg p-12 text-center">
            <p className="text-[#86868B] text-[15px]">
              No recipes found matching "{searchTerm}"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
            {filteredRecipes.map((recipe) => {
              const category = recipe.dishes?.category || 'soup';
              const categoryBadgeColors: Record<string, string> = {
                soup: 'bg-orange-100 text-orange-700',
                hot_dish_meat: 'bg-red-100 text-red-700',
                hot_dish_fish: 'bg-blue-100 text-blue-700',
                hot_dish_veg: 'bg-green-100 text-green-700',
              };
              const badgeColor = categoryBadgeColors[category] || 'bg-gray-100 text-gray-700';

              return (
                <div
                  key={recipe.id}
                  className="bg-white border border-[#D2D2D7] rounded hover:shadow-md transition-shadow group"
                >
                  {/* Recipe Card */}
                  <div className="p-2 relative">
                    {/* Subtle Category Indicator - just a small colored dot */}
                    <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full opacity-40 ${badgeColor.replace('bg-', 'bg-').split(' ')[0].replace('100', '400')}`}
                         title={category === 'soup' ? 'Soup' : category === 'hot_dish_meat' ? 'Meat' : category === 'hot_dish_fish' ? 'Fish' : category === 'hot_dish_veg' ? 'Veg' : category}>
                    </div>

                    <h3 className="text-[11px] font-semibold text-[#1D1D1F] truncate mb-1.5 leading-tight pr-2">
                      {recipe.name}
                    </h3>

                    <div className="text-[9px] text-[#86868B] mb-2 space-y-0.5">
                      <div>{recipe.base_quantity}{recipe.base_unit}</div>
                      <div>{recipe.rows?.filter(r => r.type === 'ingredient').length || 0} items</div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setQuickViewRecipe(recipe)}
                        className="w-full px-1.5 py-1 text-[9px] font-medium text-[#0071E3] border border-[#0071E3] rounded hover:bg-[#0071E3] hover:text-white transition-colors"
                      >
                        View
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(recipe)}
                          className="flex-1 px-1.5 py-1 text-[9px] font-medium bg-[#0071E3] text-white rounded hover:bg-[#0077ED] transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDuplicate(recipe)}
                          className="flex-1 px-1.5 py-1 text-[9px] font-medium text-[#6E6E73] border border-[#D2D2D7] rounded hover:bg-[#F5F5F7] transition-colors"
                          title="Duplicate"
                        >
                          Copy
                        </button>
                      </div>
                      <button
                        onClick={() => handleDelete(recipe.id)}
                        className="w-full px-1.5 py-1 text-[9px] font-medium text-[#FF3B30] border border-[#FF3B30] rounded hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Quick View Modal */}
      {quickViewRecipe && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setQuickViewRecipe(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#FAFAFA] px-6 py-4 border-b border-[#E8E8ED] sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[22px] font-semibold text-[#1D1D1F]">
                    {quickViewRecipe.name}
                  </h3>
                  <p className="text-[13px] text-[#86868B] mt-1">
                    Base Quantity: {quickViewRecipe.base_quantity} {quickViewRecipe.base_unit}
                  </p>
                </div>
                <button
                  onClick={() => setQuickViewRecipe(null)}
                  className="text-[#86868B] hover:text-[#1D1D1F] text-[24px] leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F5F5F7] text-left">
                    <th className="px-4 py-2 text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border border-[#D2D2D7]">
                      Ingredient / Action
                    </th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-[#86868B] uppercase tracking-wide text-right border border-[#D2D2D7] w-32">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border border-[#D2D2D7] w-24">
                      Unit
                    </th>
                    <th className="px-4 py-2 text-[11px] font-semibold text-[#86868B] uppercase tracking-wide text-right border border-[#D2D2D7] w-32">
                      Formula (%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Required Quantity */}
                  <tr className="bg-[#E8F4FF]">
                    <td className="px-4 py-2 border border-[#D2D2D7]">
                      <div className="text-[14px] font-bold text-[#0071E3]">Required</div>
                    </td>
                    <td className="px-4 py-2 border border-[#D2D2D7] text-right">
                      <div className="text-[14px] font-mono font-bold text-[#0071E3]">
                        {quickViewRecipe.base_quantity.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-2 border border-[#D2D2D7]">
                      <div className="text-[13px] text-[#6E6E73]">{quickViewRecipe.base_unit}</div>
                    </td>
                    <td className="px-4 py-2 border border-[#D2D2D7]"></td>
                  </tr>

                  {/* Spacer */}
                  <tr>
                    <td colSpan={4} className="h-2 border-0"></td>
                  </tr>

                  {/* Rows */}
                  {quickViewRecipe.rows?.map((row: any, index: number) => {
                    if (row.type === 'action') {
                      return (
                        <tr key={index} className="bg-[#FAFAFA]">
                          <td colSpan={4} className="px-4 py-3 border border-[#D2D2D7]">
                            <div className="font-bold text-[15px] text-[#1D1D1F]">
                              {row.text}
                            </div>
                          </td>
                        </tr>
                      );
                    } else {
                      const multiplier = row.multiplier !== undefined ? row.multiplier : 0;
                      let hardValue = multiplier * quickViewRecipe.base_quantity;
                      let displayUnit = row.unit || 'kg';
                      const percentage = (multiplier * 100).toFixed(2);

                      // Convert bunches to grams for display
                      if ((row.unit || '').toLowerCase().includes('bunch')) {
                        const ingredientLower = (row.text || '').toLowerCase();
                        let gramsPerBunch = 0;
                        if (ingredientLower.includes('coriander') || ingredientLower.includes('cilantro')) {
                          gramsPerBunch = 80;
                        } else if (ingredientLower.includes('spring onion') || ingredientLower.includes('scallion')) {
                          gramsPerBunch = 100;
                        }
                        if (gramsPerBunch > 0) {
                          hardValue = hardValue * gramsPerBunch;
                          displayUnit = 'gram';
                        }
                      }

                      return (
                        <tr key={index} className="hover:bg-[#FAFAFA]">
                          <td className="px-4 py-2 border border-[#D2D2D7]">
                            <div className="text-[14px] text-[#1D1D1F]">{row.text}</div>
                          </td>
                          <td className="px-4 py-2 border border-[#D2D2D7] text-right">
                            <div className="text-[14px] font-mono text-[#1D1D1F]">
                              {hardValue > 0 ? hardValue.toFixed(2) : '0.00'}
                            </div>
                          </td>
                          <td className="px-4 py-2 border border-[#D2D2D7]">
                            <div className="text-[13px] text-[#6E6E73]">{displayUnit}</div>
                          </td>
                          <td className="px-4 py-2 border border-[#D2D2D7] text-right">
                            <div className="text-[12px] font-mono text-[#86868B]">
                              {percentage}%
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setQuickViewRecipe(null)}
                  className="px-6 py-2.5 text-[15px] font-medium bg-[#0071E3] text-white rounded-lg hover:bg-[#0077ED] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
