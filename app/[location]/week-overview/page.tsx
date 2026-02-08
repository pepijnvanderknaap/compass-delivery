import { notFound } from 'next/navigation';
import WeekOverview from '@/components/WeekOverview';
import { getLocationBySlug, getAllLocationSlugs, getLocationNavItems } from '@/lib/locationConfig';

export const dynamic = 'force-dynamic';

export default async function LocationWeekOverviewPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location } = await params;
  const locationData = getLocationBySlug(location);

  // Validate location exists
  if (!locationData) {
    notFound();
  }

  // Generate navItems dynamically based on location config
  const navItems = getLocationNavItems(location, 'Menu Overview');

  return (
    <WeekOverview
      locationSlug={location}
      locationName={locationData.displayName}
      locationLogo={locationData.logo}
      navItems={navItems}
      showPrintButton={true}
    />
  );
}

export async function generateStaticParams() {
  return getAllLocationSlugs().map((location) => ({
    location,
  }));
}
