'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/types';

interface UniversalHeaderProps {
  title: string;
  backPath: string;
  actions?: React.ReactNode;
}

export default function UniversalHeader({ title, backPath, actions }: UniversalHeaderProps) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        setIsAdmin(profileData?.role === 'admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, [supabase]);

  return (
    <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm sticky top-0 z-10 no-print">
      <div className="max-w-7xl mx-auto px-8 lg:px-12">
        <div className="flex justify-between items-center py-6">
          <div className="flex flex-col">
            <div className="text-6xl font-bold text-[#475569] tracking-tight">
              DELIVERY
            </div>
            <h1 className="text-apple-subheadline text-slate-500 mt-1">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {actions}
            {isAdmin && (
              <button
                onClick={() => {
                  const screenWidth = window.screen.width;
                  const panelWidth = 500;
                  const leftPosition = screenWidth - panelWidth - 20;
                  window.open('/settings/design', 'designSettings', `width=${panelWidth},height=${window.screen.height - 100},left=${leftPosition},top=20`);
                }}
                className="px-4 py-2 text-apple-subheadline font-medium text-apple-blue hover:text-apple-blue-hover transition-colors"
                title="Design Settings"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <button
              onClick={() => router.push(backPath)}
              className="px-4 py-2 text-apple-subheadline font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              &lt; Back
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
