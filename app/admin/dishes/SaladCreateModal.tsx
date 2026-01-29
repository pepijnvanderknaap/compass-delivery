'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import QuickComponentForm from './QuickComponentForm';

interface SaladItem {
  id: string;
  name: string;
}

interface SaladItemWithPercentage {
  id: string;
  name: string;
  percentage: string;
}

interface SaladCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (items: Array<{id: string; percentage: number}>, totalPortion: number) => void;
  existingItems?: Array<{component_dish_id: string; percentage: number}>;
  existingTotalPortion?: number;
}

export default function SaladCreateModal({
  isOpen,
  onClose,
  onAdd,
  existingItems = [],
  existingTotalPortion = 0,
}: SaladCreateModalProps) {
  const supabase = createClient();
  const [allSaladItems, setAllSaladItems] = useState<SaladItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SaladItemWithPercentage[]>([]);
  const [totalPortion, setTotalPortion] = useState(existingTotalPortion.toString());
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSaladItems();
      setTotalPortion(existingTotalPortion > 0 ? existingTotalPortion.toString() : '');
      setMessage(null);
    }
  }, [isOpen, existingTotalPortion]);

  const fetchSaladItems = async () => {
    const { data } = await supabase
      .from('dishes')
      .select('id, name')
      .eq('subcategory', 'salad')
      .eq('is_active', true)
      .order('name');

    setAllSaladItems(data || []);

    // If we have existing items, load them
    if (existingItems.length > 0 && data) {
      const selected = existingItems.map(ei => {
        const item = data.find(v => v.id === ei.component_dish_id);
        return {
          id: ei.component_dish_id,
          name: item?.name || '',
          percentage: ei.percentage.toString(),
        };
      });
      setSelectedItems(selected);
    }
  };

  const handleCheckboxChange = (item: SaladItem, checked: boolean) => {
    if (checked) {
      // Add item to selected list
      setSelectedItems(prev => [...prev, { id: item.id, name: item.name, percentage: '' }]);
    } else {
      // Remove item from selected list
      setSelectedItems(prev => prev.filter(v => v.id !== item.id));
    }
  };

  const updatePercentage = (id: string, value: string) => {
    setSelectedItems(prev =>
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
    const validItems = selectedItems.filter(v => v.percentage && parseInt(v.percentage) > 0);
    if (validItems.length === 0) {
      setMessage({ type: 'error', text: 'Please select salad items and enter percentages' });
      return;
    }

    const totalPercentage = validItems.reduce((sum, v) => sum + parseInt(v.percentage), 0);
    if (totalPercentage !== 100) {
      setMessage({ type: 'error', text: `Percentages must add up to 100% (currently ${totalPercentage}%)` });
      return;
    }

    // All valid - call onAdd (just updates form state, doesn't save to database)
    onAdd(
      validItems.map(v => ({ id: v.id, percentage: parseInt(v.percentage) })),
      portion
    );
    onClose();
  };

  const handleQuickItemCreated = (newItem: { id: string; name: string }) => {
    setAllSaladItems(prev => [...prev, newItem].sort((a, b) => a.name.localeCompare(b.name)));
    setShowQuickForm(false);
  };

  if (!isOpen) return null;

  const getTotalPercentage = () => selectedItems.reduce((sum, v) => sum + (parseInt(v.percentage) || 0), 0);

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
              Create Salad
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
          <p className="mt-2 text-[13px] text-[#86868B]">
            Select salad items and set their percentages
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error/Success Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-sm text-[13px] font-medium ${
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
              placeholder="e.g., 220"
              min="1"
            />
          </div>

          {/* Salad Items with checkboxes and percentage inputs */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[13px] font-medium text-[#86868B]">
                Select Salad Items & Set Percentages *
              </label>
              <button
                type="button"
                onClick={() => setShowQuickForm(true)}
                className="text-[13px] text-[#0071E3] hover:text-[#0077ED] font-medium transition-colors"
              >
                + Create New Item
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {allSaladItems.map(item => {
                const isSelected = selectedItems.some(v => v.id === item.id);
                const selectedItem = selectedItems.find(v => v.id === item.id);

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-sm border transition-colors ${
                      isSelected
                        ? 'border-[#0071E3] bg-[#F5F5F7]'
                        : 'border-[#E8E8ED] hover:bg-[#F5F5F7]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleCheckboxChange(item, e.target.checked)}
                      className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
                    />
                    <span className="flex-1 text-[15px] text-[#1D1D1F]">{item.name}</span>

                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={selectedItem?.percentage || ''}
                          onChange={(e) => updatePercentage(item.id, e.target.value)}
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
            {selectedItems.length > 0 && (
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

      {/* Quick Salad Item Form */}
      {showQuickForm && (
        <div className="fixed inset-y-0 right-0 z-[60]">
          <QuickComponentForm
            type="salad"
            onClose={() => setShowQuickForm(false)}
            onCreated={handleQuickItemCreated}
          />
        </div>
      )}
    </div>
  );
}
