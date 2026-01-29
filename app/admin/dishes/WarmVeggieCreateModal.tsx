'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { WarmVeggieCategory } from './WarmVeggieCategoryModal';
import QuickComponentForm from './QuickComponentForm';

interface ComponentRow {
  tempId: string;
  component_dish_id: string | null;
  component_name: string;
  percentage: string;
}

interface WarmVeggieCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (warmVeggieId: string, warmVeggieName: string, components: Array<{component_name: string; percentage: number}>) => void;
}

export default function WarmVeggieCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: WarmVeggieCreateModalProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    custom_name: '',
    category: 'other' as WarmVeggieCategory,
    description: '',
  });
  const [components, setComponents] = useState<ComponentRow[]>([
    { tempId: '1', component_dish_id: null, component_name: '', percentage: '' }
  ]);
  const [availableComponents, setAvailableComponents] = useState<Array<{id: string; name: string}>>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showQuickComponentForm, setShowQuickComponentForm] = useState(false);
  const [quickComponentForRow, setQuickComponentForRow] = useState<string | null>(null);

  useEffect(() => {
    console.log('[WarmVeggieCreateModal] useEffect triggered, isOpen:', isOpen);
    if (isOpen) {
      console.log('[WarmVeggieCreateModal] Resetting form state...');
      fetchAvailableComponents();
      // Reset form
      setFormData({
        custom_name: '',
        category: 'other',
        description: '',
      });
      setComponents([
        { tempId: '1', component_dish_id: null, component_name: '', percentage: '' }
      ]);
      setMessage(null);
      // Reset the quick component form state
      setShowQuickComponentForm(false);
      setQuickComponentForRow(null);
      console.log('[WarmVeggieCreateModal] Form state reset complete');
    }
  }, [isOpen]);

  const fetchAvailableComponents = async () => {
    const { data } = await supabase
      .from('dishes')
      .select('id, name')
      .eq('subcategory', 'warm_veggie')
      .order('name');

    setAvailableComponents(data || []);
  };

  const addComponentRow = () => {
    setComponents([
      ...components,
      { tempId: Date.now().toString(), component_dish_id: null, component_name: '', percentage: '' }
    ]);
  };

  const removeComponentRow = (tempId: string) => {
    if (components.length > 1) {
      setComponents(components.filter(c => c.tempId !== tempId));
    }
  };

  const updateComponent = (tempId: string, field: keyof ComponentRow, value: string) => {
    setComponents(components.map(c => {
      if (c.tempId === tempId) {
        if (field === 'component_dish_id') {
          const selectedDish = availableComponents.find(d => d.id === value);
          return {
            ...c,
            component_dish_id: value,
            component_name: selectedDish?.name || '',
          };
        }
        return { ...c, [field]: value };
      }
      return c;
    }));
  };

  const handleCreateComponentForRow = (tempId: string) => {
    console.log('[WarmVeggieCreateModal] Opening QuickComponentForm for row:', tempId);
    console.log('[WarmVeggieCreateModal] Current state - showQuickComponentForm:', showQuickComponentForm, 'quickComponentForRow:', quickComponentForRow);
    setQuickComponentForRow(tempId);
    setShowQuickComponentForm(true);
    console.log('[WarmVeggieCreateModal] QuickComponentForm state set to true');
  };

  const handleQuickComponentCreated = (newDishId: string, newDishName: string) => {
    console.log('[WarmVeggieCreateModal] handleQuickComponentCreated called:', { newDishId, newDishName, quickComponentForRow });

    // Add the new dish to available components - use functional form to avoid stale state
    setAvailableComponents(prev => {
      console.log('[WarmVeggieCreateModal] Updating availableComponents, current:', prev);
      const updated = [...prev, { id: newDishId, name: newDishName }];
      console.log('[WarmVeggieCreateModal] Updated availableComponents:', updated);
      return updated;
    });

    // Auto-select it for the row that triggered the creation
    // Use functional form to ensure we have the latest components state
    if (quickComponentForRow) {
      setComponents(prevComponents => {
        console.log('[WarmVeggieCreateModal] Updating components, current:', prevComponents);
        const updated = prevComponents.map(c => {
          if (c.tempId === quickComponentForRow) {
            return {
              ...c,
              component_dish_id: newDishId,
              component_name: newDishName,
            };
          }
          return c;
        });
        console.log('[WarmVeggieCreateModal] Updated components:', updated);
        return updated;
      });
    }

    console.log('[WarmVeggieCreateModal] Closing QuickComponentForm...');
    setShowQuickComponentForm(false);
    setQuickComponentForRow(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Validate components
      const validComponents = components.filter(c => c.component_dish_id && c.percentage);
      if (validComponents.length === 0) {
        throw new Error('Please add at least one component');
      }

      // Check for duplicate vegetables
      const componentIds = validComponents.map(c => c.component_dish_id);
      const uniqueIds = new Set(componentIds);
      if (componentIds.length !== uniqueIds.size) {
        // Find which vegetable is duplicated
        const duplicates = validComponents.filter((c, index) =>
          componentIds.indexOf(c.component_dish_id) !== index
        );
        const duplicateNames = duplicates.map(c => c.component_name).join(', ');
        throw new Error(`Duplicate vegetables found: ${duplicateNames}. Each vegetable can only appear once in a mix.`);
      }

      // Check percentages add up to 100
      const totalPercentage = validComponents.reduce((sum, c) => sum + parseInt(c.percentage), 0);
      if (totalPercentage !== 100) {
        throw new Error(`Percentages must add up to 100% (currently ${totalPercentage}%)`);
      }

      // Create warm veggie combination
      const { data: newWarmVeggie, error: warmVeggieError } = await supabase
        .from('warm_veggie_combinations')
        .insert({
          category: formData.category,
          custom_name: formData.custom_name,
          description: formData.description || null,
        })
        .select()
        .single();

      if (warmVeggieError) {
        console.error('Error creating warm veggie combination:', warmVeggieError);
        if (warmVeggieError.code === '23505') {
          throw new Error(`A warm veggie mix with the name "${formData.custom_name}" already exists. Please use a different name.`);
        }
        throw new Error(warmVeggieError.message || 'Failed to create warm veggie combination');
      }

      // Insert components
      const componentInserts = validComponents.map(c => ({
        warm_veggie_combination_id: newWarmVeggie.id,
        component_dish_id: c.component_dish_id,
        percentage: parseInt(c.percentage),
      }));

      console.log('Inserting components:', componentInserts);

      const { error: componentsError } = await supabase
        .from('warm_veggie_combination_items')
        .insert(componentInserts);

      if (componentsError) {
        console.error('Error inserting components:', componentsError);
        // If components fail, delete the combination to avoid orphaned records
        await supabase
          .from('warm_veggie_combinations')
          .delete()
          .eq('id', newWarmVeggie.id);

        if (componentsError.code === '23505') {
          throw new Error('Duplicate component detected. Each vegetable can only appear once in a mix.');
        }
        throw new Error(componentsError.message || 'Failed to add components to the mix');
      }

      setMessage({ type: 'success', text: 'Warm veggie created successfully!' });
      setTimeout(() => {
        onSuccess(
          newWarmVeggie.id,
          formData.custom_name,
          validComponents.map(c => ({
            component_name: c.component_name,
            percentage: parseInt(c.percentage),
          }))
        );
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('Error creating warm veggie:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create warm veggie' });
    } finally {
      setSaving(false);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-sm shadow-2xl border border-[#E8E8ED] w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E8E8ED]">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-semibold text-[#1D1D1F]">
              Create New Veg Mix
            </h2>
            <button
              onClick={onClose}
              className="text-[#86868B] hover:text-[#1D1D1F] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded-sm text-[13px] ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Veg Mix Name */}
          <div>
            <label className="block text-[13px] font-medium text-[#86868B] mb-2">
              Veg Mix Name *
            </label>
            <input
              type="text"
              value={formData.custom_name}
              onChange={(e) => setFormData({ ...formData, custom_name: e.target.value })}
              className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition-all"
              placeholder="e.g., Roasted Root Vegetables, Steamed Greens"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[13px] font-medium text-[#86868B] mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as WarmVeggieCategory })}
              className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition-all"
              required
            >
              <option value="root">🥕 Root Vegetables (carrots, parsnips, potatoes, beets)</option>
              <option value="green">🥦 Green Vegetables (broccoli, green beans, spinach, kale)</option>
              <option value="other">🍆 Other (mixed vegetables, ratatouille)</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[13px] font-medium text-[#86868B] mb-2">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition-all resize-none"
              placeholder="e.g., Classic roasted root vegetables with herbs"
              rows={2}
            />
          </div>

          {/* Components */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[13px] font-medium text-[#86868B]">
                Components * (must total 100%)
              </label>
              <button
                type="button"
                onClick={addComponentRow}
                className="text-[13px] text-[#0071E3] hover:text-[#0077ED] font-medium transition-colors"
              >
                + Add Component
              </button>
            </div>

            <div className="space-y-2">
              {components.map((comp, index) => (
                <div key={comp.tempId} className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={comp.component_dish_id || ''}
                      onChange={(e) => updateComponent(comp.tempId, 'component_dish_id', e.target.value)}
                      className="flex-1 px-3 py-2 border border-[#D2D2D7] rounded-sm text-[14px] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition-all"
                      required
                    >
                      <option value="">Select vegetable...</option>
                      {availableComponents.map((veggie) => (
                        <option key={veggie.id} value={veggie.id}>
                          {veggie.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={comp.percentage}
                      onChange={(e) => updateComponent(comp.tempId, 'percentage', e.target.value)}
                      className="w-20 px-3 py-2 border border-[#D2D2D7] rounded-sm text-[14px] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition-all"
                      placeholder="%"
                      min="1"
                      max="100"
                      required
                    />
                    {components.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeComponentRow(comp.tempId)}
                        className="px-3 py-2 text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-sm transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCreateComponentForRow(comp.tempId);
                    }}
                    className="text-[13px] text-[#0071E3] hover:text-[#0077ED] font-medium transition-colors"
                  >
                    + Create Vegetable
                  </button>
                </div>
              ))}
            </div>

            {/* Percentage Total */}
            <div className="mt-2 text-[13px] text-[#6E6E73]">
              Total: {components.reduce((sum, c) => sum + (parseInt(c.percentage) || 0), 0)}%
              {components.reduce((sum, c) => sum + (parseInt(c.percentage) || 0), 0) !== 100 && (
                <span className="text-[#FF9500] ml-2">⚠ Must equal 100%</span>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-[#E8E8ED]">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded-sm hover:bg-[#F5F5F7] transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-colors disabled:opacity-40"
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Veg Mix'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Component Form - Slide in from right */}
      {showQuickComponentForm && (
        <QuickComponentForm
          type="warm_veggie"
          onClose={() => {
            setShowQuickComponentForm(false);
            setQuickComponentForRow(null);
          }}
          onCreated={(newComponent) => handleQuickComponentCreated(newComponent.id, newComponent.name)}
        />
      )}
    </div>
  );
}
