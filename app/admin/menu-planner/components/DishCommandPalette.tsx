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
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[600px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${getCategoryLabel()}...`}
              className="w-full px-4 py-3 pl-10 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-4 w-5 h-5 text-gray-400"
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
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              Use ↑↓ to navigate, Enter to select, Esc to close
            </p>
            <button
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1 border rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto">
          {loadingDishes || loadingUsage ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : dishes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No {getCategoryLabel()} found
            </div>
          ) : (
            <div className="py-2">
              {dishes.map((dish, index) => {
                const usage = usedDishes.get(dish.id);
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={dish.id}
                    onClick={() => handleSelectDish(dish.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {/* Dish Name */}
                      <span className="text-sm font-medium text-gray-900">
                        {dish.name}
                      </span>

                      {/* Duplicate Warning */}
                      {usage && (
                        <div className="flex items-center gap-1 group relative">
                          <span className="text-red-500 text-lg">⚠⚠</span>
                          {/* Tooltip - shows above the icons */}
                          <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-10 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            Used on {formatUsageDate(usage.lastUsed)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Portion Size */}
                    <span className="text-xs text-gray-500">
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
                className={`w-full px-4 py-3 flex items-center gap-2 text-blue-600 hover:bg-blue-50 transition-colors border-t border-gray-200 mt-2 ${
                  selectedIndex === dishes.length ? 'bg-blue-50' : ''
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
                <span className="text-sm font-medium">
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
