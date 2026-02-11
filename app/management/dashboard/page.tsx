'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function RegionalManagementDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to week-overview (the new home page for Regional Management)
    router.replace('/management/week-overview');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7E22CE]"></div>
    </div>
  );
}
