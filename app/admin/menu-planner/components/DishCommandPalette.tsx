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

  const [selectedIndex, setSelectedIndex] = useState(0);
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
      setSelectedIndex(0);
      setShowCreateForm(false);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, dishes.length));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex === dishes.length) {
            // Create new dish
            setShowCreateForm(true);
          } else if (dishes[selectedIndex]) {
            handleSelectDish(dishes[selectedIndex].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (showCreateForm) {
            setShowCreateForm(false);
          } else {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, dishes, showCreateForm]);

  const handleSelectDish = (dishId: string) => {
    onSelect(dishId);
    onClose();
  };

  const handleCreateNewDish = () => {
    setShowCreateForm(true);
  };

  const handleDishCreated = () => {
    setShowCreateForm(false);
    // Refresh the dish list to include newly created dish
    // Close palette - user will need to reopen to select the new dish
    onClose();
  };

  const getCategoryLabel = () => {
    switch (category) {
      case 'soup':
        return 'soups';
      case 'hot_dish_meat':
        return 'meat & fish dishes';
      case 'hot_dish_fish':
        return 'fish dishes';
      case 'hot_dish_veg':
        return 'vegetarian dishes';
      case 'salad_bar':
        return 'salad bar items';
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/30 backdrop-blur-sm font-apple"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-apple-xl border border-apple-gray5 w-full max-w-2xl max-h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-5 border-b border-apple-gray5">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${getCategoryLabel()}...`}
              className="w-full px-4 py-3 pl-10 text-apple-body border border-apple-gray4 rounded-lg focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
            />
            <svg
              className="absolute left-3 top-3.5 w-5 h-5 text-apple-gray3"
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
          <div className="flex items-center justify-between mt-3">
            <p className="text-apple-footnote text-apple-gray3">
              Use ↑↓ to navigate, Enter to select, Esc to close
            </p>
            <button
              onClick={onClose}
              className="text-apple-subheadline font-medium text-apple-blue hover:text-apple-blue-hover transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loadingDishes || loadingUsage ? (
            <div className="p-8 text-center text-apple-gray3">Loading...</div>
          ) : dishes.length === 0 ? (
            <div className="p-8 text-center text-apple-gray3">
              No {getCategoryLabel()} found
            </div>
          ) : (
            <div className="space-y-1">
              {dishes.map((dish, index) => {
                const usage = usedDishes.get(dish.id);
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={dish.id}
                    onClick={() => handleSelectDish(dish.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-4 py-3 flex items-center justify-between rounded-lg transition-colors ${
                      isSelected ? 'bg-[#E8F4FF]' : 'hover:bg-apple-gray6'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Dish Name */}
                      <span className="text-apple-subheadline font-medium text-apple-gray1">
                        {dish.name}
                      </span>

                      {/* Duplicate Warning */}
                      {usage && (
                        <div className="flex items-center gap-1 group/tooltip relative">
                          <span className="text-apple-orange text-lg">⚠⚠</span>
                          {/* Tooltip - shows above the icons */}
                          <div className="absolute left-0 bottom-full mb-1 hidden group-hover/tooltip:block z-10 bg-apple-gray1 text-white text-apple-caption px-3 py-1.5 rounded-lg shadow-apple-md whitespace-nowrap">
                            Used on {formatUsageDate(usage.lastUsed)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Portion Size */}
                    <span className="text-apple-caption text-apple-gray3">
                      {dish.default_portion_size_ml
                        ? `[${dish.default_portion_size_ml}ml]`
                        : dish.default_portion_size_g
                        ? `[${dish.default_portion_size_g}g]`
                        : ''}
                    </span>
                  </button>
                );
              })}

              {/* Create New Option */}
              <button
                onClick={handleCreateNewDish}
                onMouseEnter={() => setSelectedIndex(dishes.length)}
                className={`w-full px-4 py-3 flex items-center gap-2 text-apple-blue rounded-lg transition-colors border-t border-apple-gray5 mt-2 pt-4 ${
                  selectedIndex === dishes.length ? 'bg-[#E8F4FF]' : 'hover:bg-apple-gray6'
                }`}
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
          )}
        </div>
      </div>
    </div>
  );
}
