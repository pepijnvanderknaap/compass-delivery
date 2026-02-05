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
  originalRowIndex?: number;
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
  const [quickViewEditMode, setQuickViewEditMode] = useState(false);
  const [editedQuickViewRecipe, setEditedQuickViewRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState<'recipes' | 'import'>('recipes');

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

  const handleDeleteAllRecipes = async () => {
    if (!confirm('Are you sure you want to delete ALL recipes? This cannot be undone!')) return;

    const { error } = await supabase
      .from('recipes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      console.error('Error deleting all recipes:', error);
      setMessage({ type: 'error', text: 'Failed to delete all recipes' });
    } else {
      setMessage({ type: 'success', text: 'All recipes deleted successfully!' });
      fetchRecipes();
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImporting(true);
    setImportResults(null);

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const file of Array.from(files)) {
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);

        for (const sheetName of workbook.SheetNames) {
          try {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Parse recipe data from Excel
            // This is a placeholder - you'll need to implement the actual parsing logic
            results.errors.push(`Sheet "${sheetName}": Import logic not yet implemented`);
            results.failed++;
          } catch (err: any) {
            results.errors.push(`Sheet "${sheetName}": ${err.message}`);
            results.failed++;
          }
        }
      } catch (err: any) {
        results.errors.push(`File "${file.name}": ${err.message}`);
        results.failed++;
      }
    }

    setImportResults(results);
    setImporting(false);

    if (results.success > 0) {
      setMessage({ type: 'success', text: `Imported ${results.success} recipe(s)` });
      fetchRecipes();
    }
  };

  const handleQuickViewEdit = () => {
    if (!quickViewRecipe) return;
    setEditedQuickViewRecipe(JSON.parse(JSON.stringify(quickViewRecipe))); // Deep clone
    setQuickViewEditMode(true);
  };

  const handleQuickViewCancel = () => {
    setQuickViewEditMode(false);
    setEditedQuickViewRecipe(null);
  };

  const handleQuickViewSave = async () => {
    if (!editedQuickViewRecipe) return;

    // Calculate multipliers from percentages before saving
    const rowsWithMultipliers = editedQuickViewRecipe.rows.map(row => {
      if (row.type === 'ingredient') {
        // multiplier is already stored, just ensure it's valid
        return row;
      }
      return row;
    });

    const { error } = await supabase
      .from('recipes')
      .update({
        name: editedQuickViewRecipe.name,
        base_quantity: editedQuickViewRecipe.base_quantity,
        base_unit: editedQuickViewRecipe.base_unit,
        cooking_loss_percentage: editedQuickViewRecipe.cooking_loss_percentage,
        rows: rowsWithMultipliers,
      })
      .eq('id', editedQuickViewRecipe.id);

    if (error) {
      console.error('Error updating recipe:', error);
      setMessage({ type: 'error', text: 'Failed to update recipe' });
    } else {
      setMessage({ type: 'success', text: 'Recipe updated successfully!' });
      setQuickViewRecipe(editedQuickViewRecipe); // Update the view
      setQuickViewEditMode(false);
      setEditedQuickViewRecipe(null);
      fetchRecipes(); // Refresh the list
    }
  };

  const updateQuickViewRow = (index: number, field: string, value: any) => {
    if (!editedQuickViewRecipe) return;

    const updatedRows = [...editedQuickViewRecipe.rows];
    const row = updatedRows[index];

    if (field === 'percentage') {
      // Convert percentage to multiplier
      const percentage = parseFloat(value) || 0;
      row.multiplier = percentage / 100;
    } else {
      (row as any)[field] = value;
    }

    setEditedQuickViewRecipe({
      ...editedQuickViewRecipe,
      rows: updatedRows,
    });
  };

  const addQuickViewAction = () => {
    if (!editedQuickViewRecipe) return;
    const newRow: RecipeRow = {
      id: `action-${Date.now()}`,
      type: 'action',
      text: 'New action step',
    };
    setEditedQuickViewRecipe({
      ...editedQuickViewRecipe,
      rows: [...editedQuickViewRecipe.rows, newRow],
    });
  };

  const addQuickViewIngredient = () => {
    if (!editedQuickViewRecipe) return;
    const newRow: RecipeRow = {
      id: `ingredient-${Date.now()}`,
      type: 'ingredient',
      text: 'New ingredient',
      multiplier: 0,
      unit: 'kg',
    };
    setEditedQuickViewRecipe({
      ...editedQuickViewRecipe,
      rows: [...editedQuickViewRecipe.rows, newRow],
    });
  };

  const deleteQuickViewRow = (index: number) => {
    if (!editedQuickViewRecipe) return;
    const updatedRows = editedQuickViewRecipe.rows.filter((_, i) => i !== index);
    setEditedQuickViewRecipe({
      ...editedQuickViewRecipe,
      rows: updatedRows,
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!editedQuickViewRecipe) return;

    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;

    const updatedRows = [...editedQuickViewRecipe.rows];
    const [removed] = updatedRows.splice(dragIndex, 1);
    updatedRows.splice(dropIndex, 0, removed);

    setEditedQuickViewRecipe({
      ...editedQuickViewRecipe,
      rows: updatedRows,
    });
  };

  // Filter recipes based on search term
  const filteredRecipes = recipes.filter(recipe => {
    if (!searchTerm.trim()) return true; // Show all if no search term
    const searchLower = searchTerm.toLowerCase();
    return recipe.name.toLowerCase().includes(searchLower);
  });

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <UniversalHeader
        title=""
        backPath=""
        locationLogo=""
        locationName="Kitchen"
        navItems={[
          { label: 'Week Overview', href: '/kitchen/week-overview', active: false },
          {
            label: 'Dishes',
            href: '/kitchen/dishes',
            active: false,
            subItems: [
              { label: 'Dish Library', href: '/kitchen/dishes', active: false },
              { label: 'Dish Cards', href: '/kitchen/dish-cards', active: false },
              { label: 'Allergens', href: '/kitchen/allergens', active: false },
            ]
          },
          { label: 'Menu Planner', href: '/kitchen/menus', active: false },
          { label: 'Recipes', href: '/kitchen/recipes', active: true },
          { label: 'Production', href: '/kitchen/production', active: false },
        ]}      />

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex gap-1 border-b border-[#D2D2D7]">
            <button
              onClick={() => setActiveTab('recipes')}
              className={`px-6 py-3 text-[15px] font-medium transition-colors ${
                activeTab === 'recipes'
                  ? 'text-[#0078D4] border-b-2 border-[#0078D4]'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Recipes
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-6 py-3 text-[15px] font-medium transition-colors ${
                activeTab === 'import'
                  ? 'text-[#0078D4] border-b-2 border-[#0078D4]'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Import & Manage
            </button>
          </div>
        </div>

        {/* Recipes Tab */}
        {activeTab === 'recipes' && (
          <>
            {/* Search Box - Prominent at top */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search recipes... (e.g., Cauliflower, Tomato, etc.)"
              className="w-full px-6 py-4 text-[17px] border-2 border-[#D2D2D7] rounded-xl focus:outline-none focus:border-[#0078D4] focus:ring-4 focus:ring-[#0078D4]/20 transition-all"
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
              className="px-4 py-2 text-[13px] font-medium text-[#0078D4] hover:text-[#106EBE] transition-colors"
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
        ) : !searchTerm.trim() ? (
          <div className="text-center py-12">
            <p className="text-[#86868B] text-[15px]">
              Start typing to search recipes...
            </p>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="bg-white border border-[#D2D2D7] rounded-lg p-12 text-center">
            <p className="text-[#86868B] text-[15px]">
              No recipes found matching "{searchTerm}"
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    className="bg-white border border-[#D2D2D7] rounded-lg hover:shadow-lg transition-shadow group"
                  >
                    {/* Recipe Card */}
                    <div className="p-4 relative">
                      {/* Subtle Category Indicator - just a small colored dot */}
                      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full opacity-40 ${badgeColor.replace('bg-', 'bg-').split(' ')[0].replace('100', '400')}`}
                           title={category === 'soup' ? 'Soup' : category === 'hot_dish_meat' ? 'Meat' : category === 'hot_dish_fish' ? 'Fish' : category === 'hot_dish_veg' ? 'Veg' : category}>
                      </div>

                      <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-3 leading-tight pr-4 line-clamp-2">
                        {recipe.name}
                      </h3>

                      <div className="text-[13px] text-[#86868B] mb-4 space-y-1">
                        <div>{recipe.base_quantity}{recipe.base_unit}</div>
                        <div>{recipe.rows?.filter(r => r.type === 'ingredient').length || 0} ingredients</div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setQuickViewRecipe(recipe);
                            setQuickViewEditMode(false);
                            setEditedQuickViewRecipe(null);
                          }}
                          className="w-full px-3 py-2 text-[13px] font-medium text-[#0078D4] border border-[#0078D4] rounded-lg hover:bg-[#0078D4] hover:text-white transition-colors"
                        >
                          View
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(recipe)}
                            className="flex-1 px-3 py-2 text-[13px] font-medium bg-[#0078D4] text-white rounded-lg hover:bg-[#106EBE] transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDuplicate(recipe)}
                            className="flex-1 px-3 py-2 text-[13px] font-medium text-[#6E6E73] border border-[#D2D2D7] rounded-lg hover:bg-[#F5F5F7] transition-colors"
                            title="Duplicate"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => handleDelete(recipe.id)}
                            className="flex-1 px-3 py-2 text-[13px] font-medium text-[#FF3B30] border border-[#FF3B30] rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
          </>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
                multiple
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="px-6 py-3 text-[15px] font-medium bg-[#0078D4] text-white hover:bg-[#106EBE] rounded-lg transition-colors disabled:opacity-50"
              >
                {importing ? 'Importing...' : '📊 Import Excel Files'}
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 text-[15px] font-medium border border-[#D2D2D7] text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-lg transition-colors"
              >
                + Add Recipe Manually
              </button>
              <button
                onClick={handleDeleteAllRecipes}
                disabled={loading || importing}
                className="px-6 py-3 text-[15px] font-medium bg-[#FF3B30] text-white hover:bg-[#FF453A] rounded-lg transition-colors disabled:opacity-50 ml-auto"
              >
                🗑️ Delete All Recipes
              </button>
            </div>

            {/* Import Results */}
            {importResults && (
              <div className="p-6 bg-white border border-[#D2D2D7] rounded-xl">
                <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-3">Import Results</h3>
                <div className="flex gap-8 mb-4">
                  <div className="text-[15px]">
                    <span className="text-[#34C759] font-semibold">{importResults.success} succeeded</span>
                  </div>
                  <div className="text-[15px]">
                    <span className="text-[#FF3B30] font-semibold">{importResults.failed} failed</span>
                  </div>
                </div>
                {importResults.errors.length > 0 && (
                  <div>
                    <h4 className="text-[13px] font-semibold text-[#FF3B30] mb-2">Errors:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {importResults.errors.map((error, i) => (
                        <li key={i} className="text-[13px] text-[#6E6E73]">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* All Recipes List */}
            <div className="bg-white border border-[#D2D2D7] rounded-xl p-6">
              <h2 className="text-[20px] font-semibold text-[#1D1D1F] mb-4">
                All Recipes ({recipes.length})
              </h2>
              {recipes.length === 0 ? (
                <p className="text-[#86868B] text-[15px]">No recipes in database</p>
              ) : (
                <div className="space-y-2">
                  {recipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="flex items-center justify-between p-3 hover:bg-[#F5F5F7] rounded-lg transition-colors"
                    >
                      <div>
                        <p className="text-[15px] font-medium text-[#1D1D1F]">{recipe.name}</p>
                        <p className="text-[13px] text-[#86868B]">
                          {recipe.dishes?.category && `${recipe.dishes.category} • `}
                          {recipe.base_quantity} {recipe.base_unit}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(recipe)}
                          className="px-3 py-1.5 text-[13px] font-medium text-[#0078D4] hover:bg-[#E8F4FF] rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(recipe.id)}
                          className="px-3 py-1.5 text-[13px] font-medium text-[#FF3B30] hover:bg-red-50 rounded transition-colors"
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
        )}
      </main>

      {/* Quick View Modal */}
      {quickViewRecipe && (
        <>
          {/* Print styles */}
          <style jsx global>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm;
              }

              /* Hide everything except the recipe modal */
              body * {
                visibility: hidden;
              }

              #recipe-modal-container,
              #recipe-modal-container * {
                visibility: visible;
              }

              /* Reset modal positioning for print */
              #recipe-modal-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
              }

              #recipe-modal-content {
                max-width: 100% !important;
                max-height: none !important;
                overflow: visible !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                width: 100% !important;
              }

              /* Hide buttons, close icon, drag handles */
              .print-hide {
                display: none !important;
              }

              button {
                display: none !important;
              }

              svg.w-3, svg.w-4 {
                display: none !important;
              }

              /* Hide all inputs and show their values */
              input, select {
                border: none !important;
                background: transparent !important;
                padding: 0 !important;
              }

              /* Adjust table for print */
              table {
                font-size: 9px !important;
                page-break-inside: avoid;
                width: 100% !important;
              }

              table th {
                padding: 2px 3px !important;
                font-size: 8px !important;
              }

              table td {
                padding: 2px 3px !important;
                font-size: 9px !important;
              }

              /* Adjust sidebar for print */
              .ingredients-sidebar {
                font-size: 8px !important;
                padding: 8px !important;
              }

              .ingredients-sidebar h4 {
                font-size: 10px !important;
                margin-bottom: 4px !important;
              }

              /* Reduce header size */
              .recipe-header {
                padding: 8px !important;
                position: static !important;
              }

              .recipe-header h3, .recipe-header input {
                font-size: 14px !important;
              }

              .recipe-header p, .recipe-header span, .recipe-header input[type="number"], .recipe-header select {
                font-size: 9px !important;
              }

              /* Ensure colors print */
              * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              /* Ensure two-column layout stays side by side */
              .flex {
                display: flex !important;
              }

              /* Remove gaps and extra spacing */
              .gap-0 {
                gap: 0 !important;
              }

              /* Make layout fit */
              .flex-\[3\] {
                flex: 2 !important;
              }

              .flex-1 {
                flex: 1 !important;
              }
            }
          `}</style>

          <div
            id="recipe-modal-container"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              if (!quickViewEditMode) {
                setQuickViewRecipe(null);
                setQuickViewEditMode(false);
                setEditedQuickViewRecipe(null);
              }
            }}
          >
            <div
              id="recipe-modal-content"
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Modal Header */}
            <div className="recipe-header bg-[#FAFAFA] px-6 py-4 border-b border-[#E8E8ED] sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {quickViewEditMode && editedQuickViewRecipe ? (
                    <input
                      type="text"
                      value={editedQuickViewRecipe.name}
                      onChange={(e) => setEditedQuickViewRecipe({ ...editedQuickViewRecipe, name: e.target.value })}
                      className="text-[22px] font-semibold text-[#1D1D1F] border border-[#D2D2D7] rounded px-3 py-1 w-full focus:outline-none focus:border-[#0078D4]"
                    />
                  ) : (
                    <h3 className="text-[22px] font-semibold text-[#1D1D1F]">
                      {quickViewRecipe.name}
                    </h3>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {quickViewEditMode && editedQuickViewRecipe ? (
                      <>
                        <span className="text-[13px] text-[#86868B]">Base Quantity:</span>
                        <input
                          type="number"
                          value={editedQuickViewRecipe.base_quantity}
                          onChange={(e) => setEditedQuickViewRecipe({ ...editedQuickViewRecipe, base_quantity: parseFloat(e.target.value) || 0 })}
                          className="text-[13px] border border-[#D2D2D7] rounded px-2 py-1 w-20 focus:outline-none focus:border-[#0078D4]"
                          step="0.1"
                        />
                        <select
                          value={editedQuickViewRecipe.base_unit}
                          onChange={(e) => setEditedQuickViewRecipe({ ...editedQuickViewRecipe, base_unit: e.target.value })}
                          className="text-[13px] border border-[#D2D2D7] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]"
                        >
                          <option value="kg">kg</option>
                          <option value="liters">liters</option>
                          <option value="servings">servings</option>
                        </select>
                        <span className="text-[13px] text-[#86868B] ml-3">Loss:</span>
                        <input
                          type="number"
                          value={editedQuickViewRecipe.cooking_loss_percentage}
                          onChange={(e) => setEditedQuickViewRecipe({ ...editedQuickViewRecipe, cooking_loss_percentage: parseFloat(e.target.value) || 0 })}
                          className="text-[13px] border border-[#D2D2D7] rounded px-2 py-1 w-16 focus:outline-none focus:border-[#0078D4]"
                          step="0.1"
                        />
                        <span className="text-[13px] text-[#86868B]">%</span>
                      </>
                    ) : (
                      <p className="text-[13px] text-[#86868B]">
                        Base Quantity: {quickViewRecipe.base_quantity} {quickViewRecipe.base_unit} | Loss: {quickViewRecipe.cooking_loss_percentage}%
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="print-hide px-3 py-1.5 text-[13px] font-medium text-[#0078D4] hover:bg-[#F5F5F7] rounded transition-colors flex items-center gap-1"
                    title="Print recipe"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </button>
                  <button
                    onClick={() => {
                      if (quickViewEditMode) {
                        handleQuickViewCancel();
                      } else {
                        setQuickViewRecipe(null);
                      }
                    }}
                    className="print-hide text-[#86868B] hover:text-[#1D1D1F] text-[24px] leading-none ml-2"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            {/* Two-column layout: Recipe (75%) + Ingredients Sidebar (25%) */}
            <div className="flex gap-0">
              {/* LEFT: Recipe Table (75%) */}
              <div className="flex-[3] p-6">
                <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F5F5F7] text-left">
                    {quickViewEditMode && (
                      <th className="px-3 py-2 border border-[#D2D2D7] w-8"></th>
                    )}
                    <th className="px-4 py-2 text-[13px] font-semibold text-[#86868B] uppercase tracking-wide border border-[#D2D2D7]">
                      Ingredient / Action
                    </th>
                    <th className="px-4 py-2 text-[13px] font-semibold text-[#86868B] uppercase tracking-wide text-right border border-[#D2D2D7] w-32">
                      Quantity {quickViewEditMode && <span className="text-[#FF3B30]">(Read-Only)</span>}
                    </th>
                    <th className="px-4 py-2 text-[13px] font-semibold text-[#86868B] uppercase tracking-wide border border-[#D2D2D7] w-24">
                      Unit
                    </th>
                    {quickViewEditMode && (
                      <>
                        <th className="px-4 py-2 text-[13px] font-semibold text-[#86868B] uppercase tracking-wide text-right border border-[#D2D2D7] w-28">
                          Formula (%)
                        </th>
                        <th className="px-3 py-2 border border-[#D2D2D7] w-8"></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {/* Required Quantity - Always Editable */}
                  <tr className="bg-[#E8F4FF]">
                    {quickViewEditMode && (
                      <td className="px-3 py-2 border border-[#D2D2D7]"></td>
                    )}
                    <td className="px-4 py-2 border border-[#D2D2D7]">
                      <div className="text-[15px] font-bold text-[#0078D4]">Required</div>
                    </td>
                    <td className="px-4 py-2 border border-[#D2D2D7] text-right">
                      <input
                        type="number"
                        value={(quickViewEditMode && editedQuickViewRecipe ? editedQuickViewRecipe.base_quantity : quickViewRecipe.base_quantity).toFixed(2)}
                        onChange={async (e) => {
                          const newQuantity = parseFloat(e.target.value) || 0;
                          if (quickViewEditMode && editedQuickViewRecipe) {
                            setEditedQuickViewRecipe({ ...editedQuickViewRecipe, base_quantity: newQuantity });
                          } else {
                            // Update and auto-save in view mode
                            const updated = { ...quickViewRecipe, base_quantity: newQuantity };
                            setQuickViewRecipe(updated);

                            // Auto-save to database
                            try {
                              const { error } = await supabase
                                .from('recipes')
                                .update({ base_quantity: newQuantity })
                                .eq('id', quickViewRecipe.id);

                              if (error) throw error;
                            } catch (err) {
                              console.error('Error auto-saving required quantity:', err);
                            }
                          }
                        }}
                        step="0.01"
                        min="0"
                        className="w-full text-[15px] font-mono font-bold text-[#0078D4] border border-[#0078D4] rounded px-2 py-1 text-right focus:outline-none focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20 bg-white"
                      />
                    </td>
                    <td className="px-4 py-2 border border-[#D2D2D7]">
                      <select
                        value={quickViewEditMode && editedQuickViewRecipe ? editedQuickViewRecipe.base_unit : quickViewRecipe.base_unit}
                        onChange={async (e) => {
                          const newUnit = e.target.value;
                          if (quickViewEditMode && editedQuickViewRecipe) {
                            setEditedQuickViewRecipe({ ...editedQuickViewRecipe, base_unit: newUnit });
                          } else {
                            // Update and auto-save in view mode
                            const updated = { ...quickViewRecipe, base_unit: newUnit };
                            setQuickViewRecipe(updated);

                            // Auto-save to database
                            try {
                              const { error } = await supabase
                                .from('recipes')
                                .update({ base_unit: newUnit })
                                .eq('id', quickViewRecipe.id);

                              if (error) throw error;
                            } catch (err) {
                              console.error('Error auto-saving base unit:', err);
                            }
                          }
                        }}
                        className="w-full text-[14px] text-[#0078D4] font-medium border border-[#0078D4] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20 bg-white"
                      >
                        <option value="kg">kg</option>
                        <option value="liters">liters</option>
                        <option value="servings">servings</option>
                        <option value="pieces">pieces</option>
                      </select>
                    </td>
                    {quickViewEditMode && (
                      <>
                        <td className="px-4 py-2 border border-[#D2D2D7]"></td>
                        <td className="px-3 py-2 border border-[#D2D2D7]"></td>
                      </>
                    )}
                  </tr>

                  {/* Rows */}
                  {(quickViewEditMode && editedQuickViewRecipe ? editedQuickViewRecipe.rows : quickViewRecipe.rows)?.map((row: any, index: number) => {
                    const currentRecipe = quickViewEditMode && editedQuickViewRecipe ? editedQuickViewRecipe : quickViewRecipe;

                    if (row.type === 'action') {
                      return (
                        <tr
                          key={row.id || index}
                          className={`bg-[#FAFAFA] ${quickViewEditMode ? 'cursor-move' : ''}`}
                          draggable={quickViewEditMode}
                          onDragStart={(e) => quickViewEditMode && handleDragStart(e, index)}
                          onDragOver={(e) => quickViewEditMode && handleDragOver(e)}
                          onDrop={(e) => quickViewEditMode && handleDrop(e, index)}
                        >
                          {quickViewEditMode && (
                            <td className="px-2 py-2 border border-[#D2D2D7] text-center cursor-move">
                              <svg className="w-4 h-4 text-[#86868B] mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                            </td>
                          )}
                          <td colSpan={quickViewEditMode ? 4 : 3} className="px-4 py-2 border border-[#D2D2D7]">
                            {quickViewEditMode ? (
                              <input
                                type="text"
                                value={row.text}
                                onChange={(e) => updateQuickViewRow(index, 'text', e.target.value)}
                                className="w-full font-bold text-[14px] text-[#1D1D1F] border border-[#D2D2D7] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]"
                              />
                            ) : (
                              <div className="font-bold text-[14px] text-[#1D1D1F]">
                                {row.text}
                              </div>
                            )}
                          </td>
                          {quickViewEditMode && (
                            <td className="px-3 py-2 border border-[#D2D2D7] text-center">
                              <button
                                onClick={() => deleteQuickViewRow(index)}
                                className="text-[#FF3B30] hover:text-[#FF453A] transition-colors"
                                title="Delete row"
                              >
                                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    } else {
                      const multiplier = row.multiplier !== undefined ? row.multiplier : 0;
                      let hardValue = multiplier * currentRecipe.base_quantity;
                      let displayUnit = row.unit || 'kg';

                      // Convert between base unit and ingredient unit
                      const baseUnitLower = (currentRecipe.base_unit || 'kg').toLowerCase();
                      const ingredientUnitLower = (row.unit || 'kg').toLowerCase();

                      if (baseUnitLower === 'kg' && ingredientUnitLower === 'gram') {
                        hardValue = hardValue * 1000;
                      } else if (baseUnitLower === 'liters' && ingredientUnitLower === 'ml') {
                        hardValue = hardValue * 1000;
                      } else if (baseUnitLower === 'kg' && ingredientUnitLower === 'ml') {
                        hardValue = hardValue * 1000;
                      } else if (baseUnitLower === 'liters' && ingredientUnitLower === 'gram') {
                        hardValue = hardValue * 1000;
                      }

                      // Convert bunches to grams for display
                      if ((row.unit || '').toLowerCase().includes('bunch')) {
                        const ingredientLower = (row.text || '').toLowerCase();
                        let gramsPerBunch = 0;
                        if (ingredientLower.includes('coriander') || ingredientLower.includes('cilantro') ||
                            ingredientLower.includes('parsley') || ingredientLower.includes('dill') ||
                            ingredientLower.includes('mint')) {
                          gramsPerBunch = 80;
                        } else if (ingredientLower.includes('spring onion') || ingredientLower.includes('scallion')) {
                          gramsPerBunch = 100;
                        }
                        if (gramsPerBunch > 0) {
                          hardValue = hardValue * gramsPerBunch;
                          displayUnit = 'gram';
                        }
                      }

                      const percentage = multiplier * 100;

                      return (
                        <tr
                          key={row.id || index}
                          className={`hover:bg-[#FAFAFA] ${quickViewEditMode ? 'cursor-move' : ''}`}
                          draggable={quickViewEditMode}
                          onDragStart={(e) => quickViewEditMode && handleDragStart(e, index)}
                          onDragOver={(e) => quickViewEditMode && handleDragOver(e)}
                          onDrop={(e) => quickViewEditMode && handleDrop(e, index)}
                        >
                          {quickViewEditMode && (
                            <td className="px-2 py-2 border border-[#D2D2D7] text-center cursor-move">
                              <svg className="w-3 h-3 text-[#86868B] mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                            </td>
                          )}
                          <td className="px-4 py-2 border border-[#D2D2D7]">
                            {quickViewEditMode ? (
                              <input
                                type="text"
                                value={row.text}
                                onChange={(e) => updateQuickViewRow(index, 'text', e.target.value)}
                                className="w-full text-[14px] text-[#1D1D1F] border border-[#D2D2D7] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]"
                              />
                            ) : (
                              <div className="text-[14px] text-[#1D1D1F]">{row.text}</div>
                            )}
                          </td>
                          <td className="px-4 py-2 border border-[#D2D2D7] text-right">
                            <div className={`text-[14px] font-mono ${quickViewEditMode ? 'text-[#86868B]' : 'text-[#1D1D1F]'}`}>
                              {hardValue > 0 ? hardValue.toFixed(2) : '0.00'}
                            </div>
                          </td>
                          <td className="px-4 py-2 border border-[#D2D2D7]">
                            {quickViewEditMode ? (
                              <select
                                value={row.unit || 'kg'}
                                onChange={(e) => updateQuickViewRow(index, 'unit', e.target.value)}
                                className="w-full text-[13px] text-[#6E6E73] border border-[#D2D2D7] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4]"
                              >
                                <option value="kg">kg</option>
                                <option value="gram">gram</option>
                                <option value="liters">liters</option>
                                <option value="ml">ml</option>
                                <option value="pieces">pieces</option>
                                <option value="slices">slices</option>
                                <option value="bunches">bunches</option>
                              </select>
                            ) : (
                              <div className="text-[13px] text-[#6E6E73]">{displayUnit}</div>
                            )}
                          </td>
                          {quickViewEditMode && (
                            <>
                              <td className="px-4 py-2 border border-[#D2D2D7] text-right">
                                <input
                                  type="number"
                                  value={percentage}
                                  onChange={(e) => updateQuickViewRow(index, 'percentage', e.target.value)}
                                  step="0.1"
                                  min="0"
                                  className="w-full text-[13px] font-mono text-[#1D1D1F] border border-[#0078D4] rounded px-2 py-1 focus:outline-none focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20"
                                />
                              </td>
                              <td className="px-3 py-2 border border-[#D2D2D7] text-center">
                                <button
                                  onClick={() => deleteQuickViewRow(index)}
                                  className="text-[#FF3B30] hover:text-[#FF453A] transition-colors"
                                  title="Delete row"
                                >
                                  <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    }
                  })}

                  {/* Add Row Buttons - Only in edit mode */}
                  {quickViewEditMode && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 border-0">
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={addQuickViewAction}
                            className="px-6 py-2.5 text-[15px] font-medium text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-lg transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Action
                          </button>
                          <button
                            onClick={addQuickViewIngredient}
                            className="px-6 py-2.5 text-[15px] font-medium text-white bg-[#34C759] hover:bg-[#30B350] rounded-lg transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Ingredient
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Summary: Gross Weight, Loss, Net Weight */}
                  {(() => {
                    const currentRecipe = quickViewEditMode && editedQuickViewRecipe ? editedQuickViewRecipe : quickViewRecipe;

                    // Helper function to convert units to base unit (kg or liters)
                    const convertToBaseUnit = (value: number, unit: string, baseUnit: string, ingredientName?: string): number => {
                      const unitLower = (unit || 'kg').toLowerCase().trim();

                      // Convert bunches to grams based on ingredient type
                      if (unitLower.includes('bunch')) {
                        const ingredientLower = (ingredientName || '').toLowerCase();
                        let gramsPerBunch = 0;

                        if (ingredientLower.includes('coriander') || ingredientLower.includes('cilantro') ||
                            ingredientLower.includes('parsley') || ingredientLower.includes('dill') ||
                            ingredientLower.includes('mint')) {
                          gramsPerBunch = 80;
                        } else if (ingredientLower.includes('spring onion') || ingredientLower.includes('scallion')) {
                          gramsPerBunch = 100;
                        } else {
                          console.log('Unknown bunch type, excluding from weight:', ingredientName, value, unit);
                          return 0;
                        }

                        const totalGrams = value * gramsPerBunch;
                        if (baseUnit === 'kg') {
                          return totalGrams / 1000;
                        }
                        return totalGrams;
                      }

                      // Skip non-weight/volume units
                      if (unitLower.includes('piece') || unitLower.includes('slice')) {
                        return 0;
                      }

                      // Convert to kg
                      if (baseUnit === 'kg') {
                        if (unitLower.includes('gram') || unitLower === 'g') {
                          return value / 1000;
                        }
                        if (unitLower === 'kg' || unitLower === 'kilo' || unitLower === 'kilos') {
                          return value;
                        }
                        if (unitLower === 'liters' || unitLower === 'liter' || unitLower === 'l') {
                          return value;
                        }
                        if (unitLower === 'ml' || unitLower === 'milliliter' || unitLower === 'milliliters') {
                          return value / 1000;
                        }
                        return value;
                      }

                      // Convert to liters
                      if (baseUnit === 'liters') {
                        if (unitLower === 'ml' || unitLower === 'milliliter' || unitLower === 'milliliters') {
                          return value / 1000;
                        }
                        if (unitLower === 'liters' || unitLower === 'liter' || unitLower === 'l') {
                          return value;
                        }
                        return value;
                      }

                      return value;
                    };

                    // Calculate gross weight
                    const grossWeight = (currentRecipe.rows || []).reduce((sum: number, row: any) => {
                      if (row.type === 'ingredient') {
                        const multiplier = row.multiplier !== undefined ? row.multiplier : 0;
                        const valueInIngredientUnit = multiplier * currentRecipe.base_quantity;
                        const valueInBaseUnit = convertToBaseUnit(valueInIngredientUnit, row.unit || 'kg', currentRecipe.base_unit, row.text);
                        return sum + valueInBaseUnit;
                      }
                      return sum;
                    }, 0);

                    const lossPercentage = currentRecipe.cooking_loss_percentage || 0;
                    const lossWeight = grossWeight * (lossPercentage / 100);
                    const netWeight = grossWeight - lossWeight;

                    return (
                      <>
                        {/* Gross Weight */}
                        <tr className="bg-[#F5F5F7]">
                          {quickViewEditMode && (
                            <td className="px-2 py-2 border border-[#D2D2D7]"></td>
                          )}
                          <td className="px-4 py-2 border border-[#D2D2D7]">
                            <div className="text-[15px] font-semibold text-[#1D1D1F]">Gross Weight</div>
                          </td>
                          <td className="px-4 py-2 border border-[#D2D2D7] text-right">
                            <div className="text-[15px] font-mono font-semibold text-[#1D1D1F]">
                              {grossWeight.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-4 py-2 border border-[#D2D2D7]">
                            <div className="text-[14px] text-[#6E6E73]">{currentRecipe.base_unit}</div>
                          </td>
                          {quickViewEditMode && (
                            <>
                              <td className="px-4 py-2 border border-[#D2D2D7]"></td>
                              <td className="px-2 py-2 border border-[#D2D2D7]"></td>
                            </>
                          )}
                        </tr>

                        {/* Loss */}
                        <tr className="bg-[#FFF5F5]">
                          {quickViewEditMode && (
                            <td className="px-2 py-2 border border-[#D2D2D7]"></td>
                          )}
                          <td className="px-4 py-2 border border-[#D2D2D7]">
                            <div className="text-[15px] font-semibold text-[#FF3B30]">Loss ({lossPercentage}%)</div>
                          </td>
                          <td className="px-4 py-2 border border-[#D2D2D7] text-right">
                            <div className="text-[15px] font-mono font-semibold text-[#FF3B30]">
                              -{lossWeight.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-4 py-2 border border-[#D2D2D7]">
                            <div className="text-[14px] text-[#6E6E73]">{currentRecipe.base_unit}</div>
                          </td>
                          {quickViewEditMode && (
                            <>
                              <td className="px-4 py-2 border border-[#D2D2D7]"></td>
                              <td className="px-2 py-2 border border-[#D2D2D7]"></td>
                            </>
                          )}
                        </tr>

                        {/* Net Weight */}
                        <tr className="bg-[#E8F5E9]">
                          {quickViewEditMode && (
                            <td className="px-2 py-2 border border-[#D2D2D7]"></td>
                          )}
                          <td className="px-4 py-2 border border-[#D2D2D7]">
                            <div className="text-[15px] font-bold text-[#34C759]">Net Weight</div>
                          </td>
                          <td className="px-4 py-2 border border-[#D2D2D7] text-right">
                            <div className="text-[15px] font-mono font-bold text-[#34C759]">
                              {netWeight.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-4 py-2 border border-[#D2D2D7]">
                            <div className="text-[14px] text-[#6E6E73]">{currentRecipe.base_unit}</div>
                          </td>
                          {quickViewEditMode && (
                            <>
                              <td className="px-4 py-2 border border-[#D2D2D7]"></td>
                              <td className="px-2 py-2 border border-[#D2D2D7]"></td>
                            </>
                          )}
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
              </div>

              {/* RIGHT: Ingredients Sidebar (25%) */}
              <div className="ingredients-sidebar flex-1 bg-[#F5F5F7] border-l border-[#E8E8ED] p-6 overflow-y-auto">
                <h4 className="text-[15px] font-semibold text-[#1D1D1F] mb-4">Ingredients</h4>
                <div className="space-y-4">
                {(() => {
                  const currentRecipe = quickViewEditMode && editedQuickViewRecipe ? editedQuickViewRecipe : quickViewRecipe;

                  // Group by category with original row index
                  const vegIngredients: any[] = [];
                  const meatFishIngredients: any[] = [];
                  const dairyIngredients: any[] = [];
                  const dryStoreIngredients: any[] = [];

                  (currentRecipe.rows || []).forEach((row: any, originalIndex: number) => {
                    if (row.type !== 'ingredient') return;

                    const multiplier = row.multiplier !== undefined ? row.multiplier : 0;
                    let hardValue = multiplier * currentRecipe.base_quantity;
                    let displayUnit = row.unit || 'kg';

                    // Convert between base unit and ingredient unit
                    const baseUnitLower = (currentRecipe.base_unit || 'kg').toLowerCase();
                    const ingredientUnitLower = (row.unit || 'kg').toLowerCase();

                    if (baseUnitLower === 'kg' && ingredientUnitLower === 'gram') {
                      hardValue = hardValue * 1000;
                    } else if (baseUnitLower === 'liters' && ingredientUnitLower === 'ml') {
                      hardValue = hardValue * 1000;
                    } else if (baseUnitLower === 'kg' && ingredientUnitLower === 'ml') {
                      hardValue = hardValue * 1000;
                    } else if (baseUnitLower === 'liters' && ingredientUnitLower === 'gram') {
                      hardValue = hardValue * 1000;
                    }

                    // Convert bunches to grams for display
                    if ((row.unit || '').toLowerCase().includes('bunch')) {
                      const ingredientLower = (row.text || '').toLowerCase();
                      let gramsPerBunch = 0;
                      if (ingredientLower.includes('coriander') || ingredientLower.includes('cilantro') ||
                          ingredientLower.includes('parsley') || ingredientLower.includes('dill') ||
                          ingredientLower.includes('mint')) {
                        gramsPerBunch = 80;
                      } else if (ingredientLower.includes('spring onion') || ingredientLower.includes('scallion')) {
                        gramsPerBunch = 100;
                      }
                      if (gramsPerBunch > 0) {
                        hardValue = hardValue * gramsPerBunch;
                        displayUnit = 'gram';
                      }
                    }

                    // Smart unit conversion: >= 1000g -> kg, >= 1000ml -> ltrs
                    if (displayUnit === 'gram' && hardValue >= 1000) {
                      hardValue = hardValue / 1000;
                      displayUnit = 'kg';
                    } else if (displayUnit === 'ml' && hardValue >= 1000) {
                      hardValue = hardValue / 1000;
                      displayUnit = 'ltrs';
                    }

                    const ingredient = { ...row, hardValue, displayUnit, originalRowIndex: originalIndex };

                    // Categorize
                    if (row.category === 'vegetable') {
                      vegIngredients.push(ingredient);
                    } else if (row.category === 'meat' || row.category === 'fish') {
                      meatFishIngredients.push(ingredient);
                    } else if (row.category === 'dairy') {
                      dairyIngredients.push(ingredient);
                    } else if (row.category === 'dry_store') {
                      dryStoreIngredients.push(ingredient);
                    } else {
                      // Default to veg if no category
                      vegIngredients.push(ingredient);
                    }
                  });

                  const handleIngredientDragStart = (e: React.DragEvent, originalRowIndex: number) => {
                    e.dataTransfer.setData('rowIndex', originalRowIndex.toString());
                  };

                  const handleCategoryDrop = (e: React.DragEvent, targetCategory: string) => {
                    e.preventDefault();
                    const rowIndex = parseInt(e.dataTransfer.getData('rowIndex'));

                    if (!editedQuickViewRecipe || isNaN(rowIndex)) return;

                    const updatedRows = [...editedQuickViewRecipe.rows];
                    if (updatedRows[rowIndex]) {
                      updatedRows[rowIndex] = {
                        ...updatedRows[rowIndex],
                        category: targetCategory as any
                      };

                      setEditedQuickViewRecipe({
                        ...editedQuickViewRecipe,
                        rows: updatedRows
                      });
                    }
                  };

                  const handleDragOver = (e: React.DragEvent) => {
                    e.preventDefault();
                  };

                  const CategorySection = ({ title, categoryKey, items }: { title: string; categoryKey: string; items: any[] }) => (
                      <div
                        className={`border-2 border-dashed rounded-lg p-3 min-h-[80px] relative transition-all ${
                          quickViewEditMode ? 'border-[#D2D2D7]' : 'border-transparent'
                        }`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleCategoryDrop(e, categoryKey)}
                      >
                      <div className="text-[12px] font-semibold text-[#86868B] uppercase tracking-wide mb-2">{title}</div>
                      {items.length > 0 ? (
                        items.map((ing, idx) => {
                          if (!quickViewEditMode) {
                            // Non-edit mode: simple display
                            return (
                              <div key={idx} className="flex items-baseline justify-between text-[13px] mb-1.5">
                                <span className="text-[#1D1D1F] font-medium truncate">{ing.text}</span>
                                <span className="text-[#6E6E73] ml-2 whitespace-nowrap font-mono text-[11px]">
                                  {ing.hardValue > 0 ? ing.hardValue.toFixed(ing.displayUnit === 'kg' || ing.displayUnit === 'ltrs' ? 2 : 0) : '0'} {ing.displayUnit}
                                </span>
                              </div>
                            );
                          }

                          // Edit mode: draggable row
                          return (
                            <div
                              key={idx}
                              draggable
                              onDragStart={(e) => handleIngredientDragStart(e, ing.originalRowIndex)}
                              className="flex items-center gap-2 text-[13px] mb-1.5 hover:bg-white rounded px-2 py-2 transition-colors cursor-move border border-transparent hover:border-[#D2D2D7]"
                            >
                              <svg className="w-4 h-4 text-[#86868B] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                              <div className="flex items-baseline justify-between flex-1 min-w-0">
                                <span className="text-[#1D1D1F] font-medium truncate">{ing.text}</span>
                                <span className="text-[#6E6E73] ml-2 whitespace-nowrap font-mono text-[11px] flex-shrink-0">
                                  {ing.hardValue > 0 ? ing.hardValue.toFixed(ing.displayUnit === 'kg' || ing.displayUnit === 'ltrs' ? 2 : 0) : '0'} {ing.displayUnit}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-[11px] text-[#86868B] italic">
                          {quickViewEditMode ? 'Drag ingredients here' : 'No ingredients'}
                        </div>
                      )}
                    </div>
                  );

                  return (
                    <>
                      <CategorySection title="Veg" categoryKey="vegetable" items={vegIngredients} />
                      <CategorySection title="Meat/Fish" categoryKey="meat" items={meatFishIngredients} />
                      <CategorySection title="Dairy" categoryKey="dairy" items={dairyIngredients} />
                      <CategorySection title="Dry Store" categoryKey="dry_store" items={dryStoreIngredients} />
                    </>
                  );
                })()}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="print-hide px-6 pb-6 flex justify-end gap-3">
                {quickViewEditMode ? (
                  <>
                    <button
                      onClick={handleQuickViewCancel}
                      className="px-6 py-2.5 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded-lg hover:bg-[#F5F5F7] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleQuickViewSave}
                      className="px-6 py-2.5 text-[15px] font-medium bg-[#34C759] text-white rounded-lg hover:bg-[#30B350] transition-colors"
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleQuickViewEdit}
                      className="px-6 py-2.5 text-[15px] font-medium bg-[#0078D4] text-white rounded-lg hover:bg-[#106EBE] transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setQuickViewRecipe(null);
                        setQuickViewEditMode(false);
                        setEditedQuickViewRecipe(null);
                      }}
                      className="px-6 py-2.5 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded-lg hover:bg-[#F5F5F7] transition-colors"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
