'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface QuickComponentFormProps {
  type: 'component' | 'warm_veggie' | 'carb' | 'condiment';
  onClose: () => void;
  onCreated: (newComponent: { id: string; name: string }) => void;
}

export default function QuickComponentForm({ type, onClose, onCreated }: QuickComponentFormProps) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    portion_size: '',
    portion_unit: 'grams' as 'grams' | 'pieces',
  });

  const getTitle = () => {
    switch (type) {
      case 'component':
        return 'New Soup Topping';
      case 'carb':
        return 'New Carb';
      case 'warm_veggie':
        return 'New Warm Veggie';
      case 'condiment':
        return 'New Add-on';
    }
  };

  const getSubcategory = () => {
    switch (type) {
      case 'component':
        return 'topping';
      case 'carb':
        return 'carb';
      case 'warm_veggie':
        return 'warm_veggie';
      case 'condiment':
        return 'condiment';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const trimmedName = formData.name.trim();
      const subcategory = getSubcategory();

      // Check if component already exists with this name and subcategory
      const { data: existingComponent } = await supabase
        .from('dishes')
        .select('*')
        .eq('category', 'component')
        .eq('subcategory', subcategory)
        .ilike('name', trimmedName)
        .single();

      if (existingComponent) {
        // Component already exists - just use it
        onCreated({ id: existingComponent.id, name: existingComponent.name });
        return;
      }

      // Component doesn't exist - create it
      const dataToSave = {
        name: trimmedName,
        category: 'component',
        subcategory: subcategory,
        portion_size: formData.portion_size ? parseFloat(formData.portion_size) : null,
        portion_unit: formData.portion_unit,
        is_active: true,
      };

      const { data: newComponent, error } = await supabase
        .from('dishes')
        .insert(dataToSave)
        .select()
        .single();

      if (error) throw error;

      // Call onCreated with the new component
      onCreated({ id: newComponent.id, name: newComponent.name });
    } catch (error) {
      console.error('Error creating component:', error);
      alert('Failed to create component. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-80 bg-white rounded-2xl flex flex-col h-full font-apple">
      {/* Header */}
      <div className="bg-apple-gray7 px-6 py-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-apple-headline text-apple-gray1">{getTitle()}</h3>
          <button
            onClick={onClose}
            className="text-apple-gray3 hover:text-apple-gray1 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6">
        <div className="space-y-4 flex-1">
          {/* Name */}
          <div>
            <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Croutons"
              className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
              required
              autoFocus
            />
          </div>

          {/* Portion Size - Only for toppings, carbs, and condiments */}
          {type !== 'warm_veggie' && (
            <div>
              <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Portion Size *</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="1"
                  value={formData.portion_size}
                  onChange={(e) => setFormData({ ...formData, portion_size: e.target.value })}
                  placeholder="25"
                  className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                  required
                  min="1"
                />
                <select
                  value={formData.portion_unit}
                  onChange={(e) => setFormData({ ...formData, portion_unit: e.target.value as any })}
                  className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                  required
                >
                  <option value="grams">g</option>
                  <option value="pieces">pcs</option>
                </select>
              </div>
            </div>
          )}

          {/* Info */}
          <p className="text-apple-footnote text-apple-gray2 bg-apple-gray6 p-3 rounded-lg">
            This component will be automatically selected in your main dish
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-6 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 text-apple-subheadline font-medium border border-apple-gray4 rounded-lg hover:bg-apple-gray6 transition-colors"
            
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !formData.name.trim() || (type !== 'warm_veggie' && !formData.portion_size)}
            className="flex-1 px-6 py-3 text-apple-subheadline font-semibold text-[#1D1D1F] bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}
