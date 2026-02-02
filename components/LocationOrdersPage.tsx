'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface LocationBranding {
  logo: string;
  name: string;
  subtitle?: string;
  loadingColor: string;
  slug: string;
}

interface LocationOrdersPageProps {
  branding: LocationBranding;
}

export default function LocationOrdersPage({ branding }: LocationOrdersPageProps) {
  const router = useRouter();
  const supabase = createClient();
  const [locationId, setLocationId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupAndRedirect = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push(`/login/${branding.slug}`);
          return;
        }

        // Get the location ID from the database based on slug
        const { data: location } = await supabase
          .from('locations')
          .select('id')
          .ilike('slug', branding.slug)
          .single();

        if (location?.id) {
          setLocationId(location.id);
          // Redirect to orders page with location context
          router.replace(`/orders?location=${branding.slug}&locationId=${location.id}&logo=${encodeURIComponent(branding.logo)}&name=${encodeURIComponent(branding.name)}`);
        } else {
          router.push(`/${branding.slug}/dashboard`);
        }
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
      }
    };

    setupAndRedirect();
  }, [router, supabase, branding]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${branding.loadingColor} mx-auto mb-4`}></div>
        <p className="text-gray-600">Loading {branding.name} orders...</p>
      </div>
    </div>
  );
}
