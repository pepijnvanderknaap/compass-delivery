'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import UniversalHeader from '@/components/UniversalHeader';
import * as XLSX from 'xlsx';

interface RecipeRow {
  id: string;
  type: 'action' | 'ingredient';
  text: string; // For action: the action text. For ingredient: the ingredient name
  hardValue?: number; // Only for ingredients (UI only, converted to multiplier for DB)
  multiplier?: number; // Only for ingredients (stored in DB: hardValue / base_quantity)
  unit?: string; // Only for ingredients (kg, grams, liters, ml)
  category?: 'vegetable' | 'meat' | 'fish' | 'dairy' | 'dry_store'; // Only for ingredients
}

interface Recipe {
  id: string;
  dish_id: string;
  name: string; // Combined dish + recipe name
  base_quantity: number;
  base_unit: string;
  rows: RecipeRow[]; // All rows in order (actions and ingredients mixed)
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

export default function RecipesAdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      router.push('/login');
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

  const addActionRow = () => {
    const newRow: RecipeRow = {
      id: Date.now().toString(),
      type: 'action',
      text: '',
    };
    setRows([...rows, newRow]);
  };

  const addIngredientRow = () => {
    const newRow: RecipeRow = {
      id: Date.now().toString(),
      type: 'ingredient',
      text: '',
      hardValue: 0,
      unit: 'kg',
      category: 'vegetable',
    };
    setRows([...rows, newRow]);
  };

  const insertActionAt = (index: number) => {
    const newRow: RecipeRow = {
      id: Date.now().toString(),
      type: 'action',
      text: '',
    };
    const newRows = [...rows];
    newRows.splice(index, 0, newRow);
    setRows(newRows);
  };

  const insertIngredientAt = (index: number) => {
    const newRow: RecipeRow = {
      id: Date.now().toString(),
      type: 'ingredient',
      text: '',
      hardValue: 0,
      unit: 'kg',
      category: 'vegetable',
    };
    const newRows = [...rows];
    newRows.splice(index, 0, newRow);
    setRows(newRows);
  };

