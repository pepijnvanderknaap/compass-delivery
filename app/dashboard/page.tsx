'use client';

import Link from 'next/link';
import Image from 'next/image';

function DashboardContent() {

  const sections = [
    {
      title: 'Kitchen Management',
      href: '/login/dark-kitchen',
      description: 'Manage dishes, menus, recipes, and production',
      gradient: 'from-[#5A8DC8] via-[#4A7DB5] to-[#3A6DA2]', // ACSS: DK supporting main color (header bg) = #4A7DB5 | Icons from https://phosphoricons.com
      icon: (
        <svg className="w-20 h-20" viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H208V208ZM72,76A12,12,0,1,1,84,88,12,12,0,0,1,72,76Zm44,0a12,12,0,1,1,12,12A12,12,0,0,1,116,76Zm44,0a12,12,0,1,1,12,12A12,12,0,0,1,160,76Zm24,28H72a8,8,0,0,0-8,8v72a8,8,0,0,0,8,8H184a8,8,0,0,0,8-8V112A8,8,0,0,0,184,104Zm-8,72H80V120h96Z"></path>
        </svg>
      )
    },
    {
      title: 'Location Management',
      href: '/login/location-management',
      description: 'Orders, menus, and feedback for locations',
      gradient: 'from-emerald-600 via-teal-700 to-cyan-800', // ACSS: LM supporting main color (header bg) = #0F766E (teal-700)
      icon: (
        <svg className="w-20 h-20" viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M248,208H232V96a8,8,0,0,0,0-16H184V48a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16V208H24a8,8,0,0,0,0,16H248a8,8,0,0,0,0-16ZM216,96V208H184V96ZM56,48H168V208H144V160a8,8,0,0,0-8-8H88a8,8,0,0,0-8,8v48H56Zm72,160H96V168h32ZM72,80a8,8,0,0,1,8-8H96a8,8,0,0,1,0,16H80A8,8,0,0,1,72,80Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H128A8,8,0,0,1,120,80ZM72,120a8,8,0,0,1,8-8H96a8,8,0,0,1,0,16H80A8,8,0,0,1,72,120Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H128A8,8,0,0,1,120,120Z"></path>
        </svg>
      )
    },
    {
      title: 'Regional Management',
      href: '/login/regional-management',
      description: 'Invoicing and statistics overview',
      gradient: 'from-indigo-600 via-purple-700 to-pink-800', // ACSS: RM supporting main color (header bg) = #7E22CE (purple-700)
      icon: (
        <svg className="w-20 h-20" viewBox="0 0 256 256" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M207.06,72.67A111.24,111.24,0,0,0,128,40h-.4C66.07,40.21,16,91,16,153.13V176a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V152A111.25,111.25,0,0,0,207.06,72.67ZM224,176H119.71l54.76-75.3a8,8,0,0,0-12.94-9.42L99.92,176H32V153.13c0-3.08.15-6.12.43-9.13H56a8,8,0,0,0,0-16H35.27c10.32-38.86,44-68.24,84.73-71.66V80a8,8,0,0,0,16,0V56.33A96.14,96.14,0,0,1,221,128H200a8,8,0,0,0,0,16h23.67c.21,2.65.33,5.31.33,8Z"></path>
        </svg>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 max-w-6xl mx-auto px-8 pt-32 pb-16 w-full">
        <div className="mb-32 text-center">
          <h2 className="text-5xl font-bold text-black mb-3 tracking-tight">
            Welcome to Compass Delivery
          </h2>
          <p className="text-xl text-black/40">
            Select your area to sign in and continue
          </p>
        </div>

        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-90 group-hover:opacity-100 transition-opacity`}></div>
              <div className="relative p-12 flex flex-col items-center text-center min-h-[320px]">
                <div className="mb-6 text-white/90 group-hover:text-white transition-colors group-hover:scale-110 transform duration-300">
                  {section.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                  {section.title}
                </h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  {section.description}
                </p>
                <div className="mt-auto pt-6">
                  <div className="inline-flex items-center text-white/90 text-sm font-medium group-hover:text-white transition-colors">
                    Sign In
                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-center justify-center gap-6">
            <p className="text-lg text-gray-700">
              Compass Delivery, proudly presented by:
            </p>
            <Image
              src="/compass-logo.svg"
              alt="Compass Group"
              width={240}
              height={240}
              className="h-32 w-auto"
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
