import { redirect, notFound } from 'next/navigation';
import { getAllLocationSlugs } from '@/lib/locationConfig';

export default async function LocationDashboardPage({
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

  // Redirect to week overview which will have the proper header
  redirect(`/${location}/week-overview`);
}

export async function generateStaticParams() {
  return getAllLocationSlugs().map((location) => ({
    location,
  }));
}
