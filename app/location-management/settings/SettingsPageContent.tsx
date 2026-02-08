'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile, LocationSettings, Location, LocationStaff } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';
import UserProfileComponent from '@/components/UserProfile';

interface SettingsPageContentProps {
  forcedLocation?: string;
}

export default function SettingsPageContent({ forcedLocation }: SettingsPageContentProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [settings, setSettings] = useState<LocationSettings | null>(null);
  const [staff, setStaff] = useState<LocationStaff[]>([]);
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

  const locationParam = forcedLocation || searchParams.get('location');
  const currentLocation = locationParam && locationBranding[locationParam] ? locationBranding[locationParam] : null;

  // State for Snapchat building selection
  const [snapchatBuilding, setSnapchatBuilding] = useState<'119' | '165'>(() => {
    if (locationParam === 'snapchat-165') return '165';
    return '119'; // Default to 119 for 'snapchat' or 'snapchat-119'
  });

  // Debug: log if we can't find the location branding
  if (locationParam && !currentLocation) {
    console.error(`Location branding not found for: "${locationParam}"`, Object.keys(locationBranding));
  }

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
          .select('*, locations(id, name, address, contact_person, contact_email, contact_phone)')
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

        // Determine which location to fetch
        let targetLocationId = profileData.location_id;

        if (locationParam) {
          const dbLocationName = locationParamMapping[locationParam];
          const { data: paramLocation } = await supabase
            .from('locations')
            .select('*')
            .eq('name', dbLocationName)
            .single();

          if (paramLocation) {
            targetLocationId = paramLocation.id;
            setLocation(paramLocation);
          }
        } else if (profileData.locations) {
          setLocation(profileData.locations as any);
        }

        if (targetLocationId) {
          await fetchLocationData(targetLocationId);
        }
      } catch (err) {
        console.error('Error initializing:', err);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [supabase, router, locationParam]);

  // Handle Snapchat building changes
  useEffect(() => {
    const handleBuildingChange = () => {
      const isSnapchat = locationParam?.startsWith('snapchat');
      if (!isSnapchat) return;

      const newSlug = `snapchat-${snapchatBuilding}`;
      if (newSlug !== locationParam) {
        router.push(`/${newSlug}/settings`);
      }
    };

    handleBuildingChange();
  }, [snapchatBuilding, locationParam, router]);

  const fetchLocationData = async (locationId: string) => {
    try {
      if (!location) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('*')
          .eq('id', locationId)
          .single();

        if (locationData) {
          setLocation(locationData);
        }
      }

      // Fetch settings
      let { data: settingsData } = await supabase
        .from('location_settings')
        .select('*')
        .eq('location_id', locationId)
        .single();

      // If no settings exist, create default
      if (!settingsData) {
        const defaultSettings = {
          location_id: locationId,
        };
        const { data: newSettings } = await supabase
          .from('location_settings')
          .insert(defaultSettings)
          .select()
          .single();
        settingsData = newSettings;
      }

      setSettings(settingsData);

      // Fetch staff
      const { data: staffData } = await supabase
        .from('location_staff')
        .select('*')
        .eq('location_id', locationId)
        .order('staff_name');

      if (staffData) {
        setStaff(staffData);
      }
    } catch (err) {
      console.error('Error fetching location data:', err);
    }
  };

  const handleLocationUpdate = (field: keyof Location, value: string) => {
    if (location) {
      setLocation({ ...location, [field]: value });
    }
  };

  const handleSettingsUpdate = (field: keyof LocationSettings, value: string) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  const handleStaffUpdate = (index: number, field: keyof LocationStaff, value: string) => {
    const updatedStaff = [...staff];
    updatedStaff[index] = { ...updatedStaff[index], [field]: value };
    setStaff(updatedStaff);
  };

  const handleAddStaff = () => {
    if (location) {
      setStaff([...staff, {
        id: `temp-${Date.now()}`,
        location_id: location.id,
        staff_name: '',
        staff_role: '',
        staff_mobile: '',
        created_at: new Date().toISOString(),
      }]);
    }
  };

  const handleRemoveStaff = (index: number) => {
    const updatedStaff = staff.filter((_, i) => i !== index);
    setStaff(updatedStaff);
  };

  const handleSave = async () => {
    if (!location || !settings) return;

    setSaving(true);
    try {
      // Update location
      const { error: locationError } = await supabase
        .from('locations')
        .update({
          name: location.name,
          address: location.address,
          contact_person: location.contact_person,
          contact_email: location.contact_email,
          contact_phone: location.contact_phone,
        })
        .eq('id', location.id);

      if (locationError) throw locationError;

      // Update settings
      const { error: settingsError } = await supabase
        .from('location_settings')
        .upsert({
          ...settings,
          location_id: location.id,
        });

      if (settingsError) throw settingsError;

      // Delete all existing staff for this location
      await supabase
        .from('location_staff')
        .delete()
        .eq('location_id', location.id);

      // Insert new staff (only non-empty names)
      const validStaff = staff.filter(s => s.staff_name.trim() !== '');
      if (validStaff.length > 0) {
        const staffToInsert = validStaff.map(s => ({
          location_id: location.id,
          staff_name: s.staff_name,
          staff_role: s.staff_role || null,
          staff_mobile: s.staff_mobile || null,
        }));

        const { error: staffError } = await supabase
          .from('location_staff')
          .insert(staffToInsert);

        if (staffError) throw staffError;
      }

      alert('Settings saved successfully!');

      // Refresh data
      await fetchLocationData(location.id);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3]"></div>
      </div>
    );
  }

  if (!profile || !location) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-[#6E6E73]">Unable to load location data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <AdminQuickNav />

      <UniversalHeader
        title=""
        backPath=""
        locationLogo={currentLocation?.logo || undefined}
        locationName={currentLocation?.name || ''}
        locationSubtitle={locationParam?.startsWith('snapchat') ? `Building ${snapchatBuilding}` : currentLocation?.subtitle}
        navItems={locationParam ? [
          { label: 'Menu Overview', href: `/${locationParam}/week-overview`, active: false },
          { label: 'Orders', href: `/${locationParam}/orders`, active: false },
          { label: 'Soup & Salad Bar', href: `/${locationParam}/soup-salad-bar`, active: false },
          { label: locationParam === 'symphony' ? 'Banqueting' : 'Catering', href: locationParam === 'symphony' ? `/admin/banqueting` : `/${locationParam}/catering`, active: false },
          { label: 'Settings', href: `/${locationParam}/settings`, active: true },
          ...(locationParam !== 'symphony' ? [{ label: 'Cost & Billing', href: `/${locationParam}/cost-billing`, active: false }] : []),
        ] : undefined}
        actions={
          <UserProfileComponent userName={profile.full_name || 'User'} redirectPath="/home" />
        }
      />

      {/* Snapchat Building Selector */}
      {locationParam?.startsWith('snapchat') && (
        <div className="max-w-5xl mx-auto px-8 pt-6">
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

      <main className="max-w-5xl mx-auto px-8 py-6">
        <div className="space-y-4">
          {/* Section 1: Location Details */}
          <div className="bg-white border border-[#E8E8ED] rounded-sm p-4">
            <h2 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
              Location Details
            </h2>

            <div className="space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={location.name || ''}
                    onChange={(e) => handleLocationUpdate('name', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                    General Phone
                  </label>
                  <input
                    type="tel"
                    value={settings?.general_phone || ''}
                    onChange={(e) => handleSettingsUpdate('general_phone', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                  Address
                </label>
                <textarea
                  value={location.address || ''}
                  onChange={(e) => handleLocationUpdate('address', e.target.value)}
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20 resize-none"
                  placeholder="Full address"
                />
              </div>

              <div className="pt-2 border-t border-[#E8E8ED]">
                <h3 className="text-[13px] font-medium text-[#1D1D1F] mb-2">Contact Person</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={settings?.contact_person_name || ''}
                      onChange={(e) => handleSettingsUpdate('contact_person_name', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                      placeholder="Contact name"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={settings?.contact_person_mobile || ''}
                      onChange={(e) => handleSettingsUpdate('contact_person_mobile', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={settings?.contact_person_email || ''}
                      onChange={(e) => handleSettingsUpdate('contact_person_email', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                  Delivery Directions
                </label>
                <textarea
                  value={settings?.delivery_directions || ''}
                  onChange={(e) => handleSettingsUpdate('delivery_directions', e.target.value)}
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20 resize-none"
                  placeholder="Delivery instructions, parking details, building access..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Compass Team */}
          <div className="bg-white border border-[#E8E8ED] rounded-sm p-4">
            <h2 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
              Compass Team
            </h2>

            <div className="space-y-2.5">
              {/* Location Manager */}
              <div>
                <h3 className="text-[13px] font-medium text-[#1D1D1F] mb-2">Location Manager</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={settings?.site_manager_name || ''}
                      onChange={(e) => handleSettingsUpdate('site_manager_name', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                      placeholder="Manager name"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={settings?.site_manager_mobile || ''}
                      onChange={(e) => handleSettingsUpdate('site_manager_mobile', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={settings?.site_manager_email || ''}
                      onChange={(e) => handleSettingsUpdate('site_manager_email', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Regional Manager */}
              <div className="pt-2 border-t border-[#E8E8ED]">
                <h3 className="text-[13px] font-medium text-[#1D1D1F] mb-2">Regional Manager</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={settings?.regional_manager_name || ''}
                      onChange={(e) => handleSettingsUpdate('regional_manager_name', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                      placeholder="Manager name"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={settings?.regional_manager_mobile || ''}
                      onChange={(e) => handleSettingsUpdate('regional_manager_mobile', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={settings?.regional_manager_email || ''}
                      onChange={(e) => handleSettingsUpdate('regional_manager_email', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Staff List */}
              <div className="pt-2 border-t border-[#E8E8ED]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-medium text-[#1D1D1F]">Compass Staff</h3>
                  <button
                    onClick={handleAddStaff}
                    className="px-2.5 py-1 text-[12px] font-medium text-[#0071E3] hover:text-[#0077ED] hover:bg-[#F5F5F7] border border-[#D2D2D7] rounded-sm transition-all"
                  >
                    + Add Staff
                  </button>
                </div>

                {staff.length === 0 ? (
                  <div className="text-center py-4 bg-[#FAFAFA] rounded-sm border border-[#E8E8ED]">
                    <p className="text-[12px] text-[#86868B]">No staff members added yet</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {staff.map((member, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 p-2 bg-[#FAFAFA] rounded-sm border border-[#E8E8ED]">
                        <div>
                          <label className="block text-[11px] font-medium text-[#86868B] mb-0.5">
                            Name
                          </label>
                          <input
                            type="text"
                            value={member.staff_name}
                            onChange={(e) => handleStaffUpdate(index, 'staff_name', e.target.value)}
                            className="w-full px-2 py-1 text-[13px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                            placeholder="Staff name"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-[#86868B] mb-0.5">
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={member.staff_mobile || ''}
                            onChange={(e) => handleStaffUpdate(index, 'staff_mobile', e.target.value)}
                            className="w-full px-2 py-1 text-[13px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                            placeholder="+1 (555) 000-0000"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-[#86868B] mb-0.5">
                            Function
                          </label>
                          <input
                            type="text"
                            value={member.staff_role || ''}
                            onChange={(e) => handleStaffUpdate(index, 'staff_role', e.target.value)}
                            className="w-full px-2 py-1 text-[13px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                            placeholder="Role/Function"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            onClick={() => handleRemoveStaff(index)}
                            className="px-2.5 py-1 text-[11px] font-medium text-[#FF3B30] hover:text-white hover:bg-[#FF3B30] border border-[#FF3B30] rounded-sm transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 text-[14px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
