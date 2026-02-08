import WeekOverview from '@/components/WeekOverview';

export default function JaaWeekOverviewPage() {
  return (
    <WeekOverview
      locationSlug="jaa"
      locationName="JAA Training"
      locationLogo="/locations/jaa-logo.png"
      navItems={[
        { label: 'Menu Overview', href: '/jaa/week-overview', active: true },
        { label: 'Orders', href: '/jaa/orders', active: false },
        { label: 'Soup & Salad Bar', href: '/jaa/soup-salad-bar', active: false },
        { label: 'Catering', href: '/jaa/catering', active: false },
        { label: 'Settings', href: '/jaa/settings', active: false },
        { label: 'Cost & Billing', href: '/jaa/cost-billing', active: false },
      ]}
      showPrintButton={true}
    />
  );
}
