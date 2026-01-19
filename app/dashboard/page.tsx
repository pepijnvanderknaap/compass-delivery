'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import type { UserProfile } from '@/lib/types';

function DashboardContent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'order_submitted') {
      setSuccessMessage('Order submitted successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
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
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
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

  const mainSections = {
    admin: [
      {
        title: 'Dark Kitchen',
        href: '/dark-kitchen',
        description: 'Manage dishes, menus, recipes, and production',
        gradient: 'from-slate-700 via-slate-800 to-slate-900',
        icon: (
          <svg className="w-20 h-20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      },
      {
        title: 'Location Management',
        href: '/location-management',
        description: 'Orders, menus, and feedback for locations',
        gradient: 'from-emerald-600 via-teal-700 to-cyan-800',
        icon: (
          <svg className="w-20 h-20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      },
      {
        title: 'Regional Management',
        href: '/regional-management',
        description: 'Invoicing and statistics overview',
        gradient: 'from-indigo-600 via-purple-700 to-pink-800',
        icon: (
          <svg className="w-20 h-20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 16V8C20.9996 7.64928 20.9071 7.30481 20.7315 7.00116C20.556 6.69751 20.3037 6.44536 20 6.27L13 2.27C12.696 2.09446 12.3511 2.00205 12 2.00205C11.6489 2.00205 11.304 2.09446 11 2.27L4 6.27C3.69626 6.44536 3.44398 6.69751 3.26846 7.00116C3.09294 7.30481 3.00036 7.64928 3 8V16C3.00036 16.3507 3.09294 16.6952 3.26846 16.9988C3.44398 17.3025 3.69626 17.5546 4 17.73L11 21.73C11.304 21.9055 11.6489 21.9979 12 21.9979C12.3511 21.9979 12.696 21.9055 13 21.73L20 17.73C20.3037 17.5546 20.556 17.3025 20.7315 16.9988C20.9071 16.6952 20.9996 16.3507 21 16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3.27002 6.96L12 12.01L20.73 6.96" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 22.08V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      },
    ],
    kitchen: [
      {
        title: 'Dark Kitchen',
        href: '/dark-kitchen',
        description: 'View daily production and prep overview',
        gradient: 'from-slate-700 via-slate-800 to-slate-900',
        icon: (
          <svg className="w-20 h-20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      },
    ],
    manager: [
      {
        title: 'Location Management',
        href: '/location-management',
        description: 'Manage orders and view menus for your location',
        gradient: 'from-emerald-600 via-teal-700 to-cyan-800',
        icon: (
          <svg className="w-20 h-20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      },
    ],
  };

  const sections = mainSections[profile.role as keyof typeof mainSections] || [];

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-end gap-8">
              <Image src="/compass-logo.svg" alt="Compass Group" width={120} height={120} className="h-16 w-auto" priority />
              <div className="border-l-2 border-gray-300 pl-8 pb-1">
                <h1 className="text-xl font-semibold text-gray-900">Delivery</h1>
                <p className="text-sm text-gray-600">
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  {profile.location_id && ` · ${(profile.locations as any)?.name || ''}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{profile.full_name}</span>
              <button
                onClick={handleSignOut}
                className="px-6 py-2 text-sm font-medium bg-[#8B7355] text-white rounded-full hover:bg-[#6F5B44] transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-16">
        {successMessage && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-green-50 text-green-900 text-sm font-medium">
            {successMessage}
          </div>
        )}

        <div className="mb-16 text-center">
          <h2 className="text-5xl font-bold text-black mb-3 tracking-tight">
            Welcome back
          </h2>
          <p className="text-xl text-black/40">
            {profile.role === 'admin' && 'Select a management area to continue'}
            {profile.role === 'kitchen' && 'Access your production tools'}
            {profile.role === 'manager' && 'Manage your location'}
          </p>
        </div>

        <div className={`grid gap-8 ${sections.length === 1 ? 'grid-cols-1 max-w-xl mx-auto' : sections.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-90 group-hover:opacity-100 transition-opacity`}></div>
              <div className="relative p-12 flex flex-col items-center text-center min-h-[320px]">
                <div className="mb-6 text-white/90 group-hover:text-white transition-colors group-hover:scale-110 transform duration-300">
                  {section.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                  {section.title}
                </h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  {section.description}
                </p>
                <div className="mt-auto pt-6">
                  <div className="inline-flex items-center text-white/90 text-sm font-medium group-hover:text-white transition-colors">
                    Enter
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {sections.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-gray-600">No sections available for your role.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
