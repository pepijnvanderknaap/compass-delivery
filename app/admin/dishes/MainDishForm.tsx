'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Dish, DishWithComponents, DishSubcategory } from '@/lib/types';
import QuickComponentForm from './QuickComponentForm';

interface MainDishFormProps {
  dish: DishWithComponents | null;
  onClose: () => void;
  onSave: () => void;
}

export default function MainDishForm({ dish, onClose, onSave }: MainDishFormProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'soup' as 'soup' | 'hot_dish_meat' | 'hot_dish_fish' | 'hot_dish_veg' | 'component' | 'off_menu',
    subcategory: null as DishSubcategory | null,
    portion_size: '150', // Default to 150ml for soups
    portion_unit: 'milliliters' as 'pieces' | 'grams' | 'kilograms' | 'milliliters' | 'liters' | 'trays',
    allergen_gluten: false,
    allergen_soy: false,
    allergen_lactose: false,
    allergen_sesame: false,
    allergen_sulphites: false,
    allergen_egg: false,
    allergen_mustard: false,
    allergen_celery: false,
  });

  const [selectedComponents, setSelectedComponents] = useState<{
    topping: string[];
    carb: string[];
    warm_veggie: string[];
    salad: string[];
    condiment: string[];
  }>({
    topping: [],
    carb: [],
    warm_veggie: [],
    salad: [],
    condiment: [],
  });

  const [availableComponents, setAvailableComponents] = useState<Dish[]>([]);
  const [componentSearchTerms, setComponentSearchTerms] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [quickFormType, setQuickFormType] = useState<'component' | 'carb' | 'warm_veggie' | 'salad' | 'condiment' | null>(null);

  useEffect(() => {
    fetchComponents();
    if (dish) {
      setFormData({
        name: dish.name,
        description: dish.description || '',
        category: dish.category,
        subcategory: dish.subcategory || null,
        portion_size: dish.portion_size ? String(dish.portion_size) : '',
        portion_unit: (dish.portion_unit || 'milliliters') as any,
        allergen_gluten: dish.allergen_gluten || false,
        allergen_soy: dish.allergen_soy || false,
        allergen_lactose: dish.allergen_lactose || false,
        allergen_sesame: dish.allergen_sesame || false,
        allergen_sulphites: dish.allergen_sulphites || false,
        allergen_egg: dish.allergen_egg || false,
        allergen_mustard: dish.allergen_mustard || false,
        allergen_celery: dish.allergen_celery || false,
      });

      // Set selected components
      if (dish.components) {
        setSelectedComponents({
          topping: dish.components.topping?.map(c => c.id) || [],
          carb: dish.components.carb?.map(c => c.id) || [],
          warm_veggie: dish.components.warm_veggie?.map(c => c.id) || [],
          salad: dish.components.salad?.map(c => c.id) || [],
          condiment: dish.components.condiment?.map(c => c.id) || [],
        });
      }
    }
  }, [dish]);

  const fetchComponents = async () => {
    const { data } = await supabase
      .from('dishes')
      .select('*')
      .not('subcategory', 'is', null)
      .order('name');

    if (data) setAvailableComponents(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      let dishId = dish?.id;

      // Prepare data with converted types
      const dataToSave = {
        ...formData,
        portion_size: formData.portion_size ? parseFloat(formData.portion_size) : null,
      };

      if (dish) {
        // Update existing dish
        const { error } = await supabase
          .from('dishes')
          .update(dataToSave)
          .eq('id', dish.id);
        if (error) throw error;
      } else {
        // Create new dish
        const { data: newDish, error } = await supabase
          .from('dishes')
          .insert([{ ...dataToSave, is_active: true }])
          .select()
          .single();
        if (error) throw error;
        dishId = newDish.id;
      }

      // Update components
      if (dishId) {
        // Delete existing components
        await supabase
          .from('dish_components')
          .delete()
          .eq('main_dish_id', dishId);

        // Insert new components
        const componentsToInsert: any[] = [];
        Object.entries(selectedComponents).forEach(([type, ids]) => {
          ids.forEach(id => {
            componentsToInsert.push({
              main_dish_id: dishId,
              component_dish_id: id,
              component_type: type,
            });
          });
        });

        if (componentsToInsert.length > 0) {
          const { error } = await supabase
            .from('dish_components')
            .insert(componentsToInsert);
          if (error) throw error;
        }
      }

      setMessage({ type: 'success', text: dish ? 'Dish updated!' : 'Dish created!' });
      setTimeout(() => {
        onSave();
        onClose();
      }, 1000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const getComponentsByType = (type: DishSubcategory) => {
    let filtered = availableComponents.filter(c => c.subcategory === type);
    const searchTerm = componentSearchTerms[type] || '';
    if (searchTerm) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return filtered.slice(0, 10);
  };

  const getVisibleSubcategories = () => {
    if (formData.category === 'soup') {
      return [{ key: 'topping' as DishSubcategory, label: 'Soup Toppings' }];
    }
    // For all hot dishes (meat, fish, veg)
    return [
      { key: 'carb' as DishSubcategory, label: 'Carbs' },
      { key: 'warm_veggie' as DishSubcategory, label: 'Warm Veggies' },
      { key: 'salad' as DishSubcategory, label: 'Salads' },
      { key: 'condiment' as DishSubcategory, label: 'Hot Dish Add-ons' },
    ];
  };

  const toggleComponent = (type: DishSubcategory, id: string) => {
    setSelectedComponents(prev => ({
      ...prev,
      [type]: prev[type].includes(id)
        ? prev[type].filter(cid => cid !== id)
        : [...prev[type], id]
    }));
  };

  const handleQuickComponentCreated = async (newComponent: { id: string; name: string }) => {
    // Refresh components list to include the new one
    await fetchComponents();

    // Auto-select the new component in the appropriate category
    if (quickFormType) {
      const categoryKey = quickFormType === 'component' ? 'topping' : quickFormType;
      setSelectedComponents(prev => ({
        ...prev,
        [categoryKey]: [...prev[categoryKey], newComponent.id]
      }));
    }

    // Close the quick form
    setQuickFormType(null);
  };


  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-apple">
      <div className="flex gap-0 max-h-[90vh]">
        {/* Main Form */}
        <div className="bg-white rounded-2xl shadow-apple-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <h2 className="text-apple-title-lg text-apple-gray1 mb-8">
            {dish ? 'Edit Main Dish' : 'Create Main Dish'}
          </h2>

          {message && (
            <div className={`mb-6 px-4 py-3 rounded-xl text-apple-subheadline ${message.type === 'success' ? 'bg-apple-green/10 text-apple-green border border-apple-green/20' : 'bg-apple-red/10 text-apple-red border border-apple-red/20'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Dish Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Dish Category</label>
                <select
                  value={formData.category === 'component' ? '' : formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any, subcategory: null })}
                  className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                >
                  <option value="">-- Select if Main Dish --</option>
                  <option value="soup">Soup</option>
                  <option value="hot_dish_meat">Hot Dish - Meat</option>
                  <option value="hot_dish_fish">Hot Dish - Fish</option>
                  <option value="hot_dish_veg">Hot Dish - Veg</option>
                </select>
              </div>
              <div>
                <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Component Type</label>
                <select
                  value={formData.subcategory || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    category: e.target.value ? 'component' : formData.category,
                    subcategory: e.target.value as DishSubcategory || null
                  })}
                  className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                >
                  <option value="">-- Select if Component --</option>
                  <option value="topping">Soup Topping</option>
                  <option value="carb">Carb</option>
                  <option value="warm_veggie">Warm Veggie</option>
                  <option value="salad">Salad</option>
                  <option value="condiment">Condiment</option>
                </select>
              </div>
            </div>

            {formData.category !== 'component' && (
              <div>
                <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all resize-none"
                />
              </div>
            )}

            {/* Portion Size - Hidden for soups (managed by location settings) */}
            {formData.category !== 'soup' && (
              <div>
                <h3 className="text-apple-headline text-apple-gray1 mb-3">Portion Size</h3>
                <p className="text-apple-subheadline text-apple-gray2 mb-4">
                  Specify the size of one portion for production calculations
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Portion Size</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.portion_size}
                      onChange={(e) => setFormData({ ...formData, portion_size: e.target.value })}
                      placeholder="e.g., 150"
                      className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Unit</label>
                    <select
                      value={formData.portion_unit}
                      onChange={(e) => setFormData({ ...formData, portion_unit: e.target.value as any })}
                      className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                    >
                      <option value="pieces">Pieces</option>
                      <option value="grams">Grams (g)</option>
                      <option value="kilograms">Kilograms (kg)</option>
                      <option value="milliliters">Milliliters (ml)</option>
                      <option value="liters">Liters (L)</option>
                      <option value="trays">Trays</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Components Selection - Only show for soups and hot dishes */}
            {formData.category !== 'component' && (
              <div>
                <h3 className="text-apple-headline text-apple-gray1 mb-3">Linked Components</h3>
                <p className="text-apple-subheadline text-apple-gray2 mb-4">
                  {formData.category === 'soup'
                    ? 'Select toppings for this soup'
                    : 'Select components for this hot dish'}
                </p>
                <div className="space-y-4">
                  {getVisibleSubcategories().map(subcat => {
                    const allComponents = availableComponents.filter(c => c.subcategory === subcat.key);
                    const components = getComponentsByType(subcat.key);
                    const totalCount = allComponents.length;

                    return (
                      <div key={subcat.key} className="border border-apple-gray5 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-apple-subheadline font-medium text-apple-gray1">
                            {subcat.label}
                            <span className="text-apple-footnote text-apple-gray3 ml-2 font-normal">
                              (Showing {components.length} of {totalCount})
                            </span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              if (subcat.key === 'topping') {
                                setQuickFormType('component');
                              } else if (subcat.key === 'carb') {
                                setQuickFormType('carb');
                              } else if (subcat.key === 'warm_veggie') {
                                setQuickFormType('warm_veggie');
                              } else if (subcat.key === 'salad') {
                                setQuickFormType('salad');
                              } else if (subcat.key === 'condiment') {
                                setQuickFormType('condiment');
                              }
                            }}
                            className="text-apple-subheadline text-apple-blue hover:text-apple-blue-hover font-medium transition-colors"
                          >
                            + New
                          </button>
                        </div>
                        {totalCount > 10 && (
                          <input
                            type="text"
                            placeholder="Search..."
                            value={componentSearchTerms[subcat.key] || ''}
                            onChange={(e) => setComponentSearchTerms({ ...componentSearchTerms, [subcat.key]: e.target.value })}
                            className="w-full px-4 py-3 text-apple-subheadline border border-apple-gray4 rounded-lg mb-3 focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                          />
                        )}
                        {components.length === 0 ? (
                          <p className="text-apple-gray3 text-apple-subheadline text-center py-2">No components found</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {components.map(component => (
                              <label key={component.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedComponents[subcat.key].includes(component.id)}
                                  onChange={() => toggleComponent(subcat.key, component.id)}
                                  className="w-5 h-5 text-apple-blue border-apple-gray4 rounded focus:ring-apple-blue/20"
                                />
                                <span className="text-apple-subheadline text-apple-gray1">{component.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Allergens */}
            <div>
              <h3 className="text-apple-headline text-apple-gray1 mb-3">Allergens</h3>
              <div className="grid grid-cols-4 gap-3">
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
                  <label key={allergen.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData as any)[allergen.key]}
                      onChange={(e) => setFormData({ ...formData, [allergen.key]: e.target.checked })}
                      className="w-5 h-5 text-apple-blue border-apple-gray4 rounded focus:ring-apple-blue/20"
                    />
                    <span className="text-apple-subheadline text-apple-gray1">{allergen.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-apple-gray5">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-apple-subheadline font-medium text-apple-gray1 border border-apple-gray4 rounded-lg hover:bg-apple-gray6 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 text-apple-subheadline font-medium text-white bg-apple-blue hover:bg-apple-blue-hover rounded-lg disabled:opacity-40 transition-colors"
              >
                {saving ? 'Saving...' : (dish ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Quick Component Form - Side by Side */}
      {quickFormType && (
        <QuickComponentForm
          type={quickFormType}
          onClose={() => setQuickFormType(null)}
          onCreated={handleQuickComponentCreated}
        />
      )}
    </div>
    </div>
  );
}
