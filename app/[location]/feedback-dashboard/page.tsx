'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getLocationBySlug, getLocationNavItems } from '@/lib/locationConfig';
import { calculateAverage, getAllRatingsFromSubmission, getScoreColor, getScoreBgColor, isDangerZone } from '@/lib/feedbackUtils';
import { format, startOfMonth, endOfMonth, startOfWeek } from 'date-fns';
import UniversalHeader from '@/components/UniversalHeader';
import type { UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface ScoreItem {
  label: string;
  score: number | null;
  isDanger: boolean;
}

export default function LocationFeedbackDashboard() {
  const params = useParams();
  const router = useRouter();
  const location = params.location as string;
  const locationData = getLocationBySlug(location);
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'overall'>('overall');
  const [overallScore, setOverallScore] = useState<number>(0);
  const [responseCount, setResponseCount] = useState<number>(0);
  const [todayScore, setTodayScore] = useState<number>(0);
  const [todayResponseCount, setTodayResponseCount] = useState<number>(0);
  const [allScores, setAllScores] = useState<ScoreItem[]>([]);
  const [todayScores, setTodayScores] = useState<ScoreItem[]>([]);
  const [dangerZones, setDangerZones] = useState<ScoreItem[]>([]);
  const [todayDangerZones, setTodayDangerZones] = useState<ScoreItem[]>([]);
  const [todayDishNames, setTodayDishNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push(`/login/${location}`);
          return;
        }

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*, locations(name, id)')
          .eq('id', user.id)
          .single();

        if (!profileData || (profileData.role !== 'manager' && profileData.role !== 'admin')) {
          router.push(`/${location}`);
          return;
        }

        setProfile(profileData);

        const dbLocationName = {
          'symphony': 'Symphony',
          'atlassian': 'Atlassian',
          'snowflake': 'Snowflake',
          'snapchat-119': 'SnapChat 119',
          'snapchat-165': 'SnapChat 165',
          'jaa': 'JAA Training',
        }[location];

        if (!dbLocationName) {
          setError('Invalid location');
          setLoading(false);
          return;
        }

        const { data: locData } = await supabase
          .from('locations')
          .select('id')
          .eq('name', dbLocationName)
          .maybeSingle();

        if (!locData) {
          setError('Location not found in database');
          setLoading(false);
          return;
        }

        if (profileData.role === 'manager' && profileData.location_id !== locData.id) {
          router.push(`/${location}`);
          return;
        }

        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());
        const today = format(new Date(), 'yyyy-MM-dd');

        // Fetch monthly data
        const { data: feedbackData, error: fetchError } = await supabase
          .from('customer_feedback')
          .select('*')
          .eq('location_id', locData.id)
          .gte('submission_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('submission_date', format(monthEnd, 'yyyy-MM-dd'));

        if (fetchError) throw fetchError;

        // Fetch today's data
        const { data: todayFeedbackData } = await supabase
          .from('customer_feedback')
          .select('*')
          .eq('location_id', locData.id)
          .eq('submission_date', today);

        // Calculate monthly stats
        if (!feedbackData || feedbackData.length === 0) {
          setOverallScore(0);
          setResponseCount(0);
        } else {
          const allRatings = feedbackData.flatMap(getAllRatingsFromSubmission);
          const overall = calculateAverage(allRatings) || 0;
          setOverallScore(overall);
          setResponseCount(feedbackData.length);

          // Calculate all scores (Portion Size moved to Food Quality)
          const scores: ScoreItem[] = [
            { label: 'Soup', score: calculateAverage(feedbackData.map(f => f.soup_rating)), isDanger: false },
            { label: 'Hot Meat/Fish', score: calculateAverage(feedbackData.map(f => f.hot_meat_rating)), isDanger: false },
            { label: 'Hot Vegetarian', score: calculateAverage(feedbackData.map(f => f.hot_veg_rating)), isDanger: false },
            { label: 'Salad Bar', score: calculateAverage(feedbackData.map(f => f.salad_bar_rating)), isDanger: false },
            { label: 'Sandwiches', score: calculateAverage(feedbackData.map(f => f.sandwich_rating)), isDanger: false },
            { label: 'Portion Size', score: calculateAverage(feedbackData.map(f => f.portion_size_rating)), isDanger: false },
            { label: 'Price/Quality', score: calculateAverage(feedbackData.map(f => f.price_quality_rating)), isDanger: false },
            { label: 'Service & Checkout Speed', score: calculateAverage(feedbackData.map(f => f.service_speed_rating)), isDanger: false },
            { label: 'Cleanliness', score: calculateAverage(feedbackData.map(f => f.cleanliness_rating)), isDanger: false },
          ];

          // Mark danger zones
          scores.forEach(item => {
            item.isDanger = isDangerZone(item.score);
          });

          setAllScores(scores);
          // For regular locations, only show Service Quality danger zones (last 3 items)
          setDangerZones(scores.slice(6).filter(s => s.isDanger));
        }

        // Fetch today's menu to get actual dish names
        const todayDate = new Date();
        const dayOfWeek = todayDate.getDay();
        const currentWeekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
        const weekStartString = format(currentWeekStart, 'yyyy-MM-dd');
        const todayIndex = dayOfWeek === 0 ? -1 : dayOfWeek - 1; // Sunday = -1, Mon = 0, Fri = 4

        const dishNames: Record<string, string> = {};

        if (todayIndex >= 0 && todayIndex <= 4) {
          // Fetch weekly menu
          const { data: menuData } = await supabase
            .from('weekly_menus')
            .select('id')
            .eq('week_start_date', weekStartString)
            .maybeSingle();

          if (menuData) {
            // Fetch today's menu items with dish names
            const { data: itemsData } = await supabase
              .from('menu_items')
              .select('*, dish:dishes!dish_id(name, category)')
              .eq('menu_id', menuData.id)
              .eq('day_of_week', todayIndex);

            if (itemsData && itemsData.length > 0) {
              itemsData.forEach((item: any) => {
                const dish = item.dish;
                if (!dish) return;

                switch (dish.category) {
                  case 'soup':
                    dishNames.soup = dish.name;
                    break;
                  case 'hot_dish_meat':
                    dishNames.hotMeat = dish.name;
                    break;
                  case 'hot_dish_veg':
                    dishNames.hotVeg = dish.name;
                    break;
                }
              });
            }
          }
        }

        setTodayDishNames(dishNames);

        // Calculate today's stats
        if (!todayFeedbackData || todayFeedbackData.length === 0) {
          setTodayScore(0);
          setTodayResponseCount(0);
          setTodayScores([]);
          setTodayDangerZones([]);
        } else {
          const todayAllRatings = todayFeedbackData.flatMap(getAllRatingsFromSubmission);
          const todayOverall = calculateAverage(todayAllRatings) || 0;
          setTodayScore(todayOverall);
          setTodayResponseCount(todayFeedbackData.length);

          // Calculate today's scores with actual dish names where available
          const todayScoresData: ScoreItem[] = [
            { label: dishNames.soup || 'Soup', score: calculateAverage(todayFeedbackData.map(f => f.soup_rating)), isDanger: false },
            { label: dishNames.hotMeat || 'Hot Meat/Fish', score: calculateAverage(todayFeedbackData.map(f => f.hot_meat_rating)), isDanger: false },
            { label: dishNames.hotVeg || 'Hot Vegetarian', score: calculateAverage(todayFeedbackData.map(f => f.hot_veg_rating)), isDanger: false },
            { label: 'Salad Bar', score: calculateAverage(todayFeedbackData.map(f => f.salad_bar_rating)), isDanger: false },
            { label: 'Sandwiches', score: calculateAverage(todayFeedbackData.map(f => f.sandwich_rating)), isDanger: false },
            { label: 'Portion Size', score: calculateAverage(todayFeedbackData.map(f => f.portion_size_rating)), isDanger: false },
            { label: 'Price/Quality', score: calculateAverage(todayFeedbackData.map(f => f.price_quality_rating)), isDanger: false },
            { label: 'Service & Checkout Speed', score: calculateAverage(todayFeedbackData.map(f => f.service_speed_rating)), isDanger: false },
            { label: 'Cleanliness', score: calculateAverage(todayFeedbackData.map(f => f.cleanliness_rating)), isDanger: false },
          ];

          // Mark today's danger zones
          todayScoresData.forEach(item => {
            item.isDanger = isDangerZone(item.score);
          });

          setTodayScores(todayScoresData);
          // For regular locations, only show Service Quality danger zones (last 3 items)
          setTodayDangerZones(todayScoresData.slice(6).filter(s => s.isDanger));
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [location, locationData, router, supabase]);

  if (!locationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <h1 className="text-[22px] font-semibold text-[#1D1D1F]">Invalid Location</h1>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3]"></div>
      </div>
    );
  }

  const navItems = getLocationNavItems(location, 'Feedback Dashboard');
  const currentMonth = format(new Date(), 'MMMM yyyy');

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <UniversalHeader
        title="Feedback Dashboard"
        backPath={`/${location}`}
        locationName={locationData.displayName}
        locationLogo={locationData.logo}
        navItems={navItems}
      />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-[32px] font-semibold text-[#1D1D1F] mb-2 tracking-tight">
            Customer Feedback
          </h1>
          <p className="text-[17px] text-[#6E6E73]">
            {currentMonth} Performance Summary
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8">
            <p className="text-[15px] text-red-700">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-6 mb-8">
          <button
            onClick={() => setActiveTab('today')}
            className={`text-[15px] font-semibold transition-all ${
              activeTab === 'today'
                ? 'text-[#0071E3]'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Today's Score
          </button>
          <button
            onClick={() => setActiveTab('overall')}
            className={`text-[15px] font-semibold transition-all ${
              activeTab === 'overall'
                ? 'text-[#0071E3]'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Overall Score
          </button>
        </div>

        {/* Today's Score Tab */}
        {activeTab === 'today' && (
          <>
            {todayResponseCount === 0 ? (
              <div className="bg-white rounded-xs border border-[#E8E8ED] p-12 text-center">
                <div className="text-[60px] mb-4">📊</div>
                <h2 className="text-[22px] font-semibold text-[#1D1D1F] mb-2">
                  No Feedback Today
                </h2>
                <p className="text-[15px] text-[#6E6E73] max-w-md mx-auto">
                  Customer feedback will appear here once responses are submitted today.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xs border border-[#E8E8ED] overflow-hidden">
                {/* Hero Stats - Today */}
                <div className="grid grid-cols-2 border-b border-[#E8E8ED]">
                  <div className={`${getScoreBgColor(todayScore)} p-5 border-r border-[#E8E8ED]`}>
                    <div className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">
                      Today's Score
                    </div>
                    <div className={`text-[48px] font-bold leading-none mb-1 ${getScoreColor(todayScore)}`}>
                      {todayScore}
                    </div>
                    <div className="text-[13px] text-[#6E6E73]">
                      Overall average
                    </div>
                  </div>
                  <div className="bg-white p-5">
                    <div className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">
                      Responses
                    </div>
                    <div className="text-[48px] font-bold text-[#1D1D1F] leading-none mb-1">
                      {todayResponseCount}
                    </div>
                    <div className="text-[13px] text-[#6E6E73]">
                      Submitted today
                    </div>
                  </div>
                </div>

                {/* Today's Danger Zones */}
                {todayDangerZones.length > 0 && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 p-5 border-b border-red-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-[28px]">⚠️</div>
                      <div>
                        <h3 className="text-[17px] font-bold text-red-900">
                          Needs Attention
                        </h3>
                        <p className="text-[13px] text-red-700">
                          {todayDangerZones.length} {todayDangerZones.length === 1 ? 'category' : 'categories'} below target (65)
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {todayDangerZones.map((item) => (
                        <div key={item.label} className="bg-white rounded-xs p-3 border border-red-300">
                          <div className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                            {item.label}
                          </div>
                          <div className="text-[28px] font-bold text-red-600 leading-none">
                            {item.score}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Combined Categories Grid */}
                <div className="p-5">
                  {/* Food Quality */}
                  <div className="mb-5">
                    <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3 pb-2 border-b border-[#E8E8ED]">
                      Food Quality
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {todayScores.slice(0, 6).map((item) => (
                        <div
                          key={item.label}
                          className={`${getScoreBgColor(item.score)} rounded-xs p-3 border ${
                            item.isDanger ? 'border-red-300' : 'border-[#E8E8ED]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[13px] font-medium text-[#1D1D1F]">
                              {item.label}
                            </div>
                            {item.isDanger && (
                              <div className="text-[16px]">⚠️</div>
                            )}
                          </div>
                          <div className={`text-[32px] font-bold leading-none ${getScoreColor(item.score)}`}>
                            {item.score !== null ? item.score : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Service Quality */}
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3 pb-2 border-b border-[#E8E8ED]">
                      Service Quality
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {todayScores.slice(6).map((item) => (
                        <div
                          key={item.label}
                          className={`${getScoreBgColor(item.score)} rounded-xs p-3 border ${
                            item.isDanger ? 'border-red-300' : 'border-[#E8E8ED]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[13px] font-medium text-[#1D1D1F]">
                              {item.label}
                            </div>
                            {item.isDanger && (
                              <div className="text-[16px]">⚠️</div>
                            )}
                          </div>
                          <div className={`text-[32px] font-bold leading-none ${getScoreColor(item.score)}`}>
                            {item.score !== null ? item.score : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Overall Score Tab */}
        {activeTab === 'overall' && (
          <>
            {responseCount === 0 ? (
          <div className="bg-white rounded-xs border border-[#E8E8ED] p-12 text-center">
            <div className="text-[60px] mb-4">📊</div>
            <h2 className="text-[22px] font-semibold text-[#1D1D1F] mb-2">
              No Feedback Yet
            </h2>
            <p className="text-[15px] text-[#6E6E73] max-w-md mx-auto">
              Customer feedback will appear here once responses are submitted through the QR code forms.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xs border border-[#E8E8ED] overflow-hidden">
            {/* Hero Stats - Overall */}
            <div className="grid grid-cols-2 border-b border-[#E8E8ED]">
              <div className={`${getScoreBgColor(overallScore)} p-5 border-r border-[#E8E8ED]`}>
                <div className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">
                  Overall Score
                </div>
                <div className={`text-[48px] font-bold leading-none mb-1 ${getScoreColor(overallScore)}`}>
                  {overallScore}
                </div>
                <div className="text-[13px] text-[#6E6E73]">
                  Monthly average
                </div>
              </div>
              <div className="bg-white p-5">
                <div className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-2">
                  Total Responses
                </div>
                <div className="text-[48px] font-bold text-[#1D1D1F] leading-none mb-1">
                  {responseCount}
                </div>
                <div className="text-[13px] text-[#6E6E73]">
                  This month
                </div>
              </div>
            </div>

            {/* Danger Zones */}
            {dangerZones.length > 0 && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 p-5 border-b border-red-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-[28px]">⚠️</div>
                  <div>
                    <h3 className="text-[17px] font-bold text-red-900">
                      Needs Attention
                    </h3>
                    <p className="text-[13px] text-red-700">
                      {dangerZones.length} {dangerZones.length === 1 ? 'category' : 'categories'} below target (65)
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {dangerZones.map((item) => (
                    <div key={item.label} className="bg-white rounded-xs p-3 border border-red-300">
                      <div className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                        {item.label}
                      </div>
                      <div className="text-[28px] font-bold text-red-600 leading-none">
                        {item.score}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Combined Categories Grid */}
            <div className="p-5">
              {/* Food Quality */}
              <div className="mb-5">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3 pb-2 border-b border-[#E8E8ED]">
                  Food Quality
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {allScores.slice(0, 6).map((item) => (
                    <div
                      key={item.label}
                      className={`${getScoreBgColor(item.score)} rounded-xs p-3 border ${
                        item.isDanger ? 'border-red-300' : 'border-[#E8E8ED]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[13px] font-medium text-[#1D1D1F]">
                          {item.label}
                        </div>
                        {item.isDanger && (
                          <div className="text-[16px]">⚠️</div>
                        )}
                      </div>
                      <div className={`text-[32px] font-bold leading-none ${getScoreColor(item.score)}`}>
                        {item.score !== null ? item.score : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Service Quality */}
              <div>
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3 pb-2 border-b border-[#E8E8ED]">
                  Service Quality
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {allScores.slice(6).map((item) => (
                    <div
                      key={item.label}
                      className={`${getScoreBgColor(item.score)} rounded-xs p-3 border ${
                        item.isDanger ? 'border-red-300' : 'border-[#E8E8ED]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[13px] font-medium text-[#1D1D1F]">
                          {item.label}
                        </div>
                        {item.isDanger && (
                          <div className="text-[16px]">⚠️</div>
                        )}
                      </div>
                      <div className={`text-[32px] font-bold leading-none ${getScoreColor(item.score)}`}>
                        {item.score !== null ? item.score : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}
