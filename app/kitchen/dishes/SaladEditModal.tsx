'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SaladEditModalProps {
  isOpen: boolean;
  saladId: string | null;
  currentName: string;
  currentCategory: 'leafy' | 'vegetable' | 'coleslaw';
  currentDescription: string | null;
  onClose: () => void;
  onSave: () => void;
}

export default function SaladEditModal({
  isOpen,
  saladId,
  currentName,
  currentCategory,
  currentDescription,
  onClose,
  onSave,
}: SaladEditModalProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState({
    custom_name: currentName,
    category: currentCategory,
    description: currentDescription || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        custom_name: currentName,
        category: currentCategory,
        description: currentDescription || '',
      });
      setMessage(null);
    }
  }, [isOpen, currentName, currentCategory, currentDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saladId) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('salad_combinations')
        .update({
          custom_name: formData.custom_name,
          category: formData.category,
          description: formData.description || null,
        })
        .eq('id', saladId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Salad updated successfully!' });
      setTimeout(() => {
        onSave();
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('Error updating salad:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update salad' });
    } finally {
      setSaving(false);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-sm shadow-2xl border border-[#E8E8ED] w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E8E8ED]">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-semibold text-[#1D1D1F]">
              Edit Salad
            </h2>
            <button
              onClick={onClose}
              className="text-[#86868B] hover:text-[#1D1D1F] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded-sm text-[13px] ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Salad Name */}
          <div>
            <label className="block text-[13px] font-medium text-[#86868B] mb-2">
              Salad Name *
            </label>
            <input
              type="text"
              value={formData.custom_name}
              onChange={(e) => setFormData({ ...formData, custom_name: e.target.value })}
              className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition-all"
              placeholder="e.g., Greek Salad, Indian Coleslaw"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[13px] font-medium text-[#86868B] mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition-all"
              required
            >
              <option value="leafy">🥗 Leafy Salads (lettuce, mixed greens, spinach)</option>
              <option value="vegetable">🥕 Vegetable Salads (roasted, grilled, raw vegetables)</option>
              <option value="coleslaw">🥬 Coleslaws (cabbage-based salads)</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[13px] font-medium text-[#86868B] mb-2">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 outline-none transition-all resize-none"
              placeholder="e.g., Classic Greek salad with feta and olives"
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded-sm hover:bg-[#F5F5F7] transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-colors disabled:opacity-40"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
