import WeekOverview from '@/components/WeekOverview';

export default function SnapchatWeekOverviewPage() {
  return (
    <WeekOverview
      locationSlug="snapchat"
      locationName="SnapChat"
      locationLogo="/locations/snapchat-logo.jpg"
      navItems={[
        { label: 'Menu Overview', href: '/snapchat/week-overview', active: true },
        { label: 'Orders', href: '/snapchat/orders', active: false },
        { label: 'Soup & Salad Bar', href: '/snapchat/soup-salad-bar', active: false },
        { label: 'Catering', href: '/snapchat/catering', active: false },
        { label: 'Settings', href: '/snapchat/settings', active: false },
        { label: 'Cost & Billing', href: '/snapchat/cost-billing', active: false },
      ]}
      showPrintButton={true}
    />
  );
}
