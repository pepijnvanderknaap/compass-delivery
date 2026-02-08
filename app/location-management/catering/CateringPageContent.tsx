'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import UniversalHeader from '@/components/UniversalHeader';
import UserProfileComponent from '@/components/UserProfile';
import type { UserProfile } from '@/lib/types';

interface CateringPageContentProps {
  forcedLocation?: string;
}

interface CateringOrder {
  id: string;
  delivery_date: string;
  description: string;
  estimated_portions: number;
  food_cost: number;
  labor_cost: number;
  total_cost: number;
  status: 'draft' | 'ready_for_production' | 'delivered';
  created_at: string;
}

export default function CateringPageContent({ forcedLocation }: CateringPageContentProps) {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [locationParam, setLocationParam] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [orders, setOrders] = useState<CateringOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);

  // Location branding
  const locationBranding: Record<string, { logo: string; name: string; subtitle?: string }> = {
    'snowflake': { logo: '/locations/snowflake-logo-v2.png', name: 'Snowflake' },
    'atlassian': { logo: '/locations/atlassian-logo.png', name: 'Atlassian' },
    'snapchat-119': { logo: '/locations/snapchat-logo.jpg', name: 'SnapChat', subtitle: 'Building 119' },
    'snapchat-165': { logo: '/locations/snapchat-logo.jpg', name: 'SnapChat', subtitle: 'Building 165' },
    'jaa': { logo: '/locations/jaa-logo.png', name: 'JAA Training' },
  };

  const currentLocation = locationParam ? locationBranding[locationParam] : null;
  const navLocationSlug = locationParam;
  const snapchatBuilding = locationParam?.startsWith('snapchat-') ? locationParam.split('-')[1] : null;

  // New order form state
  const [newOrder, setNewOrder] = useState({
    delivery_date: '',
    description: '',
    estimated_portions: 0,
  });

  // Get minimum date (4 days from now)
  const getMinDeliveryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 4);
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);

      // Get user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Get location
      const { data: locationData } = await supabase
        .from('locations')
        .select('id, name')
        .eq('slug', forcedLocation || '')
        .single();

      if (locationData) {
        setLocationId(locationData.id);
        setLocationName(locationData.name);
        setLocationParam(forcedLocation || null);

        // Load catering orders
        const { data: ordersData } = await supabase
          .from('catering_orders')
          .select('*')
          .eq('location_id', locationData.id)
          .order('delivery_date', { ascending: false });

        setOrders(ordersData || []);
      }

      setLoading(false);
    };

    if (forcedLocation) {
      initialize();
    }
  }, [forcedLocation, supabase, router]);

  const handleCreateOrder = async () => {
    if (!locationId || !newOrder.delivery_date || !newOrder.description) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate 4-day minimum
    const deliveryDate = new Date(newOrder.delivery_date);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 4);

    if (deliveryDate < minDate) {
      alert('Delivery date must be at least 4 days from today');
      return;
    }

    const { data, error } = await supabase
      .from('catering_orders')
      .insert({
        location_id: locationId,
        delivery_date: newOrder.delivery_date,
        description: newOrder.description,
        estimated_portions: newOrder.estimated_portions,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating catering order:', error);
      alert('Failed to create catering order');
      return;
    }

    // Refresh orders list
    const { data: ordersData } = await supabase
      .from('catering_orders')
      .select('*')
      .eq('location_id', locationId)
      .order('delivery_date', { ascending: false });

    setOrders(ordersData || []);
    setShowNewOrderForm(false);
    setNewOrder({ delivery_date: '', description: '', estimated_portions: 0 });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-[#86868B] bg-[#F5F5F7]';
      case 'ready_for_production': return 'text-[#FF9500] bg-[#FFF4E5]';
      case 'delivered': return 'text-[#34C759] bg-[#E8F8EC]';
      default: return 'text-[#86868B] bg-[#F5F5F7]';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Awaiting Kitchen';
      case 'ready_for_production': return 'Ready for Production';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  if (loading || !profile || !currentLocation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <UniversalHeader
        locationLogo={currentLocation.logo}
        locationName={currentLocation.name}
        locationSubtitle={navLocationSlug?.startsWith('snapchat') ? `Building ${snapchatBuilding}` : currentLocation.subtitle}
        navItems={navLocationSlug ? [
          { label: 'Menu Overview', href: `/${navLocationSlug}/week-overview`, active: false },
          { label: 'Orders', href: `/${navLocationSlug}/orders`, active: false },
          { label: 'Soup & Salad Bar', href: `/${navLocationSlug}/soup-salad-bar`, active: false },
          { label: 'Catering', href: `/${navLocationSlug}/catering`, active: true },
          { label: 'Settings', href: `/${navLocationSlug}/settings`, active: false },
          { label: 'Cost & Billing', href: `/${navLocationSlug}/cost-billing`, active: false },
        ] : undefined}
        actions={
          <UserProfileComponent userName={profile.full_name || 'User'} redirectPath="/home" />
        }
      />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-[28px] font-semibold text-[#1D1D1F]">Catering Orders</h1>
            <p className="text-[13px] text-[#86868B] mt-1">Request off-menu items for special events</p>
          </div>
          <button
            onClick={() => setShowNewOrderForm(true)}
            className="px-6 py-2.5 text-[15px] font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-colors"
          >
            New Catering Order
          </button>
        </div>
        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white border border-[#E8E8ED] rounded-sm p-16 text-center shadow-sm">
            <p className="text-[15px] text-[#86868B]">No catering orders yet</p>
            <p className="text-[13px] text-[#86868B] mt-2">Click "New Catering Order" to request off-menu items</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white border border-[#E8E8ED] rounded-sm p-8 shadow-sm hover:border-[#0071E3] hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-[17px] font-semibold text-[#1D1D1F]">
                        {new Date(order.delivery_date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </h3>
                      <span className={`px-3 py-1.5 text-[12px] font-medium rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-[15px] text-[#1D1D1F] mb-3 leading-relaxed">{order.description}</p>
                    {order.estimated_portions > 0 && (
                      <p className="text-[13px] text-[#86868B]">Estimated portions: {order.estimated_portions}</p>
                    )}
                  </div>
                  {order.status !== 'draft' && order.total_cost > 0 && (
                    <div className="text-right ml-8">
                      <p className="text-[13px] font-medium text-[#86868B] mb-2">Total Cost</p>
                      <p className="text-[24px] font-semibold text-[#1D1D1F]">€{order.total_cost.toFixed(2)}</p>
                      <p className="text-[13px] text-[#86868B] mt-2">
                        Food: €{order.food_cost.toFixed(2)} | Labor: €{order.labor_cost.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Order Modal */}
      {showNewOrderForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-sm shadow-2xl max-w-2xl w-full p-10">
            <h2 className="text-[22px] font-semibold text-[#1D1D1F] mb-8">New Catering Order</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-[13px] font-medium text-[#86868B] mb-2.5">
                  Delivery Date (minimum 4 days from today) *
                </label>
                <input
                  type="date"
                  value={newOrder.delivery_date}
                  onChange={(e) => setNewOrder({ ...newOrder, delivery_date: e.target.value })}
                  min={getMinDeliveryDate()}
                  className="w-full px-4 py-3 text-[15px] border border-[#D2D2D7] rounded-sm focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#86868B] mb-2.5">
                  Description *
                </label>
                <textarea
                  value={newOrder.description}
                  onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                  placeholder="e.g., 200 canapés for drinks party"
                  rows={4}
                  className="w-full px-4 py-3 text-[15px] border border-[#D2D2D7] rounded-sm focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none resize-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#86868B] mb-2.5">
                  Estimated Portions
                </label>
                <input
                  type="number"
                  value={newOrder.estimated_portions || ''}
                  onChange={(e) => setNewOrder({ ...newOrder, estimated_portions: parseInt(e.target.value) || 0 })}
                  placeholder="Optional"
                  className="w-full px-4 py-3 text-[15px] border border-[#D2D2D7] rounded-sm focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                onClick={() => {
                  setShowNewOrderForm(false);
                  setNewOrder({ delivery_date: '', description: '', estimated_portions: 0 });
                }}
                className="flex-1 px-6 py-3.5 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded-sm hover:bg-[#F5F5F7] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                className="flex-1 px-6 py-3.5 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-all"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
