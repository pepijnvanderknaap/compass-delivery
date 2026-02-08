'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';

interface BanquetingOrder {
  id: string;
  order_number: string | null;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  delivery_date: string;
  delivery_time: string;
  floor_number: string | null;
  status: string;
  notes: string | null;
  total_amount: number;
  created_at: string;
}

interface BanquetingPageContentProps {
  forcedLocation?: string;
}

export default function BanquetingPageContent({ forcedLocation }: BanquetingPageContentProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<BanquetingOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders'>('orders');
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

  // Use forcedLocation if provided, otherwise use searchParams
  const locationParam = forcedLocation || searchParams.get('location');
  const currentLocation = locationParam ? locationBranding[locationParam] : null;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push(currentLocation ? `/login/${locationParam}` : '/login/location-management');
          return;
        }

        const { data: profileData, error } = await supabase
          .from('user_profiles')
          .select('*, locations(name)')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        setProfile(profileData);
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [supabase, router, locationParam, currentLocation]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/home');
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      // Get location ID based on location parameter
      let locationId = profile?.location_id;

      if (locationParam) {
        // Map location param to actual location name
        const locationName = currentLocation?.name || 'Symphony';
        const { data: location } = await supabase
          .from('locations')
          .select('id')
          .eq('name', locationName)
          .single();

        if (location) {
          locationId = location.id;
        }
      }

      if (!locationId) return;

      const { data, error } = await supabase
        .from('banqueting_orders')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      setOrders(data || []);
    } catch (err) {
      console.error('Unexpected error fetching orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchOrders();
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Unable to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminQuickNav />

      <UniversalHeader
        title="Banqueting"
        backPath={currentLocation ? (locationParam === 'snapchat-119' || locationParam === 'snapchat-165' ? '/snapchat/dashboard' : `/${locationParam}/dashboard`) : "/location-management"}
        locationLogo={currentLocation?.logo || ""}
        locationName={currentLocation?.name || ""}
        locationSubtitle={currentLocation?.subtitle}
        actions={
          <>
            <span className="text-apple-subheadline text-slate-700">{profile.full_name}</span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-apple-subheadline font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </>
        }
      />

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        {/* Tabs */}
        <div className="flex gap-6 mb-8 border-b border-[#E8E8ED]">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 text-[15px] font-semibold transition-all ${
              activeTab === 'orders'
                ? 'text-[#0071E3] border-b-2 border-[#0071E3]'
                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`pb-3 text-[15px] font-semibold transition-all ${
              activeTab === 'catalog'
                ? 'text-[#0071E3] border-b-2 border-[#0071E3]'
                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
            }`}
          >
            Catalog
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            {ordersLoading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3] mx-auto"></div>
                <p className="mt-4 text-[15px] text-[#86868B]">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white border border-[#E8E8ED] rounded-sm p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#D2D2D7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-2">No orders yet</h3>
                <p className="text-[15px] text-[#6E6E73]">Banqueting orders will appear here</p>
              </div>
            ) : (
              <div className="bg-white border border-[#E8E8ED] rounded-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#F5F5F7] border-b border-[#E8E8ED]">
                    <tr>
                      <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">Date</th>
                      <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">Company</th>
                      <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">Contact</th>
                      <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">Event</th>
                      <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">Status</th>
                      <th className="px-6 py-4 text-right text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8ED]">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-[#F5F5F7] transition-colors">
                        <td className="px-6 py-4 text-[15px] text-[#1D1D1F]">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[15px] font-medium text-[#1D1D1F]">{order.company_name}</p>
                          {order.floor_number && (
                            <p className="text-[13px] text-[#86868B]">Floor {order.floor_number}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[15px] text-[#1D1D1F]">{order.contact_name}</p>
                          <p className="text-[13px] text-[#86868B]">{order.contact_email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[15px] text-[#1D1D1F]">
                            {new Date(order.delivery_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-[13px] text-[#86868B]">{order.delivery_time}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 text-[12px] font-medium rounded-full ${
                            order.status === 'pending' ? 'bg-[#FF9500]/10 text-[#FF9500]' :
                            order.status === 'confirmed' ? 'bg-[#34C759]/10 text-[#34C759]' :
                            order.status === 'cancelled' ? 'bg-[#FF3B30]/10 text-[#FF3B30]' :
                            'bg-[#86868B]/10 text-[#86868B]'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-[15px] font-semibold text-[#1D1D1F]">
                          €{order.total_amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Catalog Tab */}
        {activeTab === 'catalog' && (
          <div className="bg-white border border-[#E8E8ED] rounded-sm p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#D2D2D7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-2">Catalog Management</h3>
            <p className="text-[15px] text-[#6E6E73]">Coming soon</p>
          </div>
        )}
      </main>
    </div>
  );
}
