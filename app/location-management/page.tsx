'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import type { UserProfile } from '@/lib/types';

export default function LocationManagementPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

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

  const sections = [
    { title: 'Menu Overview', href: '#', description: 'Coming soon', icon: '📅', available: false },
    { title: 'Orders', href: '/orders', description: 'View and manage your orders', icon: '📝', available: true },
    { title: 'Feedback', href: '#', description: 'Coming soon', icon: '💬', available: false },
  ];

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-end gap-8">
              <Image src="/compass-logo.svg" alt="Compass Group" width={120} height={120} className="h-16 w-auto" priority />
              <div className="border-l-2 border-gray-300 pl-8 pb-1">
                <h1 className="text-xl font-semibold text-gray-900">Location Management</h1>
                <p className="text-sm text-gray-600">
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  {profile.location_id && ` · ${(profile.locations as any)?.name || ''}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
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
        <div className="mb-12">
          <h2 className="text-4xl font-semibold text-black mb-2 tracking-tight">
            Location Management
          </h2>
          <p className="text-lg text-black/50">
            Manage menus, orders, and feedback for your location
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => (
            section.available ? (
              <Link
                key={section.href}
                href={section.href}
                className="group bg-white border border-black/10 rounded-2xl p-8 hover:border-black/20 transition-all"
              >
                <div className="text-4xl mb-4">{section.icon}</div>
                <h3 className="text-xl font-semibold text-black mb-1.5">
                  {section.title}
                </h3>
                <p className="text-sm text-black/50">{section.description}</p>
              </Link>
            ) : (
              <div
                key={section.title}
                className="bg-white border border-black/5 rounded-2xl p-8 opacity-50 cursor-not-allowed"
              >
                <div className="text-4xl mb-4">{section.icon}</div>
                <h3 className="text-xl font-semibold text-black mb-1.5">
                  {section.title}
                </h3>
                <p className="text-sm text-black/50">{section.description}</p>
              </div>
            )
          ))}
        </div>
      </main>
    </div>
  );
}
