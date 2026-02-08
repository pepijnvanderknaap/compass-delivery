import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import CateringPageContent from '@/app/location-management/catering/CateringPageContent';
import { getAllLocationSlugs } from '@/lib/locationConfig';

export default async function LocationCateringPage({
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
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3]"></div>
      </div>
    }>
      <CateringPageContent forcedLocation={location} />
    </Suspense>
  );
}

export async function generateStaticParams() {
  return getAllLocationSlugs().map((location) => ({
    location,
  }));
}
