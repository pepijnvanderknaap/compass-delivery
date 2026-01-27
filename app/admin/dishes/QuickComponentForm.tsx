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
    allergen_gluten: false,
    allergen_soy: false,
    allergen_lactose: false,
    allergen_sesame: false,
    allergen_sulphites: false,
    allergen_egg: false,
    allergen_mustard: false,
    allergen_celery: false,
    allergen_fish: false,
    allergen_shellfish: false,
  });

  const getTitle = () => {
    switch (type) {
      case 'component':
        return 'New Soup Topping';
      case 'carb':
        return 'New Carb';
      case 'warm_veggie':
        return 'New Warm Vegetables';
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
        allergen_gluten: formData.allergen_gluten,
        allergen_soy: formData.allergen_soy,
        allergen_lactose: formData.allergen_lactose,
        allergen_sesame: formData.allergen_sesame,
        allergen_sulphites: formData.allergen_sulphites,
        allergen_egg: formData.allergen_egg,
        allergen_mustard: formData.allergen_mustard,
        allergen_celery: formData.allergen_celery,
        allergen_fish: formData.allergen_fish,
        allergen_shellfish: formData.allergen_shellfish,
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
    <div className="w-80 bg-white border-l border-[#E8E8ED] shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#FAFAFA] px-6 py-4 border-b border-[#E8E8ED]">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] font-semibold text-[#1D1D1F]">{getTitle()}</h3>
          <button
            onClick={onClose}
            className="text-[#86868B] hover:text-[#1D1D1F] transition-colors text-xl"
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
            <label className="block text-[13px] font-medium text-[#86868B] mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Croutons"
              className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg text-[15px] text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition-all"
              required
              autoFocus
            />
          </div>

          {/* Portion Size - Only for toppings, carbs, and condiments */}
          {type !== 'warm_veggie' && (
            <div>
              <label className="block text-[13px] font-medium text-[#86868B] mb-2">Portion Size *</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="1"
                  value={formData.portion_size}
                  onChange={(e) => setFormData({ ...formData, portion_size: e.target.value })}
                  placeholder="25"
                  className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg text-[15px] text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition-all"
                  required
                  min="1"
                />
                <select
                  value={formData.portion_unit}
                  onChange={(e) => setFormData({ ...formData, portion_unit: e.target.value as any })}
                  className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg text-[15px] text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition-all"
                  required
                >
                  <option value="grams">g</option>
                  <option value="pieces">pcs</option>
                </select>
              </div>
            </div>
          )}

          {/* Allergens */}
          <div>
            <label className="block text-[13px] font-medium text-[#86868B] mb-3">Allergens</label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allergen_gluten}
                  onChange={(e) => setFormData({ ...formData, allergen_gluten: e.target.checked })}
                  className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
                />
                <span className="text-[15px] text-[#1D1D1F]">Gluten</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allergen_soy}
                  onChange={(e) => setFormData({ ...formData, allergen_soy: e.target.checked })}
                  className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
                />
                <span className="text-[15px] text-[#1D1D1F]">Soy</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allergen_lactose}
                  onChange={(e) => setFormData({ ...formData, allergen_lactose: e.target.checked })}
                  className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
                />
                <span className="text-[15px] text-[#1D1D1F]">Lactose</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allergen_sesame}
                  onChange={(e) => setFormData({ ...formData, allergen_sesame: e.target.checked })}
                  className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
                />
                <span className="text-[15px] text-[#1D1D1F]">Sesame</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allergen_sulphites}
                  onChange={(e) => setFormData({ ...formData, allergen_sulphites: e.target.checked })}
                  className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
                />
                <span className="text-[15px] text-[#1D1D1F]">Sulphites</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allergen_egg}
                  onChange={(e) => setFormData({ ...formData, allergen_egg: e.target.checked })}
                  className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
                />
                <span className="text-[15px] text-[#1D1D1F]">Egg</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allergen_mustard}
                  onChange={(e) => setFormData({ ...formData, allergen_mustard: e.target.checked })}
                  className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
                />
                <span className="text-[15px] text-[#1D1D1F]">Mustard</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allergen_celery}
                  onChange={(e) => setFormData({ ...formData, allergen_celery: e.target.checked })}
                  className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
                />
                <span className="text-[15px] text-[#1D1D1F]">Celery</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allergen_fish}
                  onChange={(e) => setFormData({ ...formData, allergen_fish: e.target.checked })}
                  className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
                />
                <span className="text-[15px] text-[#1D1D1F]">Fish</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allergen_shellfish}
                  onChange={(e) => setFormData({ ...formData, allergen_shellfish: e.target.checked })}
                  className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
                />
                <span className="text-[15px] text-[#1D1D1F]">Shellfish</span>
              </label>
            </div>
          </div>

          {/* Info */}
          <p className="text-[13px] text-[#6E6E73] bg-[#F5F5F7] p-3 rounded-lg">
            This component will be automatically selected in your main dish
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-6 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded-lg hover:bg-[#F5F5F7] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !formData.name.trim() || (type !== 'warm_veggie' && !formData.portion_size)}
            className="flex-1 px-4 py-3 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-lg transition-colors disabled:opacity-40"
          >
            {saving ? 'Adding...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
