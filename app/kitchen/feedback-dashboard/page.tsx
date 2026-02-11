'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { calculateAverage, getScoreColor, getScoreBgColor, isDangerZone } from '@/lib/feedbackUtils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import UniversalHeader from '@/components/UniversalHeader';
import type { UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface DishDangerZone {
  dishType: string;
  overallScore: number;
  locationBreakdown: {
    locationName: string;
    score: number;
  }[];
}

interface PortionSizeByLocation {
  locationName: string;
  score: number;
}

export default function KitchenFeedbackDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dishDangerZones, setDishDangerZones] = useState<DishDangerZone[]>([]);
  const [portionSizes, setPortionSizes] = useState<PortionSizeByLocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login/kitchen');
          return;
        }

        // Get user profile
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profileData || (profileData.role !== 'kitchen' && profileData.role !== 'admin')) {
          router.push('/home');
          return;
        }

        setProfile(profileData);

        // Get all locations
        const { data: locations } = await supabase
          .from('locations')
          .select('id, name')
          .eq('is_active', true);

        if (!locations) {
          setError('No locations found');
          setLoading(false);
          return;
        }

        // Get current month's feedback from ALL locations
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());

        const { data: feedbackData, error: fetchError } = await supabase
          .from('customer_feedback')
          .select('*, locations(name)')
          .gte('submission_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('submission_date', format(monthEnd, 'yyyy-MM-dd'));

        if (fetchError) throw fetchError;

        if (!feedbackData || feedbackData.length === 0) {
          setLoading(false);
          return;
        }

        // Calculate dish averages across all locations
        const dishCategories = [
          { key: 'soup_rating', label: 'Soup' },
          { key: 'hot_meat_rating', label: 'Hot Dish (Meat/Fish)' },
          { key: 'hot_veg_rating', label: 'Hot Dish (Vegetarian)' },
          { key: 'salad_bar_rating', label: 'Salad Bar' },
          { key: 'sandwich_rating', label: 'Sandwich Selection' }
        ];

        const dangerZones: DishDangerZone[] = [];

        for (const category of dishCategories) {
          const allRatings = feedbackData.map((f: any) => f[category.key]).filter((r: any) => r !== null);
          const overallScore = calculateAverage(allRatings);

          // Only include if score is 65 or below
          if (overallScore !== null && overallScore <= 65) {
            // Get location breakdown
            const locationBreakdown = locations.map(loc => {
              const locFeedback = feedbackData.filter((f: any) => f.location_id === loc.id);
              const locRatings = locFeedback.map((f: any) => f[category.key]).filter((r: any) => r !== null);
              const locScore = calculateAverage(locRatings);
              return {
                locationName: loc.name,
                score: locScore || 0
              };
            }).filter(loc => loc.score > 0)
              .sort((a, b) => a.score - b.score); // Sort by score ascending (worst first)

            dangerZones.push({
              dishType: category.label,
              overallScore,
              locationBreakdown
            });
          }
        }

        setDishDangerZones(dangerZones);

        // Calculate portion size by location
        const portionSizeData = locations.map(loc => {
          const locFeedback = feedbackData.filter((f: any) => f.location_id === loc.id);
          const portionRatings = locFeedback.map((f: any) => f.portion_size_rating).filter((r: any) => r !== null);
          const score = calculateAverage(portionRatings);
          return {
            locationName: loc.name,
            score: score || 0
          };
        }).filter(loc => loc.score > 0)
          .sort((a, b) => a.score - b.score); // Sort by score ascending (worst first)

        setPortionSizes(portionSizeData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3]"></div>
      </div>
    );
  }

  const currentMonth = format(new Date(), 'MMMM yyyy');

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <UniversalHeader
        title=""
        backPath=""
        locationLogo=""
        locationName="Kitchen"
        navItems={[
          { label: 'Week Overview', href: '/kitchen/week-overview', active: false },
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
          { label: 'Feedback', href: '/kitchen/feedback-dashboard', active: true },
          { label: 'Settings', href: '/kitchen/settings', active: false },
        ]}
      />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold text-[#1D1D1F] mb-2">
            Kitchen Feedback Dashboard
          </h1>
          <p className="text-[15px] text-[#6E6E73]">
            Food quality and portion feedback for {currentMonth}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-[15px] text-red-700">{error}</p>
          </div>
        )}

        {/* Dishes Requiring Attention */}
        <div className="bg-white rounded-xl border border-[#E8E8ED] p-6 mb-6">
          <h2 className="text-[22px] font-semibold text-[#1D1D1F] mb-6">
            Dishes Requiring Attention (≤65)
          </h2>

          {dishDangerZones.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-[64px] mb-4">✅</div>
              <h3 className="text-[22px] font-semibold text-green-600 mb-2">
                Great Work!
              </h3>
              <p className="text-[15px] text-[#6E6E73]">
                All dishes are performing well (no scores ≤65 this month)
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {dishDangerZones.map((zone) => (
                <div key={zone.dishType} className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[17px] font-semibold text-[#1D1D1F]">
                      {zone.dishType}
                    </h3>
                    <div className="text-[24px] font-bold text-red-600">
                      {zone.overallScore}
                    </div>
                  </div>
                  <div className="text-[13px] font-medium text-[#86868B] uppercase tracking-wide mb-3">
                    Location Breakdown
                  </div>
                  <div className="space-y-2">
                    {zone.locationBreakdown.map((loc) => (
                      <div key={loc.locationName} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-200">
                        <div className="text-[15px] text-[#1D1D1F]">
                          {loc.locationName}
                        </div>
                        <div className={`text-[17px] font-semibold ${getScoreColor(loc.score)}`}>
                          {loc.score}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Portion Size Feedback */}
        <div className="bg-white rounded-xl border border-[#E8E8ED] p-6">
          <h2 className="text-[22px] font-semibold text-[#1D1D1F] mb-6">
            Portion Size Feedback
          </h2>

          {portionSizes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-[64px] mb-4">📊</div>
              <p className="text-[15px] text-[#6E6E73]">
                No portion size feedback available this month
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {portionSizes.map((location) => (
                <div
                  key={location.locationName}
                  className={`${getScoreBgColor(location.score)} rounded-xl p-4 border border-[#E8E8ED] flex items-center justify-between`}
                >
                  <div className="text-[15px] font-medium text-[#1D1D1F]">
                    {location.locationName}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-[24px] font-bold ${getScoreColor(location.score)}`}>
                      {location.score}
                    </div>
                    {isDangerZone(location.score) && (
                      <div className="text-[20px]">⚠️</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
