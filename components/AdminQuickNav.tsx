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
      key: 'snap119',
      label: 'Snap119',
      fullName: 'SnapChat Building 119',
      href: '/snapchat/dashboard',
      activeColor: 'bg-yellow-400 text-black',
      inactiveColor: 'bg-yellow-400/10 text-yellow-600 hover:bg-yellow-400/20',
    },
    {
      key: 'snap165',
      label: 'Snap165',
      fullName: 'SnapChat Building 165',
      href: '/snapchat/dashboard',
      activeColor: 'bg-yellow-400 text-black',
      inactiveColor: 'bg-yellow-400/10 text-yellow-600 hover:bg-yellow-400/20',
    },
    {
      label: 'Sym',
      fullName: 'Symphony Offices',
      href: '/symphony/dashboard',
      activeColor: 'bg-blue-600 text-white',
      inactiveColor: 'bg-blue-600/10 text-blue-600 hover:bg-blue-600/20',
    },
    {
      label: 'Atlas',
      fullName: 'Atlassian',
      href: '/atlassian/dashboard',
      activeColor: 'bg-blue-500 text-white',
      inactiveColor: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
    },
    {
      label: 'Snow',
      fullName: 'Snowflake',
      href: '/snowflake/dashboard',
      activeColor: 'bg-cyan-400 text-black',
      inactiveColor: 'bg-cyan-400/10 text-cyan-600 hover:bg-cyan-400/20',
    },
    {
      label: 'JAA',
      fullName: 'JAA Training',
      href: '/jaa/dashboard',
      activeColor: 'bg-orange-500 text-white',
      inactiveColor: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20',
    },
    {
      label: 'DK',
      fullName: 'Kitchen',
      href: '/kitchen/dashboard',
      activeColor: 'bg-[#4A7DB5] text-white',
      inactiveColor: 'bg-[#4A7DB5]/10 text-[#4A7DB5] hover:bg-[#4A7DB5]/20',
    },
    {
      label: 'RM',
      fullName: 'Regional Management',
      href: '/management/dashboard',
      activeColor: 'bg-[#7E22CE] text-white',
      inactiveColor: 'bg-[#7E22CE]/10 text-[#7E22CE] hover:bg-[#7E22CE]/20',
    },
  ];

  const isActive = (href: string) => {
    return pathname?.startsWith(href);
  };

  return (
    <div className="fixed right-4 top-24 z-50 flex flex-col gap-2 bg-gray-50 rounded-lg p-2 shadow-lg border border-[#E8E8ED]">
      {sections.map((section) => (
        <button
          key={section.key || section.href}
          onClick={() => router.push(section.href)}
          className={`px-4 py-2.5 text-sm font-semibold rounded-sm transition-all ${
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
  );
}
