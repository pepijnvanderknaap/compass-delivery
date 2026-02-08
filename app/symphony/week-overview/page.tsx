import WeekOverview from '@/components/WeekOverview';

export default function SymphonyWeekOverviewPage() {
  return (
    <WeekOverview
      locationSlug="symphony"
      locationName="Symphony Offices"
      locationLogo="/locations/symphony-offices.png"
      navItems={[
        { label: 'Menu Overview', href: '/symphony/week-overview', active: true },
        { label: 'Orders', href: '/symphony/orders', active: false },
        { label: 'Soup & Salad Bar', href: '/symphony/soup-salad-bar', active: false },
        { label: 'Banqueting', href: '/admin/banqueting', active: false },
        { label: 'Settings', href: '/symphony/settings', active: false },
      ]}
      showPrintButton={true}
    />
  );
}
