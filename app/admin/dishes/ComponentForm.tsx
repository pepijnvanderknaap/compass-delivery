'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Dish, DishSubcategory } from '@/lib/types';

interface ComponentFormProps {
  component: Dish | null;
  onClose: () => void;
  onSave: () => void;
}

export default function ComponentForm({ component, onClose, onSave }: ComponentFormProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    photo_url: '',
    subcategory: 'carb' as DishSubcategory,
    portion_size: '',
    portion_unit: 'grams' as 'pieces' | 'grams' | 'kilograms' | 'milliliters' | 'liters' | 'trays',
    allergen_gluten: false,
    allergen_soy: false,
    allergen_lactose: false,
    allergen_sesame: false,
    allergen_sulphites: false,
    allergen_egg: false,
    allergen_mustard: false,
    allergen_celery: false,
    allergen_fish: false,
    allergen_shellfish: false,
    allergen_nuts: false,
    allergen_peanuts: false,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Media and description toggle
  const [showMediaSection, setShowMediaSection] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (component) {
      // Open media section if component has photo or description
      if (component.description || (component as any).photo_url) {
        setShowMediaSection(true);
      }

      setFormData({
        name: component.name,
        description: component.description || '',
        photo_url: (component as any).photo_url || '',
        subcategory: component.subcategory as DishSubcategory,
        portion_size: component.portion_size ? String(component.portion_size) : '',
        portion_unit: (component.portion_unit || 'grams') as any,
        allergen_gluten: component.allergen_gluten || false,
        allergen_soy: component.allergen_soy || false,
        allergen_lactose: component.allergen_lactose || false,
        allergen_sesame: component.allergen_sesame || false,
        allergen_sulphites: component.allergen_sulphites || false,
        allergen_egg: component.allergen_egg || false,
        allergen_mustard: component.allergen_mustard || false,
        allergen_celery: component.allergen_celery || false,
        allergen_fish: (component as any).allergen_fish || false,
        allergen_shellfish: (component as any).allergen_shellfish || false,
        allergen_nuts: (component as any).allergen_nuts || false,
        allergen_peanuts: (component as any).allergen_peanuts || false,
      });
    }
  }, [component]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Prepare data with converted types
      const dataToSave = {
        ...formData,
        portion_size: formData.portion_size ? parseFloat(formData.portion_size) : null,
      };

      if (component) {
        // Update existing component
        const { error } = await supabase
          .from('dishes')
          .update(dataToSave)
          .eq('id', component.id);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Component updated!' });
      } else {
        // Create new component
        const { error } = await supabase
          .from('dishes')
          .insert([{ ...dataToSave, category: 'component', is_active: true }]);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Component created!' });
      }

      setTimeout(() => {
        onSave();
        onClose();
      }, 1000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `dish-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('dishes')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('dishes')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, photo_url: publicUrl }));
      setMessage({ type: 'success', text: 'Photo uploaded successfully!' });
    } catch (error: any) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: `Failed to upload photo: ${error.message}` });
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDeletePhoto = () => {
    setFormData(prev => ({ ...prev, photo_url: '' }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">
            {component ? 'Edit Component' : 'Create Component'}
          </h2>

          {message && (
            <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Component Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type *</label>
                <select
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value as DishSubcategory })}
                  className="w-full px-3 py-2 border rounded-sm"
                >
                  <option value="topping">Topping</option>
                  <option value="carb">Carb</option>
                  <option value="warm_veggie">Warm Vegetables</option>
                  <option value="salad">Salad</option>
                  <option value="condiment">Add-ons</option>
                </select>
              </div>
            </div>

            <div>
              {/* Toggle Button */}
              <button
                type="button"
                onClick={() => setShowMediaSection(!showMediaSection)}
                className={`w-full flex items-center justify-between px-4 py-3 border-2 rounded-sm text-apple-subheadline font-medium transition-all ${
                  showMediaSection
                    ? 'border-[#34C759] bg-[#34C759]/10 text-[#34C759]'
                    : 'border-apple-gray4 text-apple-gray2 hover:border-apple-gray3'
                }`}
              >
                <span>Add media and description</span>
                <svg
                  className={`w-5 h-5 transition-transform ${showMediaSection ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Collapsible Section */}
              {showMediaSection && (
                <div className="mt-4 p-6 border border-apple-gray5 rounded-sm bg-apple-gray7 space-y-6">
                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  {/* Media Upload/Preview */}
                  <div>
                    <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Photo</label>
                    {formData.photo_url ? (
                      /* Photo Preview */
                      <div className="relative">
                        <img
                          src={formData.photo_url}
                          alt="Component preview"
                          className="w-full h-48 object-cover rounded-sm border border-apple-gray4"
                        />
                        <button
                          type="button"
                          onClick={handleDeletePhoto}
                          className="absolute top-3 right-3 bg-[#FF3B30] text-white p-2 rounded-md hover:bg-[#FF453A] transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      /* Upload Area */
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className="border-2 border-dashed border-apple-gray4 rounded-sm p-8 text-center cursor-pointer hover:border-apple-blue hover:bg-white transition-all"
                      >
                        {uploading ? (
                          <div className="text-apple-gray2">Uploading...</div>
                        ) : (
                          <>
                            <svg
                              className="w-12 h-12 mx-auto text-apple-gray3 mb-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <p className="text-apple-subheadline text-apple-gray2 mb-1">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-apple-footnote text-apple-gray3">
                              PNG, JPG up to 5MB
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Description Field */}
                  <div>
                    <label className="block text-apple-footnote font-medium text-apple-gray3 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      placeholder="Add a description for this component..."
                      className="w-full px-4 py-3 border border-apple-gray4 rounded-sm text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 outline-none transition-all resize-none bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Portion Size - Only required for toppings, carbs, and condiments */}
            {formData.subcategory !== 'salad' && formData.subcategory !== 'warm_veggie' && (
              <div>
                <h3 className="font-semibold mb-3">Portion Size *</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Specify the size of one portion for production calculations (required)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Portion Size *</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.portion_size}
                      onChange={(e) => setFormData({ ...formData, portion_size: e.target.value })}
                      placeholder="e.g., 220"
                      className="w-full px-3 py-2 border rounded-sm"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Unit *</label>
                    <select
                      value={formData.portion_unit}
                      onChange={(e) => setFormData({ ...formData, portion_unit: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-sm"
                      required
                    >
                      <option value="pieces">Pieces</option>
                      <option value="grams">Grams (g)</option>
                      <option value="kilograms">Kilograms (kg)</option>
                      <option value="milliliters">Milliliters (ml)</option>
                      <option value="liters">Liters (L)</option>
                      <option value="trays">Trays</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Info for salad/warm veggie components */}
            {(formData.subcategory === 'salad' || formData.subcategory === 'warm_veggie') && (
              <div className="bg-blue-50 border border-blue-200 rounded-sm p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Portion sizes for {formData.subcategory === 'salad' ? 'salad' : 'warm veggie'} components are calculated based on percentages when creating a hot dish. No fixed portion size needed.
                </p>
              </div>
            )}

            {/* Allergens */}
            <div>
              <h3 className="font-semibold mb-3">Allergens</h3>
              <p className="text-sm text-gray-600 mb-3">These allergens will affect any main dish that uses this component</p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { key: 'allergen_gluten', label: 'Gluten' },
                  { key: 'allergen_soy', label: 'Soy' },
                  { key: 'allergen_lactose', label: 'Lactose' },
                  { key: 'allergen_sesame', label: 'Sesame' },
                  { key: 'allergen_sulphites', label: 'Sulphites' },
                  { key: 'allergen_egg', label: 'Egg' },
                  { key: 'allergen_mustard', label: 'Mustard' },
                  { key: 'allergen_celery', label: 'Celery' },
                  { key: 'allergen_fish', label: 'Fish' },
                  { key: 'allergen_shellfish', label: 'Shellfish' },
                  { key: 'allergen_nuts', label: 'Nuts' },
                  { key: 'allergen_peanuts', label: 'Peanuts' },
                ].map(allergen => (
                  <label key={allergen.key} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData as any)[allergen.key]}
                      onChange={(e) => setFormData({ ...formData, [allergen.key]: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">{allergen.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-900 rounded-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-slate-700 text-white rounded-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (component ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
