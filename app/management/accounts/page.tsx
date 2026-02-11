'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';
import { getManagementNavItems } from '@/lib/locationConfig';
import type { UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface LocationOrderTotals {
  locationId: string;
  locationName: string;
  soup: number;
  saladBar: number;
  hotDishMeat: number;
  hotDishVeg: number;
}

export default function AccountsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'order_totals' | 'staff_cost' | 'fixed_cost' | 'allocation'>('order_totals');
  const [locationOrderTotals, setLocationOrderTotals] = useState<LocationOrderTotals[]>([]);
  const [costPrices, setCostPrices] = useState({
    soup: 0,
    saladBar: 0,
    hotDishMeat: 0,
    hotDishVeg: 0,
  });
  const [costPriceInputs, setCostPriceInputs] = useState({
    soup: '',
    saladBar: '',
    hotDishMeat: '',
    hotDishVeg: '',
  });
  const [kitchenStaff, setKitchenStaff] = useState<any[]>([]);
  const [kitchenSettings, setKitchenSettings] = useState<any>(null);
  const [billingSettings, setBillingSettings] = useState({
    employer_social_security_percentage: 17.90,
    pension_contribution_percentage: 8.00,
    holiday_allowance_percentage: 8.00,
    other_employer_costs_percentage: 2.00,
  });
  const [staffCosts, setStaffCosts] = useState({
    total_gross_salaries: 0,
    total_employer_costs: 0,
    total_monthly_cost: 0,
    working_days_this_month: 0,
    cost_per_working_day: 0,
    breakdown: [] as any[],
  });
  const [showStaffInputs, setShowStaffInputs] = useState(false);
  const [kitchenLeasePercentage, setKitchenLeasePercentage] = useState(10);
  const [kitchenLeasePercentageInput, setKitchenLeasePercentageInput] = useState('10');
  const [fixedCosts, setFixedCosts] = useState({
    van_1_lease_monthly: 0,
    van_1_fuel_monthly: 0,
    van_2_lease_monthly: 0,
    van_2_fuel_monthly: 0,
    other_fixed_costs_monthly: 0,
    other_fixed_costs_description: '',
  });
  const [fixedCostInputs, setFixedCostInputs] = useState({
    van_1_lease_monthly: '',
    van_1_fuel_monthly: '',
    van_2_lease_monthly: '',
    van_2_fuel_monthly: '',
    other_fixed_costs_monthly: '',
    other_fixed_costs_description: '',
  });
  const [locations, setLocations] = useState<any[]>([]);
  const [locationInvoices, setLocationInvoices] = useState<Record<string, number>>({});
  const [locationStaffCosts, setLocationStaffCosts] = useState<Record<string, number>>({});
  const [allocationPercentages, setAllocationPercentages] = useState<Record<string, { kitchen_staff: number; fixed_cost: number }>>({});
  const [allocationInputs, setAllocationInputs] = useState<Record<string, { kitchen_staff: string; fixed_cost: string }>>({});
  const [shouldSaveDefaults, setShouldSaveDefaults] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const initializePage = async () => {
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

        if (profileData?.role !== 'admin') {
          router.push('/home');
          return;
        }

        setProfile(profileData);
      } catch (err) {
        console.error('Error initializing page:', err);
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [supabase, router]);

  useEffect(() => {
    if (!loading && profile) {
      fetchOrderTotals();
      fetchCostPrices();
      fetchKitchenStaff();
      fetchFixedCosts();
      fetchLocations();
      fetchLocationInvoices();
      fetchAllocationPercentages();
    }
  }, [loading, profile, supabase]);

  // Auto-save default allocation percentages when set for the first time
  useEffect(() => {
    if (shouldSaveDefaults && Object.keys(allocationPercentages).length > 0) {
      saveAllocationPercentages();
      setShouldSaveDefaults(false);
    }
  }, [shouldSaveDefaults, allocationPercentages]);

  const fetchCostPrices = async () => {
    try {
      const monthStart = startOfMonth(new Date());
      const monthYear = format(monthStart, 'yyyy-MM-01');

      const { data } = await supabase
        .from('kitchen_cost_prices')
        .select('*')
        .eq('month_year', monthYear)
        .maybeSingle();

      if (data) {
        const prices = {
          soup: data.soup_cost_price || 0,
          saladBar: data.salad_bar_cost_price || 0,
          hotDishMeat: data.hot_dish_meat_cost_price || 0,
          hotDishVeg: data.hot_dish_veg_cost_price || 0,
        };
        setCostPrices(prices);
        setCostPriceInputs({
          soup: prices.soup > 0 ? prices.soup.toString() : '',
          saladBar: prices.saladBar > 0 ? prices.saladBar.toString() : '',
          hotDishMeat: prices.hotDishMeat > 0 ? prices.hotDishMeat.toString() : '',
          hotDishVeg: prices.hotDishVeg > 0 ? prices.hotDishVeg.toString() : '',
        });
      }
    } catch (err) {
      console.error('Error fetching cost prices:', err);
    }
  };

  const saveCostPrices = async () => {
    try {
      const monthStart = startOfMonth(new Date());
      const monthYear = format(monthStart, 'yyyy-MM-01');

      await supabase
        .from('kitchen_cost_prices')
        .upsert({
          month_year: monthYear,
          soup_cost_price: costPrices.soup || null,
          salad_bar_cost_price: costPrices.saladBar || null,
          hot_dish_meat_cost_price: costPrices.hotDishMeat || null,
          hot_dish_veg_cost_price: costPrices.hotDishVeg || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'month_year'
        });
    } catch (err) {
      console.error('Error saving cost prices:', err);
    }
  };

  const fetchFixedCosts = async () => {
    try {
      const monthStart = startOfMonth(new Date());
      const monthYear = format(monthStart, 'yyyy-MM-01');

      const { data } = await supabase
        .from('kitchen_fixed_costs')
        .select('*')
        .eq('month_year', monthYear)
        .maybeSingle();

      if (data) {
        // Set kitchen lease percentage
        const leasePercentage = data.kitchen_lease_percentage || 10;
        setKitchenLeasePercentage(leasePercentage);
        setKitchenLeasePercentageInput(leasePercentage.toString());

        const costs = {
          van_1_lease_monthly: data.van_1_lease_monthly || 0,
          van_1_fuel_monthly: data.van_1_fuel_monthly || 0,
          van_2_lease_monthly: data.van_2_lease_monthly || 0,
          van_2_fuel_monthly: data.van_2_fuel_monthly || 0,
          other_fixed_costs_monthly: data.other_fixed_costs_monthly || 0,
          other_fixed_costs_description: data.other_fixed_costs_description || '',
        };
        setFixedCosts(costs);
        setFixedCostInputs({
          van_1_lease_monthly: costs.van_1_lease_monthly > 0 ? costs.van_1_lease_monthly.toString() : '',
          van_1_fuel_monthly: costs.van_1_fuel_monthly > 0 ? costs.van_1_fuel_monthly.toString() : '',
          van_2_lease_monthly: costs.van_2_lease_monthly > 0 ? costs.van_2_lease_monthly.toString() : '',
          van_2_fuel_monthly: costs.van_2_fuel_monthly > 0 ? costs.van_2_fuel_monthly.toString() : '',
          other_fixed_costs_monthly: costs.other_fixed_costs_monthly > 0 ? costs.other_fixed_costs_monthly.toString() : '',
          other_fixed_costs_description: costs.other_fixed_costs_description,
        });
      }
    } catch (err) {
      console.error('Error fetching fixed costs:', err);
    }
  };

  const saveFixedCosts = async () => {
    try {
      const monthStart = startOfMonth(new Date());
      const monthYear = format(monthStart, 'yyyy-MM-01');

      await supabase
        .from('kitchen_fixed_costs')
        .upsert({
          month_year: monthYear,
          kitchen_lease_percentage: kitchenLeasePercentage,
          van_1_lease_monthly: fixedCosts.van_1_lease_monthly || null,
          van_1_fuel_monthly: fixedCosts.van_1_fuel_monthly || null,
          van_2_lease_monthly: fixedCosts.van_2_lease_monthly || null,
          van_2_fuel_monthly: fixedCosts.van_2_fuel_monthly || null,
          other_fixed_costs_monthly: fixedCosts.other_fixed_costs_monthly || null,
          other_fixed_costs_description: fixedCosts.other_fixed_costs_description || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'month_year'
        });
    } catch (err) {
      console.error('Error saving fixed costs:', err);
    }
  };

  const fetchKitchenStaff = async () => {
    try {
      // Get Kitchen location
      const { data: kitchenLocation } = await supabase
        .from('locations')
        .select('id')
        .eq('name', 'Kitchen')
        .single();

      if (!kitchenLocation) return;

      // Fetch kitchen settings
      const { data: settings } = await supabase
        .from('location_settings')
        .select('*')
        .eq('location_id', kitchenLocation.id)
        .single();

      setKitchenSettings(settings);

      // Fetch kitchen staff
      const { data: staff } = await supabase
        .from('location_staff')
        .select('*')
        .eq('location_id', kitchenLocation.id);

      setKitchenStaff(staff || []);

      // Calculate working days (Monday-Friday)
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const workingDays = calculateWorkingDays(year, month);

      calculateStaffCosts(settings, staff || [], workingDays);
    } catch (err) {
      console.error('Error fetching kitchen staff:', err);
    }
  };

  const calculateWorkingDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let count = 0;

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
    }

    return count;
  };

  const calculateStaffCosts = (settings: any, staff: any[], workingDays: number) => {
    let totalGross = 0;
    const breakdown = [];

    // Add Manager 1 (site_manager)
    if (settings?.site_manager_gross_monthly_salary) {
      const gross = settings.site_manager_gross_monthly_salary;
      const employerCosts = gross * (
        (billingSettings.employer_social_security_percentage / 100) +
        (billingSettings.pension_contribution_percentage / 100) +
        (billingSettings.holiday_allowance_percentage / 100) +
        (billingSettings.other_employer_costs_percentage / 100)
      );
      const total = gross + employerCosts;
      const costPerDay = workingDays > 0 ? total / workingDays : 0;

      totalGross += gross;
      breakdown.push({
        id: 'manager_1',
        name: settings.site_manager_name || 'Manager 1',
        role: 'Kitchen Manager',
        is_manager: true,
        gross_salary: gross,
        contractual_hours: settings.site_manager_contractual_hours || 38,
        employer_costs: employerCosts,
        total_cost: total,
        cost_per_day: costPerDay,
      });
    }

    // Add Manager 2 (kitchen_manager_2)
    if (settings?.kitchen_manager_2_gross_monthly_salary) {
      const gross = settings.kitchen_manager_2_gross_monthly_salary;
      const employerCosts = gross * (
        (billingSettings.employer_social_security_percentage / 100) +
        (billingSettings.pension_contribution_percentage / 100) +
        (billingSettings.holiday_allowance_percentage / 100) +
        (billingSettings.other_employer_costs_percentage / 100)
      );
      const total = gross + employerCosts;
      const costPerDay = workingDays > 0 ? total / workingDays : 0;

      totalGross += gross;
      breakdown.push({
        id: 'manager_2',
        name: settings.kitchen_manager_2_name || 'Manager 2',
        role: 'Kitchen Manager',
        is_manager: true,
        gross_salary: gross,
        contractual_hours: settings.kitchen_manager_2_contractual_hours || 38,
        employer_costs: employerCosts,
        total_cost: total,
        cost_per_day: costPerDay,
      });
    }

    // Add staff members
    staff.forEach((member: any) => {
      if (member.gross_monthly_salary) {
        const gross = member.gross_monthly_salary;
        const employerCosts = gross * (
          (billingSettings.employer_social_security_percentage / 100) +
          (billingSettings.pension_contribution_percentage / 100) +
          (billingSettings.holiday_allowance_percentage / 100) +
          (billingSettings.other_employer_costs_percentage / 100)
        );
        const total = gross + employerCosts;
        const costPerDay = workingDays > 0 ? total / workingDays : 0;

        totalGross += gross;
        breakdown.push({
          id: member.id,
          name: member.staff_name,
          role: member.staff_role || 'Kitchen Staff',
          is_manager: false,
          gross_salary: gross,
          contractual_hours: member.contractual_hours || 38,
          employer_costs: employerCosts,
          total_cost: total,
          cost_per_day: costPerDay,
        });
      }
    });

    const totalEmployerCosts = breakdown.reduce((sum, item) => sum + item.employer_costs, 0);
    const totalMonthlyCost = breakdown.reduce((sum, item) => sum + item.total_cost, 0);
    const costPerDay = workingDays > 0 ? totalMonthlyCost / workingDays : 0;

    setStaffCosts({
      total_gross_salaries: totalGross,
      total_employer_costs: totalEmployerCosts,
      total_monthly_cost: totalMonthlyCost,
      working_days_this_month: workingDays,
      cost_per_working_day: costPerDay,
      breakdown,
    });
  };

  const handleStaffSalaryUpdate = async (memberId: string, newGrossSalary: number) => {
    try {
      // Get Kitchen location
      const { data: kitchenLocation } = await supabase
        .from('locations')
        .select('id')
        .eq('name', 'Kitchen')
        .single();

      if (!kitchenLocation) return;

      if (memberId === 'manager_1') {
        // Update site_manager salary
        await supabase
          .from('location_settings')
          .update({ site_manager_gross_monthly_salary: newGrossSalary })
          .eq('location_id', kitchenLocation.id);

        setKitchenSettings({ ...kitchenSettings, site_manager_gross_monthly_salary: newGrossSalary });
      } else if (memberId === 'manager_2') {
        // Update kitchen_manager_2 salary
        await supabase
          .from('location_settings')
          .update({ kitchen_manager_2_gross_monthly_salary: newGrossSalary })
          .eq('location_id', kitchenLocation.id);

        setKitchenSettings({ ...kitchenSettings, kitchen_manager_2_gross_monthly_salary: newGrossSalary });
      } else {
        // Update staff member salary
        await supabase
          .from('location_staff')
          .update({ gross_monthly_salary: newGrossSalary })
          .eq('id', memberId);

        const updatedStaff = kitchenStaff.map(s =>
          s.id === memberId ? { ...s, gross_monthly_salary: newGrossSalary } : s
        );
        setKitchenStaff(updatedStaff);
      }

      // Recalculate costs
      const now = new Date();
      const workingDays = calculateWorkingDays(now.getFullYear(), now.getMonth());

      if (memberId === 'manager_1' || memberId === 'manager_2') {
        const updatedSettings = { ...kitchenSettings };
        if (memberId === 'manager_1') {
          updatedSettings.site_manager_gross_monthly_salary = newGrossSalary;
        } else {
          updatedSettings.kitchen_manager_2_gross_monthly_salary = newGrossSalary;
        }
        calculateStaffCosts(updatedSettings, kitchenStaff, workingDays);
      } else {
        const updatedStaff = kitchenStaff.map(s =>
          s.id === memberId ? { ...s, gross_monthly_salary: newGrossSalary } : s
        );
        calculateStaffCosts(kitchenSettings, updatedStaff, workingDays);
      }
    } catch (err) {
      console.error('Error updating staff salary:', err);
    }
  };

  const handleStaffHoursUpdate = async (memberId: string, newHours: number) => {
    try {
      // Get Kitchen location
      const { data: kitchenLocation } = await supabase
        .from('locations')
        .select('id')
        .eq('name', 'Kitchen')
        .single();

      if (!kitchenLocation) return;

      if (memberId === 'manager_1') {
        // Update site_manager hours
        await supabase
          .from('location_settings')
          .update({ site_manager_contractual_hours: newHours })
          .eq('location_id', kitchenLocation.id);

        setKitchenSettings({ ...kitchenSettings, site_manager_contractual_hours: newHours });
      } else if (memberId === 'manager_2') {
        // Update kitchen_manager_2 hours
        await supabase
          .from('location_settings')
          .update({ kitchen_manager_2_contractual_hours: newHours })
          .eq('location_id', kitchenLocation.id);

        setKitchenSettings({ ...kitchenSettings, kitchen_manager_2_contractual_hours: newHours });
      } else {
        // Update staff member hours
        await supabase
          .from('location_staff')
          .update({ contractual_hours: newHours })
          .eq('id', memberId);

        const updatedStaff = kitchenStaff.map(s =>
          s.id === memberId ? { ...s, contractual_hours: newHours } : s
        );
        setKitchenStaff(updatedStaff);
      }

      // Recalculate costs
      const now = new Date();
      const workingDays = calculateWorkingDays(now.getFullYear(), now.getMonth());

      if (memberId === 'manager_1' || memberId === 'manager_2') {
        const updatedSettings = { ...kitchenSettings };
        if (memberId === 'manager_1') {
          updatedSettings.site_manager_contractual_hours = newHours;
        } else {
          updatedSettings.kitchen_manager_2_contractual_hours = newHours;
        }
        calculateStaffCosts(updatedSettings, kitchenStaff, workingDays);
      } else {
        const updatedStaff = kitchenStaff.map(s =>
          s.id === memberId ? { ...s, contractual_hours: newHours } : s
        );
        calculateStaffCosts(kitchenSettings, updatedStaff, workingDays);
      }
    } catch (err) {
      console.error('Error updating staff hours:', err);
    }
  };

  const fetchOrderTotals = async () => {
    try {
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      // Fetch all active locations (excluding Kitchen)
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
        .eq('is_active', true)
        .neq('name', 'Kitchen')
        .order('name');

      if (!locations) return;

      // Fetch all order items for this month with delivery dates
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          portions,
          delivery_date,
          orders!inner (
            location_id
          ),
          dishes (
            category
          )
        `)
        .gte('delivery_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('delivery_date', format(monthEnd, 'yyyy-MM-dd'));

      if (!orderItems) return;

      // Calculate totals per location
      const totals: LocationOrderTotals[] = locations.map(location => {
        const locationItems = orderItems.filter((item: any) =>
          item.orders?.location_id === location.id
        );

        let soup = 0;
        let saladBar = 0;
        let hotDishMeat = 0;
        let hotDishVeg = 0;

        locationItems.forEach((item: any) => {
          const category = item.dishes?.category;
          const portions = item.portions || 0;

          switch (category) {
            case 'soup':
              soup += portions;
              break;
            case 'salad_bar':
              saladBar += portions;
              break;
            case 'hot_dish_meat':
              hotDishMeat += portions;
              break;
            case 'hot_dish_veg':
              hotDishVeg += portions;
              break;
          }
        });

        return {
          locationId: location.id,
          locationName: location.name,
          soup,
          saladBar,
          hotDishMeat,
          hotDishVeg,
        };
      });

      setLocationOrderTotals(totals);
    } catch (err) {
      console.error('Error fetching order totals:', err);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data } = await supabase
        .from('locations')
        .select('id, name')
        .eq('is_active', true)
        .neq('name', 'Kitchen')
        .order('name');

      if (data) {
        setLocations(data);

        // Initialize allocation percentages for locations that don't have them
        // Default to equal distribution (e.g., 16.666% for 6 locations)
        const defaultPercentage = data.length > 0 ? parseFloat((100 / data.length).toFixed(3)) : 0;

        const updatedPercentages: Record<string, { kitchen_staff: number; fixed_cost: number }> = {};
        const updatedInputs: Record<string, { kitchen_staff: string; fixed_cost: string }> = {};
        let hasNewDefaults = false;

        data.forEach(location => {
          // Only set defaults if this location doesn't have allocations yet
          const existing = allocationPercentages[location.id];
          if (!existing || (existing.kitchen_staff === 0 && existing.fixed_cost === 0)) {
            updatedPercentages[location.id] = {
              kitchen_staff: defaultPercentage,
              fixed_cost: defaultPercentage
            };
            updatedInputs[location.id] = {
              kitchen_staff: defaultPercentage.toString(),
              fixed_cost: defaultPercentage.toString()
            };
            hasNewDefaults = true;
          } else {
            updatedPercentages[location.id] = existing;
            updatedInputs[location.id] = allocationInputs[location.id] || {
              kitchen_staff: existing.kitchen_staff.toString(),
              fixed_cost: existing.fixed_cost.toString()
            };
          }
        });

        setAllocationPercentages(updatedPercentages);
        setAllocationInputs(updatedInputs);

        // Trigger auto-save of defaults if we just set them
        if (hasNewDefaults) {
          setShouldSaveDefaults(true);
        }
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  const fetchLocationInvoices = async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
      const currentYear = now.getFullYear();

      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('location_id, total_amount, staff_subtotal')
        .eq('invoice_month', currentMonth)
        .eq('invoice_year', currentYear);

      console.log(`Fetching invoices for month ${currentMonth}, year ${currentYear}:`, invoices, error);

      if (invoices) {
        const totals: Record<string, number> = {};
        const staffCosts: Record<string, number> = {};
        invoices.forEach((invoice: any) => {
          console.log('Invoice:', {
            location_id: invoice.location_id,
            total_amount: invoice.total_amount,
            staff_subtotal: invoice.staff_subtotal
          });
          if (!totals[invoice.location_id]) {
            totals[invoice.location_id] = 0;
          }
          if (!staffCosts[invoice.location_id]) {
            staffCosts[invoice.location_id] = 0;
          }
          totals[invoice.location_id] += invoice.total_amount || 0;
          staffCosts[invoice.location_id] += invoice.staff_subtotal || 0;
        });
        console.log('Location staff costs:', staffCosts);
        setLocationInvoices(totals);
        setLocationStaffCosts(staffCosts);
      }
    } catch (err) {
      console.error('Error fetching location invoices:', err);
    }
  };

  const fetchAllocationPercentages = async () => {
    try {
      const monthStart = startOfMonth(new Date());
      const monthYear = format(monthStart, 'yyyy-MM-01');

      const { data } = await supabase
        .from('cost_revenue_allocation')
        .select('*')
        .eq('month_year', monthYear);

      if (data && data.length > 0) {
        const percentages: Record<string, { kitchen_staff: number; fixed_cost: number }> = {};
        const inputs: Record<string, { kitchen_staff: string; fixed_cost: string }> = {};

        data.forEach((item: any) => {
          percentages[item.location_id] = {
            kitchen_staff: item.kitchen_staff_allocation_percentage || 0,
            fixed_cost: item.fixed_cost_allocation_percentage || 0,
          };
          inputs[item.location_id] = {
            kitchen_staff: item.kitchen_staff_allocation_percentage > 0 ? item.kitchen_staff_allocation_percentage.toString() : '',
            fixed_cost: item.fixed_cost_allocation_percentage > 0 ? item.fixed_cost_allocation_percentage.toString() : '',
          };
        });

        setAllocationPercentages(percentages);
        setAllocationInputs(inputs);
      }
    } catch (err) {
      console.error('Error fetching allocation percentages:', err);
    }
  };

  const saveAllocationPercentages = async () => {
    try {
      const monthStart = startOfMonth(new Date());
      const monthYear = format(monthStart, 'yyyy-MM-01');

      const records = Object.keys(allocationPercentages).map(locationId => ({
        month_year: monthYear,
        location_id: locationId,
        kitchen_staff_allocation_percentage: allocationPercentages[locationId].kitchen_staff || 0,
        fixed_cost_allocation_percentage: allocationPercentages[locationId].fixed_cost || 0,
        updated_at: new Date().toISOString(),
      }));

      await supabase
        .from('cost_revenue_allocation')
        .upsert(records, {
          onConflict: 'month_year,location_id'
        });
    } catch (err) {
      console.error('Error saving allocation percentages:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7E22CE]"></div>
      </div>
    );
  }

  const navItems = getManagementNavItems('Accounts');
  const currentMonth = format(new Date(), 'MMMM yyyy');

  const calculateTotal = (field: keyof Omit<LocationOrderTotals, 'locationId' | 'locationName'>) => {
    return locationOrderTotals.reduce((sum, loc) => sum + loc[field], 0);
  };

  const calculateLocationTotalCost = (location: LocationOrderTotals) => {
    return (
      location.soup * costPrices.soup +
      location.saladBar * costPrices.saladBar +
      location.hotDishMeat * costPrices.hotDishMeat +
      location.hotDishVeg * costPrices.hotDishVeg
    );
  };

  const calculateGrandTotal = () => {
    return locationOrderTotals.reduce((sum, loc) => sum + calculateLocationTotalCost(loc), 0);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <UniversalHeader
        title="Regional Management"
        backPath=""
        navItems={navItems}
      />

      <main className="max-w-7xl mx-auto px-6 py-6">
        <AdminQuickNav />

        <div className="mb-4 mt-4">
          <h1 className="text-[22px] font-semibold text-[#1D1D1F] mb-1">
            Accounts
          </h1>
          <p className="text-[13px] text-[#6E6E73]">
            {currentMonth}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mb-6">
          <button
            onClick={() => setActiveTab('order_totals')}
            className={`text-sm font-semibold transition-all ${
              activeTab === 'order_totals'
                ? 'text-[#0071E3]'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Order Totals
          </button>
          <button
            onClick={() => setActiveTab('staff_cost')}
            className={`text-sm font-semibold transition-all ${
              activeTab === 'staff_cost'
                ? 'text-[#0071E3]'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Staff Cost
          </button>
          <button
            onClick={() => setActiveTab('fixed_cost')}
            className={`text-sm font-semibold transition-all ${
              activeTab === 'fixed_cost'
                ? 'text-[#0071E3]'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Fixed Cost
          </button>
          <button
            onClick={() => setActiveTab('allocation')}
            className={`text-sm font-semibold transition-all ${
              activeTab === 'allocation'
                ? 'text-[#0071E3]'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Cost & Revenue Allocation
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* TAB 1: Order Totals */}
          <div className={activeTab !== 'order_totals' ? 'hidden' : ''}>
            <div className="bg-white rounded-xl border border-[#E8E8ED] p-4 mb-4">
              <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-3">
                Monthly Order Totals by Location
              </h2>

              {/* Cost Price Inputs */}
              <div className="mb-6 p-4 bg-[#F5F5F7] rounded-lg">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
                  Cost Prices (per portion)
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                      Soup
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={costPriceInputs.soup}
                      placeholder="0.00"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const input = e.target.value;
                        setCostPriceInputs({ ...costPriceInputs, soup: input });
                        const numValue = parseFloat(input.replace(',', '.'));
                        if (!isNaN(numValue)) {
                          setCostPrices({ ...costPrices, soup: numValue });
                        }
                      }}
                      onBlur={() => {
                        if (costPrices.soup > 0) {
                          setCostPriceInputs({ ...costPriceInputs, soup: costPrices.soup.toString() });
                        } else {
                          setCostPriceInputs({ ...costPriceInputs, soup: '' });
                        }
                        saveCostPrices();
                      }}
                      className="w-full px-3 py-2 text-[13px] border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                      Salad Bar
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={costPriceInputs.saladBar}
                      placeholder="0.00"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const input = e.target.value;
                        setCostPriceInputs({ ...costPriceInputs, saladBar: input });
                        const numValue = parseFloat(input.replace(',', '.'));
                        if (!isNaN(numValue)) {
                          setCostPrices({ ...costPrices, saladBar: numValue });
                        }
                      }}
                      onBlur={() => {
                        if (costPrices.saladBar > 0) {
                          setCostPriceInputs({ ...costPriceInputs, saladBar: costPrices.saladBar.toString() });
                        } else {
                          setCostPriceInputs({ ...costPriceInputs, saladBar: '' });
                        }
                        saveCostPrices();
                      }}
                      className="w-full px-3 py-2 text-[13px] border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                      Hot Dish Meat/Fish
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={costPriceInputs.hotDishMeat}
                      placeholder="0.00"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const input = e.target.value;
                        setCostPriceInputs({ ...costPriceInputs, hotDishMeat: input });
                        const numValue = parseFloat(input.replace(',', '.'));
                        if (!isNaN(numValue)) {
                          setCostPrices({ ...costPrices, hotDishMeat: numValue });
                        }
                      }}
                      onBlur={() => {
                        if (costPrices.hotDishMeat > 0) {
                          setCostPriceInputs({ ...costPriceInputs, hotDishMeat: costPrices.hotDishMeat.toString() });
                        } else {
                          setCostPriceInputs({ ...costPriceInputs, hotDishMeat: '' });
                        }
                        saveCostPrices();
                      }}
                      className="w-full px-3 py-2 text-[13px] border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                      Hot Dish Veg
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={costPriceInputs.hotDishVeg}
                      placeholder="0.00"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const input = e.target.value;
                        setCostPriceInputs({ ...costPriceInputs, hotDishVeg: input });
                        const numValue = parseFloat(input.replace(',', '.'));
                        if (!isNaN(numValue)) {
                          setCostPrices({ ...costPrices, hotDishVeg: numValue });
                        }
                      }}
                      onBlur={() => {
                        if (costPrices.hotDishVeg > 0) {
                          setCostPriceInputs({ ...costPriceInputs, hotDishVeg: costPrices.hotDishVeg.toString() });
                        } else {
                          setCostPriceInputs({ ...costPriceInputs, hotDishVeg: '' });
                        }
                        saveCostPrices();
                      }}
                      className="w-full px-3 py-2 text-[13px] border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Order Totals Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E8E8ED]">
                      <th className="text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wide pb-2">
                        Location
                      </th>
                      <th className="text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide pb-2">
                        Soup
                      </th>
                      <th className="text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide pb-2">
                        Salad Bar
                      </th>
                      <th className="text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide pb-2">
                        Hot Meat/Fish
                      </th>
                      <th className="text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide pb-2">
                        Hot Veg
                      </th>
                      <th className="text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide pb-2">
                        Total Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationOrderTotals.map((location) => (
                      <tr key={location.locationId} className="border-b border-[#E8E8ED] last:border-b-0">
                        <td className="py-2.5 text-[13px] font-medium text-[#1D1D1F]">
                          {location.locationName}
                        </td>
                        <td className="py-2.5 text-right text-[13px] text-[#6E6E73]">
                          {location.soup}
                        </td>
                        <td className="py-2.5 text-right text-[13px] text-[#6E6E73]">
                          {location.saladBar}
                        </td>
                        <td className="py-2.5 text-right text-[13px] text-[#6E6E73]">
                          {location.hotDishMeat}
                        </td>
                        <td className="py-2.5 text-right text-[13px] text-[#6E6E73]">
                          {location.hotDishVeg}
                        </td>
                        <td className="py-2.5 text-right text-[13px] font-semibold text-[#1D1D1F]">
                          €{calculateLocationTotalCost(location).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#F5F5F7] font-semibold">
                      <td className="py-3 text-[13px] text-[#1D1D1F]">
                        TOTAL
                      </td>
                      <td className="py-3 text-right text-[13px] text-[#1D1D1F]">
                        {calculateTotal('soup')}
                      </td>
                      <td className="py-3 text-right text-[13px] text-[#1D1D1F]">
                        {calculateTotal('saladBar')}
                      </td>
                      <td className="py-3 text-right text-[13px] text-[#1D1D1F]">
                        {calculateTotal('hotDishMeat')}
                      </td>
                      <td className="py-3 text-right text-[13px] text-[#1D1D1F]">
                        {calculateTotal('hotDishVeg')}
                      </td>
                      <td className="py-3 text-right text-[15px] font-bold text-[#1D1D1F]">
                        €{calculateGrandTotal().toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* TAB 2: Staff Cost */}
          <div className={activeTab !== 'staff_cost' ? 'hidden' : ''}>
            <div className="bg-white rounded-xl border border-[#E8E8ED] p-4">
              <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-3">
                Kitchen Staff Cost
              </h2>
              <p className="text-[11px] text-[#86868B] mb-4">
                {staffCosts.working_days_this_month} working days this month (Mon-Fri)
              </p>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#FAFAFA]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#D2D2D7]">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#D2D2D7]">
                        Role
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#D2D2D7]">
                        Contract Hrs
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#D2D2D7]">
                        Gross Monthly
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#D2D2D7]">
                        Empl. Cost.
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#D2D2D7]">
                        Pension
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#D2D2D7]">
                        Hol.Pay
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#D2D2D7]">
                        Other
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#D2D2D7]">
                        Total Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#E8E8ED]">
                    {staffCosts.breakdown.length > 0 ? (
                      staffCosts.breakdown.map((member) => {
                        const werkgeverslasten = member.gross_salary * (billingSettings.employer_social_security_percentage / 100);
                        const pensioen = member.gross_salary * (billingSettings.pension_contribution_percentage / 100);
                        const vakantiegeld = member.gross_salary * (billingSettings.holiday_allowance_percentage / 100);
                        const other = member.gross_salary * (billingSettings.other_employer_costs_percentage / 100);

                        return (
                          <tr key={member.id} className="hover:bg-[#F5F5F7] transition-colors">
                            <td className="px-4 py-3 text-[13px] font-medium text-[#1D1D1F]">
                              {member.name}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-[#6E6E73]">
                              {member.role}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right">
                              {member.contractual_hours || 38}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right">
                              €{member.gross_salary.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-[#FF9500] text-right">
                              €{werkgeverslasten.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-[#FF9500] text-right">
                              €{pensioen.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-[#FF9500] text-right">
                              €{vakantiegeld.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-[#FF9500] text-right">
                              €{other.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-[13px] font-semibold text-[#0071E3] text-right">
                              €{member.total_cost.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-[13px] text-[#86868B]">
                          No staff data available. Add staff members in Kitchen Settings to see costs.
                        </td>
                      </tr>
                    )}
                    {staffCosts.breakdown.length > 0 && (
                      <tr className="bg-[#F5F5F7] font-semibold">
                        <td colSpan={3} className="px-4 py-3 text-[13px] text-[#1D1D1F]">
                          TOTAL
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right">
                          €{staffCosts.total_gross_salaries.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#FF9500] text-right">
                          €{(staffCosts.total_gross_salaries * (billingSettings.employer_social_security_percentage / 100)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#FF9500] text-right">
                          €{(staffCosts.total_gross_salaries * (billingSettings.pension_contribution_percentage / 100)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#FF9500] text-right">
                          €{(staffCosts.total_gross_salaries * (billingSettings.holiday_allowance_percentage / 100)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#FF9500] text-right">
                          €{(staffCosts.total_gross_salaries * (billingSettings.other_employer_costs_percentage / 100)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-[15px] font-bold text-[#0071E3] text-right">
                          €{staffCosts.total_monthly_cost.toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Collapsible Edit Staff Data Section */}
              <div className="mt-6 bg-white border border-[#E8E8ED] rounded-lg">
                <button
                  onClick={() => setShowStaffInputs(!showStaffInputs)}
                  className="w-full px-4 py-3 flex items-center justify-between text-[13px] font-medium text-[#0071E3] hover:bg-[#F5F5F7] transition-colors rounded-t-lg"
                >
                  <span>{showStaffInputs ? 'Hide' : 'Edit Staff Data'}</span>
                  <span className="text-[16px]">{showStaffInputs ? '▼' : '▶'}</span>
                </button>

                {showStaffInputs && (
                  <div className="p-4 border-t border-[#E8E8ED]">
                    <p className="text-[11px] text-[#86868B] mb-4 italic">
                      Sensitive salary information - only visible when editing
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full border border-[#E8E8ED] rounded-sm">
                        <thead className="bg-[#F5F5F7]">
                          <tr>
                            <th className="px-3 py-2 text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Name</th>
                            <th className="px-3 py-2 text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Role</th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Contract Hrs</th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Gross Monthly Salary (€)</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-[#E8E8ED]">
                          {/* Manager 1 */}
                          {kitchenSettings?.site_manager_name && (
                            <tr className="hover:bg-[#F5F5F7] transition-colors">
                              <td className="px-3 py-2 text-[13px] font-medium text-[#1D1D1F]">{kitchenSettings.site_manager_name}</td>
                              <td className="px-3 py-2 text-[13px] text-[#86868B]">Kitchen Manager</td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  value={kitchenSettings.site_manager_contractual_hours || 38}
                                  onChange={(e) => {
                                    const newValue = parseInt(e.target.value) || 38;
                                    handleStaffHoursUpdate('manager_1', newValue);
                                  }}
                                  className="w-16 px-2 py-1 text-[13px] text-right border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3]"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={kitchenSettings.site_manager_gross_monthly_salary || ''}
                                  onChange={(e) => {
                                    const newValue = parseFloat(e.target.value) || 0;
                                    handleStaffSalaryUpdate('manager_1', newValue);
                                  }}
                                  className="w-28 px-2 py-1 text-[13px] text-right border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3]"
                                  placeholder="3500.00"
                                />
                              </td>
                            </tr>
                          )}

                          {/* Manager 2 */}
                          {kitchenSettings?.kitchen_manager_2_name && (
                            <tr className="hover:bg-[#F5F5F7] transition-colors">
                              <td className="px-3 py-2 text-[13px] font-medium text-[#1D1D1F]">{kitchenSettings.kitchen_manager_2_name}</td>
                              <td className="px-3 py-2 text-[13px] text-[#86868B]">Kitchen Manager</td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  value={kitchenSettings.kitchen_manager_2_contractual_hours || 38}
                                  onChange={(e) => {
                                    const newValue = parseInt(e.target.value) || 38;
                                    handleStaffHoursUpdate('manager_2', newValue);
                                  }}
                                  className="w-16 px-2 py-1 text-[13px] text-right border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3]"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={kitchenSettings.kitchen_manager_2_gross_monthly_salary || ''}
                                  onChange={(e) => {
                                    const newValue = parseFloat(e.target.value) || 0;
                                    handleStaffSalaryUpdate('manager_2', newValue);
                                  }}
                                  className="w-28 px-2 py-1 text-[13px] text-right border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3]"
                                  placeholder="3500.00"
                                />
                              </td>
                            </tr>
                          )}

                          {/* Kitchen Staff */}
                          {kitchenStaff.length > 0 ? (
                            kitchenStaff.map((member) => (
                              <tr key={member.id} className="hover:bg-[#F5F5F7] transition-colors">
                                <td className="px-3 py-2 text-[13px] font-medium text-[#1D1D1F]">{member.staff_name}</td>
                                <td className="px-3 py-2 text-[13px] text-[#86868B]">{member.staff_role || 'Kitchen Staff'}</td>
                                <td className="px-3 py-2 text-right">
                                  <input
                                    type="number"
                                    value={member.contractual_hours || 38}
                                    onChange={(e) => {
                                      const newValue = parseInt(e.target.value) || 38;
                                      handleStaffHoursUpdate(member.id, newValue);
                                    }}
                                    className="w-16 px-2 py-1 text-[13px] text-right border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3]"
                                  />
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={member.gross_monthly_salary || ''}
                                    onChange={(e) => {
                                      const newValue = parseFloat(e.target.value) || 0;
                                      handleStaffSalaryUpdate(member.id, newValue);
                                    }}
                                    className="w-28 px-2 py-1 text-[13px] text-right border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3]"
                                    placeholder="2800.00"
                                  />
                                </td>
                              </tr>
                            ))
                          ) : (
                            !kitchenSettings?.site_manager_name && !kitchenSettings?.kitchen_manager_2_name && (
                              <tr>
                                <td colSpan={4} className="px-3 py-6 text-center text-[13px] text-[#86868B]">
                                  No staff members found. Add staff in Kitchen Settings.
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Employer Cost Percentages */}
              <div className="mt-6 p-4 bg-[#F5F5F7] rounded-lg border border-[#E8E8ED]">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
                  Dutch Employer Cost Percentages
                </h3>
                <div className="grid grid-cols-4 gap-3 text-[13px]">
                  <div>
                    <div className="font-medium text-[#86868B]">Empl. Cost.:</div>
                    <div className="font-semibold text-[#1D1D1F]">{billingSettings.employer_social_security_percentage}%</div>
                  </div>
                  <div>
                    <div className="font-medium text-[#86868B]">Pension:</div>
                    <div className="font-semibold text-[#1D1D1F]">{billingSettings.pension_contribution_percentage}%</div>
                  </div>
                  <div>
                    <div className="font-medium text-[#86868B]">Hol.Pay:</div>
                    <div className="font-semibold text-[#1D1D1F]">{billingSettings.holiday_allowance_percentage}%</div>
                  </div>
                  <div>
                    <div className="font-medium text-[#86868B]">Other:</div>
                    <div className="font-semibold text-[#1D1D1F]">{billingSettings.other_employer_costs_percentage}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TAB 3: Fixed Cost */}
          <div className={activeTab !== 'fixed_cost' ? 'hidden' : ''}>
            <div className="bg-white rounded-xl border border-[#E8E8ED] p-4">
              <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-3">
                Monthly Fixed Costs
              </h2>
              <p className="text-[11px] text-[#86868B] mb-6">
                Track recurring kitchen fixed costs for {currentMonth}
              </p>

              <div className="space-y-6">
                {/* Kitchen Lease */}
                <div className="p-4 bg-[#FAFAFA] rounded-lg border border-[#E8E8ED]">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
                    Kitchen Lease (calculated from Order Totals COS)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                        Lease Percentage (%)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={kitchenLeasePercentageInput}
                        placeholder="10.00"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const input = e.target.value;
                          setKitchenLeasePercentageInput(input);
                          const numValue = parseFloat(input.replace(',', '.'));
                          if (!isNaN(numValue)) {
                            setKitchenLeasePercentage(numValue);
                          }
                        }}
                        onBlur={() => {
                          if (kitchenLeasePercentage > 0) {
                            setKitchenLeasePercentageInput(kitchenLeasePercentage.toString());
                          } else {
                            setKitchenLeasePercentageInput('10');
                            setKitchenLeasePercentage(10);
                          }
                          saveFixedCosts();
                        }}
                        className="w-full px-3 py-2 text-[13px] border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                        Monthly Lease Amount (€) - Auto Calculated
                      </label>
                      <div className="w-full px-3 py-2 text-[13px] bg-[#E8E8ED] border border-[#D2D2D7] rounded-lg text-[#6E6E73] font-semibold">
                        €{(calculateGrandTotal() * (kitchenLeasePercentage / 100)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#6E6E73] mt-2 italic">
                    Based on Order Totals COS: €{calculateGrandTotal().toFixed(2)} × {kitchenLeasePercentage}%
                  </p>
                </div>

                {/* Delivery Vans */}
                <div className="p-4 bg-[#FAFAFA] rounded-lg border border-[#E8E8ED]">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
                    Delivery Vans
                  </h3>

                  {/* Van 1 */}
                  <div className="mb-4">
                    <h4 className="text-[13px] font-medium text-[#1D1D1F] mb-2">Van 1</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                          Lease (€)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={fixedCostInputs.van_1_lease_monthly}
                          placeholder="0.00"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const input = e.target.value;
                            setFixedCostInputs({ ...fixedCostInputs, van_1_lease_monthly: input });
                            const numValue = parseFloat(input.replace(',', '.'));
                            if (!isNaN(numValue)) {
                              setFixedCosts({ ...fixedCosts, van_1_lease_monthly: numValue });
                            }
                          }}
                          onBlur={() => {
                            if (fixedCosts.van_1_lease_monthly > 0) {
                              setFixedCostInputs({ ...fixedCostInputs, van_1_lease_monthly: fixedCosts.van_1_lease_monthly.toString() });
                            } else {
                              setFixedCostInputs({ ...fixedCostInputs, van_1_lease_monthly: '' });
                            }
                            saveFixedCosts();
                          }}
                          className="w-full px-3 py-2 text-[13px] border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                          Fuel (€)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={fixedCostInputs.van_1_fuel_monthly}
                          placeholder="0.00"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const input = e.target.value;
                            setFixedCostInputs({ ...fixedCostInputs, van_1_fuel_monthly: input });
                            const numValue = parseFloat(input.replace(',', '.'));
                            if (!isNaN(numValue)) {
                              setFixedCosts({ ...fixedCosts, van_1_fuel_monthly: numValue });
                            }
                          }}
                          onBlur={() => {
                            if (fixedCosts.van_1_fuel_monthly > 0) {
                              setFixedCostInputs({ ...fixedCostInputs, van_1_fuel_monthly: fixedCosts.van_1_fuel_monthly.toString() });
                            } else {
                              setFixedCostInputs({ ...fixedCostInputs, van_1_fuel_monthly: '' });
                            }
                            saveFixedCosts();
                          }}
                          className="w-full px-3 py-2 text-[13px] border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Van 2 */}
                  <div>
                    <h4 className="text-[13px] font-medium text-[#1D1D1F] mb-2">Van 2</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                          Lease (€)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={fixedCostInputs.van_2_lease_monthly}
                          placeholder="0.00"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const input = e.target.value;
                            setFixedCostInputs({ ...fixedCostInputs, van_2_lease_monthly: input });
                            const numValue = parseFloat(input.replace(',', '.'));
                            if (!isNaN(numValue)) {
                              setFixedCosts({ ...fixedCosts, van_2_lease_monthly: numValue });
                            }
                          }}
                          onBlur={() => {
                            if (fixedCosts.van_2_lease_monthly > 0) {
                              setFixedCostInputs({ ...fixedCostInputs, van_2_lease_monthly: fixedCosts.van_2_lease_monthly.toString() });
                            } else {
                              setFixedCostInputs({ ...fixedCostInputs, van_2_lease_monthly: '' });
                            }
                            saveFixedCosts();
                          }}
                          className="w-full px-3 py-2 text-[13px] border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                          Fuel (€)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={fixedCostInputs.van_2_fuel_monthly}
                          placeholder="0.00"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const input = e.target.value;
                            setFixedCostInputs({ ...fixedCostInputs, van_2_fuel_monthly: input });
                            const numValue = parseFloat(input.replace(',', '.'));
                            if (!isNaN(numValue)) {
                              setFixedCosts({ ...fixedCosts, van_2_fuel_monthly: numValue });
                            }
                          }}
                          onBlur={() => {
                            if (fixedCosts.van_2_fuel_monthly > 0) {
                              setFixedCostInputs({ ...fixedCostInputs, van_2_fuel_monthly: fixedCosts.van_2_fuel_monthly.toString() });
                            } else {
                              setFixedCostInputs({ ...fixedCostInputs, van_2_fuel_monthly: '' });
                            }
                            saveFixedCosts();
                          }}
                          className="w-full px-3 py-2 text-[13px] border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#6E6E73] mt-3 italic">
                    Note: Maintenance and insurance are included in the lease
                  </p>
                </div>

                {/* Other Fixed Costs */}
                <div className="p-4 bg-[#FAFAFA] rounded-lg border border-[#E8E8ED]">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">
                    Other Fixed Costs
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                        Amount (€)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={fixedCostInputs.other_fixed_costs_monthly}
                        placeholder="0.00"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const input = e.target.value;
                          setFixedCostInputs({ ...fixedCostInputs, other_fixed_costs_monthly: input });
                          const numValue = parseFloat(input.replace(',', '.'));
                          if (!isNaN(numValue)) {
                            setFixedCosts({ ...fixedCosts, other_fixed_costs_monthly: numValue });
                          }
                        }}
                        onBlur={() => {
                          if (fixedCosts.other_fixed_costs_monthly > 0) {
                            setFixedCostInputs({ ...fixedCostInputs, other_fixed_costs_monthly: fixedCosts.other_fixed_costs_monthly.toString() });
                          } else {
                            setFixedCostInputs({ ...fixedCostInputs, other_fixed_costs_monthly: '' });
                          }
                          saveFixedCosts();
                        }}
                        className="w-full px-3 py-2 text-[13px] border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#86868B] uppercase tracking-wide mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={fixedCostInputs.other_fixed_costs_description}
                        placeholder="e.g., Equipment rental, Insurance"
                        onChange={(e) => {
                          const input = e.target.value;
                          setFixedCostInputs({ ...fixedCostInputs, other_fixed_costs_description: input });
                          setFixedCosts({ ...fixedCosts, other_fixed_costs_description: input });
                        }}
                        onBlur={() => {
                          saveFixedCosts();
                        }}
                        className="w-full px-3 py-2 text-[13px] border border-[#D2D2D7] rounded-lg focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 bg-[#F5F5F7] rounded-lg border-2 border-[#0071E3]">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-[17px] font-bold text-[#1D1D1F]">
                        Total Monthly Fixed Costs
                      </h3>
                      <p className="text-[11px] text-[#6E6E73] mt-1">
                        All recurring kitchen expenses for {currentMonth}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[28px] font-bold text-[#0071E3]">
                        €{(
                          (calculateGrandTotal() * (kitchenLeasePercentage / 100)) +
                          fixedCosts.van_1_lease_monthly +
                          fixedCosts.van_1_fuel_monthly +
                          fixedCosts.van_2_lease_monthly +
                          fixedCosts.van_2_fuel_monthly +
                          fixedCosts.other_fixed_costs_monthly
                        ).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-[#86868B] mt-1">
                        per month
                      </div>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="mt-4 pt-4 border-t border-[#D2D2D7] grid grid-cols-3 gap-4 text-[13px]">
                    <div>
                      <div className="text-[#86868B]">Kitchen Lease</div>
                      <div className="font-semibold text-[#1D1D1F]">
                        €{(calculateGrandTotal() * (kitchenLeasePercentage / 100)).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#86868B]">Van Costs Total</div>
                      <div className="font-semibold text-[#1D1D1F]">
                        €{(
                          fixedCosts.van_1_lease_monthly +
                          fixedCosts.van_1_fuel_monthly +
                          fixedCosts.van_2_lease_monthly +
                          fixedCosts.van_2_fuel_monthly
                        ).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#86868B]">Other Costs</div>
                      <div className="font-semibold text-[#1D1D1F]">
                        €{fixedCosts.other_fixed_costs_monthly.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TAB 4: Cost & Revenue Allocation */}
          <div className={activeTab !== 'allocation' ? 'hidden' : ''}>
            <div className="bg-white rounded-xl border border-[#E8E8ED] p-4">
              <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-3">
                Cost & Revenue Allocation - P&L by Location
              </h2>
              <p className="text-[11px] text-[#86868B] mb-6">
                Profit & Loss overview for {currentMonth} - Allocate Kitchen Staff and Fixed Costs by percentage
              </p>

              {locations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-[#FAFAFA]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#D2D2D7]">
                          Item
                        </th>
                        {locations.map(location => (
                          <th key={location.id} className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#D2D2D7]">
                            {location.name}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#1D1D1F] uppercase tracking-wide border-b border-[#D2D2D7] bg-[#E8E8ED]">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* REVENUE */}
                      <tr className="bg-[#F5F5F7]">
                        <td colSpan={locations.length + 2} className="px-4 py-2 text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">
                          Revenue
                        </td>
                      </tr>
                      <tr className="hover:bg-[#F5F5F7] transition-colors">
                        <td className="px-4 py-3 text-[13px] font-medium text-[#1D1D1F]">
                          Monthly Invoice Total
                        </td>
                        {locations.map(location => {
                          const revenue = locationInvoices[location.id] || 0;
                          return (
                            <td key={location.id} className="px-4 py-3 text-right text-[13px] text-[#34C759] font-semibold">
                              €{revenue.toFixed(2)}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right text-[15px] font-bold text-[#34C759] bg-[#F5F5F7]">
                          €{Object.values(locationInvoices).reduce((sum, val) => sum + val, 0).toFixed(2)}
                        </td>
                      </tr>

                      {/* COSTS */}
                      <tr className="bg-[#F5F5F7]">
                        <td colSpan={locations.length + 2} className="px-4 py-2 text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide border-t-2 border-[#D2D2D7]">
                          Costs
                        </td>
                      </tr>

                      {/* Food Cost (COS) - FIRST */}
                      <tr className="hover:bg-[#F5F5F7] transition-colors">
                        <td className="px-4 py-3 text-[13px] font-medium text-[#1D1D1F]">
                          Food Cost (COS)
                        </td>
                        {locations.map(location => {
                          const locationData = locationOrderTotals.find(loc => loc.locationId === location.id);
                          const foodCost = locationData ? calculateLocationTotalCost(locationData) : 0;
                          return (
                            <td key={location.id} className="px-4 py-3 text-right text-[13px] text-[#FF3B30] font-semibold">
                              €{foodCost.toFixed(2)}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right text-[13px] text-[#FF3B30] font-semibold bg-[#F5F5F7]">
                          €{calculateGrandTotal().toFixed(2)}
                        </td>
                      </tr>

                      {/* Kitchen Staff Cost - SECOND */}
                      <tr className="hover:bg-[#F5F5F7] transition-colors">
                        <td className="px-4 py-3 text-[13px] font-medium text-[#1D1D1F]">
                          Kitchen Staff Cost
                        </td>
                        {locations.map(location => {
                          const percentage = allocationPercentages[location.id]?.kitchen_staff || 0;
                          const allocatedCost = staffCosts.total_monthly_cost * (percentage / 100);
                          return (
                            <td key={location.id} className="px-4 py-3 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <div className="text-[13px] text-[#FF3B30] font-semibold">
                                  €{allocatedCost.toFixed(2)}
                                </div>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={allocationInputs[location.id]?.kitchen_staff || ''}
                                  placeholder="0"
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    const input = e.target.value;
                                    setAllocationInputs({
                                      ...allocationInputs,
                                      [location.id]: {
                                        ...allocationInputs[location.id],
                                        kitchen_staff: input
                                      }
                                    });
                                    const numValue = parseFloat(input.replace(',', '.'));
                                    if (!isNaN(numValue)) {
                                      setAllocationPercentages({
                                        ...allocationPercentages,
                                        [location.id]: {
                                          ...allocationPercentages[location.id],
                                          kitchen_staff: numValue
                                        }
                                      });
                                    }
                                  }}
                                  onBlur={() => {
                                    const currentPercentage = allocationPercentages[location.id]?.kitchen_staff || 0;
                                    if (currentPercentage > 0) {
                                      setAllocationInputs({
                                        ...allocationInputs,
                                        [location.id]: {
                                          ...allocationInputs[location.id],
                                          kitchen_staff: currentPercentage.toString()
                                        }
                                      });
                                    } else {
                                      setAllocationInputs({
                                        ...allocationInputs,
                                        [location.id]: {
                                          ...allocationInputs[location.id],
                                          kitchen_staff: ''
                                        }
                                      });
                                    }
                                    saveAllocationPercentages();
                                  }}
                                  className="w-16 px-2 py-1 text-[11px] text-right border border-[#D2D2D7] rounded focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                                />
                                <span className="text-[10px] text-[#86868B]">%</span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right bg-[#F5F5F7]">
                          <div className="text-[13px] text-[#FF3B30] font-semibold">
                            €{staffCosts.total_monthly_cost.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-[#86868B] mt-1">
                            {locations.reduce((sum, loc) => sum + (allocationPercentages[loc.id]?.kitchen_staff || 0), 0).toFixed(1)}% total
                          </div>
                        </td>
                      </tr>

                      {/* Location Staff Cost - THIRD */}
                      <tr className="hover:bg-[#F5F5F7] transition-colors">
                        <td className="px-4 py-3 text-[13px] font-medium text-[#1D1D1F]">
                          Location Staff Cost
                        </td>
                        {locations.map(location => {
                          const staffCost = locationStaffCosts[location.id] || 0;
                          return (
                            <td key={location.id} className="px-4 py-3 text-right text-[13px] text-[#FF3B30] font-semibold">
                              €{staffCost.toFixed(2)}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right text-[13px] text-[#FF3B30] font-semibold bg-[#F5F5F7]">
                          €{Object.values(locationStaffCosts).reduce((sum, val) => sum + val, 0).toFixed(2)}
                        </td>
                      </tr>

                      {/* Fixed Costs - FOURTH (LAST) */}
                      <tr className="hover:bg-[#F5F5F7] transition-colors">
                        <td className="px-4 py-3 text-[13px] font-medium text-[#1D1D1F]">
                          Fixed Costs
                        </td>
                        {locations.map(location => {
                          const totalFixedCost = (
                            (calculateGrandTotal() * (kitchenLeasePercentage / 100)) +
                            fixedCosts.van_1_lease_monthly +
                            fixedCosts.van_1_fuel_monthly +
                            fixedCosts.van_2_lease_monthly +
                            fixedCosts.van_2_fuel_monthly +
                            fixedCosts.other_fixed_costs_monthly
                          );
                          const percentage = allocationPercentages[location.id]?.fixed_cost || 0;
                          const allocatedCost = totalFixedCost * (percentage / 100);
                          return (
                            <td key={location.id} className="px-4 py-3 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <div className="text-[13px] text-[#FF3B30] font-semibold">
                                  €{allocatedCost.toFixed(2)}
                                </div>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={allocationInputs[location.id]?.fixed_cost || ''}
                                  placeholder="0"
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    const input = e.target.value;
                                    setAllocationInputs({
                                      ...allocationInputs,
                                      [location.id]: {
                                        ...allocationInputs[location.id],
                                        fixed_cost: input
                                      }
                                    });
                                    const numValue = parseFloat(input.replace(',', '.'));
                                    if (!isNaN(numValue)) {
                                      setAllocationPercentages({
                                        ...allocationPercentages,
                                        [location.id]: {
                                          ...allocationPercentages[location.id],
                                          fixed_cost: numValue
                                        }
                                      });
                                    }
                                  }}
                                  onBlur={() => {
                                    const currentPercentage = allocationPercentages[location.id]?.fixed_cost || 0;
                                    if (currentPercentage > 0) {
                                      setAllocationInputs({
                                        ...allocationInputs,
                                        [location.id]: {
                                          ...allocationInputs[location.id],
                                          fixed_cost: currentPercentage.toString()
                                        }
                                      });
                                    } else {
                                      setAllocationInputs({
                                        ...allocationInputs,
                                        [location.id]: {
                                          ...allocationInputs[location.id],
                                          fixed_cost: ''
                                        }
                                      });
                                    }
                                    saveAllocationPercentages();
                                  }}
                                  className="w-16 px-2 py-1 text-[11px] text-right border border-[#D2D2D7] rounded focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20"
                                />
                                <span className="text-[10px] text-[#86868B]">%</span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right bg-[#F5F5F7]">
                          <div className="text-[13px] text-[#FF3B30] font-semibold">
                            €{(
                              (calculateGrandTotal() * (kitchenLeasePercentage / 100)) +
                              fixedCosts.van_1_lease_monthly +
                              fixedCosts.van_1_fuel_monthly +
                              fixedCosts.van_2_lease_monthly +
                              fixedCosts.van_2_fuel_monthly +
                              fixedCosts.other_fixed_costs_monthly
                            ).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-[#86868B] mt-1">
                            {locations.reduce((sum, loc) => sum + (allocationPercentages[loc.id]?.fixed_cost || 0), 0).toFixed(1)}% total
                          </div>
                        </td>
                      </tr>

                      {/* Total Costs */}
                      <tr className="border-t-2 border-[#D2D2D7] bg-[#FFF5F5]">
                        <td className="px-4 py-3 text-[13px] font-bold text-[#1D1D1F]">
                          Total Costs
                        </td>
                        {locations.map(location => {
                          const kitchenStaffCost = staffCosts.total_monthly_cost * ((allocationPercentages[location.id]?.kitchen_staff || 0) / 100);
                          const totalFixedCost = (
                            (calculateGrandTotal() * (kitchenLeasePercentage / 100)) +
                            fixedCosts.van_1_lease_monthly +
                            fixedCosts.van_1_fuel_monthly +
                            fixedCosts.van_2_lease_monthly +
                            fixedCosts.van_2_fuel_monthly +
                            fixedCosts.other_fixed_costs_monthly
                          );
                          const fixedCostAllocation = totalFixedCost * ((allocationPercentages[location.id]?.fixed_cost || 0) / 100);
                          const locationStaffCost = locationStaffCosts[location.id] || 0;
                          const locationData = locationOrderTotals.find(loc => loc.locationId === location.id);
                          const foodCost = locationData ? calculateLocationTotalCost(locationData) : 0;
                          const totalCost = kitchenStaffCost + fixedCostAllocation + locationStaffCost + foodCost;
                          return (
                            <td key={location.id} className="px-4 py-3 text-right text-[15px] font-bold text-[#FF3B30]">
                              €{totalCost.toFixed(2)}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right text-[15px] font-bold text-[#FF3B30] bg-[#F5F5F7]">
                          €{(staffCosts.total_monthly_cost +
                            (calculateGrandTotal() * (kitchenLeasePercentage / 100)) +
                            fixedCosts.van_1_lease_monthly +
                            fixedCosts.van_1_fuel_monthly +
                            fixedCosts.van_2_lease_monthly +
                            fixedCosts.van_2_fuel_monthly +
                            fixedCosts.other_fixed_costs_monthly +
                            Object.values(locationStaffCosts).reduce((sum, val) => sum + val, 0) +
                            calculateGrandTotal()
                          ).toFixed(2)}
                        </td>
                      </tr>

                      {/* NET PROFIT */}
                      <tr className="bg-[#F5F5F7] border-t-2 border-[#D2D2D7]">
                        <td colSpan={locations.length + 2} className="px-4 py-2 text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">
                          Net Profit
                        </td>
                      </tr>
                      <tr className="bg-[#E8F4FF] border-b-2 border-[#0071E3]">
                        <td className="px-4 py-4 text-[15px] font-bold text-[#1D1D1F]">
                          Net Profit
                        </td>
                        {locations.map(location => {
                          const revenue = locationInvoices[location.id] || 0;
                          const kitchenStaffCost = staffCosts.total_monthly_cost * ((allocationPercentages[location.id]?.kitchen_staff || 0) / 100);
                          const totalFixedCost = (
                            (calculateGrandTotal() * (kitchenLeasePercentage / 100)) +
                            fixedCosts.van_1_lease_monthly +
                            fixedCosts.van_1_fuel_monthly +
                            fixedCosts.van_2_lease_monthly +
                            fixedCosts.van_2_fuel_monthly +
                            fixedCosts.other_fixed_costs_monthly
                          );
                          const fixedCostAllocation = totalFixedCost * ((allocationPercentages[location.id]?.fixed_cost || 0) / 100);
                          const locationStaffCost = locationStaffCosts[location.id] || 0;
                          const locationData = locationOrderTotals.find(loc => loc.locationId === location.id);
                          const foodCost = locationData ? calculateLocationTotalCost(locationData) : 0;
                          const totalCost = kitchenStaffCost + fixedCostAllocation + locationStaffCost + foodCost;
                          const netProfit = revenue - totalCost;
                          const netProfitPercentage = revenue > 0 ? (netProfit / revenue) * 100 : 0;
                          const profitColor = netProfit >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]';
                          return (
                            <td key={location.id} className="px-4 py-4 text-right">
                              <div className={`text-[17px] font-bold ${profitColor}`}>
                                €{netProfit.toFixed(2)}
                              </div>
                              <div className={`text-[12px] font-semibold ${profitColor} mt-1`}>
                                {netProfitPercentage.toFixed(1)}%
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-4 py-4 text-right bg-[#F5F5F7]">
                          {(() => {
                            const totalRevenue = Object.values(locationInvoices).reduce((sum, val) => sum + val, 0);
                            const totalCosts = staffCosts.total_monthly_cost +
                              (calculateGrandTotal() * (kitchenLeasePercentage / 100)) +
                              fixedCosts.van_1_lease_monthly +
                              fixedCosts.van_1_fuel_monthly +
                              fixedCosts.van_2_lease_monthly +
                              fixedCosts.van_2_fuel_monthly +
                              fixedCosts.other_fixed_costs_monthly +
                              Object.values(locationStaffCosts).reduce((sum, val) => sum + val, 0) +
                              calculateGrandTotal();
                            const netProfit = totalRevenue - totalCosts;
                            const netProfitPercentage = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
                            const profitColor = netProfit >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]';
                            return (
                              <>
                                <div className={`text-[17px] font-bold ${profitColor}`}>
                                  €{netProfit.toFixed(2)}
                                </div>
                                <div className={`text-[12px] font-semibold ${profitColor} mt-1`}>
                                  {netProfitPercentage.toFixed(1)}%
                                </div>
                              </>
                            );
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-[13px] text-[#86868B]">
                  No active locations found. Add locations to see P&L data.
                </div>
              )}

              {/* Allocation Validation Warning */}
              {locations.length > 0 && (
                <div className="mt-6 p-4 bg-[#FFF5F5] border border-[#FF9500] rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-[#FF9500] text-[18px] mt-0.5">⚠</div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-[#1D1D1F] mb-1">
                        Allocation Percentage Validation
                      </h3>
                      <p className="text-[12px] text-[#6E6E73] mb-2">
                        For accurate cost allocation, percentages should total 100% across all locations for each cost category.
                      </p>
                      <div className="flex gap-6 text-[12px]">
                        <div>
                          <span className="font-medium text-[#86868B]">Kitchen Staff:</span>
                          <span className={`ml-2 font-semibold ${
                            Math.abs(locations.reduce((sum, loc) => sum + (allocationPercentages[loc.id]?.kitchen_staff || 0), 0) - 100) < 0.1
                              ? 'text-[#34C759]'
                              : 'text-[#FF9500]'
                          }`}>
                            {locations.reduce((sum, loc) => sum + (allocationPercentages[loc.id]?.kitchen_staff || 0), 0).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-[#86868B]">Fixed Costs:</span>
                          <span className={`ml-2 font-semibold ${
                            Math.abs(locations.reduce((sum, loc) => sum + (allocationPercentages[loc.id]?.fixed_cost || 0), 0) - 100) < 0.1
                              ? 'text-[#34C759]'
                              : 'text-[#FF9500]'
                          }`}>
                            {locations.reduce((sum, loc) => sum + (allocationPercentages[loc.id]?.fixed_cost || 0), 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
