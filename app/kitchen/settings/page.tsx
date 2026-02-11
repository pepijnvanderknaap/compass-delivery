'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile, LocationSettings, Location, LocationStaff } from '@/lib/types';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';
import UserProfileComponent from '@/components/UserProfile';

export default function KitchenSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [settings, setSettings] = useState<LocationSettings | null>(null);
  const [staff, setStaff] = useState<LocationStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!profileData) {
          router.push('/home');
          return;
        }

        // Check if user has access to kitchen (admin role)
        if (profileData.role !== 'admin') {
          router.push('/home');
          return;
        }

        setProfile(profileData);

        // Fetch Kitchen location
        const { data: kitchenLocation } = await supabase
          .from('locations')
          .select('*')
          .eq('name', 'Kitchen')
          .single();

        if (kitchenLocation) {
          setLocation(kitchenLocation);
          await fetchLocationData(kitchenLocation.id);
        }
      } catch (err) {
        console.error('Error initializing:', err);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [supabase, router]);

  const fetchLocationData = async (locationId: string) => {
    try {
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
        updated_at: new Date().toISOString(),
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
        <p className="text-[#6E6E73]">Unable to load Kitchen data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <AdminQuickNav />

      <UniversalHeader
        title="Kitchen"
        backPath=""
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
          { label: 'Feedback', href: '/kitchen/feedback-dashboard', active: false },
          { label: 'Settings', href: '/kitchen/settings', active: true },
        ]}
        actions={
          <UserProfileComponent userName={profile.full_name || 'User'} redirectPath="/home" />
        }
      />

      <main className="max-w-5xl mx-auto px-8 py-6">
        <div className="space-y-4">
          {/* Section 1: Kitchen Details */}
          <div className="bg-white border border-[#E8E8ED] rounded-sm p-4">
            <h2 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
              Kitchen Details
            </h2>

            <div className="space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={location.name || ''}
                    onChange={(e) => handleLocationUpdate('name', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                    placeholder="Kitchen name"
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
            </div>
          </div>

          {/* Section 2: Compass Team */}
          <div className="bg-white border border-[#E8E8ED] rounded-sm p-4">
            <h2 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
              Compass Team
            </h2>

            <div className="space-y-2.5">
              {/* Regional Manager */}
              <div>
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

              {/* Kitchen Management */}
              <div className="pt-2 border-t border-[#E8E8ED]">
                <h3 className="text-[13px] font-medium text-[#1D1D1F] mb-2">Kitchen Management</h3>

                {/* Manager 1 */}
                <div className="space-y-3 mb-3 p-3 bg-[#F5F5F7] rounded-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                        Manager 1 - Name
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

                {/* Manager 2 */}
                <div className="space-y-3 p-3 bg-[#F5F5F7] rounded-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[12px] font-medium text-[#86868B] mb-1">
                        Manager 2 - Name
                      </label>
                      <input
                        type="text"
                        value={settings?.kitchen_manager_2_name || ''}
                        onChange={(e) => handleSettingsUpdate('kitchen_manager_2_name', e.target.value)}
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
                        value={settings?.kitchen_manager_2_mobile || ''}
                        onChange={(e) => handleSettingsUpdate('kitchen_manager_2_mobile', e.target.value)}
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
                        value={settings?.kitchen_manager_2_email || ''}
                        onChange={(e) => handleSettingsUpdate('kitchen_manager_2_email', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-[14px] text-[#1D1D1F] bg-white border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff List */}
              <div className="pt-2 border-t border-[#E8E8ED]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-medium text-[#1D1D1F]">Kitchen Staff</h3>
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
                      <div key={index} className="p-3 bg-[#FAFAFA] rounded-sm border border-[#E8E8ED]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
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

                          <div>
                            <button
                              onClick={() => handleRemoveStaff(index)}
                              className="px-2.5 py-1 text-[11px] font-medium text-[#FF3B30] hover:text-white hover:bg-[#FF3B30] border border-[#FF3B30] rounded-sm transition-all mt-4"
                            >
                              Remove
                            </button>
                          </div>
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
