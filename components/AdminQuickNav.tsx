'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/types';

export default function AdminQuickNav() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData?.role === 'admin') {
          setProfile(profileData);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [supabase]);

  // Don't show anything while loading or if not admin
  if (loading || !profile) {
    return null;
  }

  const sections = [
    {
      label: 'DK',
      fullName: 'Dark Kitchen',
      href: '/dark-kitchen',
      activeColor: 'bg-[#4A7DB5] text-white',
      inactiveColor: 'bg-[#4A7DB5]/10 text-[#4A7DB5] hover:bg-[#4A7DB5]/20',
    },
    {
      label: 'LM',
      fullName: 'Location Management',
      href: '/location-management',
      activeColor: 'bg-[#0F766E] text-white',
      inactiveColor: 'bg-[#0F766E]/10 text-[#0F766E] hover:bg-[#0F766E]/20',
    },
    {
      label: 'RM',
      fullName: 'Regional Management',
      href: '/regional-management',
      activeColor: 'bg-[#7E22CE] text-white',
      inactiveColor: 'bg-[#7E22CE]/10 text-[#7E22CE] hover:bg-[#7E22CE]/20',
    },
  ];

  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <div className="w-full bg-white border-b border-gray-200 py-3 z-50">
      <div className="max-w-7xl mx-auto px-8 flex justify-center">
        <div className="inline-flex gap-3 bg-gray-50 rounded-sm p-2">
          {sections.map((section) => (
            <button
              key={section.href}
              onClick={() => router.push(section.href)}
              className={`px-6 py-2.5 text-sm font-semibold rounded-sm transition-all ${
                isActive(section.href)
                  ? section.activeColor
                  : section.inactiveColor
              }`}
              title={section.fullName}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
