import LocationDashboard from '@/components/LocationDashboard';

export default function SnowflakeDashboardPage() {
  return (
    <LocationDashboard
      locationSlug="snowflake"
      locationLogo="/locations/snowflake-logo.png"
      locationName="Snowflake"
      loadingColor="border-cyan-500"
    />
  );
}
