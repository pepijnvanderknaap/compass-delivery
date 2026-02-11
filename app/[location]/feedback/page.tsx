'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getLocationBySlug } from '@/lib/locationConfig';
import { RATING_LABELS, getRatingButtonColor } from '@/lib/feedbackUtils';
import { format, startOfWeek } from 'date-fns';
import Image from 'next/image';
import type { DishAvailability } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface TodaysDishes {
  soup?: string;
  hotMeat?: string;
  hotVeg?: string;
  saladBar?: string;
  sandwich?: string;
}

interface RatingState {
  soup?: number;
  hotMeat?: number;
  hotVeg?: number;
  saladBar?: number;
  sandwich?: number;
  priceQuality?: number;
  portionSize?: number;
  serviceSpeed?: number;
  cleanliness?: number;
}

export default function FeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const location = params.location as string;
  const locationData = getLocationBySlug(location);
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todaysDishes, setTodaysDishes] = useState<TodaysDishes>({});
  const [dishAvailability, setDishAvailability] = useState<DishAvailability>({
    soup: false,
    hotMeat: false,
    hotVeg: false,
    saladBar: false,
    sandwich: false
  });
  const [ratings, setRatings] = useState<RatingState>({});
  const [locationId, setLocationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodaysMenu = async () => {
      try {
        if (!locationData) {
          setError('Invalid location');
          setLoading(false);
          return;
        }

        // Get location ID from database - map slug to exact database name
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

        setLocationId(locData.id);

        // Get current week start (Monday)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekStartString = format(currentWeekStart, 'yyyy-MM-dd');

        // Get today's day index (0 = Monday, 4 = Friday)
        const todayIndex = dayOfWeek === 0 ? -1 : dayOfWeek - 1; // Sunday = -1, Mon = 0, Fri = 4

        if (todayIndex < 0 || todayIndex > 4) {
          setError('Feedback is only available Monday through Friday');
          setLoading(false);
          return;
        }

        // Fetch weekly menu
        const { data: menuData } = await supabase
          .from('weekly_menus')
          .select('id')
          .eq('week_start_date', weekStartString)
          .maybeSingle();

        if (!menuData) {
          setError('No menu available for this week');
          setLoading(false);
          return;
        }

        // Fetch today's menu items
        const { data: itemsData } = await supabase
          .from('menu_items')
          .select('*, dish:dishes!dish_id(name, category)')
          .eq('menu_id', menuData.id)
          .eq('day_of_week', todayIndex);

        if (!itemsData || itemsData.length === 0) {
          setError('No dishes available today');
          setLoading(false);
          return;
        }

        // Organize dishes by category
        const dishes: TodaysDishes = {};
        const availability: DishAvailability = {
          soup: false,
          hotMeat: false,
          hotVeg: false,
          saladBar: false,
          sandwich: false
        };

        itemsData.forEach((item: any) => {
          const dish = item.dish;
          if (!dish) return;

          switch (dish.category) {
            case 'soup':
              dishes.soup = dish.name;
              availability.soup = true;
              break;
            case 'hot_dish_meat':
              dishes.hotMeat = dish.name;
              availability.hotMeat = true;
              break;
            case 'hot_dish_veg':
              dishes.hotVeg = dish.name;
              availability.hotVeg = true;
              break;
          }
        });

        // Salad bar and sandwiches are typically always available
        dishes.saladBar = 'Salad Bar';
        availability.saladBar = true;
        dishes.sandwich = 'Sandwich Selection';
        availability.sandwich = true;

        setTodaysDishes(dishes);
        setDishAvailability(availability);
      } catch (err) {
        console.error('Error fetching menu:', err);
        setError('Failed to load today\'s menu');
      } finally {
        setLoading(false);
      }
    };

    fetchTodaysMenu();
  }, [location, locationData, supabase]);

  const handleRating = (category: keyof RatingState, value: number) => {
    setRatings(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async () => {
    // Validate all required ratings
    const requiredOperational: (keyof RatingState)[] = ['priceQuality', 'portionSize', 'serviceSpeed', 'cleanliness'];
    const missingOperational = requiredOperational.filter(key => ratings[key] === undefined);

    if (missingOperational.length > 0) {
      setError('Please rate all service quality aspects');
      return;
    }

    // Validate dish ratings (only required if dish is available)
    if (dishAvailability.soup && ratings.soup === undefined) {
      setError('Please rate the soup');
      return;
    }
    if (dishAvailability.hotMeat && ratings.hotMeat === undefined) {
      setError('Please rate the hot dish (meat/fish)');
      return;
    }
    if (dishAvailability.hotVeg && ratings.hotVeg === undefined) {
      setError('Please rate the hot dish (vegetarian)');
      return;
    }
    if (dishAvailability.saladBar && ratings.saladBar === undefined) {
      setError('Please rate the salad bar');
      return;
    }
    if (dishAvailability.sandwich && ratings.sandwich === undefined) {
      setError('Please rate the sandwich selection');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Check IP restriction (this will be handled server-side in production via API route)
      // For now, we'll submit directly to Supabase
      const { error: submitError } = await supabase
        .from('customer_feedback')
        .insert({
          location_id: locationId,
          submission_date: format(new Date(), 'yyyy-MM-dd'),
          submission_ip: 'web-submission', // In production, this would come from server
          soup_rating: ratings.soup || null,
          hot_meat_rating: ratings.hotMeat || null,
          hot_veg_rating: ratings.hotVeg || null,
          salad_bar_rating: ratings.saladBar || null,
          sandwich_rating: ratings.sandwich || null,
          price_quality_rating: ratings.priceQuality!,
          portion_size_rating: ratings.portionSize!,
          service_speed_rating: ratings.serviceSpeed!,
          cleanliness_rating: ratings.cleanliness!
        });

      if (submitError) {
        if (submitError.code === '23505') {
          // Unique constraint violation
          setError('You have already submitted feedback today. Thank you!');
        } else {
          throw submitError;
        }
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!locationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Invalid Location</h1>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3]"></div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-[28px] font-semibold text-[#1D1D1F] mb-3">
            Thank You!
          </h1>
          <p className="text-[17px] text-[#6E6E73] mb-8">
            Your feedback has been submitted successfully. We appreciate you taking the time to share your experience.
          </p>
          <button
            onClick={() => router.push(`/${location}`)}
            className="px-6 py-3 bg-[#0071E3] hover:bg-[#0077ED] text-white text-[15px] font-medium rounded-lg transition-colors"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (error && !todaysDishes.soup && !todaysDishes.hotMeat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-[28px] font-semibold text-[#1D1D1F] mb-3">
            {error}
          </h1>
          <p className="text-[15px] text-[#6E6E73]">
            Please check back during service hours (Monday-Friday).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 text-center">
          <Image
            src={locationData.logo}
            alt={locationData.displayName}
            width={120}
            height={120}
            className="mx-auto mb-4"
          />
          <h1 className="text-[28px] font-semibold text-[#1D1D1F] mb-2">
            Share Your Experience
          </h1>
          <p className="text-[15px] text-[#6E6E73]">
            Your feedback helps us serve you better
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-[15px] text-red-700 text-center">{error}</p>
          </div>
        )}

        {/* Today's Menu Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-[22px] font-semibold text-[#1D1D1F] mb-6">Today's Menu</h2>

          <div className="space-y-6">
            {dishAvailability.soup && todaysDishes.soup && (
              <RatingSection
                title={todaysDishes.soup}
                subtitle="Soup"
                selectedValue={ratings.soup}
                onRate={(value) => handleRating('soup', value)}
              />
            )}

            {dishAvailability.hotMeat && todaysDishes.hotMeat && (
              <RatingSection
                title={todaysDishes.hotMeat}
                subtitle="Hot Dish (Meat/Fish)"
                selectedValue={ratings.hotMeat}
                onRate={(value) => handleRating('hotMeat', value)}
              />
            )}

            {dishAvailability.hotVeg && todaysDishes.hotVeg && (
              <RatingSection
                title={todaysDishes.hotVeg}
                subtitle="Hot Dish (Vegetarian)"
                selectedValue={ratings.hotVeg}
                onRate={(value) => handleRating('hotVeg', value)}
              />
            )}

            {dishAvailability.saladBar && (
              <RatingSection
                title="Salad Bar"
                subtitle="Freshness & Selection"
                selectedValue={ratings.saladBar}
                onRate={(value) => handleRating('saladBar', value)}
              />
            )}

            {dishAvailability.sandwich && (
              <RatingSection
                title="Sandwich Selection"
                subtitle="Variety & Quality"
                selectedValue={ratings.sandwich}
                onRate={(value) => handleRating('sandwich', value)}
              />
            )}
          </div>
        </div>

        {/* Service Quality Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-[22px] font-semibold text-[#1D1D1F] mb-6">Service Quality</h2>

          <div className="space-y-6">
            <RatingSection
              title="Price/Quality Balance"
              subtitle="Value for money"
              selectedValue={ratings.priceQuality}
              onRate={(value) => handleRating('priceQuality', value)}
            />

            <RatingSection
              title="Portion Size"
              subtitle="Amount of food served"
              selectedValue={ratings.portionSize}
              onRate={(value) => handleRating('portionSize', value)}
            />

            <RatingSection
              title="Service & Checkout Speed"
              subtitle="Waiting time & efficiency"
              selectedValue={ratings.serviceSpeed}
              onRate={(value) => handleRating('serviceSpeed', value)}
            />

            <RatingSection
              title="Cleanliness"
              subtitle="Dining area & facilities"
              selectedValue={ratings.cleanliness}
              onRate={(value) => handleRating('cleanliness', value)}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[17px] font-semibold rounded-xl shadow-lg transition-all"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>

        <p className="text-[13px] text-[#86868B] text-center mt-4">
          Your feedback is anonymous and helps us improve our service
        </p>
      </div>
    </div>
  );
}

interface RatingSectionProps {
  title: string;
  subtitle: string;
  selectedValue?: number;
  onRate: (value: number) => void;
}

function RatingSection({ title, subtitle, selectedValue, onRate }: RatingSectionProps) {
  return (
    <div className="border-b border-[#E8E8ED] last:border-b-0 pb-6 last:pb-0">
      <div className="mb-4">
        <h3 className="text-[17px] font-semibold text-[#1D1D1F]">{title}</h3>
        <p className="text-[13px] text-[#86868B]">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {RATING_LABELS.map((rating) => (
          <button
            key={rating.value}
            onClick={() => onRate(rating.value)}
            className={`
              py-4 px-3 rounded-xl text-white text-[15px] font-medium transition-all
              ${selectedValue === rating.value ? 'ring-4 ring-offset-2 ring-opacity-50' : ''}
              ${getRatingButtonColor(rating.value)}
            `}
          >
            {rating.label}
          </button>
        ))}
      </div>
    </div>
  );
}
