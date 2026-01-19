'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Dish, DishSubcategory } from '@/lib/types';

interface ComponentFormProps {
  component: Dish | null;
  onClose: () => void;
  onSave: () => void;
}

export default function ComponentForm({ component, onClose, onSave }: ComponentFormProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subcategory: 'carb' as DishSubcategory,
    portion_size: '',
    portion_unit: 'grams' as 'pieces' | 'grams' | 'kilograms' | 'milliliters' | 'liters' | 'trays',
    allergen_gluten: false,
    allergen_soy: false,
    allergen_lactose: false,
    allergen_sesame: false,
    allergen_sulphites: false,
    allergen_egg: false,
    allergen_mustard: false,
    allergen_celery: false,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (component) {
      setFormData({
        name: component.name,
        description: component.description || '',
        subcategory: component.subcategory as DishSubcategory,
        portion_size: component.portion_size ? String(component.portion_size) : '',
        portion_unit: (component.portion_unit || 'grams') as any,
        allergen_gluten: component.allergen_gluten || false,
        allergen_soy: component.allergen_soy || false,
        allergen_lactose: component.allergen_lactose || false,
        allergen_sesame: component.allergen_sesame || false,
        allergen_sulphites: component.allergen_sulphites || false,
        allergen_egg: component.allergen_egg || false,
        allergen_mustard: component.allergen_mustard || false,
        allergen_celery: component.allergen_celery || false,
      });
    }
  }, [component]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Prepare data with converted types
      const dataToSave = {
        ...formData,
        portion_size: formData.portion_size ? parseFloat(formData.portion_size) : null,
      };

      if (component) {
        // Update existing component
        const { error } = await supabase
          .from('dishes')
          .update(dataToSave)
          .eq('id', component.id);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Component updated!' });
      } else {
        // Create new component
        const { error } = await supabase
          .from('dishes')
          .insert([{ ...dataToSave, category: 'off_menu', is_active: true }]);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Component created!' });
      }

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {component ? 'Edit Component' : 'Create Component'}
          </h2>

          {message && (
            <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Component Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type *</label>
                <select
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value as DishSubcategory })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="topping">Topping</option>
                  <option value="carb">Carb</option>
                  <option value="warm_veggie">Warm Veggie</option>
                  <option value="salad">Salad</option>
                  <option value="condiment">Condiment</option>
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

            {/* Portion Size */}
            <div>
              <h3 className="font-semibold mb-3">Portion Size</h3>
              <p className="text-sm text-gray-600 mb-3">
                Specify the size of one portion for production calculations
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Portion Size</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.portion_size}
                    onChange={(e) => setFormData({ ...formData, portion_size: e.target.value })}
                    placeholder="e.g., 220"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Unit</label>
                  <select
                    value={formData.portion_unit}
                    onChange={(e) => setFormData({ ...formData, portion_unit: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg"
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

            {/* Allergens */}
            <div>
              <h3 className="font-semibold mb-3">Allergens</h3>
              <p className="text-sm text-gray-600 mb-3">These allergens will affect any main dish that uses this component</p>
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
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (component ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
