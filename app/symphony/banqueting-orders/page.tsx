'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

interface BanquetingItem {
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

type Category = 'breakfast' | 'coffee_tea_snacks' | 'lunch_dinner' | 'borrel' | 'custom';

const categoryLabels: Record<Category, string> = {
  breakfast: 'Breakfast',
  coffee_tea_snacks: 'Coffee, Tea & Snacks',
  lunch_dinner: 'Lunch & Dinners',
  borrel: 'Borrel',
  custom: 'Custom Request',
};

interface CartItem {
  item: BanquetingItem;
  quantity: number;
}

interface CheckoutModalProps {
  cart: CartItem[];
  company: CompanyData | null;
  onClose: () => void;
  onSuccess: () => void;
}

function CheckoutModal({ cart, company, onClose, onSuccess }: CheckoutModalProps) {
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [floorNumber, setFloorNumber] = useState(company?.floor_number || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionType, setSubmissionType] = useState<'order' | 'quote' | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleRequestQuote = async () => {
    if (!company) return;
    if (!deliveryDate || !deliveryTime) {
      alert('Please fill in the event date and time.');
      return;
    }

    setSubmitting(true);
    setSubmissionType('quote');

    try {
      // Get Symphony location ID
      const { data: location } = await supabase
        .from('locations')
        .select('id')
        .eq('name', 'Symphony')
        .single();

      if (!location) {
        alert('Error: Symphony location not found');
        setSubmitting(false);
        return;
      }

      // Separate custom and regular items
      const regularItems = cart.filter(item => !item.item.id.startsWith('custom-'));
      const customItems = cart.filter(item => item.item.id.startsWith('custom-'));

      const totalAmount = regularItems.reduce((sum, item) =>
        item.item.requires_quote ? sum : sum + (item.item.price * item.quantity), 0
      );

      // Build notes with custom requests
      let fullNotes = notes || '';
      if (customItems.length > 0) {
        const customRequestText = '\n\n--- Custom Requests ---\n' +
          customItems.map(item => `• ${item.item.description} (Qty: ${item.quantity})`).join('\n');
        fullNotes += customRequestText;
      }

      // Generate PO number (format: PO-YYYY-XXXX)
      const year = new Date().getFullYear();
      const { data: lastQuote } = await supabase
        .from('banqueting_orders')
        .select('po_number')
        .not('po_number', 'is', null)
        .like('po_number', `PO-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let poNumber;
      if (lastQuote?.po_number) {
        const lastNumber = parseInt(lastQuote.po_number.split('-')[2]);
        poNumber = `PO-${year}-${String(lastNumber + 1).padStart(4, '0')}`;
      } else {
        poNumber = `PO-${year}-0001`;
      }

      // Create quote (stored as order with 'quoted' status)
      const { data: quote, error: quoteError } = await supabase
        .from('banqueting_orders')
        .insert({
          location_id: location.id,
          company_name: company.company_name,
          contact_name: company.contact_name,
          contact_email: company.contact_email,
          contact_phone: company.contact_phone,
          delivery_date: deliveryDate,
          delivery_time: deliveryTime,
          floor_number: floorNumber,
          notes: fullNotes,
          total_amount: totalAmount,
          po_number: poNumber,
          status: 'quoted'
        })
        .select()
        .single();

      if (quoteError || !quote) {
        console.error('Quote creation error:', quoteError);
        alert('Failed to create quote. Please try again.');
        setSubmitting(false);
        return;
      }

      // Create quote items (only for regular catalog items, not custom requests)
      if (regularItems.length > 0) {
        const quoteItems = regularItems.map(item => ({
          order_id: quote.id,
          item_id: item.item.id,
          quantity: item.quantity,
          unit_price: item.item.price,
          total_price: item.item.price * item.quantity
        }));

        const { error: itemsError } = await supabase
          .from('banqueting_order_items')
          .insert(quoteItems);

        if (itemsError) {
          console.error('Quote items error:', itemsError);
          alert('Quote created but failed to add items. Please contact support.');
          setSubmitting(false);
          return;
        }
      }

      // TODO: Send automated quote email

      setSuccess(true);
      setTimeout(() => {
        onSuccess(); // Clear cart and close modals
      }, 2000);
    } catch (err) {
      console.error('Submission error:', err);
      alert('An error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!company) return;
    if (!deliveryDate || !deliveryTime) {
      alert('Please fill in the event date and time.');
      return;
    }

    setSubmitting(true);
    setSubmissionType('order');

    try {
      // Get Symphony location ID
      const { data: location } = await supabase
        .from('locations')
        .select('id')
        .eq('name', 'Symphony')
        .single();

      if (!location) {
        alert('Error: Symphony location not found');
        setSubmitting(false);
        return;
      }

      // Separate custom and regular items
      const regularItems = cart.filter(item => !item.item.id.startsWith('custom-'));
      const customItems = cart.filter(item => item.item.id.startsWith('custom-'));

      const totalAmount = regularItems.reduce((sum, item) =>
        item.item.requires_quote ? sum : sum + (item.item.price * item.quantity), 0
      );

      // Build notes with custom requests
      let fullNotes = notes || '';
      if (customItems.length > 0) {
        const customRequestText = '\n\n--- Custom Requests ---\n' +
          customItems.map(item => `• ${item.item.description} (Qty: ${item.quantity})`).join('\n');
        fullNotes += customRequestText;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('banqueting_orders')
        .insert({
          location_id: location.id,
          company_name: company.company_name,
          contact_name: company.contact_name,
          contact_email: company.contact_email,
          contact_phone: company.contact_phone,
          delivery_date: deliveryDate,
          delivery_time: deliveryTime,
          floor_number: floorNumber,
          notes: fullNotes,
          total_amount: totalAmount,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError || !order) {
        console.error('Order creation error:', orderError);
        alert('Failed to create order. Please try again.');
        setSubmitting(false);
        return;
      }

      // Create order items (only for regular catalog items, not custom requests)
      if (regularItems.length > 0) {
        const orderItems = regularItems.map(item => ({
          order_id: order.id,
          item_id: item.item.id,
          quantity: item.quantity,
          unit_price: item.item.price,
          total_price: item.item.price * item.quantity
        }));

        const { error: itemsError } = await supabase
          .from('banqueting_order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('Order items error:', itemsError);
          alert('Order created but failed to add items. Please contact support.');
          setSubmitting(false);
          return;
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess(); // Clear cart and close modals
      }, 2000);
    } catch (err) {
      console.error('Submission error:', err);
      alert('An error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-[#34C759] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-[22px] font-semibold text-[#1D1D1F] mb-2">
            {submissionType === 'quote' ? 'Quote Requested!' : 'Order Placed!'}
          </h2>
          <p className="text-[15px] text-[#6E6E73]">
            {submissionType === 'quote'
              ? "Your quote request has been submitted. We'll send you a formal quote via email shortly."
              : "Your banqueting order has been submitted. We'll contact you shortly to confirm."}
          </p>
        </div>
      </div>
    );
  }

  const getTotalPrice = () => {
    return cart.reduce((total, cartItem) => {
      if (cartItem.item.requires_quote) return total;
      return total + (cartItem.item.price * cartItem.quantity);
    }, 0);
  };

  const hasQuoteItems = cart.some(item => item.item.requires_quote);

  // Get tomorrow as minimum date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#E8E8ED]">
          <div className="flex items-center justify-between">
            <h2 className="text-[28px] font-semibold text-[#1D1D1F]">Event Details</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-6 space-y-6">
          {/* Company Info (Read-only) */}
          <div className="bg-[#F5F5F7] rounded-sm p-4">
            <p className="text-[13px] font-medium text-[#86868B] mb-2">Ordering for:</p>
            <p className="text-[17px] font-semibold text-[#1D1D1F]">{company?.company_name}</p>
            <p className="text-[15px] text-[#6E6E73]">{company?.contact_name}</p>
          </div>

          {/* Delivery Date */}
          <div>
            <label htmlFor="date" className="block text-[13px] font-medium text-[#86868B] mb-2">
              Event Date <span className="text-[#FF3B30]">*</span>
            </label>
            <input
              id="date"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={minDate}
              className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
              required
            />
          </div>

          {/* Delivery Time */}
          <div>
            <label htmlFor="time" className="block text-[13px] font-medium text-[#86868B] mb-2">
              Event Time <span className="text-[#FF3B30]">*</span>
            </label>
            <input
              id="time"
              type="time"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
              required
            />
          </div>

          {/* Floor Number */}
          <div>
            <label htmlFor="floor" className="block text-[13px] font-medium text-[#86868B] mb-2">
              Floor Number
            </label>
            <input
              id="floor"
              type="text"
              value={floorNumber}
              onChange={(e) => setFloorNumber(e.target.value)}
              className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
              placeholder="e.g., 5"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label htmlFor="notes" className="block text-[13px] font-medium text-[#86868B] mb-2">
              Additional Information
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all resize-none"
              placeholder="Dietary requirements, setup instructions, etc."
            />
          </div>

          {/* Order Summary */}
          <div className="border-t border-[#E8E8ED] pt-6">
            <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-3">Order Summary</h3>
            <div className="space-y-2 mb-4">
              {cart.map((item) => (
                <div key={item.item.id} className="flex justify-between text-[15px]">
                  <span className="text-[#6E6E73]">
                    {item.quantity}x {item.item.name}
                  </span>
                  {!item.item.requires_quote && (
                    <span className="font-medium text-[#1D1D1F]">
                      €{(item.item.price * item.quantity).toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {!hasQuoteItems && (
              <div className="flex justify-between items-center pt-3 border-t border-[#E8E8ED]">
                <span className="text-[17px] font-semibold text-[#1D1D1F]">Total</span>
                <span className="text-[22px] font-semibold text-[#1D1D1F]">
                  €{getTotalPrice().toFixed(2)}
                </span>
              </div>
            )}
            {hasQuoteItems && (
              <p className="text-[13px] text-[#FF9500] mt-2">
                * Some items require a quote - final pricing to be confirmed
              </p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="space-y-3 pt-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRequestQuote}
                disabled={submitting}
                className="flex-1 px-6 py-3 border border-[#0071E3] text-[#0071E3] text-[15px] font-semibold rounded-sm hover:bg-[#0071E3]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting && submissionType === 'quote' ? 'Requesting...' : 'Request Quote'}
              </button>
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-[#0071E3] text-white text-[15px] font-semibold rounded-sm hover:bg-[#0077ED] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting && submissionType === 'order' ? 'Submitting...' : 'Place Order'}
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full px-6 py-3 border border-[#D2D2D7] text-[#1D1D1F] text-[15px] font-medium rounded-sm hover:bg-[#F5F5F7] transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CompanyData {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  floor_number: string | null;
}

export default function BanquetingWebshopPage() {
  const [items, setItems] = useState<BanquetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category>('breakfast');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [company, setCompany] = useState<CompanyData | null>(null);

  // Custom request form fields
  const [customEventDate, setCustomEventDate] = useState('');
  const [customNumberOfPeople, setCustomNumberOfPeople] = useState('');
  const [customEventType, setCustomEventType] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check authentication
    const companyData = sessionStorage.getItem('symphony_company');
    if (!companyData) {
      router.push('/symphony');
      return;
    }
    setCompany(JSON.parse(companyData));
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('banqueting_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching items:', error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const filteredItems = items.filter(item => item.category === selectedCategory);

  const addToCart = (item: BanquetingItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.item.id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.item.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prevCart, { item, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity === 0) {
      setCart(prevCart => prevCart.filter(cartItem => cartItem.item.id !== itemId));
    } else {
      setCart(prevCart =>
        prevCart.map(cartItem =>
          cartItem.item.id === itemId ? { ...cartItem, quantity } : cartItem
        )
      );
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, cartItem) => {
      if (cartItem.item.requires_quote) return total;
      return total + (cartItem.item.price * cartItem.quantity);
    }, 0);
  };

  const hasQuoteItems = cart.some(cartItem => cartItem.item.requires_quote);

  const handleCheckout = () => {
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleAddCustomRequest = () => {
    if (!customEventDate || !customNumberOfPeople || !customEventType || !customDescription.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // Build detailed description
    const fullDescription = `Event Date: ${customEventDate}\nNumber of People: ${customNumberOfPeople}\nEvent Type: ${customEventType}\n\nDetails:\n${customDescription}`;

    // Create a temporary custom item
    const customItem: BanquetingItem = {
      id: `custom-${Date.now()}`,
      name: `Custom ${customEventType} Request`,
      description: fullDescription,
      category: 'custom',
      price: 0,
      unit: 'custom event',
      requires_quote: true,
      image_url: null,
      is_active: true,
      sort_order: 999
    };

    addToCart(customItem);

    // Clear form
    setCustomEventDate('');
    setCustomNumberOfPeople('');
    setCustomEventType('');
    setCustomDescription('');

    setShowCart(true);
  };

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
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative px-6 py-2.5 bg-[#0071E3] text-white text-[15px] font-semibold rounded-sm hover:bg-[#0077ED] transition-colors"
              >
                Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Page Title */}
        <h1 className="text-[28px] font-semibold text-[#1D1D1F] mb-8">Banqueting Menu</h1>

        {/* Category Tabs */}
        <div className="flex gap-6 mb-8">
          {(Object.keys(categoryLabels) as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`pb-3 text-[15px] font-semibold transition-all ${
                selectedCategory === cat
                  ? 'text-[#0071E3]'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Items Grid or Custom Request Form */}
        {selectedCategory === 'custom' ? (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white border border-[#E8E8ED] rounded-sm shadow-sm p-8">
              <div className="mb-6">
                <h2 className="text-[28px] font-semibold text-[#1D1D1F] mb-2">Custom Catering Request</h2>
                <p className="text-[15px] text-[#6E6E73]">
                  Tell us about your event and we'll create a custom catering solution for you
                </p>
              </div>

              <div className="space-y-6">
                {/* Event Date */}
                <div>
                  <label htmlFor="customEventDate" className="block text-[13px] font-medium text-[#86868B] mb-2">
                    Event Date <span className="text-[#FF3B30]">*</span>
                  </label>
                  <input
                    id="customEventDate"
                    type="date"
                    value={customEventDate}
                    onChange={(e) => setCustomEventDate(e.target.value)}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                  />
                </div>

                {/* Number of People */}
                <div>
                  <label htmlFor="customNumberOfPeople" className="block text-[13px] font-medium text-[#86868B] mb-2">
                    Number of People <span className="text-[#FF3B30]">*</span>
                  </label>
                  <input
                    id="customNumberOfPeople"
                    type="number"
                    min="1"
                    value={customNumberOfPeople}
                    onChange={(e) => setCustomNumberOfPeople(e.target.value)}
                    placeholder="e.g., 50"
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                  />
                </div>

                {/* Type of Event */}
                <div>
                  <label htmlFor="customEventType" className="block text-[13px] font-medium text-[#86868B] mb-2">
                    Type of Event <span className="text-[#FF3B30]">*</span>
                  </label>
                  <select
                    id="customEventType"
                    value={customEventType}
                    onChange={(e) => setCustomEventType(e.target.value)}
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                  >
                    <option value="">Select event type...</option>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Borrel">Borrel</option>
                    <option value="Party">Party</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Request Details */}
                <div>
                  <label htmlFor="customDescription" className="block text-[13px] font-medium text-[#86868B] mb-2">
                    Event Details & Requirements <span className="text-[#FF3B30]">*</span>
                  </label>
                  <textarea
                    id="customDescription"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all resize-none"
                    placeholder="Describe your catering needs in detail. Include cuisine preferences, dietary requirements, service style, and any specific requests..."
                  />
                </div>

                <div className="bg-[#F5F5F7] rounded-sm p-4">
                  <p className="text-[13px] text-[#6E6E73]">
                    💡 Tip: The more details you provide, the better we can tailor our quote to your needs. Include information about dietary restrictions, preferred cuisine, setup requirements, and any special requests.
                  </p>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddCustomRequest}
                  className="w-full px-6 py-4 bg-[#0071E3] text-white text-[15px] font-semibold rounded-sm hover:bg-[#0077ED] transition-colors"
                >
                  Add Custom Request to Cart
                </button>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3] mx-auto"></div>
            <p className="mt-4 text-[15px] text-[#86868B]">Loading menu...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.length === 0 ? (
              <div className="col-span-full flex flex-col items-center py-20">
                <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-[#D2D2D7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-[15px] text-[#86868B]">No items available in this category</p>
                <p className="text-[13px] text-[#86868B] mt-1">Check back soon for new additions</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-[#E8E8ED] rounded-sm shadow-sm p-6 hover:shadow-md hover:border-[#D2D2D7] transition-all flex flex-col"
                >
                  {item.image_url && (
                    <div className="w-full h-48 mb-4 bg-[#F5F5F7] rounded-sm overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-2">{item.name}</h3>
                  <div className="flex-grow">
                    {item.description && (
                      <p className="text-[15px] text-[#6E6E73] mb-4">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-end justify-between mt-4">
                    <div>
                      {item.requires_quote ? (
                        <span className="text-[15px] font-medium text-[#FF9500]">Quote Required</span>
                      ) : (
                        <span className="text-[17px] font-semibold text-[#1D1D1F]">
                          €{item.price.toFixed(2)}
                        </span>
                      )}
                      <p className="text-[13px] text-[#86868B]">{item.unit}</p>
                    </div>
                    <button
                      onClick={() => addToCart(item)}
                      className="px-4 py-2 bg-[#0071E3] text-white text-[15px] font-semibold rounded-sm hover:bg-[#0077ED] transition-colors"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          cart={cart}
          company={company}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setCart([]); // Clear cart
            setShowCheckout(false); // Close checkout modal
          }}
        />
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in duration-200"
          onClick={() => setShowCart(false)}
        >
          <div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cart Header */}
            <div className="px-6 py-6 border-b border-[#E8E8ED]">
              <div className="flex items-center justify-between">
                <h2 className="text-[22px] font-semibold text-[#1D1D1F]">Your Cart</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-[#D2D2D7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="text-[15px] text-[#86868B]">Your cart is empty</p>
                  <p className="text-[13px] text-[#86868B] mt-1">Add items to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((cartItem) => (
                    <div key={cartItem.item.id} className="border border-[#E8E8ED] rounded-sm p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-[15px] font-medium text-[#1D1D1F]">{cartItem.item.name}</h3>
                          <p className="text-[13px] text-[#86868B]">{cartItem.item.unit}</p>
                        </div>
                        {!cartItem.item.requires_quote && (
                          <span className="text-[15px] font-semibold text-[#1D1D1F]">
                            €{(cartItem.item.price * cartItem.quantity).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center border border-[#D2D2D7] rounded-sm text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                        >
                          -
                        </button>
                        <span className="text-[15px] font-semibold text-[#1D1D1F] w-10 text-center">
                          {cartItem.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(cartItem.item.id, cartItem.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center border border-[#D2D2D7] rounded-sm text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                        >
                          +
                        </button>
                        <button
                          onClick={() => updateQuantity(cartItem.item.id, 0)}
                          className="ml-auto text-[13px] font-medium text-[#FF3B30] hover:text-[#FF453A] transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="px-6 py-6 border-t border-[#E8E8ED]">
                {!hasQuoteItems && (
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[17px] font-semibold text-[#1D1D1F]">Total</span>
                    <span className="text-[22px] font-semibold text-[#1D1D1F]">
                      €{getTotalPrice().toFixed(2)}
                    </span>
                  </div>
                )}
                {hasQuoteItems && (
                  <p className="text-[13px] text-[#FF9500] mb-4">
                    * Some items require a quote - we'll contact you with pricing
                  </p>
                )}
                <button
                  onClick={handleCheckout}
                  className="w-full px-6 py-3 bg-[#0071E3] text-white text-[15px] font-semibold rounded-sm hover:bg-[#0077ED] transition-colors"
                >
                  Request Quote / Place Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
