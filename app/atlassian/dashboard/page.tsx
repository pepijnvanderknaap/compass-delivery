import LocationDashboard from '@/components/LocationDashboard';

export default function AtlassianDashboardPage() {
  return (
    <LocationDashboard
      locationSlug="atlassian"
      locationLogo="/locations/atlassian-logo.png"
      locationName="Atlassian"
      loadingColor="border-blue-500"
    />
  );
}
