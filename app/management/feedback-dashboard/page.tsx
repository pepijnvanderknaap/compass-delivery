'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { calculateAverage, getAllRatingsFromSubmission, getScoreColor, getScoreBgColor, isDangerZone } from '@/lib/feedbackUtils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';
import type { UserProfile, DangerZone } from '@/lib/types';
import { getManagementNavItems } from '@/lib/locationConfig';

export const dynamic = 'force-dynamic';

interface LocationScore {
  locationName: string;
  score: number;
  responseCount: number;
}

interface CategoryAverage {
  category: string;
  score: number | null;
}

export default function ManagementFeedbackDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [overallClusterScore, setOverallClusterScore] = useState<number>(0);
  const [totalResponses, setTotalResponses] = useState<number>(0);
  const [locationScores, setLocationScores] = useState<LocationScore[]>([]);
  const [categoryAverages, setCategoryAverages] = useState<CategoryAverage[]>([]);
  const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login/management');
          return;
        }

        // Get user profile
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profileData || profileData.role !== 'admin') {
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
          .select('*')
          .gte('submission_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('submission_date', format(monthEnd, 'yyyy-MM-dd'));

        if (fetchError) throw fetchError;

        if (!feedbackData || feedbackData.length === 0) {
          setLoading(false);
          return;
        }

        // Calculate overall cluster score (ALL ratings from ALL locations)
        const allRatings = feedbackData.flatMap(getAllRatingsFromSubmission);
        const clusterScore = calculateAverage(allRatings) || 0;
        setOverallClusterScore(clusterScore);
        setTotalResponses(feedbackData.length);

        // Calculate location scores
        const locScores = locations.map(loc => {
          const locFeedback = feedbackData.filter(f => f.location_id === loc.id);
          const locRatings = locFeedback.flatMap(getAllRatingsFromSubmission);
          return {
            locationName: loc.name,
            score: calculateAverage(locRatings) || 0,
            responseCount: locFeedback.length
          };
        }).filter(loc => loc.responseCount > 0)
          .sort((a, b) => b.score - a.score); // Sort descending (best first)

        setLocationScores(locScores);

        // Calculate category averages (cluster-wide)
        const categories = [
          { key: 'soup_rating', label: 'Soup' },
          { key: 'hot_meat_rating', label: 'Hot Meat/Fish' },
          { key: 'hot_veg_rating', label: 'Hot Vegetarian' },
          { key: 'salad_bar_rating', label: 'Salad Bar' },
          { key: 'sandwich_rating', label: 'Sandwiches' },
          { key: 'price_quality_rating', label: 'Price/Quality' },
          { key: 'portion_size_rating', label: 'Portion Size' },
          { key: 'service_speed_rating', label: 'Service Speed' },
          { key: 'cleanliness_rating', label: 'Cleanliness' }
        ];

        const catAverages = categories.map(cat => {
          const ratings = feedbackData.map((f: any) => f[cat.key]).filter((r: any) => r !== null);
          return {
            category: cat.label,
            score: calculateAverage(ratings)
          };
        });

        setCategoryAverages(catAverages);

        // Calculate danger zones (scores <65 across ALL categories and locations)
        const dangers: DangerZone[] = [];

        categories.forEach(cat => {
          locations.forEach(loc => {
            const locFeedback = feedbackData.filter((f: any) => f.location_id === loc.id);
            const ratings = locFeedback.map((f: any) => f[cat.key]).filter((r: any) => r !== null);
            const score = calculateAverage(ratings);

            if (score !== null && score < 65) {
              dangers.push({
                location: loc.name,
                category: cat.label,
                score
              });
            }
          });
        });

        // Sort by score ascending (worst first)
        dangers.sort((a, b) => a.score - b.score);
        setDangerZones(dangers);
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
  const navItems = getManagementNavItems('Feedback Analytics');

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <UniversalHeader
        title="Regional Management"
        backPath=""
        navItems={navItems}
      />

      <div className="max-w-7xl mx-auto px-6 py-6">
        <AdminQuickNav />

        <div className="mb-4 mt-4">
          <h1 className="text-[22px] font-semibold text-[#1D1D1F] mb-1">
            Feedback Overview
          </h1>
          <p className="text-[13px] text-[#6E6E73]">
            {currentMonth}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-[15px] text-red-700">{error}</p>
          </div>
        )}

        {totalResponses === 0 ? (
          <div className="bg-white rounded-xl border border-[#E8E8ED] p-8 text-center">
            <div className="text-[48px] mb-3">📊</div>
            <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-1">
              No Feedback Data
            </h2>
            <p className="text-[13px] text-[#6E6E73]">
              No customer feedback has been submitted this month across all locations.
            </p>
          </div>
        ) : (
          <>
            {/* Overall Cluster Score */}
            <div className="bg-white rounded-xl border border-[#E8E8ED] p-4 mb-4">
              <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-3">
                Overall Cluster Performance
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`${getScoreBgColor(overallClusterScore)} rounded-lg p-4 border border-[#E8E8ED]`}>
                  <div className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                    Cluster Score
                  </div>
                  <div className={`text-[36px] font-bold ${getScoreColor(overallClusterScore)}`}>
                    {overallClusterScore}
                  </div>
                  <div className="text-[11px] text-[#6E6E73] mt-1">
                    All ratings across all locations
                  </div>
                </div>
                <div className="bg-[#F5F5F7] rounded-lg p-4 border border-[#E8E8ED]">
                  <div className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                    Total Responses
                  </div>
                  <div className="text-[36px] font-bold text-[#1D1D1F]">
                    {totalResponses}
                  </div>
                  <div className="text-[11px] text-[#6E6E73] mt-1">
                    Across {locationScores.length} locations
                  </div>
                </div>
              </div>
            </div>

            {/* Location Performance */}
            <div className="bg-white rounded-xl border border-[#E8E8ED] p-4 mb-4">
              <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-3">
                Location Performance
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E8E8ED]">
                      <th className="text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wide pb-2">
                        Location
                      </th>
                      <th className="text-center text-[11px] font-semibold text-[#86868B] uppercase tracking-wide pb-2">
                        Score
                      </th>
                      <th className="text-center text-[11px] font-semibold text-[#86868B] uppercase tracking-wide pb-2">
                        Responses
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationScores.map((loc) => (
                      <tr key={loc.locationName} className="border-b border-[#E8E8ED] last:border-b-0">
                        <td className="py-2.5 text-[13px] font-medium text-[#1D1D1F]">
                          {loc.locationName}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`text-[17px] font-bold ${getScoreColor(loc.score)}`}>
                            {loc.score}
                          </span>
                        </td>
                        <td className="py-2.5 text-center text-[13px] text-[#6E6E73]">
                          {loc.responseCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Averages (Cluster-Wide) */}
            <div className="bg-white rounded-xl border border-[#E8E8ED] p-4 mb-4">
              <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-3">
                Category Averages (Cluster-Wide)
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {categoryAverages.map((cat) => (
                  <div key={cat.category} className={`${getScoreBgColor(cat.score)} rounded-lg p-3 border border-[#E8E8ED]`}>
                    <div className="text-[11px] font-medium text-[#86868B] mb-1">
                      {cat.category}
                    </div>
                    <div className={`text-[22px] font-bold ${getScoreColor(cat.score)}`}>
                      {cat.score !== null ? cat.score : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger Zones */}
            <div className="bg-white rounded-xl border border-[#E8E8ED] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-[20px]">⚠️</div>
                <h2 className="text-[17px] font-semibold text-[#1D1D1F]">
                  Danger Zones (Scores &lt;65)
                </h2>
              </div>

              {dangerZones.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-[48px] mb-3">✅</div>
                  <h3 className="text-[17px] font-semibold text-green-600 mb-1">
                    Excellent Performance!
                  </h3>
                  <p className="text-[13px] text-[#6E6E73]">
                    No scores below 65 across all locations and categories this month.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E8E8ED]">
                        <th className="text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wide pb-2">
                          Location
                        </th>
                        <th className="text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wide pb-2">
                          Category
                        </th>
                        <th className="text-center text-[11px] font-semibold text-[#86868B] uppercase tracking-wide pb-2">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dangerZones.map((zone, index) => (
                        <tr key={index} className="border-b border-[#E8E8ED] last:border-b-0 bg-red-50">
                          <td className="py-2.5 text-[13px] font-medium text-[#1D1D1F]">
                            {zone.location}
                          </td>
                          <td className="py-2.5 text-[13px] text-[#6E6E73]">
                            {zone.category}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className="text-[17px] font-bold text-red-600">
                              {zone.score} ⚠️
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
