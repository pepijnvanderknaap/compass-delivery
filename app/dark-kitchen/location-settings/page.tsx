'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile, Location, LocationSettings, LocationStaff } from '@/lib/types';
import AdminQuickNav from '@/components/AdminQuickNav';

export default function LocationSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
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

        if (!profileData || profileData.role !== 'admin') {
          router.push('/dark-kitchen');
          return;
        }

        setProfile(profileData);

        const { data: locationsData } = await supabase
          .from('locations')
          .select('*')
          .eq('is_active', true)
          .order('name');

        setLocations(locationsData || []);
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
      // Fetch settings
      const { data: settingsData } = await supabase
        .from('location_settings')
        .select('*')
        .eq('location_id', locationId)
        .single();

      // If no settings exist, create a default empty settings object
      if (!settingsData) {
        const defaultSettings: Partial<LocationSettings> = {
          location_id: locationId,
          soup_portion_size_ml: 150,
          salad_bar_portion_size_g: 240,
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

      // Fetch staff
      const { data: staffData } = await supabase
        .from('location_staff')
        .select('*')
        .eq('location_id', locationId)
        .order('staff_name');

      setStaff(staffData || []);
    } catch (err) {
      console.error('Error fetching location settings:', err);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedLocationId || !settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('location_settings')
        .upsert({
          ...settings,
          location_id: selectedLocationId,
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

  const handleAddStaff = async () => {
    if (!selectedLocationId) return;

    const newStaff: Partial<LocationStaff> = {
      location_id: selectedLocationId,
      staff_name: '',
      staff_role: '',
      staff_mobile: '',
    };

    const { data, error } = await supabase
      .from('location_staff')
      .insert(newStaff)
      .select()
      .single();

    if (!error && data) {
      setStaff([...staff, data]);
    }
  };

  const handleUpdateStaff = async (staffId: string, field: keyof LocationStaff, value: string) => {
    const updatedStaff = staff.map(s =>
      s.id === staffId ? { ...s, [field]: value } : s
    );
    setStaff(updatedStaff);

    await supabase
      .from('location_staff')
      .update({ [field]: value })
      .eq('id', staffId);
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Remove this staff member?')) return;

    const { error } = await supabase
      .from('location_staff')
      .delete()
      .eq('id', staffId);

    if (!error) {
      setStaff(staff.filter(s => s.id !== staffId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const selectedLocation = locations.find(l => l.id === selectedLocationId);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminQuickNav />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 py-6">
        <div className="max-w-full mx-auto px-6 lg:px-8">
          <h1 className="text-5xl font-extralight text-white tracking-[0.3em] uppercase" style={{ fontFamily: "'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, sans-serif" }}>
            DELIVERY
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-full mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="text-2xl font-light text-gray-700">
              Location Settings
            </div>
            <button
              onClick={() => router.push('/dark-kitchen')}
              className="px-6 py-2 text-sm font-medium bg-blue-800 text-white rounded-sm hover:bg-blue-900 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
        {/* Location Selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Location
          </label>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a location...</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {selectedLocationId && settings && (
          <div className="space-y-8">
            {/* Show simplified form for Dark Kitchen */}
            {selectedLocation?.name === 'Dark Kitchen' ? (
              <>
                {/* Management Section */}
                <div className="bg-white border border-black/10 shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3">
                    Management
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={selectedLocation?.address || ''}
                        onChange={async (e) => {
                          const newAddress = e.target.value;
                          await supabase
                            .from('locations')
                            .update({ address: newAddress })
                            .eq('id', selectedLocationId);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                        Site Manager 1
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={settings.site_manager_name || ''}
                            onChange={(e) => setSettings({ ...settings, site_manager_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={settings.site_manager_email || ''}
                            onChange={(e) => setSettings({ ...settings, site_manager_email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mobile
                          </label>
                          <input
                            type="tel"
                            value={settings.site_manager_mobile || ''}
                            onChange={(e) => setSettings({ ...settings, site_manager_mobile: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                        Site Manager 2
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={settings.regional_manager_name || ''}
                            onChange={(e) => setSettings({ ...settings, regional_manager_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={settings.regional_manager_email || ''}
                            onChange={(e) => setSettings({ ...settings, regional_manager_email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mobile
                          </label>
                          <input
                            type="tel"
                            value={settings.regional_manager_mobile || ''}
                            onChange={(e) => setSettings({ ...settings, regional_manager_mobile: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                        Regional Manager
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={settings.contact_person_name || ''}
                            onChange={(e) => setSettings({ ...settings, contact_person_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={settings.contact_person_email || ''}
                            onChange={(e) => setSettings({ ...settings, contact_person_email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mobile
                          </label>
                          <input
                            type="tel"
                            value={settings.contact_person_mobile || ''}
                            onChange={(e) => setSettings({ ...settings, contact_person_mobile: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          Other Staff
                        </h3>
                        <button
                          onClick={handleAddStaff}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-sm hover:bg-blue-700 transition-colors"
                        >
                          + Add Staff
                        </button>
                      </div>

                      {staff.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No additional staff members added yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {staff.map((member) => (
                            <div key={member.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-sm">
                              <input
                                type="text"
                                value={member.staff_name}
                                onChange={(e) => handleUpdateStaff(member.id, 'staff_name', e.target.value)}
                                placeholder="Name"
                                className="px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="text"
                                value={member.staff_role || ''}
                                onChange={(e) => handleUpdateStaff(member.id, 'staff_role', e.target.value)}
                                placeholder="Role"
                                className="px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="tel"
                                value={member.staff_mobile || ''}
                                onChange={(e) => handleUpdateStaff(member.id, 'staff_mobile', e.target.value)}
                                placeholder="Mobile"
                                className="px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => handleDeleteStaff(member.id)}
                                className="px-3 py-2 text-sm font-medium text-red-600 border border-slate-300 rounded-sm hover:bg-slate-50 transition-colors"
                                
                              >
                                {/* ACSS: Global "delete" button
                                    LOCKED: button-style (border with rounded corners), size (px-3 py-2 text-sm), text-size/weight (scales with button)
                                    EDITABLE via CSS: background-color, border-color, text-color
                                */}
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Satisfaction Score */}
                <div className="bg-white border border-black/10 shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3">
                    Satisfaction Score
                  </h2>

                  <div className="flex-1 max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Overall Score (out of 10)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={settings.satisfaction_score || ''}
                      onChange={(e) => setSettings({ ...settings, satisfaction_score: parseFloat(e.target.value) || null })}
                      placeholder="8.5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Average satisfaction score across all locations</p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-8 py-3 bg-blue-800 text-white font-medium rounded-sm hover:bg-blue-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save All Settings'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Section 1: Client Details */}
                <div className="bg-white border border-black/10 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3">
                1. Client Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Address
                  </label>
                  <input
                    type="text"
                    value={selectedLocation?.address || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm bg-gray-50 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    General Phone Number
                  </label>
                  <input
                    type="tel"
                    value={settings.general_phone || ''}
                    onChange={(e) => setSettings({ ...settings, general_phone: e.target.value })}
                    placeholder="+31 20 123 4567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    value={settings.contact_person_name || ''}
                    onChange={(e) => setSettings({ ...settings, contact_person_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person Email
                  </label>
                  <input
                    type="email"
                    value={settings.contact_person_email || ''}
                    onChange={(e) => setSettings({ ...settings, contact_person_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person Mobile
                  </label>
                  <input
                    type="tel"
                    value={settings.contact_person_mobile || ''}
                    onChange={(e) => setSettings({ ...settings, contact_person_mobile: e.target.value })}
                    placeholder="+31 6 1234 5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                  Billing Information (if different)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Billing Contact Name
                    </label>
                    <input
                      type="text"
                      value={settings.billing_contact_name || ''}
                      onChange={(e) => setSettings({ ...settings, billing_contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Billing Email
                    </label>
                    <input
                      type="email"
                      value={settings.billing_contact_email || ''}
                      onChange={(e) => setSettings({ ...settings, billing_contact_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Billing Phone
                    </label>
                    <input
                      type="tel"
                      value={settings.billing_contact_phone || ''}
                      onChange={(e) => setSettings({ ...settings, billing_contact_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Directions (for drivers)
                </label>
                <textarea
                  value={settings.delivery_directions || ''}
                  onChange={(e) => setSettings({ ...settings, delivery_directions: e.target.value })}
                  rows={4}
                  placeholder="e.g., Enter via main entrance, use service elevator on the left, kitchen is on 2nd floor..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Section 2: Compass Team */}
            <div className="bg-white border border-black/10 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3">
                2. Compass Team
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                    Site Manager
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={settings.site_manager_name || ''}
                        onChange={(e) => setSettings({ ...settings, site_manager_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={settings.site_manager_email || ''}
                        onChange={(e) => setSettings({ ...settings, site_manager_email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile
                      </label>
                      <input
                        type="tel"
                        value={settings.site_manager_mobile || ''}
                        onChange={(e) => setSettings({ ...settings, site_manager_mobile: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                    Regional Manager
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={settings.regional_manager_name || ''}
                        onChange={(e) => setSettings({ ...settings, regional_manager_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={settings.regional_manager_email || ''}
                        onChange={(e) => setSettings({ ...settings, regional_manager_email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile
                      </label>
                      <input
                        type="tel"
                        value={settings.regional_manager_mobile || ''}
                        onChange={(e) => setSettings({ ...settings, regional_manager_mobile: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      Other Staff
                    </h3>
                    <button
                      onClick={handleAddStaff}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-sm hover:bg-blue-700 transition-colors"
                    >
                      + Add Staff
                    </button>
                  </div>

                  {staff.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No additional staff members added yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {staff.map((member) => (
                        <div key={member.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-sm">
                          <input
                            type="text"
                            value={member.staff_name}
                            onChange={(e) => handleUpdateStaff(member.id, 'staff_name', e.target.value)}
                            placeholder="Name"
                            className="px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={member.staff_role || ''}
                            onChange={(e) => handleUpdateStaff(member.id, 'staff_role', e.target.value)}
                            placeholder="Role"
                            className="px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="tel"
                            value={member.staff_mobile || ''}
                            onChange={(e) => handleUpdateStaff(member.id, 'staff_mobile', e.target.value)}
                            placeholder="Mobile"
                            className="px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleDeleteStaff(member.id)}
                            className="px-3 py-2 text-sm font-medium text-red-600 border border-slate-300 rounded-sm hover:bg-slate-50 transition-colors"
                          >
                            {/* ACSS: Global "delete" button
                                LOCKED: button-style (border with rounded corners), size (px-3 py-2 text-sm), text-size/weight (scales with button)
                                EDITABLE via CSS: background-color, border-color, text-color
                            */}
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Key Interest Points */}
            <div className="bg-white border border-black/10 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3">
                3. Key Interest Points
              </h2>

              <p className="text-sm text-gray-600 mb-4">
                What matters most to this client? Note their preferences, priorities, and special requirements.
              </p>

              <textarea
                value={settings.key_interest_points || ''}
                onChange={(e) => setSettings({ ...settings, key_interest_points: e.target.value })}
                rows={6}
                placeholder="e.g., Very focused on sustainability, prefers organic ingredients when possible. Appreciates detailed allergen information. Values consistent delivery times..."
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Section 4: Satisfaction Score */}
            <div className="bg-white border border-black/10 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3">
                4. Satisfaction Score
              </h2>

              <div className="flex items-center space-x-6">
                <div className="flex-1 max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Score (out of 10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={settings.satisfaction_score || ''}
                    onChange={(e) => setSettings({ ...settings, satisfaction_score: parseFloat(e.target.value) || null })}
                    placeholder="8.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex-1 bg-blue-50 border border-blue-200 rounded-sm p-4">
                  <p className="text-sm text-blue-800 font-medium">
                    Review System Coming Soon
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Automated satisfaction tracking and review collection will be available in a future update.
                  </p>
                </div>
              </div>
            </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-8 py-3 bg-blue-800 text-white font-medium rounded-sm hover:bg-blue-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save All Settings'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {!selectedLocationId && (
          <div className="bg-white border border-black/10 shadow-sm p-12 text-center">
            <p className="text-gray-500">Please select a location to view and edit settings.</p>
          </div>
        )}
      </main>
    </div>
  );
}
