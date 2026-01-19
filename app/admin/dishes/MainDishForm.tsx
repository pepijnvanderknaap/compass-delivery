'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Dish, DishWithComponents, DishSubcategory } from '@/lib/types';

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
    category: 'soup' as 'soup' | 'hot_dish_meat' | 'hot_dish_fish' | 'hot_dish_veg' | 'off_menu',
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchComponents();
    if (dish) {
      setFormData({
        name: dish.name,
        description: dish.description || '',
        category: dish.category,
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

      if (dish) {
        // Update existing dish
        const { error } = await supabase
          .from('dishes')
          .update(formData)
          .eq('id', dish.id);
        if (error) throw error;
      } else {
        // Create new dish
        const { data: newDish, error } = await supabase
          .from('dishes')
          .insert([{ ...formData, is_active: true }])
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
    return availableComponents.filter(c => c.subcategory === type);
  };

  const toggleComponent = (type: DishSubcategory, id: string) => {
    setSelectedComponents(prev => ({
      ...prev,
      [type]: prev[type].includes(id)
        ? prev[type].filter(cid => cid !== id)
        : [...prev[type], id]
    }));
  };

  const subcategoryConfig = [
    { key: 'topping' as DishSubcategory, label: 'Toppings', icon: '🌿' },
    { key: 'carb' as DishSubcategory, label: 'Carbs', icon: '🍚' },
    { key: 'warm_veggie' as DishSubcategory, label: 'Warm Veggies', icon: '🥕' },
    { key: 'salad' as DishSubcategory, label: 'Salads', icon: '🥗' },
    { key: 'condiment' as DishSubcategory, label: 'Condiments', icon: '🧂' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {dish ? 'Edit Main Dish' : 'Create Main Dish'}
          </h2>

          {message && (
            <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Dish Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="soup">Soup</option>
                  <option value="hot_dish_meat">Hot Dish - Meat</option>
                  <option value="hot_dish_fish">Hot Dish - Fish</option>
                  <option value="hot_dish_veg">Hot Dish - Veg</option>
                  <option value="off_menu">Off Menu</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {/* Components Selection */}
            <div>
              <h3 className="font-semibold mb-3">Linked Components</h3>
              <div className="space-y-4">
                {subcategoryConfig.map(subcat => {
                  const components = getComponentsByType(subcat.key);
                  if (components.length === 0) return null;

                  return (
                    <div key={subcat.key} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">{subcat.icon} {subcat.label}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {components.map(component => (
                          <label key={component.id} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedComponents[subcat.key].includes(component.id)}
                              onChange={() => toggleComponent(subcat.key, component.id)}
                              className="rounded"
                            />
                            <span className="text-sm">{component.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Allergens */}
            <div>
              <h3 className="font-semibold mb-3">Allergens</h3>
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
                  <label key={allergen.key} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData as any)[allergen.key]}
                      onChange={(e) => setFormData({ ...formData, [allergen.key]: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">{allergen.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (dish ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
