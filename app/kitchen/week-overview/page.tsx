import WeekOverview from '@/components/WeekOverview';

export default function KitchenWeekOverviewPage() {
  return (
    <WeekOverview
      locationSlug="kitchen"
      locationName="Kitchen"
      navItems={[
        { label: 'Week Overview', href: '/kitchen/week-overview', active: true },
        {
          label: 'Dishes',
          href: '/kitchen/dishes',
          active: false,
          subItems: [
            { label: 'Dish Library', href: '/kitchen/dishes', active: false },
            { label: 'Dish Cards', href: '/kitchen/dish-cards', active: false },
            { label: 'Allergens', href: '/kitchen/allergens', active: false },
          ]
        },
        { label: 'Menu Planner', href: '/kitchen/menus', active: false },
        { label: 'Recipes', href: '/kitchen/recipes', active: false },
        { label: 'Production', href: '/kitchen/production', active: false },
        { label: 'Feedback', href: '/kitchen/feedback-dashboard', active: false },
        { label: 'Settings', href: '/kitchen/settings', active: false },
      ]}
      showPrintButton={true}
    />
  );
}
