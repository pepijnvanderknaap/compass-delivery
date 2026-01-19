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

  const roleCards = {
    admin: [
      // Admin Management
      { title: 'Manage Locations', href: '/admin/locations', description: 'Add and manage location sites', icon: '🏢' },
      { title: 'Manage Dishes', href: '/admin/dishes', description: 'Create and edit dish options', icon: '🍽️' },
      { title: 'Weekly Menus', href: '/admin/menus', description: 'Set up weekly menu offerings', icon: '📋' },
      { title: 'Invoicing', href: '/invoicing', description: 'Generate invoices and export data', icon: '💰' },
      // Kitchen View
      { title: 'Daily Overview', href: '/kitchen/daily-overview', description: 'View daily kitchen prep overview', icon: '👨‍🍳' },
      // Manager Functions
      { title: 'New Order', href: '/orders/new', description: 'Place a new weekly order', icon: '📝' },
      { title: 'View Orders', href: '/orders', description: 'View and edit orders', icon: '📊' },
    ],
    kitchen: [
      { title: 'Daily Overview', href: '/kitchen/daily-overview', description: 'View all portions for today', icon: '👨‍🍳' },
    ],
    manager: [
      { title: 'New Order', href: '/orders/new', description: 'Place a new weekly order', icon: '📝' },
      { title: 'View Orders', href: '/orders', description: 'View and edit your orders', icon: '📊' },
    ],
  };

  const cards = roleCards[profile.role as keyof typeof roleCards] || [];

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

        <div className="mb-12">
          <h2 className="text-4xl font-semibold text-black mb-2 tracking-tight">
            Welcome back
          </h2>
          <p className="text-lg text-black/50">
            {profile.role === 'admin' && 'Manage your kitchen ordering system'}
            {profile.role === 'kitchen' && 'View daily orders and prepare meals'}
            {profile.role === 'manager' && 'Place and manage your location orders'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-white border border-black/10 rounded-2xl p-8 hover:border-black/20 transition-all"
            >
              <div className="text-4xl mb-4">{card.icon}</div>
              <h3 className="text-xl font-semibold text-black mb-1.5">
                {card.title}
              </h3>
              <p className="text-sm text-black/50">{card.description}</p>
            </Link>
          ))}
        </div>

        {cards.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-gray-600">No actions available for your role.</p>
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
