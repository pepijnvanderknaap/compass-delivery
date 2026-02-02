'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { WarmVeggieCategory } from './WarmVeggieCategoryModal';

interface WarmVeggieAllergens {
  allergen_gluten: boolean;
  allergen_soy: boolean;
  allergen_lactose: boolean;
  allergen_sesame: boolean;
  allergen_sulphites: boolean;
  allergen_egg: boolean;
  allergen_mustard: boolean;
  allergen_celery: boolean;
  allergen_fish: boolean;
  allergen_shellfish: boolean;
  allergen_nuts: boolean;
  allergen_peanuts: boolean;
}

interface WarmVeggieCombination extends WarmVeggieAllergens {
  id: string;
  name: string;
  description: string | null;
  component_count: number;
  components: Array<{
    component_name: string;
    percentage: number;
  }>;
}

interface WarmVeggieSelectionModalProps {
  isOpen: boolean;
  category: WarmVeggieCategory | null;
  onClose: () => void;
  onBack: () => void;
  onSelect: (warmVeggieId: string, components: Array<{component_name: string; percentage: number}>) => void;
}

const allergenLabels: Record<keyof WarmVeggieAllergens, string> = {
  allergen_gluten: 'Gluten',
  allergen_soy: 'Soy',
  allergen_lactose: 'Lactose',
  allergen_sesame: 'Sesame',
  allergen_sulphites: 'Sulphites',
  allergen_egg: 'Egg',
  allergen_mustard: 'Mustard',
  allergen_celery: 'Celery',
  allergen_fish: 'Fish',
  allergen_shellfish: 'Shellfish',
  allergen_nuts: 'Nuts',
  allergen_peanuts: 'Peanuts',
};

export default function WarmVeggieSelectionModal({
  isOpen,
  category,
  onClose,
  onBack,
  onSelect,
}: WarmVeggieSelectionModalProps) {
  const supabase = createClient();
  const [warmVeggies, setWarmVeggies] = useState<WarmVeggieCombination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && category) {
      fetchWarmVeggies();
    }
  }, [isOpen, category]);

  const fetchWarmVeggies = async () => {
    if (!category) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('v_warm_veggie_combinations_full')
      .select('*')
      .eq('category', category)
      .order('name');

    if (error) {
      console.error('Error fetching warm veggie combinations:', error);
    } else {
      setWarmVeggies(data || []);
    }
    setLoading(false);
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

  if (!isOpen || !category) return null;

  const getCategoryLabel = (cat: WarmVeggieCategory) => {
    const labels = {
      root: '🥕 Root Vegetables',
      green: '🥦 Green Vegetables',
      other: '🍆 Other',
    };
    return labels[cat];
  };

  const getAllergens = (warmVeggie: WarmVeggieCombination): string[] => {
    return Object.entries(allergenLabels)
      .filter(([key]) => warmVeggie[key as keyof WarmVeggieAllergens])
      .map(([_, label]) => label);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-sm shadow-2xl border border-[#E8E8ED] w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E8E8ED]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="text-[#86868B] hover:text-[#1D1D1F] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-[22px] font-semibold text-[#1D1D1F]">
                {getCategoryLabel(category)}
              </h2>
            </div>
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
          {loading ? (
            <div className="text-center py-8 text-[#86868B]">
              Loading warm vegetables...
            </div>
          ) : warmVeggies.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-[#86868B] text-[15px] mb-4">
                No warm vegetables found in this category
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {warmVeggies.map((warmVeggie) => {
                const allergens = getAllergens(warmVeggie);
                return (
                  <button
                    key={warmVeggie.id}
                    onClick={() => onSelect(warmVeggie.id, warmVeggie.components)}
                    className="w-full p-5 border border-[#E8E8ED] rounded-sm hover:border-[#0071E3] hover:bg-[#F5F5F7] transition-all text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-[17px] font-semibold text-[#1D1D1F] mb-1">
                          {warmVeggie.name}
                        </div>
                        {warmVeggie.description && (
                          <div className="text-[13px] text-[#6E6E73] mb-2">
                            {warmVeggie.description}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {warmVeggie.components.map((comp, idx) => (
                            <span
                              key={idx}
                              className="text-[12px] px-2 py-1 bg-[#F5F5F7] text-[#6E6E73] rounded"
                            >
                              {comp.component_name} ({comp.percentage}%)
                            </span>
                          ))}
                        </div>
                        {allergens.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {allergens.map((allergen) => (
                              <span
                                key={allergen}
                                className="text-[11px] px-2 py-0.5 bg-[#FF3B30]/10 text-[#FF3B30] rounded-full border border-[#FF3B30]/20"
                              >
                                {allergen}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-[#86868B] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
