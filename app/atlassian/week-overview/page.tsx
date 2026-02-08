import WeekOverview from '@/components/WeekOverview';

export default function AtlassianWeekOverviewPage() {
  return (
    <WeekOverview
      locationSlug="atlassian"
      locationName="Atlassian"
      locationLogo="/locations/atlassian-logo.png"
      navItems={[
        { label: 'Menu Overview', href: '/atlassian/week-overview', active: true },
        { label: 'Orders', href: '/atlassian/orders', active: false },
        { label: 'Soup & Salad Bar', href: '/atlassian/soup-salad-bar', active: false },
        { label: 'Catering', href: '/atlassian/catering', active: false },
        { label: 'Settings', href: '/atlassian/settings', active: false },
        { label: 'Cost & Billing', href: '/atlassian/cost-billing', active: false },
      ]}
      showPrintButton={true}
    />
  );
}
