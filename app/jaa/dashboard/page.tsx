import LocationDashboard from '@/components/LocationDashboard';

export default function JAADashboardPage() {
  return (
    <LocationDashboard
      locationSlug="jaa"
      locationLogo="/locations/jaa-logo.png"
      locationName="JAA Training"
      loadingColor="border-orange-600"
    />
  );
}
