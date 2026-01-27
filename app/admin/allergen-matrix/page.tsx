'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Dish } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';

export default function AllergenMatrixPage() {
  const supabase = createClient();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    fetchDishes();
  }, []);

  const fetchDishes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('dishes')
      .select('*')
      .in('category', ['soup', 'hot_dish_meat', 'hot_dish_fish', 'hot_dish_veg'])
      .eq('is_active', true)
      .order('category')
      .order('name');

    if (data) setDishes(data);
    setLoading(false);
  };

  const filteredDishes = dishes.filter((dish) => {
    return filterCategory === 'all' || dish.category === filterCategory;
  });

  const allergenColumns = [
    { key: 'allergen_gluten', label: 'Gluten', shortLabel: 'Glu' },
    { key: 'allergen_soy', label: 'Soy', shortLabel: 'Soy' },
    { key: 'allergen_lactose', label: 'Lactose', shortLabel: 'Lac' },
    { key: 'allergen_sesame', label: 'Sesame', shortLabel: 'Ses' },
    { key: 'allergen_sulphites', label: 'Sulphites', shortLabel: 'Sul' },
    { key: 'allergen_egg', label: 'Egg', shortLabel: 'Egg' },
    { key: 'allergen_mustard', label: 'Mustard', shortLabel: 'Mus' },
    { key: 'allergen_celery', label: 'Celery', shortLabel: 'Cel' },
  ];

  const dietaryColumns = [
    { key: 'contains_pork', label: 'Pork', shortLabel: 'Pork' },
    { key: 'contains_beef', label: 'Beef', shortLabel: 'Beef' },
    { key: 'contains_lamb', label: 'Lamb', shortLabel: 'Lamb' },
    { key: 'is_vegetarian', label: 'Vegetarian', shortLabel: 'Veg' },
    { key: 'is_vegan', label: 'Vegan', shortLabel: 'Vgn' },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 font-apple">
      <AdminQuickNav />

      {/* Header - Hidden when printing */}
      <div className="no-print">
        <UniversalHeader title="Allergen Matrix" backPath="/dark-kitchen" />

        <div className="max-w-7xl mx-auto px-8 lg:px-12 py-6">
          <div className="bg-white border border-slate-300 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-3 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all"
                >
                  <option value="all">All Categories</option>
                  <option value="soup">Soup</option>
                  <option value="hot_dish_meat">Hot Dish - Meat</option>
                  <option value="hot_dish_fish">Hot Dish - Fish</option>
                  <option value="hot_dish_veg">Hot Dish - Veg</option>
                </select>
              </div>

              <button
                onClick={handlePrint}
                className="px-6 py-3 text-apple-subheadline font-medium text-white bg-apple-blue hover:bg-apple-blue-hover rounded-lg transition-colors"
              >
                Print Matrix
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 lg:px-12 py-10 print:px-4">
        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-3xl font-bold text-slate-800 text-center mb-2">
            Allergen & Dietary Information Matrix
          </h1>
          <p className="text-center text-slate-600">
            Compass Group Dark Kitchen - {new Date().toLocaleDateString()}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-apple-gray2 no-print">Loading dishes...</div>
        ) : filteredDishes.length === 0 ? (
          <div className="bg-white border border-slate-300 rounded-lg p-12 text-center no-print">
            <p className="text-apple-subheadline text-apple-gray2">No dishes found.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-300 rounded-lg overflow-hidden print:border-2">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="bg-slate-700">
                    <th className="px-4 py-3 text-left text-white font-semibold border-r border-slate-600 sticky left-0 bg-slate-700 z-10">
                      Dish Name
                    </th>
                    <th className="px-4 py-3 text-left text-white font-semibold border-r border-slate-600 min-w-[120px]">
                      Category
                    </th>
                    {/* Allergens Header */}
                    <th
                      colSpan={allergenColumns.length}
                      className="px-4 py-3 text-center text-white font-semibold border-r border-slate-600 bg-amber-700"
                    >
                      Allergens
                    </th>
                    {/* Dietary Header */}
                    <th
                      colSpan={dietaryColumns.length}
                      className="px-4 py-3 text-center text-white font-semibold bg-green-700"
                    >
                      Dietary Info
                    </th>
                  </tr>
                  <tr className="bg-slate-100">
                    <th className="px-4 py-2 border-b border-slate-300 sticky left-0 bg-slate-100 z-10"></th>
                    <th className="px-4 py-2 border-b border-slate-300"></th>
                    {allergenColumns.map((col) => (
                      <th
                        key={col.key}
                        className="px-2 py-2 text-center text-xs font-semibold text-amber-800 border-l border-slate-300 border-b"
                        title={col.label}
                      >
                        {col.shortLabel}
                      </th>
                    ))}
                    {dietaryColumns.map((col) => (
                      <th
                        key={col.key}
                        className="px-2 py-2 text-center text-xs font-semibold text-green-800 border-l border-slate-300 border-b"
                        title={col.label}
                      >
                        {col.shortLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDishes.map((dish, idx) => (
                    <tr
                      key={dish.id}
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800 border-b border-slate-200 sticky left-0 z-10" style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                        {dish.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 border-b border-slate-200">
                        {dish.category === 'soup' && 'Soup'}
                        {dish.category === 'hot_dish_meat' && 'Hot - Meat'}
                        {dish.category === 'hot_dish_fish' && 'Hot - Fish'}
                        {dish.category === 'hot_dish_veg' && 'Hot - Veg'}
                      </td>
                      {allergenColumns.map((col) => (
                        <td
                          key={col.key}
                          className="px-2 py-3 text-center border-l border-b border-slate-200"
                        >
                          {(dish as any)[col.key] ? (
                            <div className="flex justify-center">
                              <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                                ✓
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}
                      {dietaryColumns.map((col) => (
                        <td
                          key={col.key}
                          className="px-2 py-3 text-center border-l border-b border-slate-200"
                        >
                          {(dish as any)[col.key] ? (
                            <div className="flex justify-center">
                              <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">
                                ✓
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="p-6 bg-slate-50 border-t border-slate-300">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Legend</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-slate-600">
                <div>
                  <p className="font-semibold mb-1">Allergens:</p>
                  {allergenColumns.map((col) => (
                    <p key={col.key}>{col.shortLabel} = {col.label}</p>
                  ))}
                </div>
                <div>
                  <p className="font-semibold mb-1">Dietary Info:</p>
                  {dietaryColumns.map((col) => (
                    <p key={col.key}>{col.shortLabel} = {col.label}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 0.5cm;
            size: landscape;
          }
          table {
            font-size: 10pt;
          }
          th, td {
            padding: 4px 8px !important;
          }
        }
      `}</style>
    </div>
  );
}
