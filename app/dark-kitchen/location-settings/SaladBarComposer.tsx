'use client';

import { useState } from 'react';
import type { LocationSettings } from '@/lib/types';

interface SaladBarElement {
  key: keyof LocationSettings;
  label: string;
  emoji: string;
  defaultPercentage: number;
  color: string;
}

const SALAD_BAR_ELEMENTS: SaladBarElement[] = [
  { key: 'salad_leaves_percentage', label: 'Salad Leaves', emoji: '🥬', defaultPercentage: 0.05, color: '#10b981' },
  { key: 'cucumber_percentage', label: 'Cucumber', emoji: '🥒', defaultPercentage: 0.05, color: '#059669' },
  { key: 'tomato_percentage', label: 'Tomato', emoji: '🍅', defaultPercentage: 0.05, color: '#ef4444' },
  { key: 'carrot_julienne_percentage', label: 'Carrot Julienne', emoji: '🥕', defaultPercentage: 0.05, color: '#f97316' },
  { key: 'radish_julienne_percentage', label: 'Radish', emoji: '🌱', defaultPercentage: 0.05, color: '#ec4899' },
  { key: 'pickled_beetroot_percentage', label: 'Pickled Beetroot', emoji: '🫐', defaultPercentage: 0.05, color: '#a855f7' },
  { key: 'mixed_blanched_veg_percentage', label: 'Blanched Veg', emoji: '🥦', defaultPercentage: 0.07, color: '#22c55e' },
  { key: 'roasted_veg_1_percentage', label: 'Roasted Veg 1', emoji: '🍆', defaultPercentage: 0.07, color: '#8b5cf6' },
  { key: 'roasted_veg_2_percentage', label: 'Roasted Veg 2', emoji: '🫑', defaultPercentage: 0.07, color: '#84cc16' },
  { key: 'roasted_veg_3_percentage', label: 'Roasted Veg 3', emoji: '🌽', defaultPercentage: 0.07, color: '#eab308' },
  { key: 'potato_salad_percentage', label: 'Potato Salad', emoji: '🥔', defaultPercentage: 0.06, color: '#d97706' },
  { key: 'composed_salad_percentage', label: 'Composed Salad', emoji: '🥗', defaultPercentage: 0.16, color: '#14b8a6' },
  { key: 'pasta_salad_percentage', label: 'Pasta Salad', emoji: '🍝', defaultPercentage: 0.16, color: '#f59e0b' },
  { key: 'carb_percentage', label: 'Carb', emoji: '🍞', defaultPercentage: 0.04, color: '#92400e' },
];

interface SaladBarComposerProps {
  settings: LocationSettings;
  onSettingsChange: (settings: LocationSettings) => void;
}

export default function SaladBarComposer({ settings, onSettingsChange }: SaladBarComposerProps) {
  // Initialize percentages from settings or use defaults
  const getPercentage = (key: keyof LocationSettings): number => {
    const value = settings[key] as number | null | undefined;
    const defaultValue = SALAD_BAR_ELEMENTS.find(el => el.key === key)?.defaultPercentage || 0;
    return value !== null && value !== undefined ? value : defaultValue;
  };

  const [localPercentages, setLocalPercentages] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    SALAD_BAR_ELEMENTS.forEach(element => {
      initial[element.key] = getPercentage(element.key);
    });
    return initial;
  });

  // Handle slider change with proportional adjustment
  const handleSliderChange = (changedKey: keyof LocationSettings, newValue: number) => {
    const clampedValue = Math.max(0, Math.min(1, newValue));
    const oldValue = localPercentages[changedKey] || 0;
    const delta = clampedValue - oldValue;

    if (delta === 0) return;

    const otherElements = SALAD_BAR_ELEMENTS.filter(el => el.key !== changedKey);
    const otherElementsSum = otherElements.reduce((sum, el) => sum + (localPercentages[el.key] || 0), 0);

    const newPercentages: Record<string, number> = {
      [changedKey]: clampedValue,
    };

    if (otherElementsSum > 0) {
      const remainingTotal = 1 - clampedValue;
      otherElements.forEach(element => {
        const currentValue = localPercentages[element.key] || 0;
        const proportion = currentValue / otherElementsSum;
        newPercentages[element.key] = remainingTotal * proportion;
      });
    } else {
      const equalShare = (1 - clampedValue) / otherElements.length;
      otherElements.forEach(element => {
        newPercentages[element.key] = equalShare;
      });
    }

    setLocalPercentages(newPercentages);

    const updatedSettings = { ...settings };
    Object.entries(newPercentages).forEach(([key, value]) => {
      (updatedSettings as any)[key] = value;
    });
    onSettingsChange(updatedSettings);
  };

  const totalPortionSize = settings.salad_bar_portion_size_g || 240;

  const handleResetToDefaults = () => {
    const defaultPercentages: Record<string, number> = {};
    SALAD_BAR_ELEMENTS.forEach(element => {
      defaultPercentages[element.key] = element.defaultPercentage;
    });

    setLocalPercentages(defaultPercentages);

    const updatedSettings = { ...settings };
    Object.entries(defaultPercentages).forEach(([key, value]) => {
      (updatedSettings as any)[key] = value;
    });
    onSettingsChange(updatedSettings);
  };

  return (
    <div className="space-y-4">
      {/* Compact Visual Bar */}
      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Mix Preview
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefaults}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Reset to Default
            </button>
            <div className="text-xs text-gray-600">
              <span className="font-bold text-blue-700">{totalPortionSize}g</span> total
            </div>
          </div>
        </div>

        <div className="h-6 rounded overflow-hidden flex">
          {SALAD_BAR_ELEMENTS.map((element) => {
            const percentage = localPercentages[element.key] || 0;
            if (percentage === 0) return null;

            return (
              <div
                key={element.key}
                className="transition-all duration-500 hover:opacity-80 cursor-pointer relative group"
                style={{
                  width: `${percentage * 100}%`,
                  backgroundColor: element.color,
                }}
                title={`${element.label}: ${Math.round(percentage * totalPortionSize)}g`}
              >
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                  {element.label}: {Math.round(percentage * totalPortionSize)}g
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ultra-Compact Grid */}
      <div className="grid grid-cols-2 gap-2">
        {SALAD_BAR_ELEMENTS.map((element) => {
          const percentage = localPercentages[element.key] || 0;
          const weight = Math.round(percentage * totalPortionSize);

          return (
            <div key={element.key} className="bg-white border border-gray-200 rounded-md p-2 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: element.color }}
                  />
                  <span className="font-medium text-gray-800 text-xs">
                    {element.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-sm font-bold" style={{ color: element.color }}>
                    {weight}
                  </span>
                  <span className="text-[10px] text-gray-500">g</span>
                </div>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={percentage * 100}
                  onChange={(e) => handleSliderChange(element.key, parseFloat(e.target.value) / 100)}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${element.color} 0%, ${element.color} ${percentage * 100}%, #e5e7eb ${percentage * 100}%, #e5e7eb 100%)`,
                  }}
                />
                <div className="mt-0.5">
                  <span className="text-[10px] font-medium" style={{ color: element.color }}>
                    {(percentage * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Minimal info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
        <p className="text-[10px] text-blue-800">
          <span className="font-semibold">Tip:</span> Drag sliders to adjust - others auto-rebalance to 100%
        </p>
      </div>
    </div>
  );
}
