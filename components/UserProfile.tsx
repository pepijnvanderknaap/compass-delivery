'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface UserProfileProps {
  userName: string;
  redirectPath?: string;
}

export default function UserProfile({ userName, redirectPath = '/home' }: UserProfileProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push(redirectPath);
  };

  return (
    <div className="relative group">
      <button className="text-[17px] font-normal text-[#1D1D1F] transition-colors hover:text-[#1D1D1F]">
        {userName}
      </button>

      {/* Dropdown for sign out */}
      <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
        <div className="bg-white py-2 min-w-[140px]">
          <button
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-2 text-[15px] font-normal text-[#86868B] hover:text-[#1D1D1F] transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
