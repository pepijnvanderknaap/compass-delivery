/*
 * TO REVERT TO OLD GRID LAYOUT:
 * Uncomment the code below and delete everything after the "NEW APPLE-STYLE LAYOUT" comment
 *
import LocationDashboard from '@/components/LocationDashboard';

export default function KitchenDashboardPage() {
  const kitchenSections = [
    {
      title: 'Dishes',
      href: '/kitchen/dishes',
      description: 'Manage dish catalog and components',
      available: true,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 3v9l6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      title: 'Dish Cards',
      href: '/kitchen/dish-cards',
      description: 'Print dish cards with photos and ingredients',
      available: true,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      )
    },
    {
      title: 'Menu Planner',
      href: '/kitchen/menus',
      description: 'Plan weekly menus across locations',
      available: true,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      title: 'Recipes',
      href: '/kitchen/recipes',
      description: 'Manage recipes and preparation instructions',
      available: true,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      title: 'Allergens Matrix',
      href: '/kitchen/allergens',
      description: 'View allergen information across all dishes',
      available: true,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      title: 'Week Overview',
      href: '/kitchen/week-overview',
      description: 'Production overview for the week',
      available: true,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      title: 'Production',
      href: '/kitchen/production',
      description: 'Generate and print production sheets',
      available: true,
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
  ];

  return (
    <LocationDashboard
      locationSlug="kitchen"
      locationLogo=""
      locationName="Kitchen"
      customSections={kitchenSections}
    />
  );
}
*/

// ===== NEW APPLE-STYLE LAYOUT =====

import { redirect } from 'next/navigation';

export default function KitchenDashboardPage() {
  // Page names kept handy for later placement:
  // Week Overview, Dishes, Dish Cards, Menu Planner, Recipes, Allergens, Production

  // Redirect to week overview which will have the proper header
  redirect('/kitchen/week-overview');
}
