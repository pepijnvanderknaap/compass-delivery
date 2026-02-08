'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';

interface BanquetingItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  unit: string;
  is_active: boolean;
  sort_order: number;
}

interface CartItem {
  item: BanquetingItem;
  quantity: number;
}

export default function SymphonyCateringPage() {
  const [items, setItems] = useState<BanquetingItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('breakfast');
  const [showCart, setShowCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  // Order form fields
  const [orderForm, setOrderForm] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    delivery_date: '',
    delivery_time: '',
    floor_number: '',
    po_number: '',
    notes: '',
  });

  const categories = [
    { id: 'breakfast', name: 'Breakfast' },
    { id: 'coffee_tea_snacks', name: 'Coffee, Tea & Snacks' },
    { id: 'lunch_dinner', name: 'Lunch & Dinner' },
    { id: 'borrel', name: 'Borrel' },
  ];

  useEffect(() => {
    const fetchBanquetingItems = async () => {
      try {
        const { data, error } = await supabase
          .from('banqueting_items')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching banqueting items:', error);
        } else {
          setItems(data || []);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanquetingItems();
  }, [supabase]);

  const filteredItems = items.filter(item => item.category === selectedCategory);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const addToCart = (item: BanquetingItem) => {
    const existingItem = cart.find(cartItem => cartItem.item.id === item.id);

    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.item.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { item, quantity: 1 }]);
    }
    setShowCart(true);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(cartItem => cartItem.item.id !== itemId));
    } else {
      setCart(cart.map(cartItem =>
        cartItem.item.id === itemId
          ? { ...cartItem, quantity }
          : cartItem
      ));
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(cartItem => cartItem.item.id !== itemId));
  };

  const getCartTotal = () => {
    return cart.reduce((total, cartItem) =>
      total + (cartItem.item.price * cartItem.quantity), 0
    );
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('Please add items to your cart');
      return;
    }

    setSubmitting(true);

    try {
      // Look up Symphony location ID from database
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('id')
        .eq('name', 'Symphony')
        .single();

      if (locationError || !location) {
        throw new Error('Symphony location not found in database');
      }

      // Generate order number
      const orderNumber = `BAN-${Date.now()}`;

      // Calculate total
      const totalAmount = getCartTotal();

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('banqueting_orders')
        .insert({
          order_number: orderNumber,
          location_id: location.id,
          company_name: orderForm.company_name,
          contact_name: orderForm.contact_name,
          contact_email: orderForm.contact_email,
          contact_phone: orderForm.contact_phone,
          delivery_date: orderForm.delivery_date,
          delivery_time: orderForm.delivery_time,
          floor_number: orderForm.floor_number,
          po_number: orderForm.po_number || null,
          notes: orderForm.notes || null,
          total_amount: totalAmount,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(cartItem => ({
        order_id: order.id,
        item_id: cartItem.item.id,
        quantity: cartItem.quantity,
        unit_price: cartItem.item.price,
        total_price: cartItem.item.price * cartItem.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('banqueting_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Success - clear form and cart
      alert(`Order submitted successfully! Order number: ${orderNumber}\n\nYou will receive a confirmation email shortly.`);
      setCart([]);
      setShowCart(false);
      setOrderForm({
        company_name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        delivery_date: '',
        delivery_time: '',
        floor_number: '',
        po_number: '',
        notes: '',
      });

    } catch (err: any) {
      console.error('Error submitting order:', err);
      alert('Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <Link href="/symphony">
                <Image
                  src="/locations/symphony-offices.png"
                  alt="Symphony Offices"
                  width={180}
                  height={60}
                  className="object-contain cursor-pointer"
                />
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative px-6 py-3 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-lg transition-colors"
              >
                View Cart ({cart.length})
              </button>
              <Link
                href="/symphony"
                className="px-6 py-3 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] hover:bg-[#F5F5F7] rounded-lg transition-colors"
              >
                Back to Restaurant
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-[48px] font-semibold text-[#1D1D1F] mb-4 tracking-tight">
            Banqueting
          </h1>
          <p className="text-[20px] text-[#6E6E73]">
            Premium catering for your meetings, events, and celebrations
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 text-[15px] font-medium rounded-lg transition-all whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'bg-[#0071E3] text-white'
                    : 'bg-white text-[#1D1D1F] border border-[#D2D2D7] hover:bg-[#F5F5F7]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[20px] text-[#6E6E73]">
              No items available in this category yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-[#E8E8ED] rounded-xl p-6 hover:border-[#0071E3] hover:shadow-lg transition-all duration-300"
              >
                <div className="mb-4">
                  <h3 className="text-[20px] font-semibold text-[#1D1D1F] mb-2">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-[15px] text-[#6E6E73] mb-4">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[24px] font-semibold text-[#0071E3]">
                      {formatPrice(item.price)}
                    </p>
                    <p className="text-[13px] text-[#86868B]">
                      {item.unit}
                    </p>
                  </div>
                  <button
                    className="px-5 py-2.5 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-lg transition-colors"
                    onClick={() => addToCart(item)}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setShowCart(false)}>
          <div
            className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-[#E8E8ED] px-8 py-6 flex justify-between items-center">
              <h2 className="text-[28px] font-semibold text-[#1D1D1F]">Your Order</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] text-[24px]"
              >
                ✕
              </button>
            </div>

            <div className="p-8">
              {cart.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-[17px] text-[#6E6E73]">Your cart is empty</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitOrder} className="space-y-8">
                  {/* Cart Items */}
                  <div className="space-y-4">
                    <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-4">Items</h3>
                    {cart.map((cartItem) => (
                      <div key={cartItem.item.id} className="flex items-start justify-between p-4 border border-[#E8E8ED] rounded-lg">
                        <div className="flex-1">
                          <h4 className="text-[15px] font-medium text-[#1D1D1F]">{cartItem.item.name}</h4>
                          <p className="text-[13px] text-[#86868B]">{formatPrice(cartItem.item.price)} {cartItem.item.unit}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            value={cartItem.quantity}
                            onChange={(e) => updateQuantity(cartItem.item.id, parseInt(e.target.value) || 0)}
                            className="w-20 px-3 py-2 text-center border border-[#D2D2D7] rounded-lg focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                          />
                          <span className="text-[15px] font-medium text-[#1D1D1F] w-24 text-right">
                            {formatPrice(cartItem.item.price * cartItem.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(cartItem.item.id)}
                            className="text-[#FF3B30] hover:text-[#FF453A] text-[20px]"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t border-[#E8E8ED] pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[17px] font-semibold text-[#1D1D1F]">Total</span>
                      <span className="text-[28px] font-semibold text-[#0071E3]">
                        {formatPrice(getCartTotal())}
                      </span>
                    </div>
                  </div>

                  {/* Delivery Details */}
                  <div className="space-y-4">
                    <h3 className="text-[17px] font-semibold text-[#1D1D1F]">Delivery Details</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                          Delivery Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={orderForm.delivery_date}
                          onChange={(e) => setOrderForm({ ...orderForm, delivery_date: e.target.value })}
                          className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                          Delivery Time *
                        </label>
                        <input
                          type="time"
                          required
                          value={orderForm.delivery_time}
                          onChange={(e) => setOrderForm({ ...orderForm, delivery_time: e.target.value })}
                          className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                        Floor Number
                      </label>
                      <input
                        type="text"
                        value={orderForm.floor_number}
                        onChange={(e) => setOrderForm({ ...orderForm, floor_number: e.target.value })}
                        placeholder="e.g., 3rd Floor"
                        className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-[17px] font-semibold text-[#1D1D1F]">Contact Information</h3>

                    <div>
                      <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={orderForm.company_name}
                        onChange={(e) => setOrderForm({ ...orderForm, company_name: e.target.value })}
                        className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                        Contact Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={orderForm.contact_name}
                        onChange={(e) => setOrderForm({ ...orderForm, contact_name: e.target.value })}
                        className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={orderForm.contact_email}
                          onChange={(e) => setOrderForm({ ...orderForm, contact_email: e.target.value })}
                          className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={orderForm.contact_phone}
                          onChange={(e) => setOrderForm({ ...orderForm, contact_phone: e.target.value })}
                          className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                        PO Number
                      </label>
                      <input
                        type="text"
                        value={orderForm.po_number}
                        onChange={(e) => setOrderForm({ ...orderForm, po_number: e.target.value })}
                        placeholder="Purchase Order Number (if applicable)"
                        className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium text-[#86868B] mb-2">
                        Special Instructions / Notes
                      </label>
                      <textarea
                        rows={3}
                        value={orderForm.notes}
                        onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                        placeholder="Any special requests or dietary requirements..."
                        className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 resize-none"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="sticky bottom-0 bg-white pt-6 border-t border-[#E8E8ED]">
                    <button
                      type="submit"
                      disabled={submitting || cart.length === 0}
                      className="w-full px-6 py-4 text-[17px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting Order...' : 'Submit Order'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
