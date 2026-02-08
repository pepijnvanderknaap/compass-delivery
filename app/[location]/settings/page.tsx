import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import SettingsPageContent from '@/app/location-management/settings/SettingsPageContent';
import { getAllLocationSlugs } from '@/lib/locationConfig';

export default async function LocationSettingsPage({
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <SettingsPageContent forcedLocation={location} />
    </Suspense>
  );
}

export async function generateStaticParams() {
  return getAllLocationSlugs().map((location) => ({
    location,
  }));
}
