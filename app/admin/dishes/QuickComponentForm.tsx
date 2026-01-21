'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface QuickComponentFormProps {
  type: 'component' | 'warm_veggie' | 'salad' | 'carb' | 'condiment';
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
      case 'salad':
        return 'New Salad';
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
      case 'salad':
        return 'salad';
      case 'condiment':
        return 'condiment';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const dataToSave = {
        name: formData.name.trim(),
        category: 'component',
        subcategory: getSubcategory(),
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
    <div className="w-80 bg-white border-l border-apple-gray5 shadow-apple-lg flex flex-col h-full font-apple">
      {/* Header */}
      <div className="bg-apple-gray7 px-6 py-4 border-b border-apple-gray5">
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

          {/* Portion Size */}
          <div>
            <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Portion Size</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.01"
                value={formData.portion_size}
                onChange={(e) => setFormData({ ...formData, portion_size: e.target.value })}
                placeholder="25"
                className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
              />
              <select
                value={formData.portion_unit}
                onChange={(e) => setFormData({ ...formData, portion_unit: e.target.value as any })}
                className="w-full px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
              >
                <option value="grams">g</option>
                <option value="pieces">pcs</option>
              </select>
            </div>
          </div>

          {/* Info */}
          <p className="text-apple-footnote text-apple-gray2 bg-apple-gray6 p-3 rounded-lg">
            This component will be automatically selected in your main dish
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t border-apple-gray5 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 text-apple-subheadline font-medium border border-apple-gray4 rounded-lg hover:bg-apple-gray6 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !formData.name.trim()}
            className="flex-1 px-4 py-3 text-apple-subheadline font-medium text-white bg-apple-blue hover:bg-apple-blue-hover rounded-lg disabled:opacity-40 transition-colors"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
