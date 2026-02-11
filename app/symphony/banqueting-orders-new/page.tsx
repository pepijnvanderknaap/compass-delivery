'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

interface BanquetingProduct {
  id: string;
  name: string;
  description: string | null;
  category: 'breakfast' | 'coffee_tea_snacks' | 'lunch_dinner' | 'borrel' | 'custom';
  price: number;
  unit: string;
  requires_quote: boolean;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

interface CompanyData {
  id: string;
  company_name: string;
  po_workflow: string;
}

interface TimeslotItem {
  product: BanquetingProduct;
  quantity: number;
}

interface Timeslot {
  id: string;
  time: string;
  floor: string;
  guestCount: number;
  items: TimeslotItem[];
  notes: string;
}

const TIME_OPTIONS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00'
];

const CATEGORIES = [
  { key: 'breakfast' as const, label: 'Breakfast' },
  { key: 'coffee_tea_snacks' as const, label: 'Coffee, Tea & Snacks' },
  { key: 'lunch_dinner' as const, label: 'Lunch & Dinner' },
  { key: 'borrel' as const, label: 'Borrel' },
];

export default function BanquetingOrdersPage() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [products, setProducts] = useState<BanquetingProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Order state
  const [orderDate, setOrderDate] = useState('');
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [currentTimeslot, setCurrentTimeslot] = useState<Timeslot | null>(null);

  // UI state
  const [step, setStep] = useState<'date' | 'timeslot-setup' | 'products' | 'summary'>('date');
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]['key']>('breakfast');
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const companyData = sessionStorage.getItem('symphony_company');
    if (!companyData) {
      router.push('/symphony');
      return;
    }
    setCompany(JSON.parse(companyData));
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('banqueting_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const startNewTimeslot = () => {
    setCurrentTimeslot({
      id: `temp-${Date.now()}`,
      time: '',
      floor: '',
      guestCount: 0,
      items: [],
      notes: '',
    });
    setStep('timeslot-setup');
  };

  const saveTimeslotSetup = () => {
    if (!currentTimeslot?.time || !currentTimeslot.guestCount) {
      alert('Please fill in time and number of guests');
      return;
    }
    setStep('products');
  };

  const addProductToTimeslot = (product: BanquetingProduct) => {
    if (!currentTimeslot) return;

    const existingItem = currentTimeslot.items.find(i => i.product.id === product.id);
    if (existingItem) {
      setCurrentTimeslot({
        ...currentTimeslot,
        items: currentTimeslot.items.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      setCurrentTimeslot({
        ...currentTimeslot,
        items: [...currentTimeslot.items, { product, quantity: 1 }],
      });
    }
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    if (!currentTimeslot) return;

    if (quantity === 0) {
      setCurrentTimeslot({
        ...currentTimeslot,
        items: currentTimeslot.items.filter(i => i.product.id !== productId),
      });
    } else {
      setCurrentTimeslot({
        ...currentTimeslot,
        items: currentTimeslot.items.map(i =>
          i.product.id === productId ? { ...i, quantity } : i
        ),
      });
    }
  };

  const saveAndAddAnother = () => {
    if (!currentTimeslot || currentTimeslot.items.length === 0) {
      alert('Please add at least one product to this timeslot');
      return;
    }

    const updatedTimeslots = [...timeslots, currentTimeslot].sort((a, b) => a.time.localeCompare(b.time));
    setTimeslots(updatedTimeslots);
    setCurrentTimeslot(null);
    startNewTimeslot();
  };

  const saveAndCheckout = () => {
    if (!currentTimeslot || currentTimeslot.items.length === 0) {
      alert('Please add at least one product to this timeslot');
      return;
    }

    const updatedTimeslots = [...timeslots, currentTimeslot].sort((a, b) => a.time.localeCompare(b.time));
    setTimeslots(updatedTimeslots);
    setCurrentTimeslot(null);
    setStep('summary');
  };

  const removeTimeslot = (timeslotId: string) => {
    setTimeslots(timeslots.filter(t => t.id !== timeslotId));
  };

  const calculateTotal = () => {
    return timeslots.reduce((total, timeslot) =>
      total + timeslot.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0), 0
    );
  };

  const handleSubmitOrder = async (orderType: 'order' | 'quote') => {
    if (!company || timeslots.length === 0) return;

    // Check PO requirements
    if (orderType === 'order' && company.po_workflow === 'provide_with_order') {
      const poNumber = prompt('Please enter your PO number:');
      if (!poNumber) return;
      await submitOrder(orderType, poNumber);
    } else if (orderType === 'order' && company.po_workflow === 'quote_then_po') {
      alert('You must request a quote first before placing an order');
      return;
    } else {
      await submitOrder(orderType, null);
    }
  };

  const submitOrder = async (orderType: 'order' | 'quote', poNumber: string | null) => {
    if (!company) return;

    setSubmitting(true);

    try {
      // Generate order number
      const { data: orderNumberData, error: orderNumberError } = await supabase
        .rpc('generate_banqueting_order_number');

      if (orderNumberError) throw orderNumberError;

      const orderNumber = orderNumberData;
      const totalAmount = calculateTotal();

      // Create main order
      const { data: order, error: orderError } = await supabase
        .from('symphony_banqueting_orders')
        .insert({
          company_id: company.id,
          order_number: orderNumber,
          order_date: orderDate,
          po_number: poNumber,
          status: 'pending',
          total_amount: totalAmount,
          order_type: orderType,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create timeslots and items
      for (const timeslot of timeslots) {
        const { data: createdTimeslot, error: timeslotError } = await supabase
          .from('symphony_banqueting_timeslots')
          .insert({
            order_id: order.id,
            delivery_time: timeslot.time,
            floor_number: timeslot.floor || null,
            guest_count: timeslot.guestCount,
            notes: timeslot.notes || null,
          })
          .select()
          .single();

        if (timeslotError) throw timeslotError;

        // Insert items for this timeslot
        const items = timeslot.items.map(item => ({
          timeslot_id: createdTimeslot.id,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from('symphony_banqueting_timeslot_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      alert(orderType === 'quote'
        ? `Quote request ${orderNumber} submitted successfully!`
        : `Order ${orderNumber} placed successfully!`
      );

      // Reset and go back
      setOrderDate('');
      setTimeslots([]);
      setCurrentTimeslot(null);
      setStep('date');

    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3]"></div>
      </div>
    );
  }

  const filteredProducts = products.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white border-b border-[#E8E8ED]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <Image
              src="/locations/symphony-offices.png"
              alt="Symphony Offices"
              width={180}
              height={60}
              className="object-contain"
            />
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/symphony/company-settings')}
                className="px-6 py-2.5 border border-[#D2D2D7] text-[#1D1D1F] text-[15px] font-semibold rounded-sm hover:bg-[#F5F5F7] transition-colors"
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <h1 className="text-[28px] font-semibold text-[#1D1D1F] mb-2">Banqueting Orders</h1>
        <p className="text-[15px] text-[#6E6E73] mb-8">{company?.company_name}</p>

        {/* Step 1: Date Selection */}
        {step === 'date' && (
          <div className="max-w-2xl">
            <div className="bg-white border border-[#E8E8ED] rounded-lg shadow-sm p-8">
              <h2 className="text-[22px] font-semibold text-[#1D1D1F] mb-6">Select Event Date</h2>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg text-[17px] text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
              />
              <button
                onClick={() => orderDate && startNewTimeslot()}
                disabled={!orderDate}
                className="mt-6 w-full px-6 py-3 bg-[#0071E3] text-white text-[15px] font-semibold rounded-lg hover:bg-[#0077ED] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Timeslot Setup */}
        {step === 'timeslot-setup' && currentTimeslot && (
          <div className="max-w-2xl">
            <div className="bg-white border border-[#E8E8ED] rounded-lg shadow-sm p-8">
              <h2 className="text-[22px] font-semibold text-[#1D1D1F] mb-2">Add Delivery Time</h2>
              <p className="text-[15px] text-[#6E6E73] mb-6">
                Event date: {format(new Date(orderDate), 'EEEE, MMMM d, yyyy')}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] mb-2">Delivery Time *</label>
                  <select
                    value={currentTimeslot.time}
                    onChange={(e) => setCurrentTimeslot({ ...currentTimeslot, time: e.target.value })}
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg text-[15px] text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                  >
                    <option value="">Select time...</option>
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] mb-2">Floor Number (Optional)</label>
                  <input
                    type="text"
                    value={currentTimeslot.floor}
                    onChange={(e) => setCurrentTimeslot({ ...currentTimeslot, floor: e.target.value })}
                    placeholder="e.g., 5"
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg text-[15px] text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#86868B] mb-2">Number of Guests *</label>
                  <input
                    type="number"
                    value={currentTimeslot.guestCount || ''}
                    onChange={(e) => setCurrentTimeslot({ ...currentTimeslot, guestCount: parseInt(e.target.value) || 0 })}
                    min="1"
                    placeholder="e.g., 25"
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg text-[15px] text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setCurrentTimeslot(null);
                    setStep(timeslots.length > 0 ? 'summary' : 'date');
                  }}
                  className="flex-1 px-6 py-3 border border-[#D2D2D7] text-[#1D1D1F] text-[15px] font-semibold rounded-lg hover:bg-[#F5F5F7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTimeslotSetup}
                  className="flex-1 px-6 py-3 bg-[#0071E3] text-white text-[15px] font-semibold rounded-lg hover:bg-[#0077ED] transition-colors"
                >
                  Add Products
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Product Selection */}
        {step === 'products' && currentTimeslot && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-[22px] font-semibold text-[#1D1D1F]">Select Products</h2>
                <p className="text-[15px] text-[#6E6E73]">
                  {currentTimeslot.time} • {currentTimeslot.guestCount} guests
                  {currentTimeslot.floor && ` • Floor ${currentTimeslot.floor}`}
                </p>
              </div>
              <div className="text-right">
                <div className="text-[13px] text-[#86868B]">Items in this timeslot</div>
                <div className="text-[22px] font-semibold text-[#1D1D1F]">
                  {currentTimeslot.items.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-4 mb-6 border-b border-[#E8E8ED]">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`pb-3 text-[15px] font-semibold transition-all ${
                    selectedCategory === cat.key
                      ? 'text-[#0071E3] border-b-2 border-[#0071E3]'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredProducts.map(product => {
                const inCart = currentTimeslot.items.find(i => i.product.id === product.id);
                return (
                  <div key={product.id} className="bg-white border border-[#E8E8ED] rounded-lg overflow-hidden hover:border-[#0071E3] transition-colors">
                    {product.image_url && (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        width={400}
                        height={300}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-1">{product.name}</h3>
                      {product.description && (
                        <p className="text-[13px] text-[#6E6E73] mb-3">{product.description}</p>
                      )}
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-[17px] font-semibold text-[#0071E3]">€{product.price.toFixed(2)}</div>
                          <div className="text-[13px] text-[#86868B]">per {product.unit}</div>
                        </div>
                        {inCart ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateProductQuantity(product.id, inCart.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center border border-[#D2D2D7] rounded-md hover:bg-[#F5F5F7] transition-colors"
                            >
                              -
                            </button>
                            <span className="text-[15px] font-semibold text-[#1D1D1F] w-8 text-center">
                              {inCart.quantity}
                            </span>
                            <button
                              onClick={() => updateProductQuantity(product.id, inCart.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center border border-[#D2D2D7] rounded-md hover:bg-[#F5F5F7] transition-colors"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addProductToTimeslot(product)}
                            className="px-4 py-2 bg-[#0071E3] text-white text-[13px] font-semibold rounded-md hover:bg-[#0077ED] transition-colors"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Timeslot Notes */}
            <div className="mb-6">
              <label className="block text-[15px] font-semibold text-[#1D1D1F] mb-2">
                Special Instructions (Optional)
              </label>
              <textarea
                value={currentTimeslot.notes}
                onChange={(e) => setCurrentTimeslot({ ...currentTimeslot, notes: e.target.value })}
                rows={3}
                placeholder="Any special requests for this delivery time..."
                className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg text-[15px] text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={saveAndAddAnother}
                disabled={currentTimeslot.items.length === 0}
                className="flex-1 px-6 py-3 border-2 border-[#0071E3] text-[#0071E3] text-[15px] font-semibold rounded-lg hover:bg-[#0071E3] hover:text-white transition-colors disabled:opacity-40"
              >
                Add Another Timeslot for This Day
              </button>
              <button
                onClick={saveAndCheckout}
                disabled={currentTimeslot.items.length === 0}
                className="flex-1 px-6 py-3 bg-[#0071E3] text-white text-[15px] font-semibold rounded-lg hover:bg-[#0077ED] transition-colors disabled:opacity-40"
              >
                Checkout
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {step === 'summary' && (
          <div>
            <h2 className="text-[22px] font-semibold text-[#1D1D1F] mb-2">Order Summary</h2>
            <p className="text-[15px] text-[#6E6E73] mb-8">
              Event date: {format(new Date(orderDate), 'EEEE, MMMM d, yyyy')}
            </p>

            {/* Timeslots */}
            <div className="space-y-6 mb-8">
              {timeslots.map((timeslot, index) => (
                <div key={timeslot.id} className="bg-white border border-[#E8E8ED] rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-[17px] font-semibold text-[#1D1D1F]">
                        Delivery {index + 1}: {timeslot.time}
                      </div>
                      <div className="text-[13px] text-[#6E6E73]">
                        {timeslot.guestCount} guests
                        {timeslot.floor && ` • Floor ${timeslot.floor}`}
                      </div>
                    </div>
                    <button
                      onClick={() => removeTimeslot(timeslot.id)}
                      className="text-[#FF3B30] text-[13px] font-medium hover:text-[#FF453A] transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  {timeslot.items.map(item => (
                    <div key={item.product.id} className="flex justify-between items-center py-2 border-t border-[#E8E8ED]">
                      <div>
                        <div className="text-[15px] text-[#1D1D1F]">{item.product.name}</div>
                        <div className="text-[13px] text-[#6E6E73]">
                          {item.quantity} × €{item.product.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-[15px] font-semibold text-[#1D1D1F]">
                        €{(item.quantity * item.product.price).toFixed(2)}
                      </div>
                    </div>
                  ))}

                  {timeslot.notes && (
                    <div className="mt-4 p-3 bg-[#F5F5F7] rounded-md">
                      <div className="text-[13px] font-medium text-[#86868B] mb-1">Special Instructions:</div>
                      <div className="text-[13px] text-[#1D1D1F]">{timeslot.notes}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="bg-[#F5F5F7] rounded-lg p-6 mb-8">
              <div className="flex justify-between items-center">
                <div className="text-[17px] font-semibold text-[#1D1D1F]">Total Amount</div>
                <div className="text-[28px] font-semibold text-[#0071E3]">
                  €{calculateTotal().toFixed(2)}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={startNewTimeslot}
                className="px-6 py-3 border border-[#D2D2D7] text-[#1D1D1F] text-[15px] font-semibold rounded-lg hover:bg-[#F5F5F7] transition-colors"
              >
                Edit Order
              </button>
              <button
                onClick={() => handleSubmitOrder('quote')}
                disabled={submitting}
                className="flex-1 px-6 py-3 border-2 border-[#0071E3] text-[#0071E3] text-[15px] font-semibold rounded-lg hover:bg-[#0071E3] hover:text-white transition-colors disabled:opacity-40"
              >
                {submitting ? 'Requesting...' : 'Request Quote'}
              </button>
              <button
                onClick={() => handleSubmitOrder('order')}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-[#0071E3] text-white text-[15px] font-semibold rounded-lg hover:bg-[#0077ED] transition-colors disabled:opacity-40"
              >
                {submitting ? 'Placing...' : 'Place Order'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
