import WeekOverview from '@/components/WeekOverview';

export default function SnowflakeWeekOverviewPage() {
  return (
    <WeekOverview
      locationSlug="snowflake"
      locationName="Snowflake"
      locationLogo="/locations/snowflake-logo-v2.png"
      navItems={[
        { label: 'Menu Overview', href: '/snowflake/week-overview', active: true },
        { label: 'Orders', href: '/snowflake/orders', active: false },
        { label: 'Soup & Salad Bar', href: '/snowflake/soup-salad-bar', active: false },
        { label: 'Catering', href: '/snowflake/catering', active: false },
        { label: 'Settings', href: '/snowflake/settings', active: false },
        { label: 'Cost & Billing', href: '/snowflake/cost-billing', active: false },
      ]}
      showPrintButton={true}
    />
  );
}
