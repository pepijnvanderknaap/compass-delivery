'use client';

import { useState, useEffect, useRef } from 'react';
import { useDishSearch } from '../hooks/useDishSearch';
import { useRecentDishes } from '../hooks/useRecentDishes';
import { format } from 'date-fns';
import MainDishForm from '../../dishes/MainDishForm';

interface DishCommandPaletteProps {
  category: string;
  onSelect: (dishId: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function DishCommandPalette({
  category,
  onSelect,
  onClose,
  isOpen,
}: DishCommandPaletteProps) {
  const { usedDishes, loading: loadingUsage } = useRecentDishes();
  const { dishes, searchQuery, setSearchQuery, loading: loadingDishes } = useDishSearch({
    category,
    usedDishes,
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setShowCreateForm(false);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Keyboard navigation - only Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (showCreateForm) {
          setShowCreateForm(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showCreateForm]);

  const handleSelectDish = (dishId: string) => {
    onSelect(dishId);
    onClose();
  };

  const handleCreateNewDish = () => {
    setShowCreateForm(true);
  };

  const handleDishCreated = (dishId?: string) => {
    setShowCreateForm(false);
    // If we have a dishId, automatically select it
    if (dishId) {
      onSelect(dishId);
    }
    onClose();
  };

  const getCategoryLabel = () => {
    switch (category) {
      case 'soup':
        return 'soups';
      case 'hot_dish_meat':
        return 'meat dishes';
      case 'hot_dish_fish':
        return 'fish dishes';
      case 'hot_dish_veg':
        return 'vegetarian dishes';
      default:
        return 'dishes';
    }
  };

  const formatUsageDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d');
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  if (showCreateForm) {
    return (
      <MainDishForm
        dish={null}
        onClose={() => setShowCreateForm(false)}
        onSave={handleDishCreated}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm font-apple"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-slate-300 w-full max-w-2xl max-h-[500px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Cancel Button */}
        <div className="p-5 border-b border-slate-300">
          <div className="flex justify-end mb-4">
            <button
              onClick={onClose}
              className="px-6 py-2 text-apple-subheadline font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              
            >
              Cancel
            </button>
          </div>
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${getCategoryLabel()}...`}
              className="w-full px-4 py-3 pl-10 text-apple-body border border-slate-300 rounded-lg focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all bg-white text-slate-700"
            />
            <svg
              className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loadingDishes || loadingUsage ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : !searchQuery ? (
            /* Empty state - no search entered yet */
            <div className="p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-apple-body text-slate-500 mb-2">Start typing to search {getCategoryLabel()}</p>
              <p className="text-apple-subheadline text-slate-400">or create a new one below</p>
            </div>
          ) : dishes.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No {getCategoryLabel()} found matching "{searchQuery}"
            </div>
          ) : (
            <div className="space-y-1">
              {dishes.map((dish, index) => {
                const usage = usedDishes.get(dish.id);

                return (
                  <button
                    key={dish.id}
                    onClick={() => handleSelectDish(dish.id)}
                    className="w-full px-4 py-3 flex items-center justify-between rounded-lg transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Dish Name */}
                      <span className="text-apple-subheadline font-medium text-slate-700">
                        {dish.name}
                      </span>

                      {/* Duplicate Warning */}
                      {usage && (
                        <div className="flex items-center gap-1 group/tooltip relative">
                          <span className="text-apple-orange text-lg">⚠⚠</span>
                          {/* Tooltip - shows above the icons */}
                          <div className="absolute left-0 bottom-full mb-1 hidden group-hover/tooltip:block z-10 bg-slate-700 text-white text-apple-caption px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                            Used on {formatUsageDate(usage.lastUsed)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Portion Size */}
                    <span className="text-apple-caption text-slate-500">
                      {dish.default_portion_size_ml
                        ? `[${dish.default_portion_size_ml}ml]`
                        : dish.default_portion_size_g
                        ? `[${dish.default_portion_size_g}g]`
                        : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Create New Button - Always visible at bottom */}
        <div className="border-t border-slate-300 p-3">
          <button
            onClick={handleCreateNewDish}
            className="w-full px-4 py-3 flex items-center justify-center gap-2 rounded-lg transition-colors bg-[#4A7DB5] text-white hover:bg-[#3A6DA2]"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-apple-subheadline font-medium">
              Create new {category === 'soup' ? 'soup' : 'dish'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
