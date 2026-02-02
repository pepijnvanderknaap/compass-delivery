'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { UserProfile } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';

interface DashboardSection {
  title: string;
  href: string;
  description: string;
  available: boolean;
  icon: ReactNode;
}

interface LocationDashboardProps {
  locationSlug: string;
  locationLogo: string;
  locationName: string;
  locationSubtitle?: string;
  loadingColor?: string;
  buildingSwitcher?: ReactNode;
  customSections?: DashboardSection[];
}

export default function LocationDashboard({
  locationSlug,
  locationLogo,
  locationName,
  locationSubtitle,
  loadingColor = 'border-[#0078D4]',
  buildingSwitcher,
  customSections
}: LocationDashboardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push(`/login/${locationSlug}`);
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
  }, [supabase, router, locationSlug]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${loadingColor} mx-auto mb-4`}></div>
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

  const defaultSections: DashboardSection[] = [
    {
      title: 'Menu Overview',
      href: '#',
      description: 'Coming soon',
      available: false,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      title: 'Orders',
      href: `/${locationSlug}/orders`,
      description: 'View and manage your orders',
      available: true,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      title: 'Soup & Salad Bar',
      href: `/${locationSlug}/soup-salad-bar`,
      description: 'Configure soup portions and salad bar composition',
      available: true,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
      )
    },
    {
      title: 'Banqueting',
      href: `/${locationSlug}/banqueting`,
      description: 'Manage catering catalog, orders and quotes',
      available: true,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M3 2h8M3 2v7M11 2v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 2v5h-2v15M20 7H16M19 11h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="7" cy="22" r="1" fill="currentColor"/>
        </svg>
      )
    },
    {
      title: 'Location Settings',
      href: `/${locationSlug}/settings`,
      description: 'View location details and contact information',
      available: true,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      title: 'Feedback',
      href: '#',
      description: 'Coming soon',
      available: false,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
  ];

  const sections = customSections || defaultSections;

  return (
    <div className="min-h-screen bg-white">
      <AdminQuickNav />

      <UniversalHeader
        title=""
        backPath="/home"
        locationLogo={locationLogo}
        locationName={locationName}
        actions={
          <>
            <span className="text-apple-subheadline text-[#6E6E73]">{profile.full_name}</span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-apple-subheadline font-medium text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </>
        }
      />

      <main className="max-w-6xl mx-auto px-8 py-24">
        {buildingSwitcher && (
          <div className="mb-8 flex justify-center">
            {buildingSwitcher}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => (
            section.available ? (
              <Link
                key={section.href}
                href={section.href}
                className="group relative overflow-hidden bg-white border-2 border-[#D2D2D7] rounded-lg p-8 hover:border-[#1D1D1F] hover:shadow-lg transition-all duration-300"
              >
                <div className="text-[#0078D4] mb-6 group-hover:scale-110 transition-all duration-300">
                  {section.icon}
                </div>
                <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">
                  {section.title}
                </h3>
                <p className="text-sm text-[#6E6E73]">{section.description}</p>
              </Link>
            ) : (
              <div
                key={section.title}
                className="relative overflow-hidden bg-white border-2 border-[#E8E8ED] rounded-lg p-8 opacity-50 cursor-not-allowed"
              >
                <div className="text-[#86868B] mb-6">
                  {section.icon}
                </div>
                <h3 className="text-xl font-semibold text-[#6E6E73] mb-2">
                  {section.title}
                </h3>
                <p className="text-sm text-[#86868B]">{section.description}</p>
              </div>
            )
          ))}
        </div>
      </main>
    </div>
  );
}
