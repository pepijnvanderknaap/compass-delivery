'use client';

import Link from 'next/link';
import Image from 'next/image';

function DashboardContent() {
  const managementSections = [
    {
      title: 'Kitchen Management',
      href: '/login/kitchen',
      description: 'Dishes, menus, recipes & production',
    },
    {
      title: 'Regional Management',
      href: '/login/management',
      description: 'Invoicing & statistics',
    },
  ];

  const locations = [
    {
      name: 'Symphony',
      href: '/login/symphony',
      logo: '/locations/symphony-offices.png',
    },
    {
      name: 'Atlassian',
      href: '/login/atlassian',
      logo: '/locations/atlassian-logo.png',
    },
    {
      name: 'Snowflake',
      href: '/login/snowflake',
      logo: '/locations/snowflake-logo.png',
    },
    {
      name: 'SnapChat',
      href: '/login/snapchat',
      logo: '/locations/snapchat-logo.jpg',
    },
    {
      name: 'JAA Training',
      href: '/login/jaa',
      logo: '/locations/jaa-logo.png',
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Navigation Bar with Management Links */}
      <nav className="bg-white border-b border-[#E8E8ED]">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex justify-end gap-3">
            {managementSections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="px-4 py-2 text-[13px] font-medium text-[#1D1D1F] border border-[#D2D2D7] hover:bg-[#F5F5F7] rounded-lg transition-colors"
              >
                {section.title}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 pt-16 pb-12 w-full">
        {/* Hero Title */}
        <div className="mb-32 text-center">
          <h1 className="text-[48px] font-semibold text-[#1D1D1F] mb-2 tracking-tight">
            Compass Delivery
          </h1>
          <p className="text-[20px] text-[#6E6E73] font-normal">
            Cluster Amsterdam
          </p>
        </div>

        {/* Locations Section */}
        <div className="mb-8">
          <h2 className="text-[17px] font-light text-[#6E6E73] mb-6 text-center">
            Select your location to login
          </h2>
        </div>

        <div className="grid grid-cols-5 gap-3 max-w-4xl mx-auto mb-24">
          {locations.map((location, index) => (
            <Link
              key={index}
              href={location.href}
              className="group flex items-center justify-center border-2 border-[#D2D2D7] rounded-lg p-4 transition-all duration-300 hover:border-[#0078D4] hover:shadow-lg aspect-square"
            >
              <Image
                src={location.logo}
                alt={location.name}
                width={140}
                height={70}
                className="object-contain transition-all duration-300"
              />
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-[#E8E8ED] py-8 bg-white mt-16">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-center justify-center gap-6">
            <p className="text-[15px] text-[#6E6E73]">
              Proudly presented by
            </p>
            <Image
              src="/compass-logo.svg"
              alt="Compass Group"
              width={240}
              height={240}
              className="h-24 w-auto -translate-y-[5px]"
              priority
            />
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
