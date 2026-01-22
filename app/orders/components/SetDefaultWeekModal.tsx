'use client';

import { useState, useEffect } from 'react';
import { saveDefaultWeekTemplate, getDefaultWeekTemplate } from '../actions';

interface SetDefaultWeekModalProps {
  locationId: string;
  locationName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SetDefaultWeekModal({
  locationId,
  locationName,
  isOpen,
  onClose
}: SetDefaultWeekModalProps) {
  const [defaults, setDefaults] = useState<Record<number, {
    soup: number;
    hot_dish_meat_fish: number;
    hot_dish_veg: number;
  }>>({
    1: { soup: 0, hot_dish_meat_fish: 0, hot_dish_veg: 0 },
    2: { soup: 0, hot_dish_meat_fish: 0, hot_dish_veg: 0 },
    3: { soup: 0, hot_dish_meat_fish: 0, hot_dish_veg: 0 },
    4: { soup: 0, hot_dish_meat_fish: 0, hot_dish_veg: 0 },
    5: { soup: 0, hot_dish_meat_fish: 0, hot_dish_veg: 0 },
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadExistingDefaults();
    }
  }, [isOpen, locationId]);

  const loadExistingDefaults = async () => {
    setLoading(true);
    const result = await getDefaultWeekTemplate(locationId);

    if (result.data && result.data.length > 0) {
      const loadedDefaults: typeof defaults = {
        1: { soup: 0, hot_dish_meat_fish: 0, hot_dish_veg: 0 },
        2: { soup: 0, hot_dish_meat_fish: 0, hot_dish_veg: 0 },
        3: { soup: 0, hot_dish_meat_fish: 0, hot_dish_veg: 0 },
        4: { soup: 0, hot_dish_meat_fish: 0, hot_dish_veg: 0 },
        5: { soup: 0, hot_dish_meat_fish: 0, hot_dish_veg: 0 },
      };

      result.data.forEach(template => {
        loadedDefaults[template.day_of_week] = {
          soup: template.soup,
          hot_dish_meat_fish: template.hot_dish_meat_fish,
          hot_dish_veg: template.hot_dish_veg,
        };
      });

      setDefaults(loadedDefaults);
    }
    setLoading(false);
  };

  const handleChange = (day: number, category: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const finalValue = Math.max(0, numValue);

    setDefaults(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [category]: finalValue
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const templates = Object.entries(defaults).map(([day, values]) => ({
        day_of_week: parseInt(day),
        ...values
      }));

      const result = await saveDefaultWeekTemplate(locationId, templates);

      if (result.error) {
        alert(`Failed to save: ${result.error}`);
      } else {
        alert('Default week template saved successfully!');
        onClose();
      }
    } catch (err) {
      console.error('Error saving defaults:', err);
      alert('Failed to save default week template');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const categories = [
    { key: 'soup', label: 'Soup' },
    { key: 'hot_dish_meat_fish', label: 'Hot Dish Meat/Fish' },
    { key: 'hot_dish_veg', label: 'Hot Dish Veg' }
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200">
          <h2 className="text-apple-title-lg text-apple-gray1">Set Default Week for {locationName}</h2>
          <p className="text-apple-subheadline text-apple-gray2 mt-1">
            These values will automatically populate new weeks. Managers can adjust them as needed.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-apple-blue"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map((day) => (
                <div key={day} className="border border-slate-200 rounded-xl p-5">
                  <h3 className="text-apple-headline text-apple-gray1 mb-4">{dayNames[day - 1]}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {categories.map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">
                          {label}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={defaults[day][key as keyof typeof defaults[1]]}
                          onChange={(e) => handleChange(day, key, e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg text-apple-subheadline focus:outline-none focus:ring-2 focus:ring-apple-blue/20 focus:border-apple-blue"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 text-apple-subheadline font-medium text-apple-gray1 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-3 text-apple-subheadline font-medium text-white bg-apple-blue hover:bg-apple-blue-hover rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Default Week'}
          </button>
        </div>
      </div>
    </div>
  );
}
