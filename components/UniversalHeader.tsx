'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface SubNavItem {
  label: string;
  href: string;
  active?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  active?: boolean;
  subItems?: SubNavItem[];
}

interface UniversalHeaderProps {
  title: string;
  backPath: string;
  actions?: React.ReactNode;
  locationLogo?: string; // Path to location-specific logo
  locationName?: string; // Display name for the location
  locationSubtitle?: string; // Optional subtitle (e.g., "Building 119")
  navItems?: NavItem[]; // Optional navigation items
}

export default function UniversalHeader({ title, backPath, actions, locationLogo, locationName, locationSubtitle, navItems }: UniversalHeaderProps) {
  const router = useRouter();

  return (
    <nav className="bg-white/90 backdrop-blur-xl sticky top-0 z-10 no-print">
      <div className="max-w-7xl mx-auto px-8 lg:px-12">
        {/* Logo Row */}
        <div className="flex justify-between items-center py-3">
          <div className="flex flex-col">
            {locationLogo ? (
              <div className="flex items-center gap-1">
                <Image
                  src={locationLogo}
                  alt={locationName || 'Location'}
                  width={120}
                  height={40}
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="text-5xl font-bold text-[#475569] tracking-tight">
                DELIVERY
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {actions}
            {backPath && (
              <button
                onClick={() => router.push(backPath)}
                className="px-4 py-2 text-apple-subheadline font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                &lt; Back
              </button>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        {navItems && navItems.length > 0 && (
          <div className="flex items-center justify-end gap-8 py-2 border-t-2 border-[#D2D2D7]">
            {navItems.map((item) => (
              <div key={item.href} className="relative group">
                <button
                  onClick={() => router.push(item.href)}
                  className={`text-[17px] font-light transition-colors ${
                    item.active
                      ? 'text-[#1D1D1F]'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  {item.label}
                </button>

                {/* Dropdown for sub-items */}
                {item.subItems && item.subItems.length > 0 && (
                  <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="bg-white py-2 min-w-[160px]">
                      {item.subItems.map((subItem) => (
                        <button
                          key={subItem.href}
                          onClick={() => router.push(subItem.href)}
                          className={`block w-full text-left px-4 py-2 text-[15px] font-light transition-colors ${
                            subItem.active
                              ? 'text-[#1D1D1F]'
                              : 'text-[#86868B] hover:text-[#1D1D1F]'
                          }`}
                        >
                          {subItem.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
