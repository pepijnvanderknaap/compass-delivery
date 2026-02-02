'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';

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

export default function BanquetingAdminContent() {
  const [items, setItems] = useState<BanquetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category>('breakfast');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BanquetingItem | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Location branding data
  const locationBranding: Record<string, { logo: string; name: string; subtitle?: string }> = {
    'symphony': {
      logo: '/locations/symphony-offices.png',
      name: 'Symphony Offices',
    },
    'atlassian': {
      logo: '/locations/atlassian-logo.png',
      name: 'Atlassian',
    },
    'snowflake': {
      logo: '/locations/snowflake-logo.png',
      name: 'Snowflake',
    },
    'snapchat': {
      logo: '/locations/snapchat-logo.jpg',
      name: 'SnapChat',
    },
    'snapchat-119': {
      logo: '/locations/snapchat-logo.jpg',
      name: 'SnapChat',
      subtitle: 'Building 119',
    },
    'snapchat-165': {
      logo: '/locations/snapchat-logo.jpg',
      name: 'SnapChat',
      subtitle: 'Building 165',
    },
    'jaa': {
      logo: '/locations/jaa-logo.png',
      name: 'JAA Training',
    },
  };

  const locationParam = searchParams.get('location');
  const currentLocation = locationParam ? locationBranding[locationParam] : null;

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
      // Create new item
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminQuickNav />
      <UniversalHeader
        title="Banqueting Catalog"
        backPath={currentLocation ? `/${locationParam}/dashboard` : "/location-management"}
        locationLogo={currentLocation?.logo || ""}
        locationName={currentLocation?.name || ""}
        locationSubtitle={currentLocation?.subtitle}
      />

      <main className="max-w-7xl mx-auto px-8 py-24">
        {/* Category Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          {(Object.keys(categoryLabels) as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                selectedCategory === cat
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Add New Button */}
        <div className="mb-6">
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            + Add New Item
          </button>
        </div>

        {/* Items Table */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading items...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      No items in this category yet
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className={!item.is_active ? 'bg-gray-50 opacity-60' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-md truncate">
                          {item.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.requires_quote ? (
                            <span className="text-amber-600 font-medium">Quote Required</span>
                          ) : (
                            `€${item.price.toFixed(2)}`
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{item.unit}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.requires_quote
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {item.requires_quote ? 'Quote' : 'Instant'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleActive(item)}
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-teal-600 hover:text-teal-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      disabled={formData.requires_quote}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit *
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="e.g., per person, per tray"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.requires_quote}
                      onChange={(e) => setFormData({ ...formData, requires_quote: e.target.checked, price: e.target.checked ? 0 : formData.price })}
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Requires Quote</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.name || !formData.unit}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
