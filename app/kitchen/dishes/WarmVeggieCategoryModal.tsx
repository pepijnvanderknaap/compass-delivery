'use client';

import { useEffect } from 'react';

export type WarmVeggieCategory = 'root' | 'green' | 'other';

interface CategoryInfo {
  key: WarmVeggieCategory;
  label: string;
  icon: string;
  color: string;
  description: string;
}

interface WarmVeggieCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: WarmVeggieCategory) => void;
}

const categories: CategoryInfo[] = [
  {
    key: 'root',
    label: 'Root Vegetables',
    icon: '🥕',
    color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    description: 'Carrots, parsnips, potatoes, beets, turnips'
  },
  {
    key: 'green',
    label: 'Green Vegetables',
    icon: '🥦',
    color: 'bg-green-50 hover:bg-green-100 border-green-200',
    description: 'Broccoli, green beans, spinach, kale, peas'
  },
  {
    key: 'other',
    label: 'Other',
    icon: '🍆',
    color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    description: 'Mixed vegetables, ratatouille, etc.'
  }
];

export default function WarmVeggieCategoryModal({
  isOpen,
  onClose,
  onSelectCategory,
}: WarmVeggieCategoryModalProps) {
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
        className="bg-white rounded-sm shadow-2xl border border-[#E8E8ED] w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E8E8ED]">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-semibold text-[#1D1D1F]">
              Select Warm Veggie Type
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

        {/* Categories */}
        <div className="p-6 space-y-3">
          {categories.map((category) => (
            <button
              key={category.key}
              onClick={() => onSelectCategory(category.key)}
              className={`w-full p-5 border-2 rounded-sm transition-all text-left ${category.color}`}
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">{category.icon}</div>
                <div className="flex-1">
                  <div className="text-[17px] font-semibold text-[#1D1D1F] mb-1">
                    {category.label}
                  </div>
                  <div className="text-[13px] text-[#6E6E73]">
                    {category.description}
                  </div>
                </div>
                <svg className="w-5 h-5 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