  const updateRow = (id: string, field: string, value: any) => {
    setRows(rows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const removeRow = (id: string) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const moveRowUp = (index: number) => {
    if (index === 0) return;
    const newRows = [...rows];
    [newRows[index - 1], newRows[index]] = [newRows[index], newRows[index - 1]];
    setRows(newRows);
  };

  const moveRowDown = (index: number) => {
    if (index === rows.length - 1) return;
    const newRows = [...rows];
    [newRows[index], newRows[index + 1]] = [newRows[index + 1], newRows[index]];
    setRows(newRows);
  };

  const addFinalStep = () => {
    setFinalSteps([...finalSteps, '']);
  };

  const updateFinalStep = (index: number, value: string) => {
    setFinalSteps(finalSteps.map((step, i) => i === index ? value : step));
  };

  const removeFinalStep = (index: number) => {
    setFinalSteps(finalSteps.filter((_, i) => i !== index));
  };

  const calculateMultipliers = () => {
    // Convert all hard values to multipliers based on base quantity
    // Remove hardValue from saved data (it's UI-only, we store multiplier)
    return rows.map(row => {
      if (row.type === 'ingredient' && row.hardValue !== undefined) {
        const { hardValue, ...rowWithoutHardValue } = row;
        return {
          ...rowWithoutHardValue,
          multiplier: formData.base_quantity > 0 ? hardValue / formData.base_quantity : 0
        };
      }
      return row;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.dish_id) {
      setMessage({ type: 'error', text: 'Please select a dish' });
      return;
    }

    if (rows.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one row' });
      return;
    }

    // Get dish name to use as recipe name
    const selectedDish = dishes.find(d => d.id === formData.dish_id);
    if (!selectedDish) {
      setMessage({ type: 'error', text: 'Selected dish not found' });
      return;
    }

    // Calculate multipliers from hard values
    const rowsWithMultipliers = calculateMultipliers();

    const dataToSave = {
      dish_id: formData.dish_id,
      name: selectedDish.name,
      base_quantity: formData.base_quantity,
      base_unit: formData.base_unit,
      rows: rowsWithMultipliers,
      cooking_loss_percentage: formData.cooking_loss_percentage,
      final_steps: finalSteps.filter(step => step.trim() !== ''),
    };

    if (editingRecipe) {
      const { error } = await supabase
        .from('recipes')
        .update(dataToSave)
        .eq('id', editingRecipe.id);

      if (error) {
        console.error('Error updating recipe:', error);
        setMessage({ type: 'error', text: 'Failed to update recipe' });
      } else {
        setMessage({ type: 'success', text: 'Recipe updated successfully!' });
        fetchRecipes();
        closeForm();
      }
    } else {
      const { error } = await supabase
        .from('recipes')
        .insert(dataToSave);

      if (error) {
        console.error('Error creating recipe:', error);
        setMessage({ type: 'error', text: 'Failed to create recipe' });
      } else {
        setMessage({ type: 'success', text: 'Recipe created successfully!' });
        fetchRecipes();
        closeForm();
      }
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

    // Convert multipliers back to hard values for editing
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

  const closeForm = () => {
    setShowForm(false);
    setEditingRecipe(null);
    setFormData({
      dish_id: '',
      base_quantity: 25,
      base_unit: 'kg',
      cooking_loss_percentage: 8,
    });
    setRows([]);
    setFinalSteps([]);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      soup: 'Soup',
      hot_dish_meat: 'Hot Dish (Meat)',
      hot_dish_fish: 'Hot Dish (Fish)',
      hot_dish_veg: 'Hot Dish (Veg)',
    };
    return labels[category] || category;
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setImporting(true);
    setImportResults(null);

    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    try {
      // Process all selected files
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        console.log(`Processing file ${fileIndex + 1}/${files.length}: ${file.name}`);

        try {
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer);

          // Process each sheet as a separate recipe
          for (const sheetName of workbook.SheetNames) {
            try {
              const worksheet = workbook.Sheets[sheetName];
              const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

              // Skip empty sheets
              if (data.length === 0) continue;

              // Extract recipe name (first non-empty cell or sheet name)
              let recipeName = sheetName;
              if (data[0] && data[0][0]) {
                recipeName = String(data[0][0]).trim();
              }

              console.log(`Importing recipe: ${recipeName} from file: ${file.name}`);

          // Look for "Required quantity" or base quantity
          let baseQuantity = 25;
          let baseUnit = 'kg';

          for (let i = 0; i < Math.min(15, data.length); i++) {
            const row = data[i];
            const firstCell = String(row[0] || '').toLowerCase().trim();

            // Check if this row contains the required/base quantity
            if (firstCell.includes('required') || firstCell.includes('quantity') ||
                firstCell.includes('base') || firstCell === 'required kg\'s' ||
                firstCell === 'required kgs') {

              // Try column B (index 1) and column C (index 2) for the value
              for (let colIndex = 1; colIndex <= 2; colIndex++) {
                const cellValue = String(row[colIndex] || '').trim();
                const value = parseFloat(cellValue);

                if (!isNaN(value) && value > 0) {
                  baseQuantity = value;
                  console.log(`Found base quantity: ${baseQuantity} from cell "${cellValue}" at row ${i}, column ${colIndex}`);

                  // Try to detect unit from the next cell or same cell
                  const unitCell = String(row[colIndex + 1] || cellValue).toLowerCase();
                  if (unitCell.includes('liter')) baseUnit = 'liters';
                  else if (unitCell.includes('kg')) baseUnit = 'kg';
                  break;
                }
              }
            }
          }

          console.log(`Final base quantity for ${recipeName}: ${baseQuantity} ${baseUnit}`);

          // Parse rows (skip first few header rows)
          const recipeRows: RecipeRow[] = [];
          let startParsing = false;

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            const firstCell = String(row[0] || '').trim();
            if (!firstCell) continue;

            // Skip header rows until we find content
            if (firstCell.toLowerCase().includes('required') ||
                firstCell.toLowerCase().includes('base') ||
                firstCell === recipeName) {
              startParsing = true;
              continue;
            }

            if (!startParsing) continue;

            // Debug: log the row to see structure
            console.log('Excel row:', { index: i, cells: row });

            // Check if this is an ingredient (has a numeric value in column B, C, or D)
            // Try multiple columns in case Excel structure varies
            let hasValue = false;
            let valueIndex = -1;
            let hardValue = 0;

            // Check columns B (index 1), C (index 2), D (index 3) for numeric values
            for (let colIndex = 1; colIndex <= 3; colIndex++) {
              if (row.length > colIndex) {
                const cellValue = String(row[colIndex]).trim();
                const numValue = parseFloat(cellValue);
                if (!isNaN(numValue) && numValue > 0) {
                  hasValue = true;
                  valueIndex = colIndex;
                  hardValue = numValue;
                  break;
                }
              }
            }

            if (hasValue) {
              // This is an ingredient
              // Unit is in the column after the value, or default to kg
              const unit = valueIndex + 1 < row.length ? String(row[valueIndex + 1] || 'kg').trim().toLowerCase() : 'kg';

              console.log('Found ingredient:', { name: firstCell, hardValue, unit, valueIndex });

              recipeRows.push({
                id: `${Date.now()}-${i}`,
                type: 'ingredient',
                text: firstCell,
                hardValue: hardValue,
                unit: unit === 'grams' || unit === 'gram' ? 'gram' :
                      unit === 'ml' ? 'ml' :
                      unit === 'liters' || unit === 'liter' ? 'liters' :
                      unit === 'pieces' || unit === 'piece' || unit === 'pcs' ? 'pieces' :
                      unit === 'slices' || unit === 'slice' ? 'slices' :
                      unit === 'bunches' || unit === 'bunch' ? 'bunches' : 'kg',
                category: 'vegetable',
              });
            } else {
              // This is an action
              console.log('Found action:', { text: firstCell });
              recipeRows.push({
                id: `${Date.now()}-${i}`,
                type: 'action',
                text: firstCell,
              });
            }
          }

          if (recipeRows.length === 0) {
            errors.push(`Sheet "${sheetName}": No recipe rows found`);
            failedCount++;
            continue;
          }

          // Calculate multipliers and remove hardValue (we only store multiplier)
          const rowsWithMultipliers = recipeRows.map(row => {
            if (row.type === 'ingredient' && row.hardValue !== undefined) {
              const { hardValue, ...rowWithoutHardValue } = row;
              return {
                ...rowWithoutHardValue,
                multiplier: baseQuantity > 0 ? hardValue / baseQuantity : 0
              };
            }
            return row;
          });

          // Insert recipe into database (without dish_id - will link later)
          console.log('Inserting recipe:', { recipeName, baseQuantity, baseUnit });
          const { error } = await supabase
            .from('recipes')
            .insert({
              dish_id: null, // Will be linked later
              name: recipeName,
              base_quantity: baseQuantity,
              base_unit: baseUnit,
              rows: rowsWithMultipliers,
              cooking_loss_percentage: 8,
              final_steps: [],
            });

          if (error) {
            errors.push(`Sheet "${sheetName}": Database error - ${error.message}`);
            failedCount++;
          } else {
            successCount++;
          }
        } catch (sheetError: any) {
          errors.push(`File "${file.name}" - Sheet "${sheetName}": ${sheetError.message}`);
          failedCount++;
        }
      }
        } catch (fileError: any) {
          errors.push(`File "${file.name}": ${fileError.message}`);
          failedCount++;
        }
      }

      setImportResults({ success: successCount, failed: failedCount, errors });
      fetchRecipes();

      if (successCount > 0) {
        setMessage({ type: 'success', text: `Imported ${successCount} recipe(s) successfully!` });
      } else {
        setMessage({ type: 'error', text: 'Import failed. Check results below.' });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      setMessage({ type: 'error', text: `Import failed: ${error.message}` });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-[#86868B]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <UniversalHeader title="Recipe Management" backPath="/dark-kitchen" />

      <main className="max-w-7xl mx-auto px-8 lg:px-12 py-24">
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-sm text-[15px] ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-[28px] font-semibold text-[#1D1D1F]">Recipes</h1>
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
              className="px-6 py-2.5 text-[15px] font-medium bg-[#34C759] text-white hover:bg-[#30B350] rounded-sm transition-colors disabled:opacity-50"
            >
              {importing ? 'Importing...' : '📊 Import Excel Files (Multi)'}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2.5 text-[15px] font-medium bg-[#0071E3] text-white hover:bg-[#0077ED] rounded-sm transition-colors"
            >
              + Add Recipe
            </button>
          </div>
        </div>

        {/* Import Results */}
        {importResults && (
          <div className="mb-6 p-6 bg-white border border-[#D2D2D7] rounded-lg">
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

        {/* Recipes List - Grouped by Category */}
        {recipes.length === 0 ? (
          <div className="bg-white border border-[#D2D2D7] rounded-lg p-12 text-center">
            <p className="text-[#86868B] text-[15px]">
              No recipes yet. Create your first recipe!
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Group recipes by category */}
            {(() => {
              const categoryLabels: Record<string, string> = {
                soup: 'Soups',
                hot_dish_meat: 'Hot Dishes - Meat',
                hot_dish_fish: 'Hot Dishes - Fish',
                hot_dish_veg: 'Hot Dishes - Vegetable',
              };

              const groupedRecipes: Record<string, Recipe[]> = {};
              recipes.forEach(recipe => {
                const category = recipe.dishes?.category || 'uncategorized';
                if (!groupedRecipes[category]) {
                  groupedRecipes[category] = [];
                }
                groupedRecipes[category].push(recipe);
              });

              return Object.entries(groupedRecipes).map(([category, categoryRecipes]) => (
                <div key={category} className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center justify-between bg-[#FAFAFA] border border-[#D2D2D7] rounded-lg px-6 py-4">
                    <h2 className="text-[22px] font-semibold text-[#1D1D1F]">
                      {categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1)}
                    </h2>
                    <button
                      onClick={() => setShowForm(true)}
                      className="px-5 py-2.5 text-[15px] font-medium bg-[#0071E3] text-white rounded-lg hover:bg-[#0077ED] transition-colors"
                    >
                      + Create Recipe
                    </button>
                  </div>

                  {/* Recipes in this category */}
                  <div className="space-y-6">
                    {categoryRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-white border border-[#D2D2D7] rounded-lg overflow-hidden"
              >
                {/* Recipe Header */}
                <div className="bg-[#FAFAFA] px-6 py-4 border-b border-[#E8E8ED] flex items-center justify-between">
                  <div>
                    <h3 className="text-[20px] font-bold text-[#1D1D1F]">
                      {recipe.name}
                    </h3>
                    <p className="text-[13px] text-[#86868B] mt-1">
                      Base Quantity: <span className="font-semibold text-[#1D1D1F]">{recipe.base_quantity} {recipe.base_unit}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(recipe)}
                      className="px-4 py-2 text-[13px] font-medium bg-[#0071E3] text-white rounded hover:bg-[#0077ED] transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(recipe)}
                      className="px-4 py-2 text-[13px] font-medium bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded hover:bg-[#F5F5F7] transition-colors"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleDelete(recipe.id)}
                      className="px-4 py-2 text-[13px] font-medium bg-white border border-[#D2D2D7] text-[#FF3B30] rounded hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Excel-style Recipe Table */}
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
                      {/* Required Quantity (Target) */}
                      <tr className="bg-[#E8F4FF]">
                        <td className="px-4 py-2 border border-[#D2D2D7]">
                          <div className="text-[14px] font-bold text-[#0071E3]">Required</div>
                        </td>
                        <td className="px-4 py-2 border border-[#D2D2D7] text-right">
                          <div className="text-[14px] font-mono font-bold text-[#0071E3]">
                            {recipe.base_quantity.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-4 py-2 border border-[#D2D2D7]">
                          <div className="text-[13px] text-[#6E6E73]">{recipe.base_unit}</div>
                        </td>
                        <td className="px-4 py-2 border border-[#D2D2D7]"></td>
                      </tr>

                      {/* Spacer row */}
                      <tr>
                        <td colSpan={4} className="h-2 border-0"></td>
                      </tr>

                      {recipe.rows?.map((row: any, index: number) => {
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
                          // Ingredient row - calculate from multiplier (which is stored in DB)
                          // multiplier = hardValue / base_quantity (stored as ratio)
                          // Fallback: if old data has hardValue but no multiplier, calculate multiplier
                          const multiplier = row.multiplier !== undefined
                            ? row.multiplier
                            : (row.hardValue !== undefined && recipe.base_quantity > 0
                                ? row.hardValue / recipe.base_quantity
                                : 0);
                          let hardValue = multiplier * recipe.base_quantity;
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
                              hardValue = hardValue * gramsPerBunch; // Convert bunches to grams
                              displayUnit = 'gram';
                            }
                          }

                          console.log('DEBUG Row:', {
                            text: row.text,
                            multiplier,
                            baseQty: recipe.base_quantity,
                            calculatedValue: hardValue,
                            displayUnit,
                            storedMultiplier: row.multiplier,
                            storedHardValue: row.hardValue,
                            rawRow: row
                          });

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
                                <div className="text-[10px] text-[#86868B] mt-0.5">
                                  = {multiplier.toFixed(4)} × {recipe.base_quantity}
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      })}

                      {/* Summary: Gross Weight, Loss, Net Weight */}
                      {(() => {
                        // Helper function to convert units to base unit (kg or liters)
                        const convertToBaseUnit = (value: number, unit: string, baseUnit: string, ingredientName?: string): number => {
                          const unitLower = (unit || 'kg').toLowerCase().trim();

                          // Convert bunches to grams based on ingredient type
                          if (unitLower.includes('bunch')) {
                            const ingredientLower = (ingredientName || '').toLowerCase();
                            let gramsPerBunch = 0;

                            if (ingredientLower.includes('coriander') || ingredientLower.includes('cilantro')) {
                              gramsPerBunch = 80; // 1 bunch of coriander = 80g
                            } else if (ingredientLower.includes('spring onion') || ingredientLower.includes('scallion')) {
                              gramsPerBunch = 100; // 1 bunch of spring onions = 100g
                            } else {
                              console.log('Unknown bunch type, excluding from weight:', ingredientName, value, unit);
                              return 0; // Unknown bunch type
                            }

                            const totalGrams = value * gramsPerBunch;
                            console.log(`Converting ${value} bunches of ${ingredientName} to ${totalGrams}g (${gramsPerBunch}g per bunch)`);

                            // Now convert grams to base unit (kg)
                            if (baseUnit === 'kg') {
                              console.log(`Converting ${totalGrams}g to ${totalGrams / 1000}kg`);
                              return totalGrams / 1000;
                            }
                            return totalGrams;
                          }

                          // Skip other non-weight/volume units (pieces, slices, etc.)
                          if (unitLower.includes('piece') || unitLower.includes('slice')) {
                            console.log('Excluding from weight (non-weight unit):', unit, value);
                            return 0; // Don't include in weight calculation
                          }

                          // If base unit is kg
                          if (baseUnit === 'kg') {
                            // Grams to kg
                            if (unitLower.includes('gram') || unitLower === 'g') {
                              console.log('Converting grams to kg:', value, 'grams =', value / 1000, 'kg');
                              return value / 1000;
                            }
                            // Already in kg
                            if (unitLower === 'kg' || unitLower === 'kilo' || unitLower === 'kilos') {
                              console.log('Already in kg:', value, 'kg');
                              return value;
                            }
                            // Liters to kg (1 liter ≈ 1 kg for cooking purposes)
                            if (unitLower === 'liters' || unitLower === 'liter' || unitLower === 'l') {
                              console.log('Converting liters to kg (1L ≈ 1kg):', value, 'liters ≈', value, 'kg');
                              return value; // 1 liter ≈ 1 kg
                            }
                            // ML to kg (1000 ml = 1 liter ≈ 1 kg)
                            if (unitLower === 'ml' || unitLower === 'milliliter' || unitLower === 'milliliters') {
                              console.log('Converting ml to kg:', value, 'ml =', value / 1000, 'kg');
                              return value / 1000;
                            }
                            // Unknown weight unit - log warning but include value as-is to avoid losing data
                            console.warn('Unknown weight unit, including as kg:', unit, value);
                            return value;
                          }

                          // If base unit is liters
                          if (baseUnit === 'liters') {
                            if (unitLower === 'ml' || unitLower === 'milliliter' || unitLower === 'milliliters') {
                              return value / 1000;
                            }
                            if (unitLower === 'liters' || unitLower === 'liter' || unitLower === 'l') {
                              return value;
                            }
                            console.warn('Unknown volume unit, including as liters:', unit, value);
                            return value;
                          }

                          // For servings or other units, include as-is
                          return value;
                        };

                        // Calculate gross weight (sum of all ingredients, converted to base unit)
                        const grossWeight = (recipe.rows || []).reduce((sum: number, row: any) => {
                          if (row.type === 'ingredient') {
                            const multiplier = row.multiplier !== undefined
                              ? row.multiplier
                              : (row.hardValue !== undefined && recipe.base_quantity > 0
                                  ? row.hardValue / recipe.base_quantity
                                  : 0);
                            const valueInIngredientUnit = multiplier * recipe.base_quantity;
                            const valueInBaseUnit = convertToBaseUnit(valueInIngredientUnit, row.unit || 'kg', recipe.base_unit, row.text);
                            return sum + valueInBaseUnit;
                          }
                          return sum;
                        }, 0);

                        const lossPercentage = recipe.cooking_loss_percentage || 0;
                        const lossWeight = grossWeight * (lossPercentage / 100);
                        const netWeight = grossWeight - lossWeight;

                        return (
                          <>
                            {/* Spacer row */}
                            <tr>
                              <td colSpan={4} className="h-2 border-0"></td>
                            </tr>

                            {/* Gross Weight */}
                            <tr className="bg-[#F5F5F7]">
                              <td className="px-4 py-2 border border-[#D2D2D7]">
                                <div className="text-[14px] font-semibold text-[#1D1D1F]">Gross Weight</div>
                              </td>
                              <td className="px-4 py-2 border border-[#D2D2D7] text-right">
                                <div className="text-[14px] font-mono font-semibold text-[#1D1D1F]">
                                  {grossWeight.toFixed(2)}
                                </div>
                              </td>
                              <td className="px-4 py-2 border border-[#D2D2D7]">
                                <div className="text-[13px] text-[#6E6E73]">{recipe.base_unit}</div>
                              </td>
                              <td className="px-4 py-2 border border-[#D2D2D7]"></td>
                            </tr>

                            {/* Loss */}
                            <tr className="bg-[#FFF5F5]">
                              <td className="px-4 py-2 border border-[#D2D2D7]">
                                <div className="text-[14px] font-semibold text-[#FF3B30]">Loss ({lossPercentage}%)</div>
                              </td>
                              <td className="px-4 py-2 border border-[#D2D2D7] text-right">
                                <div className="text-[14px] font-mono font-semibold text-[#FF3B30]">
                                  -{lossWeight.toFixed(2)}
                                </div>
                              </td>
                              <td className="px-4 py-2 border border-[#D2D2D7]">
                                <div className="text-[13px] text-[#6E6E73]">{recipe.base_unit}</div>
                              </td>
                              <td className="px-4 py-2 border border-[#D2D2D7]"></td>
                            </tr>

                            {/* Net Weight */}
                            <tr className="bg-[#E8F5E9]">
                              <td className="px-4 py-2 border border-[#D2D2D7]">
                                <div className="text-[14px] font-bold text-[#34C759]">Net Weight</div>
                              </td>
                              <td className="px-4 py-2 border border-[#D2D2D7] text-right">
                                <div className="text-[14px] font-mono font-bold text-[#34C759]">
                                  {netWeight.toFixed(2)}
                                </div>
                              </td>
                              <td className="px-4 py-2 border border-[#D2D2D7]">
                                <div className="text-[13px] text-[#6E6E73]">{recipe.base_unit}</div>
                              </td>
                              <td className="px-4 py-2 border border-[#D2D2D7]"></td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </main>

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeForm}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#FAFAFA] px-6 py-4 border-b border-[#E8E8ED] rounded-t-2xl sticky top-0 z-10">
              <h3 className="text-[22px] font-semibold text-[#1D1D1F]">
                {editingRecipe ? 'Edit Recipe' : 'Create New Recipe'}
              </h3>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Dish Selection & Base Quantity */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                    Dish *
                  </label>
                  <select
                    value={formData.dish_id}
                    onChange={(e) => setFormData({ ...formData, dish_id: e.target.value })}
                    className="w-full px-4 py-2 border border-[#D2D2D7] rounded text-[15px] focus:outline-none focus:border-[#0071E3]"
                    required
                  >
                    <option value="">Select a dish...</option>
                    {dishes.map((dish) => (
                      <option key={dish.id} value={dish.id}>
                        {dish.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                    Base Quantity *
                  </label>
                  <input
                    type="number"
                    value={formData.base_quantity}
                    onChange={(e) => setFormData({ ...formData, base_quantity: Number(e.target.value) })}
                    step="0.1"
                    className="w-full px-4 py-2 border border-[#D2D2D7] rounded text-[15px] focus:outline-none focus:border-[#0071E3] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                    Unit *
                  </label>
                  <select
                    value={formData.base_unit}
                    onChange={(e) => setFormData({ ...formData, base_unit: e.target.value })}
                    className="w-full px-4 py-2 border border-[#D2D2D7] rounded text-[15px] focus:outline-none focus:border-[#0071E3]"
                  >
                    <option value="kg">kg</option>
                    <option value="liters">liters</option>
                    <option value="servings">servings</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                    Loss (%)
                  </label>
                  <input
                    type="number"
                    value={formData.cooking_loss_percentage}
                    onChange={(e) => setFormData({ ...formData, cooking_loss_percentage: Number(e.target.value) })}
                    step="0.1"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-[#D2D2D7] rounded text-[15px] focus:outline-none focus:border-[#0071E3] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Excel-like Rows */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-[13px] font-medium text-[#86868B]">
                    Recipe Rows (Actions & Ingredients) *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addActionRow}
                      className="text-[#0071E3] hover:text-[#0077ED] text-[13px] font-medium px-3 py-1 border border-[#0071E3] rounded"
                    >
                      + Action
                    </button>
                    <button
                      type="button"
                      onClick={addIngredientRow}
                      className="text-[#0071E3] hover:text-[#0077ED] text-[13px] font-medium px-3 py-1 border border-[#0071E3] rounded"
                    >
                      + Ingredient
                    </button>
                  </div>
                </div>

                <div className="border border-[#D2D2D7] rounded overflow-hidden">
                  {rows.length === 0 ? (
                    <p className="text-[#86868B] text-[13px] text-center py-8">
                      No rows added yet. Add actions and ingredients.
                    </p>
                  ) : (
                    <table className="w-full">
                      <tbody>
                        {rows.map((row, index) => (
                          <>
                            <tr key={row.id} className="border-b border-[#D2D2D7] hover:bg-[#FAFAFA]">
                              {/* Move buttons */}
                              <td className="w-20 px-2 py-2">
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => moveRowUp(index)}
                                    disabled={index === 0}
                                    className="text-[#86868B] hover:text-[#1D1D1F] disabled:opacity-30"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveRowDown(index)}
                                    disabled={index === rows.length - 1}
                                    className="text-[#86868B] hover:text-[#1D1D1F] disabled:opacity-30"
                                  >
                                    ↓
                                  </button>
                                </div>
                              </td>

                              {/* Content */}
                              {row.type === 'action' ? (
                                <>
                                  <td colSpan={4} className="px-3 py-2">
                                    <input
                                      type="text"
                                      value={row.text}
                                      onChange={(e) => updateRow(row.id, 'text', e.target.value)}
                                      placeholder="Action (e.g., Roast on 200C until brown & soft)"
                                      className="w-full px-3 py-2 border border-[#D2D2D7] rounded text-[15px] font-bold focus:outline-none focus:border-[#0071E3]"
                                    />
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-2" colSpan={2}>
                                    <input
                                      type="text"
                                      value={row.text}
                                      onChange={(e) => updateRow(row.id, 'text', e.target.value)}
                                      placeholder="Ingredient name"
                                      className="w-full px-3 py-2 border border-[#D2D2D7] rounded text-[15px] focus:outline-none focus:border-[#0071E3]"
                                    />
                                  </td>
                                  <td className="px-3 py-2 w-32">
                                    <input
                                      type="number"
                                      value={row.hardValue || ''}
                                      onChange={(e) => updateRow(row.id, 'hardValue', Number(e.target.value))}
                                      placeholder="0"
                                      step="0.01"
                                      className="w-full px-3 py-2 border border-[#D2D2D7] rounded text-[15px] text-right focus:outline-none focus:border-[#0071E3] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                  </td>
                                  <td className="px-3 py-2 w-24">
                                    <select
                                      value={row.unit}
                                      onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                                      className="w-full px-2 py-2 border border-[#D2D2D7] rounded text-[14px] focus:outline-none focus:border-[#0071E3]"
                                    >
                                      <option value="kg">kg</option>
                                      <option value="gram">gram</option>
                                      <option value="liters">liters</option>
                                      <option value="ml">ml</option>
                                      <option value="pieces">pieces</option>
                                      <option value="slices">slices</option>
                                      <option value="bunches">bunches</option>
                                    </select>
                                  </td>
                                </>
                              )}

                              {/* Delete button */}
                              <td className="w-12 px-2 py-2">
                                <button
                                  type="button"
                                  onClick={() => removeRow(row.id)}
                                  className="text-red-500 hover:text-red-600 font-medium"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>

                            {/* Insert buttons between rows */}
                            <tr key={`insert-${index}`} className="h-8 bg-[#F5F5F7] hover:bg-[#E8E8ED]">
                              <td colSpan={6} className="text-center py-1">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => insertActionAt(index + 1)}
                                    className="text-[11px] text-[#0071E3] hover:text-[#0077ED] font-medium px-2 py-0.5"
                                  >
                                    + Action
                                  </button>
                                  <span className="text-[#D2D2D7]">|</span>
                                  <button
                                    type="button"
                                    onClick={() => insertIngredientAt(index + 1)}
                                    className="text-[11px] text-[#0071E3] hover:text-[#0077ED] font-medium px-2 py-0.5"
                                  >
                                    + Ingredient
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Final Steps */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-[13px] font-medium text-[#86868B]">
                    Final Steps
                  </label>
                  <button
                    type="button"
                    onClick={addFinalStep}
                    className="text-[#0071E3] hover:text-[#0077ED] text-[13px] font-medium"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="space-y-2">
                  {finalSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => updateFinalStep(index, e.target.value)}
                        placeholder="Enter final step..."
                        className="flex-1 px-3 py-2 border border-[#D2D2D7] rounded text-[14px] focus:outline-none focus:border-[#0071E3]"
                      />
                      <button
                        type="button"
                        onClick={() => removeFinalStep(index)}
                        className="text-red-500 hover:text-red-600 text-[13px] font-medium"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[#E8E8ED]">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 px-4 py-3 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded hover:bg-[#F5F5F7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded transition-colors"
                >
                  {editingRecipe ? 'Update Recipe' : 'Create Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
