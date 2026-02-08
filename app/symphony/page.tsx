'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';

interface DayMenu {
  day: string;
  dayNumber: number;
  soup: string;
  hot_dishes: Array<{ name: string; description?: string }>;
}

interface WeeklyMenu {
  sandwich: string;
  days: DayMenu[];
}

export default function SymphonyPublicPage() {
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchWeeklyMenu = async () => {
      try {
        // Look up Symphony location ID from database
        const { data: location } = await supabase
          .from('locations')
          .select('id')
          .eq('name', 'Symphony')
          .single();

        if (!location) {
          console.error('Symphony location not found in database');
          setLoading(false);
          return;
        }

        // Fetch sandwich of the day from symphony settings
        const { data: settings } = await supabase
          .from('location_settings')
          .select('sandwich_of_day')
          .eq('location_id', location.id)
          .single();

        // Get current week start (Monday)
        const today = new Date();
        const weekStart = new Date(today);
        const diff = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
        weekStart.setDate(diff);
        const weekStartStr = weekStart.toISOString().split('T')[0];

        // Fetch weekly menu from kitchen
        const { data: weeklyMenuData } = await supabase
          .from('weekly_menus')
          .select('*')
          .eq('week_start_date', weekStartStr)
          .maybeSingle();

        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const days: DayMenu[] = [];

        if (weeklyMenuData) {
          // Fetch all menu items for the week
          const { data: menuItems } = await supabase
            .from('menu_items')
            .select('*')
            .eq('menu_id', weeklyMenuData.id)
            .in('day_of_week', [1, 2, 3, 4, 5]);

          if (menuItems && menuItems.length > 0) {
            // Fetch all dish details
            const dishIds = menuItems.map(item => item.dish_id);
            const { data: dishes } = await supabase
              .from('dishes')
              .select('*')
              .in('id', dishIds);

            // Organize by day
            for (let dayNum = 1; dayNum <= 5; dayNum++) {
              const dayMenuItems = menuItems.filter(item => item.day_of_week === dayNum);

              let soupOfDay = 'To be announced';
              const hotDishes: Array<{ name: string; description?: string }> = [];

              if (dayMenuItems.length > 0 && dishes) {
                // Find soup
                const soupItem = dayMenuItems.find(item => item.meal_type === 'soup');
                if (soupItem) {
                  const soupDish = dishes.find(d => d.id === soupItem.dish_id);
                  if (soupDish) {
                    soupOfDay = soupDish.name;
                  }
                }

                // Get hot dishes (meat and veg)
                const hotItems = dayMenuItems.filter(item =>
                  item.meal_type === 'hot_meat' || item.meal_type === 'hot_veg'
                );

                hotItems.forEach(item => {
                  const dish = dishes.find(d => d.id === item.dish_id);
                  if (dish) {
                    hotDishes.push({
                      name: dish.name,
                      description: dish.description || ''
                    });
                  }
                });
              }

              days.push({
                day: dayNames[dayNum - 1],
                dayNumber: dayNum,
                soup: soupOfDay,
                hot_dishes: hotDishes
              });
            }
          }
        }

        // If no data, create empty days
        if (days.length === 0) {
          for (let dayNum = 1; dayNum <= 5; dayNum++) {
            days.push({
              day: dayNames[dayNum - 1],
              dayNumber: dayNum,
              soup: 'To be announced',
              hot_dishes: []
            });
          }
        }

        setWeeklyMenu({
          sandwich: settings?.sandwich_of_day || 'Sandwich of the day (to be announced)',
          days
        });
      } catch (err) {
        console.error('Error fetching menu:', err);
        setWeeklyMenu({
          sandwich: 'Menu loading...',
          days: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyMenu();
  }, [supabase]);

  const getDayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getFormattedDate = () => {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getWeekRange = () => {
    const today = new Date();
    const weekStart = new Date(today);
    const diff = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
    weekStart.setDate(diff);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Friday

    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const month = weekEnd.toLocaleDateString('en-US', { month: 'short' });

    return `${startDay}-${endDay} ${month}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/symphony-building.png"
          alt="Symphony Building"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* Header */}
      <nav className="relative z-10 bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <Image
                src="/locations/symphony-offices.png"
                alt="Symphony Offices"
                width={180}
                height={60}
                className="object-contain"
              />
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/symphony/catering"
                className="px-6 py-3 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-lg transition-colors"
              >
                Order Banqueting
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-24 pb-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-[48px] font-semibold text-white mb-4 tracking-tight">
            Symphony Restaurant
          </h1>
        </div>

        {/* Menu Section with Dark Blur Background */}
        <div className="max-w-6xl mx-auto backdrop-blur-md bg-black/40 rounded-2xl p-8">
          {/* Week Date */}
          <div className="mb-8 text-center">
            <p className="text-[20px] font-semibold text-white">
              Weekly Menu {getWeekRange()}
            </p>
          </div>

          {/* Weekly Menu Grid */}
          <div className="space-y-3 mb-12">
            {weeklyMenu?.days.map((dayMenu, index) => {
              const isToday = new Date().getDay() === dayMenu.dayNumber;
              return (
                <div
                  key={dayMenu.day}
                  className={`border-b border-white/20 pb-3 ${
                    isToday ? 'border-white/40' : ''
                  }`}
                >
                  <div className="grid grid-cols-12 gap-6 items-start">
                    {/* Day Label */}
                    <div className="col-span-2">
                      <p className={`text-[18px] font-semibold ${
                        isToday ? 'text-white' : 'text-white/80'
                      }`}>
                        {dayMenu.day}
                      </p>
                    </div>

                    {/* Soup */}
                    <div className="col-span-3">
                      <p className="text-[14px] text-white/50 uppercase tracking-wide mb-1">Soup</p>
                      <p className={`text-[17px] ${dayMenu.soup === 'To be announced' ? 'text-white/50 italic' : 'text-white/90'}`}>
                        {dayMenu.soup}
                      </p>
                    </div>

                    {/* Sandwich of the Day */}
                    <div className="col-span-3">
                      <p className="text-[14px] text-white/50 uppercase tracking-wide mb-1">Sandwich of the Day</p>
                      <p className="text-[17px] text-white/50 italic">
                        To be announced
                      </p>
                    </div>

                    {/* Hot Dishes */}
                    <div className="col-span-4">
                      <p className="text-[14px] text-white/50 uppercase tracking-wide mb-1">Hot Dishes</p>
                      {dayMenu.hot_dishes.length > 0 ? (
                        <div className="space-y-1">
                          {dayMenu.hot_dishes.map((dish, dishIndex) => (
                            <p key={dishIndex} className="text-[17px] text-white/90">
                              {dish.name}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[17px] text-white/50 italic">
                          To be announced
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Call to Action */}
          <div className="pt-8 border-t border-white/20 text-center">
            <p className="text-[16px] text-white/70 mb-4">
              Planning an event? Order premium catering for your meetings and celebrations
            </p>
            <Link
              href="/symphony/menu"
              className="inline-block px-6 py-2.5 text-[15px] font-medium text-white border border-white/40 hover:bg-white/10 rounded-lg transition-colors"
            >
              Browse Banqueting Menu
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
