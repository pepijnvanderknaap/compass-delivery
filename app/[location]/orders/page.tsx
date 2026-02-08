import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import OrdersPageContent from '@/app/orders/OrdersPageContent';
import { getAllLocationSlugs } from '@/lib/locationConfig';

export const dynamic = 'force-dynamic';

export default async function LocationOrdersPage({
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
      <OrdersPageContent forcedLocation={location} />
    </Suspense>
  );
}

export async function generateStaticParams() {
  return getAllLocationSlugs().map((location) => ({
    location,
  }));
}
