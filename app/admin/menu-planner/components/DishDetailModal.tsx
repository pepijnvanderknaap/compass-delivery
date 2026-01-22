'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DishWithComponents, SaladComponentWithDish, WarmVeggieComponentWithDish } from '@/lib/types';

interface DishDetailModalProps {
  dishId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (dish: DishWithComponents) => void;
  onReplace: () => void;
}

export default function DishDetailModal({
  dishId,
  isOpen,
  onClose,
  onEdit,
  onReplace
}: DishDetailModalProps) {
  const [dish, setDish] = useState<DishWithComponents | null>(null);
  const [saladComponents, setSaladComponents] = useState<SaladComponentWithDish[]>([]);
  const [warmVeggieComponents, setWarmVeggieComponents] = useState<WarmVeggieComponentWithDish[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && dishId) {
      fetchDishDetails();
    }
  }, [isOpen, dishId]);

  const fetchDishDetails = async () => {
    if (!dishId) return;

    setLoading(true);

    // Fetch dish
    const { data: dishData } = await supabase
      .from('dishes')
      .select('*')
      .eq('id', dishId)
      .single();

    if (!dishData) {
      setLoading(false);
      return;
    }

    // Fetch components
    const { data: componentLinks } = await supabase
      .from('dish_components')
      .select('component_dish_id, component_type')
      .eq('main_dish_id', dishId);

    if (componentLinks && componentLinks.length > 0) {
      const componentIds = componentLinks.map(c => c.component_dish_id);
      const { data: componentsData } = await supabase
        .from('dishes')
        .select('*')
        .in('id', componentIds);

      if (componentsData) {
        // Group components by type
        const components: DishWithComponents['components'] = {
          topping: [],
          carb: [],
          warm_veggie: [],
          salad: [],
          condiment: [],
        };

        componentLinks.forEach(link => {
          const component = componentsData.find(c => c.id === link.component_dish_id);
          if (component && link.component_type in components) {
            const componentType = link.component_type as keyof typeof components;
            components[componentType]?.push(component);
          }
        });

        setDish({ ...dishData, components });
      } else {
        setDish(dishData);
      }
    } else {
      setDish(dishData);
    }

    // Fetch salad components with percentages
    const { data: saladComponentsData } = await supabase
      .from('salad_components')
      .select('*, component_dish:dishes!component_dish_id(*)')
      .eq('main_dish_id', dishId);

    if (saladComponentsData) {
      setSaladComponents(saladComponentsData as SaladComponentWithDish[]);
    }

    // Fetch warm veggie components with percentages
    const { data: warmVeggieComponentsData } = await supabase
      .from('warm_veggie_components')
      .select('*, component_dish:dishes!component_dish_id(*)')
      .eq('main_dish_id', dishId);

    if (warmVeggieComponentsData) {
      setWarmVeggieComponents(warmVeggieComponentsData as WarmVeggieComponentWithDish[]);
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  const handleEdit = () => {
    if (dish) {
      onEdit(dish);
    }
  };

  const handleReplace = () => {
    onReplace();
  };

  const componentTypeLabels = {
    topping: 'Topping',
    carb: 'Carbohydrate',
    warm_veggie: 'Warm Vegetable',
    salad: 'Salad',
    condiment: 'Condiment',
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-apple-blue"></div>
        </div>
      ) : dish ? (
        <div className="w-full max-w-sm flex flex-col gap-2">
          {/* 1. Header Box - No border */}
          <div className="rounded-xl bg-[#4A7DB5] relative overflow-hidden">
            <div className="px-6 py-8">
              <h2 className="text-[32px] leading-tight font-semibold text-white text-center">{dish.name}</h2>
              {dish.description && (
                <p className="text-apple-body text-white/90 mt-3 text-center">{dish.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 2. Content Card with buttons inside - No border */}
          <div className="rounded-xl bg-white overflow-y-auto max-h-[60vh]">
            <div className="px-6 py-6">
              {/* Components - Simple vertical list */}
              {(dish.components && Object.values(dish.components).some(arr => arr && arr.length > 0)) || saladComponents.length > 0 || warmVeggieComponents.length > 0 ? (
                <div>
                  {/* Show "Served with" label before components */}
                  <h3 className="text-apple-footnote font-medium italic text-apple-gray3 mb-4 text-center">
                    Served with
                  </h3>

                  {/* All components - no category labels, just the names - Bigger text */}
                  <div className="space-y-2">
                    {dish.components && Object.entries(dish.components).map(([type, items]) => {
                      if (!items || items.length === 0) return null;

                      return items.map(component => (
                        <div
                          key={component.id}
                          className="text-[22px] text-apple-gray1 text-center py-1.5"
                        >
                          {component.name}
                        </div>
                      ));
                    })}

                    {/* Salad components with percentages */}
                    {saladComponents.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="text-[17px] font-medium text-apple-gray2 text-center mb-2">Salad</div>
                        {saladComponents.map(sc => (
                          <div
                            key={sc.id}
                            className="text-[18px] text-apple-gray1 text-center py-1"
                          >
                            {sc.component_dish.name} ({sc.percentage}%)
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Warm veggie components with percentages */}
                    {warmVeggieComponents.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="text-[17px] font-medium text-apple-gray2 text-center mb-2">Warm Vegetables</div>
                        {warmVeggieComponents.map(wv => (
                          <div
                            key={wv.id}
                            className="text-[18px] text-apple-gray1 text-center py-1"
                          >
                            {wv.component_dish.name} ({wv.percentage}%)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-apple-subheadline text-apple-gray3 text-center py-8">
                  No components
                </div>
              )}

              {/* Allergens (if any) - Less prominent */}
              {(dish.allergen_gluten || dish.allergen_soy || dish.allergen_lactose ||
                dish.allergen_sesame || dish.allergen_sulphites || dish.allergen_egg ||
                dish.allergen_mustard || dish.allergen_celery) && (
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h3 className="text-apple-subheadline font-medium text-apple-gray2 mb-3 text-center">Allergens</h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {dish.allergen_gluten && (
                      <span className="px-2.5 py-1 bg-amber-100 text-[11px] font-medium text-amber-800 rounded-full">
                        Gluten
                      </span>
                    )}
                    {dish.allergen_soy && (
                      <span className="px-2.5 py-1 bg-amber-100 text-[11px] font-medium text-amber-800 rounded-full">
                        Soy
                      </span>
                    )}
                    {dish.allergen_lactose && (
                      <span className="px-2.5 py-1 bg-amber-100 text-[11px] font-medium text-amber-800 rounded-full">
                        Lactose
                      </span>
                    )}
                    {dish.allergen_sesame && (
                      <span className="px-2.5 py-1 bg-amber-100 text-[11px] font-medium text-amber-800 rounded-full">
                        Sesame
                      </span>
                    )}
                    {dish.allergen_sulphites && (
                      <span className="px-2.5 py-1 bg-amber-100 text-[11px] font-medium text-amber-800 rounded-full">
                        Sulphites
                      </span>
                    )}
                    {dish.allergen_egg && (
                      <span className="px-2.5 py-1 bg-amber-100 text-[11px] font-medium text-amber-800 rounded-full">
                        Egg
                      </span>
                    )}
                    {dish.allergen_mustard && (
                      <span className="px-2.5 py-1 bg-amber-100 text-[11px] font-medium text-amber-800 rounded-full">
                        Mustard
                      </span>
                    )}
                    {dish.allergen_celery && (
                      <span className="px-2.5 py-1 bg-amber-100 text-[11px] font-medium text-amber-800 rounded-full">
                        Celery
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Buttons inside the card - side by side - Always visible */}
            <div className="px-6 pb-6 pt-6 border-t border-slate-200">
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleEdit}
                  className="flex-1 max-w-[140px] px-6 py-3 text-[16px] font-semibold text-[#1D1D1F] bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleReplace}
                  className="flex-1 max-w-[140px] px-6 py-3 text-[16px] font-semibold text-[#1D1D1F] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Replace
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-24">
          <p className="text-apple-subheadline text-apple-gray3">Dish not found</p>
        </div>
      )}
    </div>
  );
}
