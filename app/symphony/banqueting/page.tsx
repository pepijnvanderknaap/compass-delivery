'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { UserProfile } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';

export default function SymphonyBanquetingPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
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

  const sections = [
    {
      title: 'Menu Catalog',
      href: '/symphony/banqueting/catalog',
      description: 'Manage banqueting items, pricing, and categories',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="currentColor"/>
          <path d="M14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor"/>
        </svg>
      ),
      available: true
    },
    {
      title: 'Orders',
      href: '/symphony/banqueting/orders',
      description: 'View and manage incoming banqueting orders',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      available: true
    },
    {
      title: 'Overview & Invoicing',
      href: '#',
      description: 'Coming soon - View statistics and generate invoices',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      available: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminQuickNav />

      <UniversalHeader
        title="Banqueting Management"
        backPath="/symphony/dashboard"
        locationLogo="/locations/symphony-offices.png"
        locationName="Symphony Offices"
        actions={
          <>
            <span className="text-apple-subheadline text-slate-700">{profile.full_name}</span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-apple-subheadline font-medium text-white bg-apple-blue hover:bg-apple-blue-hover rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </>
        }
      />

      <main className="max-w-6xl mx-auto px-8 py-24">
        <div className="mb-8">
          <h2 className="text-[28px] font-semibold text-[#1D1D1F] mb-2">
            Banqueting Services
          </h2>
          <p className="text-[17px] text-[#6E6E73]">
            Manage your catering catalog, orders, and billing
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            section.available ? (
              <Link
                key={section.href}
                href={section.href}
                className="group relative overflow-hidden bg-white border border-[#E8E8ED] rounded-xl p-8 hover:border-[#0071E3] hover:shadow-lg transition-all duration-300"
              >
                <div className="text-[#0071E3] mb-6 group-hover:scale-110 transition-transform duration-300">
                  {section.icon}
                </div>
                <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-2">
                  {section.title}
                </h3>
                <p className="text-[15px] text-[#6E6E73]">{section.description}</p>
              </Link>
            ) : (
              <div
                key={section.title}
                className="relative overflow-hidden bg-white border border-[#E8E8ED] rounded-xl p-8 opacity-50 cursor-not-allowed"
              >
                <div className="text-[#86868B] mb-6">
                  {section.icon}
                </div>
                <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-2">
                  {section.title}
                </h3>
                <p className="text-[15px] text-[#6E6E73]">{section.description}</p>
              </div>
            )
          ))}
        </div>
      </main>
    </div>
  );
}
