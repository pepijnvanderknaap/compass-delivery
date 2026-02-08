import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import SoupSaladBarPageContent from '@/app/location-management/soup-salad-bar/SoupSaladBarPageContent';
import { getAllLocationSlugs } from '@/lib/locationConfig';

export const dynamic = 'force-dynamic';

export default async function LocationSoupSaladBarPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location } = await params;

  // Validate location exists in our config
  const validLocations = getAllLocationSlugs();
  if (!validLocations.includes(location)) {
    notFound();
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    }>
      <SoupSaladBarPageContent forcedLocation={location} />
    </Suspense>
  );
}

export async function generateStaticParams() {
  return getAllLocationSlugs().map((location) => ({
    location,
  }));
}
