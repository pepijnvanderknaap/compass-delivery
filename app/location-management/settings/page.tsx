'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile, LocationSettings } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';

export default function LocationSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<LocationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login/location-management');
          return;
        }

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*, locations(name)')
          .eq('id', user.id)
          .single();

        // Allow both managers and admins to access
        if (!profileData) {
          router.push('/location-management');
          return;
        }

        // Managers need a location_id
        if (profileData.role === 'manager' && !profileData.location_id) {
          router.push('/location-management');
          return;
        }

        setProfile(profileData);

        // For managers, use their assigned location
        if (profileData.role === 'manager' && profileData.location_id) {
          await fetchLocationSettings(profileData.location_id);
        }
      } catch (err) {
        console.error('Error initializing:', err);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [supabase, router]);

  const fetchLocationSettings = async (locationId: string) => {
    try {
      // Fetch settings
      const { data: settingsData } = await supabase
        .from('location_settings')
        .select('*')
        .eq('location_id', locationId)
        .single();

      // If no settings exist, create default settings
      if (!settingsData) {
        const defaultSettings: Partial<LocationSettings> = {
          location_id: locationId,
          soup_portion_size_ml: 150,
          salad_bar_portion_size_g: 240,
          salad_leaves_percentage: 0.05,
          cucumber_percentage: 0.05,
          tomato_percentage: 0.05,
          carrot_julienne_percentage: 0.05,
          radish_julienne_percentage: 0.05,
          pickled_beetroot_percentage: 0.05,
          mixed_blanched_veg_percentage: 0.07,
          roasted_veg_1_percentage: 0.07,
          roasted_veg_2_percentage: 0.07,
          roasted_veg_3_percentage: 0.07,
          potato_salad_percentage: 0.06,
          composed_salad_percentage: 0.16,
          pasta_salad_percentage: 0.16,
          carb_percentage: 0.04,
        };

        const { data: newSettings } = await supabase
          .from('location_settings')
          .insert(defaultSettings)
          .select()
          .single();

        setSettings(newSettings as LocationSettings);
      } else {
        setSettings(settingsData);
      }
    } catch (err) {
      console.error('Error fetching location settings:', err);
    }
  };

  const handleSaveSettings = async () => {
    if (!profile?.location_id || !settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('location_settings')
        .upsert({
          ...settings,
          location_id: profile.location_id,
        });

      if (error) throw error;

      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Unable to load profile</p>
      </div>
    );
  }

  // For managers without settings, show error
  if (profile.role === 'manager' && !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Unable to load settings for your location</p>
      </div>
    );
  }

  const locationName = (profile.locations as any)?.name || 'Your Location';

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminQuickNav />

      <UniversalHeader
        title="Location Settings"
        backPath="/location-management"
        actions={
          <>
            <span className="text-apple-subheadline text-slate-700">{profile.full_name}</span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-apple-subheadline font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </>
        }
      />

      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
        {/* Location Info */}
        <div className="mb-8 bg-white border border-teal-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {locationName}
          </h2>
          <p className="text-sm text-gray-600">
            View your location details and contact information
          </p>
        </div>

        {settings && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3">
              Location Information
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Name
                </label>
                <input
                  type="text"
                  value={locationName}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager Name
                </label>
                <input
                  type="text"
                  value={profile?.full_name || ''}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager Email
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                To configure soup portions and salad bar composition, please visit the <a href="/location-management/soup-salad-bar" className="text-teal-600 hover:text-teal-700 font-medium underline">Soup & Salad Bar</a> page.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
