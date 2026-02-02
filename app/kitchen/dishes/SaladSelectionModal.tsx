'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SaladCategory } from './SaladCategoryModal';

interface SaladComponent {
  component_name: string;
  percentage: number;
}

interface SaladAllergens {
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

interface SaladCombination extends SaladAllergens {
  id: string;
  category: SaladCategory;
  name: string;  // custom_name from database
  description: string | null;
  components: SaladComponent[];
  component_count: number;
}

interface SaladSelectionModalProps {
  isOpen: boolean;
  category?: SaladCategory;
  onClose: () => void;
  onBack?: () => void;
  onSelect: (saladComboId: string, components: SaladComponent[]) => void;
}

const categoryLabels: Record<SaladCategory, string> = {
  leafy: 'Leafy Salads',
  vegetable: 'Vegetable Salads',
  coleslaw: 'Coleslaws',
};

const allergenIcons: Record<keyof SaladAllergens, { icon: string; label: string }> = {
  allergen_gluten: { icon: '🌾', label: 'Gluten' },
  allergen_soy: { icon: '🫘', label: 'Soy' },
  allergen_lactose: { icon: '🧀', label: 'Lactose' },
  allergen_sesame: { icon: '🌱', label: 'Sesame' },
  allergen_sulphites: { icon: '🍇', label: 'Sulphites' },
  allergen_egg: { icon: '🥚', label: 'Egg' },
  allergen_mustard: { icon: '🌭', label: 'Mustard' },
  allergen_celery: { icon: '🌿', label: 'Celery' },
  allergen_fish: { icon: '🐟', label: 'Fish' },
  allergen_shellfish: { icon: '🦐', label: 'Shellfish' },
  allergen_nuts: { icon: '🥜', label: 'Nuts' },
  allergen_peanuts: { icon: '🥜', label: 'Peanuts' },
};

export default function SaladSelectionModal({
  isOpen,
  category,
  onClose,
  onBack,
  onSelect,
}: SaladSelectionModalProps) {
  const supabase = createClient();
  const [salads, setSalads] = useState<SaladCombination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchSalads();
    }
  }, [isOpen]);

  const fetchSalads = async () => {
    setLoading(true);
    try {
      // Fetch all salads without category filter
      const { data, error } = await supabase
        .from('v_salad_combinations_full')
        .select('*')
        .order('name');

      if (error) throw error;

      setSalads((data || []) as SaladCombination[]);
    } catch (error) {
      console.error('Error fetching salads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAllergens = (salad: SaladCombination): string[] => {
    const allergens: string[] = [];
    Object.entries(allergenIcons).forEach(([key, { label }]) => {
      if (salad[key as keyof SaladAllergens]) {
        allergens.push(label);
      }
    });
    return allergens;
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
        className="bg-white rounded-sm shadow-2xl border border-[#E8E8ED] w-full max-w-5xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E8E8ED]">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-semibold text-[#1D1D1F]">
              Select Salad
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
            Select a salad combination to add to your dish
          </p>
        </div>

        {/* Salad Cards Grid */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#86868B]">Loading salads...</div>
            </div>
          ) : salads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-[#86868B] text-center">
                <div className="text-[17px] font-medium mb-2">No salads in this category yet</div>
                <div className="text-[13px]">Create a new salad to get started</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {salads.map((salad) => {
                const allergens = getAllergens(salad);
                return (
                  <button
                    key={salad.id}
                    onClick={() => onSelect(salad.id, salad.components)}
                    className="text-left p-5 rounded-sm border-2 border-[#E8E8ED] hover:border-[#0071E3] hover:bg-[#F5F5F7] transition-all group"
                  >
                    {/* Salad Name */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[17px] font-semibold text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors">
                        {salad.name}
                      </h3>
                      <svg
                        className="w-5 h-5 text-[#D2D2D7] group-hover:text-[#0071E3] transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>

                    {/* Allergens (if any) */}
                    {allergens.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {allergens.map((allergen) => (
                          <span
                            key={allergen}
                            className="px-2 py-0.5 text-[11px] font-medium bg-red-100 text-red-700 rounded-full"
                          >
                            {allergen}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Components List */}
                    <div className="space-y-1.5">
                      {salad.components.map((comp, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[13px]">
                          <span className="text-[#6E6E73]">• {comp.component_name}</span>
                          <span className="text-[#1D1D1F] font-medium">{comp.percentage}%</span>
                        </div>
                      ))}
                    </div>

                    {/* Description (if exists) */}
                    {salad.description && (
                      <div className="mt-3 pt-3 border-t border-[#E8E8ED]">
                        <p className="text-[12px] text-[#86868B] italic">{salad.description}</p>
                      </div>
                    )}
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
