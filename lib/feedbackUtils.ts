import { CustomerFeedback } from './types';
import { SupabaseClient } from '@supabase/supabase-js';

export const RATING_VALUES = {
  POOR: 25,
  MEDIOCRE: 50,
  GOOD: 75,
  EXCELLENT: 100
} as const;

export const RATING_LABELS = [
  { label: 'Poor', value: RATING_VALUES.POOR, color: 'red' },
  { label: 'Mediocre', value: RATING_VALUES.MEDIOCRE, color: 'orange' },
  { label: 'Good', value: RATING_VALUES.GOOD, color: 'blue' },
  { label: 'Excellent', value: RATING_VALUES.EXCELLENT, color: 'green' }
];

/**
 * Calculate the average of an array of ratings, ignoring null values
 */
export function calculateAverage(ratings: (number | null)[]): number | null {
  const validRatings = ratings.filter((r): r is number => r !== null && r !== undefined);
  if (validRatings.length === 0) return null;
  return Math.round(validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length);
}

/**
 * Extract all ratings from a submission (both dish and operational)
 */
export function getAllRatingsFromSubmission(submission: CustomerFeedback): number[] {
  return [
    submission.soup_rating,
    submission.hot_meat_rating,
    submission.hot_veg_rating,
    submission.salad_bar_rating,
    submission.sandwich_rating,
    submission.price_quality_rating,
    submission.portion_size_rating,
    submission.service_speed_rating,
    submission.cleanliness_rating
  ].filter((r): r is number => r !== null && r !== undefined);
}

/**
 * Get Tailwind color class for a score
 */
export function getScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 75) return 'text-green-600';
  if (score >= 65) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get background color for score cards
 */
export function getScoreBgColor(score: number | null): string {
  if (score === null) return 'bg-gray-50';
  if (score >= 75) return 'bg-green-50';
  if (score >= 65) return 'bg-yellow-50';
  return 'bg-red-50';
}

/**
 * Check if a score is in the danger zone (<65)
 */
export function isDangerZone(score: number | null): boolean {
  return score !== null && score < 65;
}

/**
 * Check if an IP has already submitted feedback today for a location
 */
export async function checkIpRestriction(
  supabase: SupabaseClient,
  locationId: string,
  ip: string,
  date: string
): Promise<boolean> {
  const { data } = await supabase
    .from('customer_feedback')
    .select('id')
    .eq('location_id', locationId)
    .eq('submission_date', date)
    .eq('submission_ip', ip)
    .maybeSingle();

  return data !== null; // true if already submitted
}

/**
 * Get rating button color classes
 */
export function getRatingButtonColor(value: number): string {
  switch (value) {
    case 25:
      return 'bg-red-500 hover:bg-red-600 active:bg-red-700';
    case 50:
      return 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700';
    case 75:
      return 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700';
    case 100:
      return 'bg-green-500 hover:bg-green-600 active:bg-green-700';
    default:
      return 'bg-gray-500 hover:bg-gray-600';
  }
}
