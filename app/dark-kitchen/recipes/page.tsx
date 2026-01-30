'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import UniversalHeader from '@/components/UniversalHeader';

interface RecipeIngredient {
  id: string;
  name: string;
  multiplier: number; // hidden from UI, calculated behind the scenes
  unit: string;
  category: 'vegetable' | 'meat' | 'fish' | 'dairy' | 'dry_store';
  instruction?: string;
}

interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  cooking_loss_percentage: number;
  final_steps: string[];
}

export default function RecipesPage() {
  const supabase = createClient();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [requiredKg, setRequiredKg] = useState(25);
  const [editedIngredients, setEditedIngredients] = useState<RecipeIngredient[]>([]);
  const [editedCookingLoss, setEditedCookingLoss] = useState(8);
  const [editedRecipeName, setEditedRecipeName] = useState('');
  const [editedFinalSteps, setEditedFinalSteps] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    // TODO: Fetch from database
    const exampleRecipe: Recipe = {
      id: '1',
      name: 'Creamy Cauliflower Soup',
      cooking_loss_percentage: 8,
      final_steps: [
        'Puree with stick blender',
        'Balance with pepper, salt & lemon juice'
      ],
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
    setEditedRecipeName(exampleRecipe.name);
    setEditedFinalSteps(exampleRecipe.final_steps);
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

  // Format weight with smart unit conversion (grams if < 0.5 kg)
  const formatWeight = (weight: number, unit: string) => {
    // Convert unit abbreviations
    let displayUnit = unit;
    if (unit === 'grams') displayUnit = 'gr';
    else if (unit === 'kg') displayUnit = 'kg';
    else if (unit === 'liters') displayUnit = 'ltr';
    else if (unit === 'ml') displayUnit = 'ml';

    // Convert kg to grams if less than 0.5 kg
    if (unit === 'kg' && weight < 0.5) {
      return `${(weight * 1000).toFixed(0)} gr`;
    }
    return `${weight.toFixed(2)} ${displayUnit}`;
  };

  // Update ingredient multiplier via percentage (e.g., 28.4 for 28.4%)
  const updateIngredientPercentage = (ingredientId: string, percentage: number) => {
    setEditedIngredients(prev =>
      prev.map(ing =>
        ing.id === ingredientId
          ? { ...ing, multiplier: percentage / 100 }
          : ing
      )
    );
  };

  const updateIngredientName = (ingredientId: string, newName: string) => {
    setEditedIngredients(prev =>
      prev.map(ing =>
        ing.id === ingredientId ? { ...ing, name: newName } : ing
      )
    );
  };

  const updateIngredientInstruction = (ingredientId: string, newInstruction: string) => {
    setEditedIngredients(prev =>
      prev.map(ing =>
        ing.id === ingredientId
          ? { ...ing, instruction: newInstruction || undefined }
          : ing
      )
    );
  };

  const updateFinalStep = (index: number, newStep: string) => {
    setEditedFinalSteps(prev =>
      prev.map((step, i) => i === index ? newStep : step)
    );
  };

  const addFinalStep = () => {
    setEditedFinalSteps(prev => [...prev, '']);
  };

  const removeFinalStep = (index: number) => {
    setEditedFinalSteps(prev => prev.filter((_, i) => i !== index));
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
      <div className="min-h-screen bg-[#F5F5F7]">
        <UniversalHeader title="Recipes" backPath="/dark-kitchen" />
        <div className="max-w-6xl mx-auto px-8 py-12">
          <p className="text-[#86868B]">Loading recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <UniversalHeader title="Recipes" backPath="/dark-kitchen" />

      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Recipe Calculator */}
          <div className="lg:col-span-2">
            {/* Floating Edit Button */}
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-5 py-2 text-[14px] font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-sm transition-colors"
              >
                {isEditing ? 'Done' : 'Edit'}
              </button>
            </div>

            <div className="bg-white border border-[#D2D2D7] rounded-lg shadow-sm overflow-hidden">
              {/* Recipe Header with Required Quantity */}
              <div className="bg-[#D97706] px-4 py-3 border-b border-[#E8E8ED] flex items-center justify-between gap-4">
                <input
                  type="text"
                  value={editedRecipeName}
                  onChange={(e) => setEditedRecipeName(e.target.value)}
                  className="flex-1 bg-transparent text-[22px] font-semibold text-white placeholder-white/60 focus:outline-none"
                  placeholder="Recipe Name"
                />
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[15px] font-medium text-white">Required Quantity</span>
                  <input
                    type="number"
                    value={requiredKg}
                    onChange={(e) => setRequiredKg(Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-white/30 bg-white rounded-lg text-[14px] font-semibold text-[#1D1D1F] text-right focus:outline-none focus:border-white/50 focus:bg-white transition-all placeholder-[#86868B] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    min="1"
                    step="0.1"
                  />
                  <span className="text-[14px] text-white/90">kg</span>
                </div>
              </div>

              {/* Ingredients Table */}
              <div className="overflow-x-auto pt-4">
                <table className="w-full">
                  {isEditing && (
                    <thead>
                      <tr className="border-b border-[#D2D2D7]">
                        <th className="px-4 py-2 text-left text-[13px] font-medium text-[#86868B] border-l border-[#D2D2D7]">Ingredient</th>
                        <th className="px-4 py-2 text-right text-[13px] font-medium text-[#86868B] w-24 border-l border-[#D2D2D7]">%</th>
                        <th className="px-4 py-2 text-right text-[13px] font-medium text-[#86868B] w-28 border-l border-r border-[#D2D2D7]">Calculated</th>
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {editedIngredients.map((ingredient) => {
                      const calculatedWeight = ingredient.multiplier * requiredKg;
                      const percentage = ingredient.multiplier * 100;
                      const showInstruction = ingredient.instruction;

                      return (
                        <>
                          {/* Cooking Instruction Row - Editable */}
                          {showInstruction && (
                            <tr key={`instruction-${ingredient.id}`} className="border-t border-[#D2D2D7]">
                              <td colSpan={isEditing ? 3 : 2} className="px-4 py-2 bg-[#ECECF1] border-l border-r border-[#D2D2D7]">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={ingredient.instruction}
                                    onChange={(e) => updateIngredientInstruction(ingredient.id, e.target.value)}
                                    className="w-full bg-transparent text-[17px] font-bold text-[#1D1D1F] placeholder-[#86868B] focus:outline-none"
                                    placeholder="Cooking instruction..."
                                  />
                                ) : (
                                  <div className="text-[17px] font-bold text-[#1D1D1F]">
                                    {ingredient.instruction}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                          {/* Ingredient Row */}
                          <tr key={ingredient.id} className="border-t border-[#D2D2D7] hover:bg-[#FAFAFA] transition-colors">
                            <td className="px-4 py-1.5 border-l border-[#D2D2D7]">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={ingredient.name}
                                  onChange={(e) => updateIngredientName(ingredient.id, e.target.value)}
                                  className="w-full bg-transparent text-[15px] text-[#86868B] placeholder-[#B3B3B3] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 rounded px-1 py-0.5 -mx-1"
                                  placeholder="Ingredient name..."
                                />
                              ) : (
                                <div className="text-[15px] text-[#86868B]">{ingredient.name}</div>
                              )}
                            </td>
                            {isEditing ? (
                              <>
                                <td className="px-4 py-1.5 text-right w-24 border-l border-[#D2D2D7]">
                                  <input
                                    type="number"
                                    value={percentage.toFixed(2)}
                                    onChange={(e) => updateIngredientPercentage(ingredient.id, Number(e.target.value))}
                                    className="w-20 px-2 py-0.5 text-[14px] font-semibold text-[#1D1D1F] text-right border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                                    step="0.01"
                                  />
                                </td>
                                <td className="px-4 py-1.5 text-right w-28 border-l border-r border-[#D2D2D7]">
                                  <span className="text-[15px] font-semibold text-[#1D1D1F]">
                                    {formatWeight(calculatedWeight, ingredient.unit)}
                                  </span>
                                </td>
                              </>
                            ) : (
                              <td className="px-4 py-1.5 text-right border-r border-[#D2D2D7]" colSpan={2}>
                                <div className="text-[15px] font-semibold text-[#1D1D1F]">
                                  {formatWeight(calculatedWeight, ingredient.unit)}
                                </div>
                              </td>
                            )}
                          </tr>
                        </>
                      );
                    })}

                    {/* Final Steps */}
                    <tr className="bg-[#FAFAFA] border-t-2 border-[#D2D2D7]">
                      <td colSpan={isEditing ? 3 : 2} className="px-4 py-2 border-l border-r border-[#D2D2D7]">
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className="text-[15px] font-semibold text-[#1D1D1F]">Final Steps</h3>
                          {isEditing && (
                            <button
                              onClick={addFinalStep}
                              className="text-[#D97706] hover:text-[#B45309] text-[13px] font-medium"
                            >
                              + Add Step
                            </button>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="space-y-2">
                            {editedFinalSteps.map((step, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="text-[14px] text-[#6E6E73]">•</span>
                                <input
                                  type="text"
                                  value={step}
                                  onChange={(e) => updateFinalStep(index, e.target.value)}
                                  className="flex-1 bg-transparent text-[14px] text-[#1D1D1F] placeholder-[#86868B] border border-[#D2D2D7] rounded px-2 py-1 focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                                  placeholder="Enter step..."
                                />
                                <button
                                  onClick={() => removeFinalStep(index)}
                                  className="text-red-500 hover:text-red-600 text-[13px] font-medium"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <ul className="space-y-0.5 text-[14px] text-[#6E6E73]">
                            {editedFinalSteps.map((step, index) => (
                              <li key={index}>• {step}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>

                    {/* Summary Rows */}
                    <tr className="bg-[#F5F5F7] border-t border-[#D2D2D7]">
                      <td className="px-4 py-1.5 text-[15px] font-medium text-[#1D1D1F] border-l border-[#D2D2D7]">Gross Weight</td>
                      <td className="px-4 py-1.5 text-right text-[15px] font-semibold text-[#1D1D1F] border-r border-[#D2D2D7]">
                        {formatWeight(grossWeight, 'kg')}
                      </td>
                    </tr>
                    <tr className="bg-[#F5F5F7] border-t border-[#D2D2D7]">
                      <td className="px-4 py-1.5 text-[15px] font-medium text-[#1D1D1F] border-l border-[#D2D2D7]">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <span>Cooking Loss</span>
                            <input
                              type="number"
                              value={editedCookingLoss}
                              onChange={(e) => setEditedCookingLoss(Number(e.target.value))}
                              className="w-12 px-1.5 py-0.5 text-[14px] border border-[#D2D2D7] rounded-lg text-right focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                              step="0.1"
                            />
                            <span className="text-[14px] text-[#86868B]">%</span>
                          </div>
                        ) : (
                          <span>Cooking Loss ({editedCookingLoss}%)</span>
                        )}
                      </td>
                      <td className="px-4 py-1.5 text-right text-[15px] font-semibold text-[#1D1D1F] border-r border-[#D2D2D7]">
                        {formatWeight(grossWeight * editedCookingLoss / 100, 'kg')}
                      </td>
                    </tr>

                    <tr className="bg-[#D97706] text-white border-t border-[#D2D2D7]">
                      <td className="px-4 py-2 text-[17px] font-semibold border-l border-[#D2D2D7]">Net Weight</td>
                      <td className="px-4 py-2 text-right text-[17px] font-bold border-r border-[#D2D2D7]">
                        {formatWeight(netWeight, 'kg')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Ingredient Aggregator */}
          <div className="lg:col-span-1 mt-[54px]">
            <div className="bg-white border border-[#D2D2D7] rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#4A7DB5] px-4 py-4">
                <h2 className="text-[16px] font-semibold text-white">Shopping List</h2>
              </div>

              <div className="p-3 space-y-4">
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
                      <h3 className="text-[12px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">
                        {categoryNames[category as keyof typeof categoryNames]}
                      </h3>
                      <ul className="space-y-1">
                        {items
                          .sort((a, b) => b.weight - a.weight)
                          .map((item, idx) => (
                            <li key={idx} className="flex justify-between items-baseline gap-2">
                              <span className="text-[14px] text-[#1D1D1F] leading-tight">{item.name}</span>
                              <span className="text-[14px] font-semibold text-[#D97706] whitespace-nowrap">
                                {formatWeight(item.weight, item.unit)}
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
