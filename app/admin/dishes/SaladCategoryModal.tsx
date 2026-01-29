'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type SaladCategory = 'leafy' | 'vegetable' | 'coleslaw';

interface SaladCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: SaladCategory) => void;
}

interface CategoryInfo {
  key: SaladCategory;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const categories: CategoryInfo[] = [
  {
    key: 'leafy',
    label: 'Leafy Salads',
    icon: '🥗',
    color: 'bg-green-50 hover:bg-green-100 border-green-200',
    description: 'Lettuce, mixed greens, spinach-based'
  },
  {
    key: 'vegetable',
    label: 'Vegetable Salads',
    icon: '🥕',
    color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    description: 'Roasted, grilled, or raw vegetables'
  },
  {
    key: 'coleslaw',
    label: 'Coleslaws',
    icon: '🥬',
    color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    description: 'Cabbage-based salads and slaws'
  },
];

export default function SaladCategoryModal({ isOpen, onClose, onSelectCategory }: SaladCategoryModalProps) {
  const supabase = createClient();
  const [categoryCounts, setCategoryCounts] = useState<Record<SaladCategory, number>>({
    leafy: 0,
    vegetable: 0,
    coleslaw: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchCategoryCounts();
    }
  }, [isOpen]);

  const fetchCategoryCounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salad_combinations')
        .select('category');

      if (error) throw error;

      // Count salads per category
      const counts: Record<SaladCategory, number> = {
        leafy: 0,
        vegetable: 0,
        coleslaw: 0,
      };

      data?.forEach((item) => {
        const cat = item.category as SaladCategory;
        if (cat in counts) {
          counts[cat]++;
        }
      });

      setCategoryCounts(counts);
    } catch (error) {
      console.error('Error fetching category counts:', error);
    } finally {
      setLoading(false);
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
        className="bg-white rounded-sm shadow-2xl border border-[#E8E8ED] w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E8E8ED]">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-semibold text-[#1D1D1F]">
              Select Salad Type
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
            Choose a salad type to browse existing combinations
          </p>
        </div>

        {/* Category Grid */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#86868B]">Loading...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categories.map((category) => {
                const count = categoryCounts[category.key];
                return (
                  <button
                    key={category.key}
                    onClick={() => onSelectCategory(category.key)}
                    disabled={count === 0}
                    className={`
                      p-6 rounded-sm border-2 transition-all text-center
                      ${category.color}
                      ${count === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer transform hover:scale-105'}
                    `}
                  >
                    <div className="text-5xl mb-3">{category.icon}</div>
                    <div className="text-[17px] font-semibold text-[#1D1D1F] mb-1">
                      {category.label}
                    </div>
                    <div className="text-[12px] text-[#6E6E73] mb-2">
                      {category.description}
                    </div>
                    <div className="text-[13px] font-medium text-[#86868B]">
                      {count === 0 ? 'No salads yet' : `${count} salad${count === 1 ? '' : 's'}`}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E8E8ED] bg-[#FAFAFA]">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded-sm hover:bg-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
