'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { UserProfile } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';
import { getLocationNavItems } from '@/lib/locationConfig';

export default function SymphonyBanquetingPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders' | 'quotes' | 'invoicing'>('catalog');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login/symphony');
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
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Unable to load profile</p>
      </div>
    );
  }

  // Generate navigation items for Symphony with Banqueting as active
  const navItems = getLocationNavItems('symphony', 'Banqueting');

  return (
    <div className="min-h-screen bg-white">
      <AdminQuickNav />

      <UniversalHeader
        title=""
        backPath=""
        locationLogo="/locations/symphony-offices.png"
        locationName="Symphony Offices"
        navItems={navItems}
        actions={
          <span className="text-apple-subheadline text-[#6E6E73]">{profile.full_name}</span>
        }
      />

      <main className="max-w-7xl mx-auto px-8 lg:px-12 pt-24 pb-8">
        <div className="mb-6">
          <h2 className="text-[28px] font-semibold text-[#1D1D1F] mb-2">
            Banqueting Services
          </h2>
          <p className="text-[17px] text-[#6E6E73]">
            Manage your catering catalog, orders, and billing
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`pb-3 text-[15px] font-semibold transition-all ${
              activeTab === 'catalog'
                ? 'text-[#0071E3]'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Menu Catalog
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 text-[15px] font-semibold transition-all ${
              activeTab === 'orders'
                ? 'text-[#0071E3]'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('quotes')}
            className={`pb-3 text-[15px] font-semibold transition-all ${
              activeTab === 'quotes'
                ? 'text-[#0071E3]'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Quotes
          </button>
          <button
            onClick={() => setActiveTab('invoicing')}
            disabled
            className="pb-3 text-[15px] font-semibold text-[#86868B] opacity-50 cursor-not-allowed"
          >
            Overview & Invoicing
            <span className="ml-2 text-[11px] font-normal">(Coming Soon)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Catalog Tab */}
          <div className={activeTab !== 'catalog' ? 'hidden' : ''}>
            <iframe
              src="/symphony/banqueting/catalog"
              className="w-full h-[calc(100vh-300px)] border border-[#E8E8ED] rounded-lg"
              title="Banqueting Catalog"
            />
          </div>

          {/* Orders Tab */}
          <div className={activeTab !== 'orders' ? 'hidden' : ''}>
            <iframe
              src="/symphony/banqueting/orders"
              className="w-full h-[calc(100vh-300px)] border border-[#E8E8ED] rounded-lg"
              title="Banqueting Orders"
            />
          </div>

          {/* Quotes Tab */}
          <div className={activeTab !== 'quotes' ? 'hidden' : ''}>
            <iframe
              src="/symphony/banqueting/quotes"
              className="w-full h-[calc(100vh-300px)] border border-[#E8E8ED] rounded-lg"
              title="Banqueting Quotes"
            />
          </div>

          {/* Invoicing Tab */}
          <div className={activeTab !== 'invoicing' ? 'hidden' : ''}>
            <div className="bg-[#F5F5F7] border border-[#E8E8ED] rounded-lg p-12 text-center">
              <p className="text-[17px] text-[#6E6E73]">Overview & Invoicing coming soon</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
