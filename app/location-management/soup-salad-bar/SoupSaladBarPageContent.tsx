'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile, LocationSettings, Location } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';
import UserProfileComponent from '@/components/UserProfile';
import SaladBarComposer from '../settings/SaladBarComposer';

interface SoupSaladBarPageContentProps {
  forcedLocation?: string;
}

export default function SoupSaladBarPageContent({ forcedLocation }: SoupSaladBarPageContentProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [settings, setSettings] = useState<LocationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Location branding data
  const locationBranding: Record<string, { logo: string; name: string; subtitle?: string }> = {
    'symphony': {
      logo: '/locations/symphony-offices.png',
      name: 'Symphony Offices',
    },
    'atlassian': {
      logo: '/locations/atlassian-logo.png',
      name: 'Atlassian',
    },
    'snowflake': {
      logo: '/locations/snowflake-logo-v2.png',
      name: 'Snowflake',
    },
    'snapchat': {
      logo: '/locations/snapchat-logo.jpg',
      name: 'SnapChat',
    },
    'snapchat-119': {
      logo: '/locations/snapchat-logo.jpg',
      name: 'SnapChat',
      subtitle: 'Building 119',
    },
    'snapchat-165': {
      logo: '/locations/snapchat-logo.jpg',
      name: 'SnapChat',
      subtitle: 'Building 165',
    },
    'jaa': {
      logo: '/locations/jaa-logo.png',
      name: 'JAA Training',
    },
  };

  // Use forcedLocation if provided, otherwise use searchParams
  const locationParam = forcedLocation || searchParams.get('location');

  // State to hold the derived location slug for navigation
  const [navLocationSlug, setNavLocationSlug] = useState<string | null>(locationParam);

  // State for Snapchat building selection
  const [snapchatBuilding, setSnapchatBuilding] = useState<'119' | '165'>(() => {
    if (locationParam === 'snapchat-165') return '165';
    return '119'; // Default to 119 for 'snapchat' or 'snapchat-119'
  });

  // Use navLocationSlug for branding to ensure logo shows even after async load
  const currentLocation = navLocationSlug ? locationBranding[navLocationSlug] : null;

  // Map URL location params to database location names
  const locationParamMapping: Record<string, string> = {
    'symphony': 'Symphony',
    'atlassian': 'Atlassian',
    'snowflake': 'Snowflake',
    'snapchat': 'SnapChat 119',
    'snapchat-119': 'SnapChat 119',
    'snapchat-165': 'SnapChat 165',
    'jaa': 'JAA Training',
  };

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

        if (profileData.role === 'manager' && !profileData.location_id) {
          router.push('/location-management');
          return;
        }

        setProfile(profileData);

        // Always fetch locations to support forcedLocation lookup
        const { data: locationsData } = await supabase
          .from('locations')
          .select('*')
          .eq('is_active', true)
          .order('name');

        setLocations(locationsData || []);

        // Determine which location to show
        let targetLocationId = profileData.location_id;
        let derivedLocationSlug = locationParam;

        // If forcedLocation is provided, look up the location ID
        if (locationParam && locationsData) {
          const dbLocationName = locationParamMapping[locationParam];
          const location = locationsData.find(loc => loc.name === dbLocationName);
          if (location) {
            targetLocationId = location.id;
          }
        } else if (locationsData && targetLocationId) {
          // If no locationParam, derive the slug from the user's profile location
          const userLocation = locationsData.find(loc => loc.id === targetLocationId);
          if (userLocation) {
            // Find the reverse mapping (database name -> slug)
            const slugEntry = Object.entries(locationParamMapping).find(
              ([_, dbName]) => dbName === userLocation.name
            );
            if (slugEntry) {
              derivedLocationSlug = slugEntry[0];
            }
          }
        }

        setNavLocationSlug(derivedLocationSlug);

        if (targetLocationId) {
          setSelectedLocationId(targetLocationId);
          await fetchLocationSettings(targetLocationId);
        }
      } catch (err) {
        console.error('Error initializing:', err);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [supabase, router, forcedLocation]);

  useEffect(() => {
    if (selectedLocationId) {
      fetchLocationSettings(selectedLocationId);
    }
  }, [selectedLocationId]);

  // Handle Snapchat building changes
  useEffect(() => {
    const handleBuildingChange = async () => {
      const isSnapchat = navLocationSlug?.startsWith('snapchat');
      if (!isSnapchat || !locations.length) return;

      const newSlug = `snapchat-${snapchatBuilding}`;
      const dbLocationName = locationParamMapping[newSlug];
      const location = locations.find(loc => loc.name === dbLocationName);

      if (location && location.id !== selectedLocationId) {
        setNavLocationSlug(newSlug);
        setSelectedLocationId(location.id);
        // Update URL to reflect the building change
        router.push(`/${newSlug}/soup-salad-bar`);
        await fetchLocationSettings(location.id);
      }
    };

    handleBuildingChange();
  }, [snapchatBuilding]);

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
        title=""
        backPath=""
        locationLogo={currentLocation?.logo || ""}
        locationName={currentLocation?.name || ""}
        locationSubtitle={navLocationSlug?.startsWith('snapchat') ? `Building ${snapchatBuilding}` : currentLocation?.subtitle}
        navItems={navLocationSlug ? [
          { label: 'Menu Overview', href: `/${navLocationSlug}/week-overview`, active: false },
          { label: 'Orders', href: `/${navLocationSlug}/orders`, active: false },
          { label: 'Soup & Salad Bar', href: `/${navLocationSlug}/soup-salad-bar`, active: true },
          { label: navLocationSlug === 'symphony' ? 'Banqueting' : 'Catering', href: navLocationSlug === 'symphony' ? `/admin/banqueting` : `/${navLocationSlug}/catering`, active: false },
          { label: 'Settings', href: `/${navLocationSlug}/settings`, active: false },
          ...(navLocationSlug !== 'symphony' ? [{ label: 'Cost & Billing', href: `/${navLocationSlug}/cost-billing`, active: false }] : []),
        ] : undefined}
        actions={
          <UserProfileComponent userName={profile.full_name || 'User'} redirectPath="/home" />
        }
      />

      {/* Snapchat Building Selector */}
      {navLocationSlug?.startsWith('snapchat') && (
        <div className="max-w-6xl mx-auto px-6 lg:px-8 pt-6">
          <div className="flex items-center gap-2">
            <span className="text-[15px] text-[#6E6E73]">Building:</span>
            <div className="flex bg-[#F5F5F7] rounded-lg p-1">
              <button
                onClick={() => setSnapchatBuilding('119')}
                className={`px-4 py-1.5 text-[15px] font-medium rounded-md transition-colors ${
                  snapchatBuilding === '119'
                    ? 'bg-white text-[#1D1D1F] shadow-sm'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                119
              </button>
              <button
                onClick={() => setSnapchatBuilding('165')}
                className={`px-4 py-1.5 text-[15px] font-medium rounded-md transition-colors ${
                  snapchatBuilding === '165'
                    ? 'bg-white text-[#1D1D1F] shadow-sm'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                165
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-6">
        {selectedLocationId && (
          <div className="mb-4 bg-white border border-teal-200 rounded-lg p-4">
            <h2 className="text-base font-semibold text-gray-800 mb-1">
              {locationName}
            </h2>
            <p className="text-xs text-gray-600">
              Configure soup portions and salad bar composition for this location
            </p>
          </div>
        )}

        {!selectedLocationId && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">No location selected.</p>
          </div>
        )}

        {!settings && (selectedLocationId || profile.role === 'manager') && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">Loading settings...</p>
          </div>
        )}

        {settings && (selectedLocationId || profile.role === 'manager') && (
          <div className="space-y-4">
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

            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
              <h2 className="text-base font-semibold text-gray-800 mb-3 border-b pb-2">
                Salad Bar Configuration
              </h2>

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

              {/* Protein Portion Size - Snowflake Only */}
              {locationParam === 'snowflake' && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Protein Portion Size (g) - Snowflake Only
                  </label>
                  <input
                    type="number"
                    value={settings.protein_salad_bar_portion_g || ''}
                    onChange={(e) => setSettings({ ...settings, protein_salad_bar_portion_g: parseInt(e.target.value) || null })}
                    placeholder="80"
                    className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Protein (chicken, salmon, or tofu) added to each salad bar portion. Default: 80g
                  </p>
                </div>
              )}

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
