'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface BanquetingItem {
  id: string;
  name: string;
  description: string | null;
  category: 'breakfast' | 'coffee_tea_snacks' | 'lunch_dinner' | 'borrel';
  price: number;
  unit: string;
  requires_quote: boolean;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

type Category = 'breakfast' | 'coffee_tea_snacks' | 'lunch_dinner' | 'borrel';

const categoryLabels: Record<Category, string> = {
  breakfast: 'Breakfast',
  coffee_tea_snacks: 'Coffee, Tea & Snacks',
  lunch_dinner: 'Lunch & Dinners',
  borrel: 'Borrel',
};

export default function SymphonyBanquetingCatalogPage() {
  const [items, setItems] = useState<BanquetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category>('breakfast');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BanquetingItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<BanquetingItem | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'breakfast' as Category,
    price: 0,
    unit: '',
    requires_quote: false,
    image_url: '',
    is_active: true,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('banqueting_items')
      .select('*')
      .order('category')
      .order('sort_order', { ascending: true })
      .order('name');

    if (error) {
      console.error('Error fetching items:', error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const filteredItems = items.filter(item => item.category === selectedCategory);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      category: selectedCategory,
      price: 0,
      unit: '',
      requires_quote: false,
      image_url: '',
      is_active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (item: BanquetingItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category,
      price: item.price,
      unit: item.unit,
      requires_quote: item.requires_quote,
      image_url: item.image_url || '',
      is_active: item.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (editingItem) {
      // Update existing item
      const { error } = await supabase
        .from('banqueting_items')
        .update({
          name: formData.name,
          description: formData.description || null,
          category: formData.category,
          price: formData.price,
          unit: formData.unit,
          requires_quote: formData.requires_quote,
          image_url: formData.image_url || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingItem.id);

      if (error) {
        console.error('Error updating item:', error);
        alert('Failed to update item');
      } else {
        setShowModal(false);
        fetchItems();
      }
    } else {
      // Create new item - get max sort_order for this category
      const { data: maxOrderData } = await supabase
        .from('banqueting_items')
        .select('sort_order')
        .eq('category', formData.category)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextSortOrder = maxOrderData && maxOrderData.length > 0
        ? (maxOrderData[0].sort_order || 0) + 1
        : 0;

      const { error } = await supabase
        .from('banqueting_items')
        .insert({
          name: formData.name,
          description: formData.description || null,
          category: formData.category,
          price: formData.price,
          unit: formData.unit,
          requires_quote: formData.requires_quote,
          image_url: formData.image_url || null,
          is_active: formData.is_active,
          sort_order: nextSortOrder,
        });

      if (error) {
        console.error('Error creating item:', error);
        alert('Failed to create item');
      } else {
        setShowModal(false);
        fetchItems();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const { error } = await supabase
      .from('banqueting_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    } else {
      fetchItems();
    }
  };

  const toggleActive = async (item: BanquetingItem) => {
    const { error } = await supabase
      .from('banqueting_items')
      .update({
        is_active: !item.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (error) {
      console.error('Error toggling active status:', error);
    } else {
      fetchItems();
    }
  };

  const handleDragStart = (item: BanquetingItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetItem: BanquetingItem) => {
    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    // Only allow reordering within the same category
    if (draggedItem.category !== targetItem.category) {
      setDraggedItem(null);
      return;
    }

    const categoryItems = filteredItems;
    const draggedIndex = categoryItems.findIndex(item => item.id === draggedItem.id);
    const targetIndex = categoryItems.findIndex(item => item.id === targetItem.id);

    // Reorder items
    const reorderedItems = [...categoryItems];
    reorderedItems.splice(draggedIndex, 1);
    reorderedItems.splice(targetIndex, 0, draggedItem);

    // Update sort_order for all items in this category
    const updates = reorderedItems.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }));

    // Update in database
    try {
      for (const update of updates) {
        await supabase
          .from('banqueting_items')
          .update({ sort_order: update.sort_order, updated_at: new Date().toISOString() })
          .eq('id', update.id);
      }
      fetchItems();
    } catch (error) {
      console.error('Error updating sort order:', error);
    }

    setDraggedItem(null);
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Category Filter */}
        <div className="mb-8">
          <label className="block text-[13px] font-medium text-[#86868B] mb-3">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as Category)}
            className="px-4 py-2.5 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
          >
            {(Object.keys(categoryLabels) as Category[]).map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabels[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Add New Button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={openAddModal}
            className="px-6 py-2.5 bg-[#0071E3] text-white text-[15px] font-semibold rounded-sm hover:bg-[#0077ED] transition-colors"
          >
            + Add New Item
          </button>
          <div className="flex items-center gap-2 text-[13px] text-[#86868B]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
            <span>Drag rows to reorder items</span>
          </div>
        </div>

        {/* Items Table */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3] mx-auto"></div>
            <p className="mt-4 text-[15px] text-[#86868B]">Loading items...</p>
          </div>
        ) : (
          <div className="bg-white rounded-sm border border-[#E8E8ED] shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E8E8ED]">
              <thead className="bg-[#FAFAFA]">
                <tr>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    Price
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    Unit
                  </th>
                  <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-[13px] font-semibold text-[#86868B] uppercase tracking-wide w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#E8E8ED]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[15px] text-[#86868B]">
                      No items in this category yet
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(item)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(item)}
                      className={`cursor-move ${!item.is_active ? 'bg-[#FAFAFA] opacity-60' : ''} ${draggedItem?.id === item.id ? 'opacity-50' : ''} hover:bg-[#F5F5F7] transition-colors`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#86868B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                          <span className="text-[15px] font-medium text-[#1D1D1F]">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[15px] text-[#6E6E73] max-w-xs truncate">
                          {item.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-[15px] text-[#1D1D1F]">
                          {item.requires_quote ? (
                            <span className="text-[#FF9500] font-medium">Quote</span>
                          ) : (
                            `€${item.price.toFixed(2)}`
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-[15px] text-[#6E6E73]">{item.unit}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleActive(item)}
                          className={`px-3 py-1 inline-flex text-[12px] leading-5 font-semibold rounded-full ${
                            item.is_active
                              ? 'bg-green-50 text-[#34C759] hover:bg-green-100'
                              : 'bg-[#F5F5F7] text-[#86868B] hover:bg-[#E8E8ED]'
                          }`}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-[15px] font-medium">
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-[#0071E3] hover:text-[#0077ED] mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-[#FF3B30] hover:text-[#FF453A]"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E8E8ED] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <h2 className="text-[28px] font-semibold text-[#1D1D1F] mb-8">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all"
                  >
                    {(Object.keys(categoryLabels) as Category[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {categoryLabels[cat]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                      Price (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all disabled:bg-[#F5F5F7] disabled:text-[#86868B]"
                      disabled={formData.requires_quote}
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                      Unit *
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="e.g., per person, per tray"
                      className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                    Image URL (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.requires_quote}
                      onChange={(e) => setFormData({ ...formData, requires_quote: e.target.checked, price: e.target.checked ? 0 : formData.price })}
                      className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
                    />
                    <span className="text-[15px] font-medium text-[#1D1D1F]">Requires Quote</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
                    />
                    <span className="text-[15px] font-medium text-[#1D1D1F]">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded-sm hover:bg-[#F5F5F7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.name || !formData.unit}
                  className="px-6 py-3 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editingItem ? 'Update Item' : 'Create Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
