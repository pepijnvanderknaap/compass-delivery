import LocationDashboard from '@/components/LocationDashboard';

export default function SymphonyDashboardPage() {
  return (
    <LocationDashboard
      locationSlug="symphony"
      locationLogo="/locations/symphony-offices.png"
      locationName="Symphony Offices"
      loadingColor="border-blue-600"
    />
  );
}
