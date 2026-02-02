'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import QuickComponentForm from './QuickComponentForm';

interface Vegetable {
  id: string;
  name: string;
}

interface VegetableWithPercentage {
  id: string;
  name: string;
  percentage: string;
}

interface WarmVeggieSimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (vegetables: Array<{id: string; percentage: number}>, totalPortion: number) => void;
  existingVegetables?: Array<{component_dish_id: string; percentage: number}>;
  existingTotalPortion?: number;
}

export default function WarmVeggieSimpleModal({
  isOpen,
  onClose,
  onAdd,
  existingVegetables = [],
  existingTotalPortion = 0,
}: WarmVeggieSimpleModalProps) {
  const supabase = createClient();
  const [allVegetables, setAllVegetables] = useState<Vegetable[]>([]);
  const [selectedVegetables, setSelectedVegetables] = useState<VegetableWithPercentage[]>([]);
  const [totalPortion, setTotalPortion] = useState(existingTotalPortion.toString());
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchVegetables();
      setTotalPortion(existingTotalPortion > 0 ? existingTotalPortion.toString() : '');
      setMessage(null);
    }
  }, [isOpen, existingTotalPortion]);

  const fetchVegetables = async () => {
    const { data } = await supabase
      .from('dishes')
      .select('id, name')
      .eq('subcategory', 'warm_veggie')
      .eq('is_active', true)
      .order('name');

    setAllVegetables(data || []);

    // If we have existing vegetables, load them
    if (existingVegetables.length > 0 && data) {
      const selected = existingVegetables.map(ev => {
        const veggie = data.find(v => v.id === ev.component_dish_id);
        return {
          id: ev.component_dish_id,
          name: veggie?.name || '',
          percentage: ev.percentage.toString(),
        };
      });
      setSelectedVegetables(selected);
    }
  };

  const handleCheckboxChange = (vegetable: Vegetable, checked: boolean) => {
    if (checked) {
      // Add vegetable to selected list
      setSelectedVegetables(prev => [...prev, { id: vegetable.id, name: vegetable.name, percentage: '' }]);
    } else {
      // Remove vegetable from selected list
      setSelectedVegetables(prev => prev.filter(v => v.id !== vegetable.id));
    }
  };

  const updatePercentage = (id: string, value: string) => {
    setSelectedVegetables(prev =>
      prev.map(v => (v.id === id ? { ...v, percentage: value } : v))
    );
  };

  const handleAdd = () => {
    setMessage(null);

    // Validate total portion
    const portion = parseInt(totalPortion);
    if (!totalPortion || portion <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid total portion size' });
      return;
    }

    // Validate selections and percentages
    const validVeggies = selectedVegetables.filter(v => v.percentage && parseInt(v.percentage) > 0);
    if (validVeggies.length === 0) {
      setMessage({ type: 'error', text: 'Please select vegetables and enter percentages' });
      return;
    }

    const totalPercentage = validVeggies.reduce((sum, v) => sum + parseInt(v.percentage), 0);
    if (totalPercentage !== 100) {
      setMessage({ type: 'error', text: `Percentages must add up to 100% (currently ${totalPercentage}%)` });
      return;
    }

    // All valid - call onAdd (just updates form state, doesn't save to database)
    onAdd(
      validVeggies.map(v => ({ id: v.id, percentage: parseInt(v.percentage) })),
      portion
    );
    onClose();
  };

  const handleQuickVegetableCreated = (newVegetable: { id: string; name: string }) => {
    setAllVegetables(prev => [...prev, newVegetable].sort((a, b) => a.name.localeCompare(b.name)));
    setShowQuickForm(false);
  };

  if (!isOpen) return null;

  const getTotalPercentage = () => selectedVegetables.reduce((sum, v) => sum + (parseInt(v.percentage) || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-sm shadow-2xl border border-[#E8E8ED] w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E8E8ED]">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-semibold text-[#1D1D1F]">
              Add Warm Vegetables
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {message && (
            <div
              className={`mb-4 p-3 rounded-sm text-[13px] ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Total Portion Size */}
          <div className="mb-6">
            <label className="block text-[13px] font-medium text-[#86868B] mb-2">
              Total Portion Size (grams) *
            </label>
            <input
              type="number"
              value={totalPortion}
              onChange={(e) => setTotalPortion(e.target.value)}
              className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition-all"
              placeholder="e.g., 120"
              min="1"
            />
          </div>

          {/* Vegetables with checkboxes and percentage inputs */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[13px] font-medium text-[#86868B]">
                Select Vegetables & Set Percentages *
              </label>
              <button
                type="button"
                onClick={() => setShowQuickForm(true)}
                className="text-[13px] text-[#0071E3] hover:text-[#0077ED] font-medium transition-colors"
              >
                + Create New Vegetable
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {allVegetables.map(veggie => {
                const isSelected = selectedVegetables.some(v => v.id === veggie.id);
                const selectedVeggie = selectedVegetables.find(v => v.id === veggie.id);

                return (
                  <div
                    key={veggie.id}
                    className={`flex items-center gap-3 p-3 rounded-sm border transition-colors ${
                      isSelected
                        ? 'border-[#0071E3] bg-[#F5F5F7]'
                        : 'border-[#E8E8ED] hover:bg-[#F5F5F7]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleCheckboxChange(veggie, e.target.checked)}
                      className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
                    />
                    <span className="flex-1 text-[15px] text-[#1D1D1F]">{veggie.name}</span>

                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={selectedVeggie?.percentage || ''}
                          onChange={(e) => updatePercentage(veggie.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-20 px-3 py-2 border border-[#D2D2D7] rounded-sm text-[14px] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition-all"
                          placeholder="%"
                          min="1"
                          max="100"
                        />
                        <span className="text-[14px] text-[#86868B] w-4">%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Percentage Total */}
            {selectedVegetables.length > 0 && (
              <div className="text-[13px] text-[#6E6E73] bg-[#F5F5F7] p-3 rounded-sm">
                Total: <span className={getTotalPercentage() === 100 ? 'text-[#34C759] font-medium' : 'text-[#FF9500] font-medium'}>
                  {getTotalPercentage()}%
                </span>
                {getTotalPercentage() !== 100 && (
                  <span className="text-[#FF9500] ml-2">⚠ Must equal 100%</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E8E8ED]">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded-sm hover:bg-[#F5F5F7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 px-6 py-3 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-colors"
            >
              Add to Dish
            </button>
          </div>
        </div>
      </div>

      {/* Quick Vegetable Form */}
      {showQuickForm && (
        <div className="fixed inset-y-0 right-0 z-[60]">
          <QuickComponentForm
            type="warm_veggie"
            onClose={() => setShowQuickForm(false)}
            onCreated={handleQuickVegetableCreated}
          />
        </div>
      )}
    </div>
  );
}
