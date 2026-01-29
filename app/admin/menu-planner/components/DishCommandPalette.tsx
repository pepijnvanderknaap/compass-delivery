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
        contextCategory={category}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-sm shadow-2xl border border-[#E8E8ED] w-full max-w-2xl max-h-[600px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-6 border-b border-[#E8E8ED]">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]"
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
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${getCategoryLabel()}...`}
              className="w-full pl-12 pr-20 py-3 text-[17px] border border-[#D2D2D7] rounded-sm focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition-all bg-white text-[#1D1D1F] placeholder:text-[#86868B]"
            />
            <button
              onClick={onClose}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-[#0071E3] hover:text-[#0077ED] font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="mt-3 text-[13px] text-[#86868B]">
            Start typing to find a dish, or create a new one below
          </p>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loadingDishes || loadingUsage ? (
            <div className="p-12 text-center text-[#86868B] text-[15px]">Loading...</div>
          ) : !searchQuery ? (
            /* Empty state - no search entered yet */
            <div className="p-12"></div>
          ) : dishes.length === 0 ? (
            <div className="p-12 text-center text-[#86868B] text-[15px]">
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
                    className="w-full px-4 py-3 flex items-center justify-between rounded-sm transition-colors hover:bg-[#F5F5F7]"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Dish Name */}
                      <span className="text-[15px] font-medium text-[#1D1D1F]">
                        {dish.name}
                      </span>

                      {/* Duplicate Warning */}
                      {usage && (
                        <div className="flex items-center gap-1 group/tooltip relative">
                          <span className="text-[#FF9500] text-lg">⚠⚠</span>
                          {/* Tooltip */}
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block z-10 bg-[#1D1D1F] text-white text-[12px] px-3 py-1.5 rounded-sm shadow-lg whitespace-nowrap">
                            Used on {formatUsageDate(usage.lastUsed)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Portion Size */}
                    <span className="text-[12px] text-[#86868B]">
                      {dish.default_portion_size_ml
                        ? `${dish.default_portion_size_ml}ml`
                        : dish.default_portion_size_g
                        ? `${dish.default_portion_size_g}g`
                        : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Create New Button */}
        <div className="border-t border-[#E8E8ED] p-4">
          <button
            onClick={handleCreateNewDish}
            className="w-full px-4 py-3 flex items-center justify-center gap-2 text-[#0071E3] hover:text-[#0077ED] font-medium text-[15px] transition-colors"
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
            <span>
              Create new {category === 'soup' ? 'soup' : 'dish'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
