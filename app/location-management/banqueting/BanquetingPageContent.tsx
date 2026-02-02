'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';

interface BanquetingPageContentProps {
  forcedLocation?: string;
}

export default function BanquetingPageContent({ forcedLocation }: BanquetingPageContentProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
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

      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-12 text-center">
          <svg
            className="w-24 h-24 mx-auto mb-6 text-gray-300"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M3 2h8M3 2v7M11 2v7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 2v5h-2v15M20 7H16M19 11h-3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="7" cy="22" r="1" fill="currentColor"/>
          </svg>

          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            Banqueting Module
          </h2>

          <p className="text-lg text-gray-600 mb-2">
            Coming Soon
          </p>

          <p className="text-sm text-gray-500 max-w-2xl mx-auto">
            The banqueting module will allow you to manage catering catalog, orders, and quotes for events and meetings.
          </p>
        </div>
      </main>
    </div>
  );
}
