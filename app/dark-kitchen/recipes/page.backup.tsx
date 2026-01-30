'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import UniversalHeader from '@/components/UniversalHeader';

interface RecipeIngredient {
  id: string;
  name: string;
  multiplier: number; // e.g., 0.284 for cauliflower
  unit: string;
  category: 'vegetable' | 'meat' | 'fish' | 'dairy' | 'dry_store';
  instruction?: string; // e.g., "Roast on 200C until Cauliflower is brown & soft"
}

interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  cooking_loss_percentage: number; // e.g., 8 for 8%
  instructions?: string[];
}

export default function RecipesPage() {
  const supabase = createClient();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [requiredKg, setRequiredKg] = useState(25);
  const [editMode, setEditMode] = useState(false);
  const [editedIngredients, setEditedIngredients] = useState<RecipeIngredient[]>([]);
  const [editedCookingLoss, setEditedCookingLoss] = useState(8);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    // TODO: Fetch from database
    // For now, using the Creamy Cauliflower Soup as an example
    const exampleRecipe: Recipe = {
      id: '1',
      name: 'Creamy Cauliflower Soup',
      cooking_loss_percentage: 8,
      ingredients: [
        {
          id: '1',
          name: 'Cauliflower rosets',
          multiplier: 0.284,
          unit: 'kg',
          category: 'vegetable',
          instruction: 'Roast on 200C until Cauliflower is brown & soft'
        },
        {
          id: '2',
          name: 'Onion dice',
          multiplier: 0.17,
          unit: 'kg',
          category: 'vegetable',
          instruction: 'Slowly braise in oil for 15 minutes'
        },
        {
          id: '3',
          name: 'Dried Thyme',
          multiplier: 0.0008,
          unit: 'kg',
          category: 'dry_store'
        },
        {
          id: '4',
          name: 'Potato',
          multiplier: 0.14,
          unit: 'kg',
          category: 'vegetable',
          instruction: 'Add & cook until potatoes & pumpkin are completely soft'
        },
        {
          id: '5',
          name: 'Garlic (roasted in alu foil for 45 minutes on 180C)',
          multiplier: 0.012,
          unit: 'kg',
          category: 'vegetable'
        },
        {
          id: '6',
          name: 'Veggie Cream',
          multiplier: 0.168,
          unit: 'kg',
          category: 'dairy'
        },
        {
          id: '7',
          name: 'Vegetable Stock',
          multiplier: 0.38,
          unit: 'liters',
          category: 'dry_store'
        },
        {
          id: '8',
          name: 'Roasted Cauliflower',
          multiplier: 0.2,
          unit: 'kg',
          category: 'vegetable'
        },
        {
          id: '9',
          name: 'Salt n pepper',
          multiplier: 0.004,
          unit: 'kg',
          category: 'dry_store'
        },
        {
          id: '10',
          name: 'Parsley',
          multiplier: 0.003,
          unit: 'kg',
          category: 'vegetable',
          instruction: 'Add & blend until super smooth'
        }
      ]
    };

    setRecipes([exampleRecipe]);
    setSelectedRecipe(exampleRecipe);
    setEditedIngredients(exampleRecipe.ingredients);
    setEditedCookingLoss(exampleRecipe.cooking_loss_percentage);
  };

  const calculateGrossWeight = (ingredients: RecipeIngredient[], required: number) => {
    return ingredients.reduce((sum, ing) => {
      const weight = ing.multiplier * required;
      return sum + weight;
    }, 0);
  };

  const calculateNetWeight = (grossWeight: number, lossPercentage: number) => {
    return grossWeight * (1 - lossPercentage / 100);
  };

  const updateMultiplier = (ingredientId: string, newMultiplier: number) => {
    setEditedIngredients(prev =>
      prev.map(ing =>
        ing.id === ingredientId ? { ...ing, multiplier: newMultiplier } : ing
      )
    );
  };

  const getIngredientsByCategory = (ingredients: RecipeIngredient[], required: number) => {
    const categories = {
      vegetable: [] as { name: string; weight: number; unit: string }[],
      meat: [] as { name: string; weight: number; unit: string }[],
      fish: [] as { name: string; weight: number; unit: string }[],
      dairy: [] as { name: string; weight: number; unit: string }[],
      dry_store: [] as { name: string; weight: number; unit: string }[]
    };

    ingredients.forEach(ing => {
      const weight = ing.multiplier * required;
      categories[ing.category].push({
        name: ing.name,
        weight,
        unit: ing.unit
      });
    });

    return categories;
  };

  const grossWeight = calculateGrossWeight(editedIngredients, requiredKg);
  const netWeight = calculateNetWeight(grossWeight, editedCookingLoss);
  const categorizedIngredients = getIngredientsByCategory(editedIngredients, requiredKg);

  if (!selectedRecipe) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UniversalHeader title="Recipes" backPath="/dark-kitchen" />
        <div className="max-w-7xl mx-auto px-8 py-24">
          <p className="text-slate-600">Loading recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UniversalHeader title="Recipes" backPath="/dark-kitchen" />

      <main className="max-w-7xl mx-auto px-8 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recipe Calculator */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-300 rounded-sm shadow-sm overflow-hidden">
              {/* Recipe Header */}
              <div className="bg-[#4A7DB5] px-6 py-4">
                <h1 className="text-[22px] font-bold text-white">{selectedRecipe.name}</h1>
              </div>

              {/* Required Weight Input */}
              <div className="p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-4">
                  <label className="text-[15px] font-semibold text-slate-700 min-w-[150px]">
                    Required kilo's
                  </label>
                  <input
                    type="number"
                    value={requiredKg}
                    onChange={(e) => setRequiredKg(Number(e.target.value))}
                    className="w-32 px-4 py-2 border-2 border-[#4A7DB5] rounded-sm text-[17px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    min="1"
                    step="0.1"
                  />
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className={`ml-auto px-4 py-2 text-[13px] font-medium rounded-sm transition-colors ${
                      editMode
                        ? 'bg-[#34C759] text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {editMode ? '✓ Editing' : 'Edit Multipliers'}
                  </button>
                </div>
              </div>

              {/* Ingredients Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <tbody>
                    {editedIngredients.map((ingredient, index) => {
                      const calculatedWeight = ingredient.multiplier * requiredKg;
                      const showInstruction = ingredient.instruction;

                      return (
                        <>
                          {/* Cooking Instruction Row (Bold Header) */}
                          {showInstruction && (
                            <tr key={`instruction-${ingredient.id}`} className="border-t border-slate-200">
                              <td colSpan={3} className="px-6 py-3 bg-slate-100">
                                <div className="text-[15px] font-bold text-slate-900">
                                  {ingredient.instruction}
                                </div>
                              </td>
                            </tr>
                          )}
                          {/* Ingredient Row */}
                          <tr key={ingredient.id} className="hover:bg-slate-50">
                            <td className="px-6 py-3 text-[15px] text-slate-900">
                              {ingredient.name}
                            </td>
                            <td className="px-6 py-3 text-right">
                              {editMode ? (
                                <input
                                  type="number"
                                  value={ingredient.multiplier}
                                  onChange={(e) => updateMultiplier(ingredient.id, Number(e.target.value))}
                                  className="w-24 px-2 py-1 text-[13px] border border-slate-300 rounded text-right"
                                  step="0.001"
                                />
                              ) : (
                                <span className="text-[13px] text-slate-500">
                                  {ingredient.multiplier.toFixed(3)}×
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-right text-[15px] font-semibold text-slate-900">
                              {calculatedWeight.toFixed(2)} {ingredient.unit}
                            </td>
                          </tr>
                        </>
                      );
                    })}

                    {/* Summary Rows */}
                    <tr className="bg-slate-100 font-semibold">
                      <td className="px-6 py-4 text-[15px]">Gross Weight</td>
                      <td></td>
                      <td className="px-6 py-4 text-right text-[15px]">
                        {grossWeight.toFixed(2)} kg
                      </td>
                    </tr>
                    <tr className="bg-slate-100">
                      <td className="px-6 py-4 text-[15px]">Cooking Loss</td>
                      <td className="px-6 py-4 text-right">
                        {editMode ? (
                          <input
                            type="number"
                            value={editedCookingLoss}
                            onChange={(e) => setEditedCookingLoss(Number(e.target.value))}
                            className="w-20 px-2 py-1 text-[13px] border border-slate-300 rounded text-right"
                            step="0.1"
                          />
                        ) : (
                          <span className="text-[13px] text-slate-600">{editedCookingLoss}%</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-[15px]">
                        {(grossWeight * editedCookingLoss / 100).toFixed(2)} kg
                      </td>
                    </tr>
                    <tr className="bg-[#4A7DB5] text-white font-bold">
                      <td className="px-6 py-4 text-[17px]">Net Weight</td>
                      <td></td>
                      <td className="px-6 py-4 text-right text-[17px]">
                        {netWeight.toFixed(2)} kg
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Instructions */}
              <div className="p-6 bg-slate-50 border-t border-slate-200">
                <h3 className="text-[15px] font-bold text-slate-900 mb-2">Final Steps:</h3>
                <ul className="space-y-1 text-[15px] text-slate-700">
                  <li>• Puree with stick blender</li>
                  <li>• Balance with pepper, salt & lemon juice</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Ingredient Aggregator */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-300 rounded-sm shadow-sm overflow-hidden sticky top-24">
              <div className="bg-slate-700 px-6 py-4">
                <h2 className="text-[17px] font-bold text-white">Ingredient Summary</h2>
              </div>

              <div className="p-6 space-y-6">
                {Object.entries(categorizedIngredients).map(([category, items]) => {
                  if (items.length === 0) return null;

                  const categoryNames = {
                    vegetable: 'Vegetables',
                    meat: 'Meat',
                    fish: 'Fish',
                    dairy: 'Dairy',
                    dry_store: 'Dry Store'
                  };

                  return (
                    <div key={category}>
                      <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                        {categoryNames[category as keyof typeof categoryNames]}
                      </h3>
                      <ul className="space-y-1.5">
                        {items
                          .sort((a, b) => b.weight - a.weight)
                          .map((item, idx) => (
                            <li key={idx} className="flex justify-between text-[15px]">
                              <span className="text-slate-700">{item.name}</span>
                              <span className="font-semibold text-slate-900">
                                {item.weight.toFixed(2)} {item.unit}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
