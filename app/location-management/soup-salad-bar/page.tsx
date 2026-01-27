'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile, LocationSettings, Location } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';
import SaladBarComposer from '../settings/SaladBarComposer';

export default function SoupSaladBarPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
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

        // For admins, fetch all locations
        if (profileData.role === 'admin') {
          const { data: locationsData } = await supabase
            .from('locations')
            .select('*')
            .eq('is_active', true)
            .order('name');

          setLocations(locationsData || []);
        }

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

  useEffect(() => {
    if (selectedLocationId) {
      fetchLocationSettings(selectedLocationId);
    }
  }, [selectedLocationId]);

  const fetchLocationSettings = async (locationId: string) => {
    try {
      const { data: settingsData } = await supabase
        .from('location_settings')
        .select('*')
        .eq('location_id', locationId)
        .single();

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
    const locationId = profile?.role === 'admin' ? selectedLocationId : profile?.location_id;
    if (!locationId || !settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('location_settings')
        .upsert({
          ...settings,
          location_id: locationId,
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

  const selectedLocation = locations.find(l => l.id === selectedLocationId);
  const locationName = profile.role === 'admin'
    ? (selectedLocation?.name || 'Select a location')
    : ((profile.locations as any)?.name || 'Your Location');

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminQuickNav />

      <UniversalHeader
        title="Soup & Salad Bar"
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

      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-6">
        {/* Location Selector for Admins */}
        {profile.role === 'admin' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Select Location
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full max-w-md px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">Choose a location...</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Location Info */}
        {selectedLocationId || profile.role === 'manager' ? (
          <div className="mb-4 bg-white border border-teal-200 rounded-lg p-4">
            <h2 className="text-base font-semibold text-gray-800 mb-1">
              {locationName}
            </h2>
            <p className="text-xs text-gray-600">
              Configure soup portions and salad bar composition for this location
            </p>
          </div>
        ) : null}

        {!selectedLocationId && profile.role === 'admin' && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">Please select a location to view and edit soup & salad bar settings.</p>
          </div>
        )}

        {!settings && (selectedLocationId || profile.role === 'manager') && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">Loading settings...</p>
          </div>
        )}

        {settings && (selectedLocationId || profile.role === 'manager') && (
          <div className="space-y-4">
            {/* Soup Portion Size */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
              <h2 className="text-base font-semibold text-gray-800 mb-3 border-b pb-2">
                Soup Portion Size
              </h2>

              <div className="max-w-md">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Portion Size (ml)
                </label>
                <input
                  type="number"
                  value={settings.soup_portion_size_ml || ''}
                  onChange={(e) => setSettings({ ...settings, soup_portion_size_ml: parseInt(e.target.value) || null })}
                  placeholder="150"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <p className="text-[10px] text-gray-500 mt-1">Default: 150ml</p>
              </div>
            </div>

            {/* Salad Bar Section */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
              <h2 className="text-base font-semibold text-gray-800 mb-3 border-b pb-2">
                Salad Bar Configuration
              </h2>

              {/* Total Portion Size */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Total Salad Bar Portion Size (g)
                </label>
                <input
                  type="number"
                  value={settings.salad_bar_portion_size_g || ''}
                  onChange={(e) => setSettings({ ...settings, salad_bar_portion_size_g: parseInt(e.target.value) || null })}
                  placeholder="240"
                  className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <p className="text-[10px] text-gray-500 mt-1">Default: 240g</p>
              </div>

              {/* Salad Bar Composer */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-800 mb-2">
                  Ingredient Composition
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Adjust the percentage of each ingredient. When you change one element, the others automatically rebalance to maintain 100% total.
                </p>
                <SaladBarComposer settings={settings} onSettingsChange={setSettings} />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2 text-sm bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
