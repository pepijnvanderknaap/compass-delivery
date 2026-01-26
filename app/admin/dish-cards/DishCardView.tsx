'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Dish } from '@/lib/types';

interface DishCardViewProps {
  dish: Dish;
  onClose: () => void;
  onUpdate: () => void;
}

export default function DishCardView({ dish, onClose, onUpdate }: DishCardViewProps) {
  const supabase = createClient();
  const [components, setComponents] = useState<{ type: string; items: Dish[] }>({
    type: '',
    items: []
  });
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(dish.photo_url || '');
  const [dragActive, setDragActive] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1); // Scale multiplier for the image size
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Editable card details
  const [cardDetails, setCardDetails] = useState({
    portion_display: dish.portion_display || '',
    calories_display: dish.calories_display || '',
    origin_display: dish.origin_display || '',
    cooking_method: dish.cooking_method || '',
    prep_time: dish.prep_time || '',
    chef_note: dish.chef_note || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchComponents();
  }, [dish.id]);

  const fetchComponents = async () => {
    // Fetch all components linked to this dish
    const { data } = await supabase
      .from('dish_components')
      .select('component_dish_id, component_type, component_dish:dishes!component_dish_id(*)')
      .eq('main_dish_id', dish.id);

    if (data) {
      const grouped: Record<string, Dish[]> = {};
      data.forEach((dc: any) => {
        if (!grouped[dc.component_type]) {
          grouped[dc.component_type] = [];
        }
        grouped[dc.component_type].push(dc.component_dish);
      });

      setComponents({ type: 'grouped', items: Object.entries(grouped).flatMap(([type, items]) => items) });
    }
  };

  const uploadFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${dish.id}-${Date.now()}.${fileExt}`;
      const filePath = `dish-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('dishes')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dishes')
        .getPublicUrl(filePath);

      // Update dish record
      const { error: updateError } = await supabase
        .from('dishes')
        .update({ photo_url: publicUrl })
        .eq('id', dish.id);

      if (updateError) throw updateError;

      setPhotoUrl(publicUrl);

      // Reset crop/zoom when new image is uploaded
      setImagePosition({ x: 0, y: 0 });
      setImageScale(0.7); // Start zoomed out to show full image with context

      onUpdate();
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Failed to upload photo: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (!cropMode) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !cropMode) return;
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleImageMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setImageScale(prev => Math.min(prev + 0.2, 3)); // Zoom shows more detail (larger image)
  };

  const handleZoomOut = () => {
    setImageScale(prev => Math.max(prev - 0.2, 0.5)); // Zoom out shows more context (smaller image)
  };

  const handleResetCrop = () => {
    setImagePosition({ x: 0, y: 0 });
    setImageScale(0.7); // Reset to show full image with context
  };

  const toggleCropMode = () => {
    setCropMode(!cropMode);
  };

  const handleDeletePhoto = async () => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      // Update dish record to remove photo_url
      const { error } = await supabase
        .from('dishes')
        .update({ photo_url: null })
        .eq('id', dish.id);

      if (error) throw error;

      setPhotoUrl('');
      setImagePosition({ x: 0, y: 0 });
      setImageScale(1);
      onUpdate();
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(`Failed to delete photo: ${error.message}`);
    }
  };

  const handleSaveCardDetails = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('dishes')
        .update(cardDetails)
        .eq('id', dish.id);

      if (error) throw error;

      onUpdate();
      alert('Card details saved successfully!');

      // Reload the page to refresh the dish card
      window.location.reload();
    } catch (error: any) {
      console.error('Save error:', error);
      alert(`Failed to save details: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Get allergens
  const allergens = [
    dish.allergen_gluten && 'Gluten',
    dish.allergen_soy && 'Soy',
    dish.allergen_lactose && 'Lactose',
    dish.allergen_sesame && 'Sesame',
    dish.allergen_sulphites && 'Sulphites',
    dish.allergen_egg && 'Egg',
    dish.allergen_mustard && 'Mustard',
    dish.allergen_celery && 'Celery',
  ].filter(Boolean);

  // Get dietary info
  const dietaryInfo = [
    dish.contains_pork && 'Contains Pork',
    dish.contains_beef && 'Contains Beef',
    dish.contains_lamb && 'Contains Lamb',
    dish.is_vegetarian && 'Vegetarian',
    dish.is_vegan && 'Vegan',
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 font-apple">
      {/* Header - Hidden when printing */}
      <div className="no-print bg-white border-b border-slate-300 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 lg:px-12 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-apple-title text-apple-gray1">Dish Card</h1>
              <p className="text-apple-subheadline text-apple-gray2 mt-1">{dish.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 text-apple-subheadline font-medium text-apple-gray1 rounded-lg hover:bg-apple-gray6 transition-colors"
              >
                &lt; Back
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 lg:px-12 py-10">
        <div className="flex gap-8">
          {/* Left Side: Dish Card */}
          <div className="flex-shrink-0">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />

        {/* Printable Dish Card - A4 Portrait (210mm x 297mm) scaled to 70% for screen */}
        <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-lg print:border-0 print:shadow-none print:rounded-none w-[210mm] mx-auto min-h-[297mm] flex flex-col scale-[0.7] origin-top print:scale-100">
          {/* Photo Section - Centered Fixed-Size Frame */}
          {photoUrl ? (
            <div className="relative pt-8 pb-4 px-8 flex justify-center">
              <div
                ref={containerRef}
                className="relative w-[600px] h-[400px] bg-slate-100 overflow-hidden rounded-xl border-2 border-slate-300 no-print"
                style={{ cursor: cropMode ? 'move' : 'pointer' }}
                onClick={cropMode ? undefined : () => fileInputRef.current?.click()}
                onMouseDown={handleImageMouseDown}
                onMouseMove={handleImageMouseMove}
                onMouseUp={handleImageMouseUp}
                onMouseLeave={handleImageMouseUp}
                onDragEnter={cropMode ? undefined : handleDrag}
                onDragLeave={cropMode ? undefined : handleDrag}
                onDragOver={cropMode ? undefined : handleDrag}
                onDrop={cropMode ? undefined : handleDrop}
              >
                <img
                  ref={imageRef}
                  src={photoUrl}
                  alt={dish.name}
                  className="absolute select-none"
                  style={{
                    width: `${100 * imageScale}%`,
                    height: `${100 * imageScale}%`,
                    objectFit: 'cover',
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${imagePosition.x}px), calc(-50% + ${imagePosition.y}px))`,
                    transition: isDragging ? 'none' : 'all 0.15s ease-out',
                  }}
                  draggable={false}
                />

                {/* Crop Mode Controls */}
                {cropMode && (
                  <div className="absolute top-4 right-4 flex flex-col gap-2 bg-white rounded-lg shadow-lg p-2">
                    <button
                      onClick={handleZoomIn}
                      className="p-2 hover:bg-slate-100 rounded transition-colors"
                      title="Zoom In"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleZoomOut}
                      className="p-2 hover:bg-slate-100 rounded transition-colors"
                      title="Zoom Out"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleResetCrop}
                      className="p-2 hover:bg-slate-100 rounded transition-colors"
                      title="Reset"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <div className="border-t border-slate-200 my-1"></div>
                    <button
                      onClick={handleDeletePhoto}
                      className="p-2 hover:bg-red-50 text-red-600 rounded transition-colors"
                      title="Delete Photo"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Crop Mode Instructions */}
                {cropMode && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
                    Drag to reposition • Use zoom buttons to adjust size
                  </div>
                )}

                {/* Upload Overlay (only when not in crop mode) */}
                {!cropMode && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="text-center text-white">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="font-medium">Click or drag to change photo</p>
                    </div>
                  </div>
                )}

                {uploading && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="text-center text-white">
                      <svg className="animate-spin h-12 w-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="font-medium">Uploading...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative pt-8 pb-4 px-8 flex justify-center">
              <div
                className={`relative w-[600px] h-[400px] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center cursor-pointer transition-all rounded-xl no-print ${
                  dragActive ? 'border-4 border-blue-500 bg-blue-50' : 'border-4 border-dashed border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
              {uploading ? (
                <div className="text-center">
                  <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-slate-600 font-medium">Uploading...</p>
                </div>
              ) : (
                <div className="text-center px-6">
                  <svg className="w-20 h-20 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-600 font-semibold text-lg mb-2">
                    {dragActive ? 'Drop image here' : 'Add Dish Photo'}
                  </p>
                  <p className="text-sm text-slate-500">
                    Click to browse or drag and drop an image
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    JPG, PNG or GIF • Max 5MB
                  </p>
                </div>
              )}
              </div>
            </div>
          )}

          {/* Print-only photo (no interactive elements) */}
          {photoUrl && (
            <div className="hidden print:block pt-8 pb-4 px-8 flex justify-center">
              <div className="relative w-[600px] h-[400px] overflow-hidden rounded-xl">
                <img
                  src={photoUrl}
                  alt={dish.name}
                  className="absolute"
                  style={{
                    width: `${100 * imageScale}%`,
                    height: `${100 * imageScale}%`,
                    objectFit: 'cover',
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${imagePosition.x}px), calc(-50% + ${imagePosition.y}px))`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Content Section */}
          <div className="p-12 flex flex-col flex-1">
            {/* Dish Name - Much Bigger */}
            <div className="text-center mb-8">
              <h2 className="text-6xl text-apple-gray1 mb-6" style={{ fontWeight: '300' }}>
                {dish.name}
              </h2>

              {/* Nutritional Info - Dynamic fields */}
              <div className="flex items-center justify-center gap-6 text-apple-gray2 mb-8 flex-wrap">
                {cardDetails.portion_display && (
                  <>
                    <div className="text-center">
                      <p className="text-xl font-light">{cardDetails.portion_display}</p>
                      <p className="text-xs text-apple-gray3 uppercase tracking-wide">Portion</p>
                    </div>
                    <div className="w-px h-8 bg-slate-300"></div>
                  </>
                )}
                {cardDetails.calories_display && (
                  <>
                    <div className="text-center">
                      <p className="text-xl font-light">{cardDetails.calories_display}</p>
                      <p className="text-xs text-apple-gray3 uppercase tracking-wide">Calories</p>
                    </div>
                    <div className="w-px h-8 bg-slate-300"></div>
                  </>
                )}
                {cardDetails.origin_display && (
                  <>
                    <div className="text-center">
                      <p className="text-xl font-light">{cardDetails.origin_display}</p>
                      <p className="text-xs text-apple-gray3 uppercase tracking-wide">Origin</p>
                    </div>
                    <div className="w-px h-8 bg-slate-300"></div>
                  </>
                )}
                {cardDetails.cooking_method && (
                  <>
                    <div className="text-center">
                      <p className="text-xl font-light">{cardDetails.cooking_method}</p>
                      <p className="text-xs text-apple-gray3 uppercase tracking-wide">Method</p>
                    </div>
                    <div className="w-px h-8 bg-slate-300"></div>
                  </>
                )}
                {cardDetails.prep_time && (
                  <>
                    <div className="text-center">
                      <p className="text-xl font-light">{cardDetails.prep_time}</p>
                      <p className="text-xs text-apple-gray3 uppercase tracking-wide">Prep Time</p>
                    </div>
                    <div className="w-px h-8 bg-slate-300"></div>
                  </>
                )}
                {cardDetails.chef_note && (
                  <div className="text-center w-full">
                    <p className="text-base font-light italic">{cardDetails.chef_note}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {dish.description && (
                <p className="text-base text-apple-gray2 leading-relaxed max-w-2xl mx-auto">
                  {dish.description}
                </p>
              )}
            </div>

            {/* Served With Section - 3 per line with separators */}
            {components.items.length > 0 && (
              <div className="mb-16">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 text-center uppercase tracking-wide">
                  Served With
                </h3>
                <div className="flex flex-col items-center gap-3">
                  {/* First line - first 3 items */}
                  {components.items.slice(0, 3).length > 0 && (
                    <div className="flex items-center gap-4">
                      {components.items.slice(0, 3).map((comp, index) => (
                        <div key={comp.id} className="flex items-center gap-4">
                          <span className="text-xl text-slate-700 font-medium">
                            {comp.name}
                          </span>
                          {index < Math.min(2, components.items.slice(0, 3).length - 1) && (
                            <div className="w-px h-6 bg-slate-400"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Second line - remaining items */}
                  {components.items.slice(3).length > 0 && (
                    <div className="flex items-center gap-4">
                      {components.items.slice(3).map((comp, index) => (
                        <div key={comp.id} className="flex items-center gap-4">
                          <span className="text-xl text-slate-700 font-medium">
                            {comp.name}
                          </span>
                          {index < components.items.slice(3).length - 1 && (
                            <div className="w-px h-6 bg-slate-400"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Allergens & Dietary Info - Side by Side */}
            <div className="mb-10 max-w-4xl mx-auto">
              <div className="grid grid-cols-2 gap-8">
                {/* Allergens */}
                {allergens.length > 0 && (
                  <div className="text-center">
                    <h3 className="text-xs font-bold text-amber-900 mb-3 uppercase tracking-wide">
                      Allergens
                    </h3>
                    <p className="text-base text-slate-700">
                      {allergens.join(' • ')}
                    </p>
                  </div>
                )}

                {/* Dietary Information */}
                {dietaryInfo.length > 0 && (
                  <div className="text-center">
                    <h3 className="text-xs font-bold text-green-900 mb-3 uppercase tracking-wide">
                      Dietary Info
                    </h3>
                    <p className="text-base text-slate-700">
                      {dietaryInfo.join(' • ')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Spacer to push footer to bottom */}
            <div className="flex-1"></div>

            {/* Footer with Compass Logo */}
            <div className="pt-8 border-t border-slate-200">
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-slate-600">
                  Proudly served by:
                </p>
                <img
                  src="/compass-logo.svg"
                  alt="Compass Group"
                  className="h-24 w-auto"
                />
              </div>
            </div>
          </div>
        </div>
          </div>

          {/* Right Side: Edit Panel */}
          <div className="flex-1 no-print">
            <div className="bg-white border border-slate-300 rounded-xl p-6 sticky top-24">
              <h3 className="text-apple-title font-semibold text-apple-gray1 mb-6">Card Details</h3>

              {/* Photo Controls */}
              {photoUrl && (
                <div className="mb-6">
                  <label className="block text-apple-footnote font-medium text-apple-gray2 mb-3">Photo</label>
                  <button
                    onClick={toggleCropMode}
                    className={`w-full px-4 py-3 text-apple-subheadline font-medium rounded-lg transition-colors border ${
                      cropMode
                        ? 'text-white bg-green-600 hover:bg-green-700 border-green-600'
                        : 'text-slate-900 bg-slate-200 hover:bg-slate-300 border-slate-300'
                    }`}
                  >
                    {cropMode ? '✓ Done Cropping' : 'Adjust Photo'}
                  </button>
                </div>
              )}

              {/* Editable Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-apple-footnote font-medium text-apple-gray2 mb-2">Portion</label>
                  <input
                    type="text"
                    value={cardDetails.portion_display}
                    onChange={(e) => setCardDetails({ ...cardDetails, portion_display: e.target.value })}
                    placeholder="e.g., 160g"
                    className="w-full px-4 py-2 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-apple-footnote font-medium text-apple-gray2 mb-2">Calories</label>
                  <input
                    type="text"
                    value={cardDetails.calories_display}
                    onChange={(e) => setCardDetails({ ...cardDetails, calories_display: e.target.value })}
                    placeholder="e.g., 450 kcal"
                    className="w-full px-4 py-2 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-apple-footnote font-medium text-apple-gray2 mb-2">Origin</label>
                  <input
                    type="text"
                    value={cardDetails.origin_display}
                    onChange={(e) => setCardDetails({ ...cardDetails, origin_display: e.target.value })}
                    placeholder="e.g., Netherlands"
                    className="w-full px-4 py-2 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-apple-footnote font-medium text-apple-gray2 mb-2">Cooking Method</label>
                  <input
                    type="text"
                    value={cardDetails.cooking_method}
                    onChange={(e) => setCardDetails({ ...cardDetails, cooking_method: e.target.value })}
                    placeholder="e.g., Grilled"
                    className="w-full px-4 py-2 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-apple-footnote font-medium text-apple-gray2 mb-2">Preparation Time</label>
                  <input
                    type="text"
                    value={cardDetails.prep_time}
                    onChange={(e) => setCardDetails({ ...cardDetails, prep_time: e.target.value })}
                    placeholder="e.g., 15 min"
                    className="w-full px-4 py-2 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-apple-footnote font-medium text-apple-gray2 mb-2">Chef's Note</label>
                  <textarea
                    value={cardDetails.chef_note}
                    onChange={(e) => setCardDetails({ ...cardDetails, chef_note: e.target.value })}
                    placeholder="e.g., Best served hot"
                    rows={3}
                    className="w-full px-4 py-2 border border-apple-gray4 rounded-lg text-apple-subheadline focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/20 transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handlePrint}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-white text-slate-900 border border-slate-300 rounded hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  Print
                </button>
                <button
                  onClick={handleSaveCardDetails}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-slate-200 text-slate-900 border border-slate-300 rounded hover:bg-slate-300 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
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
          .print\\:border-0 {
            border: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
