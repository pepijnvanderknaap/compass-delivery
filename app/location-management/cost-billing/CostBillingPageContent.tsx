'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserProfile } from '@/lib/types';
import { LOCATION_PARAM_MAPPING } from '@/lib/locationConfig';
import UniversalHeader from '@/components/UniversalHeader';
import AdminQuickNav from '@/components/AdminQuickNav';
import UserProfileComponent from '@/components/UserProfile';
import jsPDF from 'jspdf';

interface CostBillingPageContentProps {
  forcedLocation?: string;
}

// Helper function to calculate working days in a month
const calculateWorkingDays = (year: number, month: number, isSnowflake: boolean = false): number => {
  const date = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    date.setDate(day);
    const dayOfWeek = date.getDay();

    if (isSnowflake) {
      // Snowflake: Mon-Thu only (1-4)
      if (dayOfWeek >= 1 && dayOfWeek <= 4) {
        workingDays++;
      }
    } else {
      // Others: Mon-Fri (1-5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workingDays++;
      }
    }
  }

  return workingDays;
};

export default function CostBillingPageContent({ forcedLocation }: CostBillingPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const locationParam = forcedLocation || searchParams.get('location');

  // User profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // PIN unlock state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // SnapChat building selector
  const [snapchatBuilding, setSnapchatBuilding] = useState<'119' | '165'>(() => {
    if (locationParam === 'snapchat-165') return '165';
    return '119';
  });

  // Toggle for showing/hiding staff input fields
  const [showStaffInputs, setShowStaffInputs] = useState(false);

  // Active tab state
  const [activeTab, setActiveTab] = useState<'live_invoice' | 'food_cost' | 'staff_cost' | 'pantry' | 'invoices'>('live_invoice');

  // Billing settings state
  const [billingSettings, setBillingSettings] = useState({
    employer_social_security_percentage: 17.90,
    pension_contribution_percentage: 8.00,
    holiday_allowance_percentage: 8.00,
    other_employer_costs_percentage: 2.00,
    management_fee_percentage: 0,
    overhead_percentage: 0,
    soup_price_per_portion: 0,
    salad_bar_price_per_portion: 0,
    hot_dish_meat_fish_price_per_portion: 0,
    hot_dish_veg_price_per_portion: 0,
  });

  // Staff state
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [locationSettings, setLocationSettings] = useState<any>(null);

  // Calculated staff costs
  const [staffCosts, setStaffCosts] = useState({
    total_gross_salaries: 0,
    total_employer_costs: 0,
    total_monthly_cost: 0,
    working_days_this_month: 0,
    cost_per_working_day: 0,
    breakdown: [] as any[],
  });

  // Monthly totals state
  const [currentMonthTotals, setCurrentMonthTotals] = useState({
    soup: { portions: 0, revenue: 0 },
    salad_bar: { portions: 0, revenue: 0 },
    hot_dish_meat: { portions: 0, revenue: 0 },
    hot_dish_veg: { portions: 0, revenue: 0 },
    catering: { orders: 0, total_cost: 0 },
    total_revenue: 0,
    total_costs: 0,
  });

  // Invoice state
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [invoiceHistory, setInvoiceHistory] = useState<any[]>([]);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);

  // PDF preview state
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Live invoice manual fields
  const [liveInvoiceData, setLiveInvoiceData] = useState({
    breakfast_count: 0,
    breakfast_price: 4.93,
    sandwich_protein_count: 0,
    sandwich_protein_price: 3.10,
    sandwich_vegan_count: 0,
    sandwich_vegan_price: 3.10,
    pantry_cost: 0,
    fruit_count: 0,
    fruit_price: 0,
    staff_days_worked: {} as Record<string, number>, // { staff_id: days }
    central_kitchen_cost: 0,
    in_unit_overhead: 0,
  });

  // Saving state for invoice
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);

  // Pantry invoices state
  const [pantryInvoices, setPantryInvoices] = useState<any[]>([]);
  const [uploadingPantry, setUploadingPantry] = useState(false);
  const [isDraggingPantry, setIsDraggingPantry] = useState(false);

  // Location branding
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
      name: 'JAA',
    },
  };

  const currentLocation = locationParam ? locationBranding[locationParam] : null;
  const navLocationSlug = locationParam;

  // Handle SnapChat building changes
  useEffect(() => {
    const handleBuildingChange = () => {
      const isSnapchat = locationParam?.startsWith('snapchat');
      if (!isSnapchat) return;

      const newSlug = `snapchat-${snapchatBuilding}`;
      if (newSlug !== locationParam) {
        router.push(`/${newSlug}/cost-billing`);
      }
    };
    handleBuildingChange();
  }, [snapchatBuilding, locationParam, router]);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login/location-management');
          return;
        }

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading profile:', error);
        setLoading(false);
      }
    };

    loadProfile();
  }, [router, supabase]);

  // Load billing settings
  useEffect(() => {
    const loadBillingSettings = async () => {
      if (!locationParam) return;

      try {
        const dbLocationName = LOCATION_PARAM_MAPPING[locationParam];
        if (!dbLocationName) return;

        // Get location ID
        const { data: location } = await supabase
          .from('locations')
          .select('id')
          .eq('name', dbLocationName)
          .single();

        if (!location) return;

        // Load billing settings
        const { data: settings } = await supabase
          .from('location_billing_settings')
          .select('*')
          .eq('location_id', location.id)
          .single();

        if (settings) {
          setBillingSettings({
            employer_social_security_percentage: settings.employer_social_security_percentage,
            pension_contribution_percentage: settings.pension_contribution_percentage,
            holiday_allowance_percentage: settings.holiday_allowance_percentage,
            other_employer_costs_percentage: settings.other_employer_costs_percentage,
            management_fee_percentage: settings.management_fee_percentage,
            overhead_percentage: settings.overhead_percentage,
            soup_price_per_portion: settings.soup_price_per_portion,
            salad_bar_price_per_portion: settings.salad_bar_price_per_portion,
            hot_dish_meat_fish_price_per_portion: settings.hot_dish_meat_fish_price_per_portion,
            hot_dish_veg_price_per_portion: settings.hot_dish_veg_price_per_portion,
          });
        }
      } catch (error) {
        console.error('Error loading billing settings:', error);
      }
    };

    loadBillingSettings();
  }, [locationParam, supabase]);

  // Load staff and calculate costs
  useEffect(() => {
    const loadStaffAndCalculateCosts = async () => {
      if (!locationParam) return;

      try {
        const dbLocationName = LOCATION_PARAM_MAPPING[locationParam];
        if (!dbLocationName) return;

        // Get location ID
        const { data: location } = await supabase
          .from('locations')
          .select('id')
          .eq('name', dbLocationName)
          .single();

        if (!location) return;

        // Fetch location settings (for site manager salary)
        const { data: settings } = await supabase
          .from('location_settings')
          .select('*')
          .eq('location_id', location.id)
          .single();

        setLocationSettings(settings);

        // Fetch staff members
        const { data: staff } = await supabase
          .from('location_staff')
          .select('*')
          .eq('location_id', location.id);

        setStaffMembers(staff || []);

        // Calculate staff costs
        let totalGross = 0;
        const breakdown = [];

        // Add site manager
        if (settings?.site_manager_gross_monthly_salary) {
          const gross = settings.site_manager_gross_monthly_salary;
          const employerCosts = gross * (
            (billingSettings.employer_social_security_percentage / 100) +
            (billingSettings.pension_contribution_percentage / 100) +
            (billingSettings.holiday_allowance_percentage / 100) +
            (billingSettings.other_employer_costs_percentage / 100)
          );
          const total = gross + employerCosts;

          totalGross += gross;
          breakdown.push({
            name: settings.site_manager_name || 'Site Manager',
            role: 'Site Manager',
            gross_salary: gross,
            employer_costs: employerCosts,
            total_cost: total,
          });
        }

        // Add staff members
        (staff || []).forEach((member: any) => {
          if (member.gross_monthly_salary) {
            const gross = member.gross_monthly_salary;
            const employerCosts = gross * (
              (billingSettings.employer_social_security_percentage / 100) +
              (billingSettings.pension_contribution_percentage / 100) +
              (billingSettings.holiday_allowance_percentage / 100) +
              (billingSettings.other_employer_costs_percentage / 100)
            );
            const total = gross + employerCosts;

            totalGross += gross;
            breakdown.push({
              name: member.staff_name,
              role: member.staff_role || 'Staff',
              gross_salary: gross,
              employer_costs: employerCosts,
              total_cost: total,
            });
          }
        });

        const totalEmployerCosts = breakdown.reduce((sum, item) => sum + item.employer_costs, 0);
        const totalMonthlyCost = breakdown.reduce((sum, item) => sum + item.total_cost, 0);

        // Calculate working days for current month
        const now = new Date();
        const isSnowflake = locationParam === 'snowflake';
        const workingDaysThisMonth = calculateWorkingDays(now.getFullYear(), now.getMonth(), isSnowflake);
        const costPerDay = workingDaysThisMonth > 0 ? totalMonthlyCost / workingDaysThisMonth : 0;

        setStaffCosts({
          total_gross_salaries: totalGross,
          total_employer_costs: totalEmployerCosts,
          total_monthly_cost: totalMonthlyCost,
          working_days_this_month: workingDaysThisMonth,
          cost_per_working_day: costPerDay,
          breakdown,
        });

      } catch (error) {
        console.error('Error loading staff and costs:', error);
      }
    };

    loadStaffAndCalculateCosts();
  }, [locationParam, billingSettings, supabase]);

  // Load monthly totals from orders
  useEffect(() => {
    const loadMonthlyTotals = async () => {
      if (!locationParam) return;

      try {
        const dbLocationName = LOCATION_PARAM_MAPPING[locationParam];
        if (!dbLocationName) return;

        // Get location ID
        const { data: location } = await supabase
          .from('locations')
          .select('id')
          .eq('name', dbLocationName)
          .single();

        if (!location) return;

        // Get current month date range (first day to last day)
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed
        const startDate = new Date(year, month, 1).toISOString().split('T')[0]; // "2026-02-01"
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]; // "2026-02-28"

        console.log('Fetching orders for location:', location.id, 'between', startDate, 'and', endDate);

        // Fetch orders with order_items
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            week_start_date,
            order_items (
              id,
              delivery_date,
              portions,
              meal_type
            )
          `)
          .eq('location_id', location.id)
          .gte('week_start_date', startDate)
          .lte('week_start_date', endDate);

        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
          return;
        }

        console.log('Fetched orders:', orders);

        // Calculate totals by meal_type
        let soupPortions = 0;
        let saladBarPortions = 0;
        let hotDishMeatPortions = 0;
        let hotDishVegPortions = 0;

        orders?.forEach((order: any) => {
          order.order_items?.forEach((item: any) => {
            const portions = item.portions || 0;
            const mealType = item.meal_type;

            if (mealType === 'soup') {
              soupPortions += portions;
            } else if (mealType === 'salad_bar') {
              saladBarPortions += portions;
            } else if (mealType === 'hot_meat') {
              hotDishMeatPortions += portions;
            } else if (mealType === 'hot_veg') {
              hotDishVegPortions += portions;
            }
          });
        });

        console.log('Totals:', {
          soup: soupPortions,
          salad_bar: saladBarPortions,
          hot_meat: hotDishMeatPortions,
          hot_veg: hotDishVegPortions,
        });

        // Calculate revenue
        const soupRevenue = soupPortions * billingSettings.soup_price_per_portion;
        const saladBarRevenue = saladBarPortions * billingSettings.salad_bar_price_per_portion;
        const hotDishMeatRevenue = hotDishMeatPortions * billingSettings.hot_dish_meat_fish_price_per_portion;
        const hotDishVegRevenue = hotDishVegPortions * billingSettings.hot_dish_veg_price_per_portion;
        const totalRevenue = soupRevenue + saladBarRevenue + hotDishMeatRevenue + hotDishVegRevenue;

        // Load catering orders for current month
        const { data: cateringOrders, error: cateringError } = await supabase
          .from('catering_orders')
          .select('id, total_cost, status')
          .eq('location_id', location.id)
          .gte('delivery_date', startDate)
          .lte('delivery_date', endDate)
          .eq('status', 'delivered');

        const cateringOrdersCount = cateringOrders?.length || 0;
        const cateringTotalCost = cateringOrders?.reduce((sum, order) => sum + (order.total_cost || 0), 0) || 0;

        console.log('Catering orders:', {
          count: cateringOrdersCount,
          total: cateringTotalCost,
        });

        setCurrentMonthTotals({
          soup: { portions: soupPortions, revenue: soupRevenue },
          salad_bar: { portions: saladBarPortions, revenue: saladBarRevenue },
          hot_dish_meat: { portions: hotDishMeatPortions, revenue: hotDishMeatRevenue },
          hot_dish_veg: { portions: hotDishVegPortions, revenue: hotDishVegRevenue },
          catering: { orders: cateringOrdersCount, total_cost: cateringTotalCost },
          total_revenue: totalRevenue,
          total_costs: staffCosts.total_monthly_cost,
        });
      } catch (error) {
        console.error('Error loading monthly totals:', error);
      }
    };

    loadMonthlyTotals();
  }, [locationParam, billingSettings, staffCosts.total_monthly_cost, supabase]);

  // Recalculate costs when staff data changes locally
  useEffect(() => {
    if (!locationParam) return;

    // Calculate working days for current month first
    const now = new Date();
    const isSnowflake = locationParam === 'snowflake';
    const workingDaysThisMonth = calculateWorkingDays(now.getFullYear(), now.getMonth(), isSnowflake);

    // Calculate staff costs
    let totalGross = 0;
    const breakdown = [];

    // Add site manager
    if (locationSettings?.site_manager_gross_monthly_salary) {
      const gross = locationSettings.site_manager_gross_monthly_salary;
      const employerCosts = gross * (
        (billingSettings.employer_social_security_percentage / 100) +
        (billingSettings.pension_contribution_percentage / 100) +
        (billingSettings.holiday_allowance_percentage / 100) +
        (billingSettings.other_employer_costs_percentage / 100)
      );
      const total = gross + employerCosts;
      const costPerDay = workingDaysThisMonth > 0 ? total / workingDaysThisMonth : 0;

      totalGross += gross;
      breakdown.push({
        id: 'site_manager',
        name: locationSettings.site_manager_name || 'Site Manager',
        role: 'Site Manager',
        is_site_manager: true,
        gross_salary: gross,
        contractual_hours: locationSettings.site_manager_contractual_hours || 40,
        employer_costs: employerCosts,
        total_cost: total,
        cost_per_day: costPerDay,
      });
    }

    // Add staff members
    staffMembers.forEach((member: any) => {
      if (member.gross_monthly_salary) {
        const gross = member.gross_monthly_salary;
        const employerCosts = gross * (
          (billingSettings.employer_social_security_percentage / 100) +
          (billingSettings.pension_contribution_percentage / 100) +
          (billingSettings.holiday_allowance_percentage / 100) +
          (billingSettings.other_employer_costs_percentage / 100)
        );
        const total = gross + employerCosts;
        const costPerDay = workingDaysThisMonth > 0 ? total / workingDaysThisMonth : 0;

        totalGross += gross;
        breakdown.push({
          id: member.id,
          name: member.staff_name,
          role: member.staff_role || 'Staff',
          is_site_manager: false,
          gross_salary: gross,
          contractual_hours: member.contractual_hours || 40,
          employer_costs: employerCosts,
          total_cost: total,
          cost_per_day: costPerDay,
        });
      }
    });

    const totalEmployerCosts = breakdown.reduce((sum, item) => sum + item.employer_costs, 0);
    const totalMonthlyCost = breakdown.reduce((sum, item) => sum + item.total_cost, 0);
    const totalCostPerDay = workingDaysThisMonth > 0 ? totalMonthlyCost / workingDaysThisMonth : 0;

    setStaffCosts({
      total_gross_salaries: totalGross,
      total_employer_costs: totalEmployerCosts,
      total_monthly_cost: totalMonthlyCost,
      working_days_this_month: workingDaysThisMonth,
      cost_per_working_day: totalCostPerDay,
      breakdown,
    });
  }, [staffMembers, locationSettings, billingSettings, locationParam]);

  // Load existing invoice for current month and invoice history
  useEffect(() => {
    if (isUnlocked && locationParam) {
      loadCurrentInvoice();
      loadInvoiceHistory();
    }
  }, [isUnlocked, locationParam, supabase]);

  // PIN unlock handler
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '123') {
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  // Save billing settings
  const handleSaveSettings = async () => {
    if (!locationParam) return;

    try {
      // Map location param to database location name
      const dbLocationName = LOCATION_PARAM_MAPPING[locationParam];
      if (!dbLocationName) return;

      // Get location ID
      const { data: location } = await supabase
        .from('locations')
        .select('id')
        .eq('name', dbLocationName)
        .single();

      if (!location) return;

      // Update billing settings
      const { error } = await supabase
        .from('location_billing_settings')
        .update({
          employer_social_security_percentage: billingSettings.employer_social_security_percentage,
          pension_contribution_percentage: billingSettings.pension_contribution_percentage,
          holiday_allowance_percentage: billingSettings.holiday_allowance_percentage,
          other_employer_costs_percentage: billingSettings.other_employer_costs_percentage,
          management_fee_percentage: billingSettings.management_fee_percentage,
          overhead_percentage: billingSettings.overhead_percentage,
          soup_price_per_portion: billingSettings.soup_price_per_portion,
          salad_bar_price_per_portion: billingSettings.salad_bar_price_per_portion,
          hot_dish_meat_fish_price_per_portion: billingSettings.hot_dish_meat_fish_price_per_portion,
          hot_dish_veg_price_per_portion: billingSettings.hot_dish_veg_price_per_portion,
        })
        .eq('location_id', location.id);

      if (error) {
        console.error('Error saving billing settings:', error);
        alert('Error saving settings');
      } else {
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving billing settings:', error);
      alert('Error saving settings');
    }
  };

  // Generate PDF Invoice
  const generateInvoicePDF = (mode: 'download' | 'preview' = 'download', invoiceData?: any) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Use provided invoice data or current live data
    const data = invoiceData || {
      liveInvoiceData,
      currentMonthTotals,
      staffCosts,
      currentDate: new Date()
    };

    const currentDate = invoiceData ? new Date(invoiceData.invoice_year, invoiceData.invoice_month - 1) : new Date();
    const invoiceMonth = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const invoiceDate = currentDate.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Letterhead
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Snowflake Computing', 20, 30);
    doc.text('Netherlands B.V.', 20, 35);
    doc.setFont('helvetica', 'normal');
    doc.text('T.a.v. crediturenadministratie', 20, 40);
    doc.text('Gustav Mahlerlaan 300-314', 20, 45);
    doc.text('1082 ME Amsterdam', 20, 50);

    // Invoice details
    doc.setFontSize(10);
    doc.text('Offerte:', 20, 70);
    doc.text('296152', 60, 70);
    doc.text('Datum:', 20, 75);
    doc.text(invoiceDate, 60, 75);
    doc.text('Klantnummer:', 20, 80);
    doc.text('0000001752', 60, 80);
    doc.text('PO nummer:', 20, 85);
    doc.text('PO-018848', 60, 85);

    doc.setFont('helvetica', 'bold');
    doc.text('Betreft:', 20, 95);
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceMonth, 60, 95);
    doc.text('Datum activiteit:', 20, 100);
    doc.text(new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }), 60, 100);
    doc.text('Aantal personen:', 20, 105);
    doc.text('Locatie:', 20, 110);

    doc.text('Hierbij bevestigen wij onze gemaakte afspraken.', 20, 120);

    // Table header
    let yPos = 135;
    doc.setFont('helvetica', 'bold');
    doc.text('Aantal', 20, yPos);
    doc.text('Omschrijving', 45, yPos);
    doc.text('Bedrag', 140, yPos, { align: 'right' });
    doc.text('Totaal', 180, yPos, { align: 'right' });
    doc.line(20, yPos + 2, 185, yPos + 2);

    yPos += 8;
    doc.setFont('helvetica', 'normal');

    // Determine data source (saved invoice or live data)
    const isLiveData = !invoiceData;
    const breakfast = isLiveData ? liveInvoiceData.breakfast_count : (invoiceData.breakfast_count || 0);
    const breakfastPrice = isLiveData ? liveInvoiceData.breakfast_price : (invoiceData.breakfast_price || 4.93);
    const soupPortions = isLiveData ? currentMonthTotals.soup.portions : (invoiceData.soup_portions || 0);
    const soupPrice = isLiveData ? billingSettings.soup_price_per_portion : (invoiceData.soup_price || 0);
    const saladBarPortions = isLiveData ? currentMonthTotals.salad_bar.portions : (invoiceData.salad_bar_portions || 0);
    const saladBarPrice = isLiveData ? billingSettings.salad_bar_price_per_portion : (invoiceData.salad_bar_price || 0);
    const hotDishMeatPortions = isLiveData ? currentMonthTotals.hot_dish_meat.portions : (invoiceData.hot_dish_meat_portions || 0);
    const hotDishMeatPrice = isLiveData ? billingSettings.hot_dish_meat_fish_price_per_portion : (invoiceData.hot_dish_meat_price || 0);
    const hotDishVegPortions = isLiveData ? currentMonthTotals.hot_dish_veg.portions : (invoiceData.hot_dish_veg_portions || 0);
    const hotDishVegPrice = isLiveData ? billingSettings.hot_dish_veg_price_per_portion : (invoiceData.hot_dish_veg_price || 0);
    const fruitCount = isLiveData ? liveInvoiceData.fruit_count : (invoiceData.fruit_count || 0);
    const fruitPrice = isLiveData ? liveInvoiceData.fruit_price : (invoiceData.fruit_price || 0);
    const pantry = isLiveData ? liveInvoiceData.pantry_cost : (invoiceData.pantry_cost || 0);
    const centralKitchen = isLiveData ? liveInvoiceData.central_kitchen_cost : (invoiceData.central_kitchen_cost || 0);
    const overhead = isLiveData ? liveInvoiceData.in_unit_overhead : (invoiceData.in_unit_overhead || 0);

    // Calculate totals first for management fee
    let foodCostCalc = 0;
    if (isLiveData) {
      foodCostCalc =
        (breakfast * breakfastPrice) +
        (soupPortions * soupPrice) +
        (saladBarPortions * saladBarPrice) +
        (hotDishMeatPortions * hotDishMeatPrice) +
        (hotDishVegPortions * hotDishVegPrice) +
        pantry +
        (fruitCount * fruitPrice);
    } else {
      foodCostCalc = invoiceData.food_subtotal || 0;
    }
    const managementFeeCalc = isLiveData ? (foodCostCalc * 0.10) : (invoiceData.management_fee || 0);

    // Add invoice items with calculations
    const items = [
      {
        aantal: breakfast.toFixed(2),
        desc: 'Breakfast',
        bedrag: breakfastPrice.toFixed(2),
        totaal: (breakfast * breakfastPrice).toFixed(2)
      },
      {
        aantal: hotDishMeatPortions.toFixed(2),
        desc: 'Hot Dish Protein',
        bedrag: hotDishMeatPrice.toFixed(2),
        totaal: (hotDishMeatPortions * hotDishMeatPrice).toFixed(2)
      },
      {
        aantal: hotDishVegPortions.toFixed(2),
        desc: 'Hot Dish Veg(an)',
        bedrag: hotDishVegPrice.toFixed(2),
        totaal: (hotDishVegPortions * hotDishVegPrice).toFixed(2)
      },
      {
        aantal: soupPortions.toFixed(2),
        desc: 'Sandwich Veg(an)',
        bedrag: soupPrice.toFixed(2),
        totaal: (soupPortions * soupPrice).toFixed(2)
      },
      {
        aantal: saladBarPortions.toFixed(2),
        desc: 'Sandwich Protein',
        bedrag: saladBarPrice.toFixed(2),
        totaal: (saladBarPortions * saladBarPrice).toFixed(2)
      },
      {
        aantal: saladBarPortions.toFixed(2),
        desc: 'Saladbar',
        bedrag: saladBarPrice.toFixed(2),
        totaal: (saladBarPortions * saladBarPrice).toFixed(2)
      },
      {
        aantal: saladBarPortions.toFixed(2),
        desc: 'Protein Saladbar',
        bedrag: saladBarPrice.toFixed(2),
        totaal: (saladBarPortions * saladBarPrice).toFixed(2)
      },
      {
        aantal: soupPortions.toFixed(2),
        desc: 'Soup',
        bedrag: soupPrice.toFixed(2),
        totaal: (soupPortions * soupPrice).toFixed(2)
      },
      {
        aantal: '1.00',
        desc: 'Pantry (inc. emballage)',
        bedrag: pantry.toFixed(2),
        totaal: pantry.toFixed(2)
      },
      {
        aantal: fruitCount.toFixed(2),
        desc: 'Fruit Op Je Werk',
        bedrag: fruitPrice.toFixed(2),
        totaal: (fruitCount * fruitPrice).toFixed(2)
      },
    ];

    // Add staff members
    if (isLiveData) {
      staffCosts.breakdown.forEach((member) => {
        const days = liveInvoiceData.staff_days_worked[member.id] || 0;
        const rate = member.cost_per_day || 0;
        items.push({
          aantal: days.toFixed(2),
          desc: member.is_site_manager ? 'Manager' : `Foodie Compass ${member.name}`,
          bedrag: rate.toFixed(2),
          totaal: (days * rate).toFixed(2)
        });
      });
    } else if (invoiceData.staffItems) {
      invoiceData.staffItems.forEach((staffItem: any) => {
        items.push({
          aantal: staffItem.days_worked.toFixed(2),
          desc: staffItem.is_site_manager ? 'Manager' : `Foodie Compass ${staffItem.staff_name}`,
          bedrag: staffItem.daily_rate.toFixed(2),
          totaal: staffItem.total_cost.toFixed(2)
        });
      });
    }

    // Add other items
    items.push(
      { aantal: '1.00', desc: 'Staff Dark kitchen', bedrag: centralKitchen.toFixed(2), totaal: centralKitchen.toFixed(2) },
      { aantal: '1.00', desc: 'In unit overhead', bedrag: overhead.toFixed(2), totaal: overhead.toFixed(2) },
      { aantal: '1.00', desc: 'Management fee', bedrag: managementFeeCalc.toFixed(2), totaal: managementFeeCalc.toFixed(2) }
    );

    // Render items
    items.forEach((item) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(item.aantal, 20, yPos);
      doc.text(item.desc, 45, yPos);
      doc.text(`€${item.bedrag}`, 140, yPos, { align: 'right' });
      doc.text(`€${item.totaal}`, 180, yPos, { align: 'right' });
      yPos += 5;
    });

    // Totals
    let foodCost, staffCost, managementFee, totalExclBtw, foodTotal, staffTotal, btwLaag, btwHoog, totalInclBtw;

    if (isLiveData) {
      // Calculate from live data
      foodCost =
        (liveInvoiceData.breakfast_count * liveInvoiceData.breakfast_price) +
        currentMonthTotals.soup.revenue +
        currentMonthTotals.salad_bar.revenue +
        currentMonthTotals.hot_dish_meat.revenue +
        currentMonthTotals.hot_dish_veg.revenue +
        liveInvoiceData.pantry_cost +
        (liveInvoiceData.fruit_count * liveInvoiceData.fruit_price);

      staffCost = staffCosts.breakdown.reduce((sum, member) => {
        const days = liveInvoiceData.staff_days_worked[member.id] || 0;
        return sum + (days * (member.cost_per_day || 0));
      }, 0);

      managementFee = foodCost * 0.10;
      totalExclBtw = foodCost + staffCost + liveInvoiceData.central_kitchen_cost + liveInvoiceData.in_unit_overhead + managementFee;

      foodTotal = foodCost + managementFee;
      staffTotal = staffCost + liveInvoiceData.central_kitchen_cost + liveInvoiceData.in_unit_overhead;
      btwLaag = foodTotal * 0.09;
      btwHoog = staffTotal * 0.21;
      totalInclBtw = foodTotal + staffTotal + btwLaag + btwHoog;
    } else {
      // Use saved invoice data
      foodCost = invoiceData.food_subtotal || 0;
      staffCost = invoiceData.staff_subtotal || 0;
      managementFee = invoiceData.management_fee || 0;
      totalExclBtw = foodCost + staffCost + managementFee;

      foodTotal = foodCost + managementFee;
      staffTotal = staffCost;
      btwLaag = foodTotal * 0.09;
      btwHoog = staffTotal * 0.21;
      totalInclBtw = invoiceData.total_amount || 0;
    }

    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Totaal exclusief btw', 20, yPos);
    doc.text(`€${totalExclBtw.toFixed(2)}`, 180, yPos, { align: 'right' });

    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text('Btw laag (9%)', 20, yPos);
    doc.text(`€${btwLaag.toFixed(2)}`, 180, yPos, { align: 'right' });

    yPos += 5;
    doc.text('Btw hoog (21%)', 20, yPos);
    doc.text(`€${btwHoog.toFixed(2)}`, 180, yPos, { align: 'right' });

    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Totaal inclusief btw', 20, yPos);
    doc.text(`€${totalInclBtw.toFixed(2)}`, 180, yPos, { align: 'right' });

    // Save PDF or return blob URL
    if (mode === 'download') {
      doc.save(`Invoice_${invoiceMonth.replace(' ', '_')}.pdf`);
    } else {
      // Return blob URL for preview
      const blob = doc.output('blob');
      return URL.createObjectURL(blob);
    }
  };

  // Handle viewing invoice PDF
  const handleViewInvoice = async (invoice: any) => {
    try {
      // Load staff items for this invoice
      const { data: staffItems } = await supabase
        .from('invoice_staff_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      const invoiceWithStaff = { ...invoice, staffItems: staffItems || [] };
      const pdfUrl = generateInvoicePDF('preview', invoiceWithStaff);
      if (pdfUrl) {
        setPdfPreviewUrl(pdfUrl);
        setShowPdfPreview(true);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      alert('Error loading invoice preview');
    }
  };

  // Handle downloading invoice PDF
  const handleDownloadInvoice = async (invoice: any) => {
    try {
      // Load staff items for this invoice
      const { data: staffItems } = await supabase
        .from('invoice_staff_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      const invoiceWithStaff = { ...invoice, staffItems: staffItems || [] };
      generateInvoicePDF('download', invoiceWithStaff);
    } catch (error) {
      console.error('Error loading invoice:', error);
      alert('Error downloading invoice');
    }
  };

  // Close PDF preview modal
  const closePdfPreview = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfPreviewUrl(null);
    setShowPdfPreview(false);
  };

  // Save live invoice
  const handleSaveInvoice = async () => {
    if (!locationParam || !profile) return;

    setIsSavingInvoice(true);

    try {
      // Map location param to database location name
      const dbLocationName = LOCATION_PARAM_MAPPING[locationParam];
      if (!dbLocationName) {
        setIsSavingInvoice(false);
        return;
      }

      // Get location ID
      const { data: location } = await supabase
        .from('locations')
        .select('id')
        .eq('name', dbLocationName)
        .single();

      if (!location) {
        alert('Location not found');
        setIsSavingInvoice(false);
        return;
      }

      // Calculate totals
      const foodSubtotal =
        (liveInvoiceData.breakfast_count * liveInvoiceData.breakfast_price) +
        (liveInvoiceData.sandwich_protein_count * liveInvoiceData.sandwich_protein_price) +
        (liveInvoiceData.sandwich_vegan_count * liveInvoiceData.sandwich_vegan_price) +
        currentMonthTotals.soup.revenue +
        currentMonthTotals.salad_bar.revenue +
        currentMonthTotals.hot_dish_meat.revenue +
        currentMonthTotals.hot_dish_veg.revenue +
        liveInvoiceData.pantry_cost +
        (liveInvoiceData.fruit_count * liveInvoiceData.fruit_price) +
        currentMonthTotals.catering.total_cost;

      const managementFee = foodSubtotal * 0.10;

      // Calculate staff costs
      let staffSubtotal = 0;
      const staffItems = [];

      // Add regular staff members
      for (const member of staffCosts.breakdown) {
        const daysWorked = liveInvoiceData.staff_days_worked[member.id] || 0;
        const dailyRate = member.cost_per_day || 0;
        const totalCost = daysWorked * dailyRate;
        staffSubtotal += totalCost;

        staffItems.push({
          staff_member_id: member.is_site_manager ? null : member.id,
          staff_name: member.name,
          is_site_manager: member.is_site_manager,
          days_worked: daysWorked,
          daily_rate: dailyRate,
          total_cost: totalCost,
        });
      }

      // Calculate BTW
      const foodTotal = foodSubtotal + managementFee;
      const staffTotal = staffSubtotal + liveInvoiceData.central_kitchen_cost + liveInvoiceData.in_unit_overhead;

      const btwLaag = foodTotal * 0.09; // 9% on food
      const btwHoog = staffTotal * 0.21; // 21% on staff

      const totalAmount = foodTotal + staffTotal + btwLaag + btwHoog;

      const currentDate = new Date();
      const invoiceMonth = currentDate.getMonth() + 1;
      const invoiceYear = currentDate.getFullYear();
      const invoiceNumber = `INV-${invoiceYear}-${String(invoiceMonth).padStart(2, '0')}-${dbLocationName.toUpperCase().replace(/\s+/g, '-')}`;

      // Upsert invoice (insert or update if exists)
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .upsert({
          location_id: location.id,
          invoice_month: invoiceMonth,
          invoice_year: invoiceYear,
          invoice_number: invoiceNumber,
          breakfast_count: liveInvoiceData.breakfast_count,
          breakfast_price: liveInvoiceData.breakfast_price,
          sandwich_protein_count: liveInvoiceData.sandwich_protein_count,
          sandwich_protein_price: liveInvoiceData.sandwich_protein_price,
          sandwich_vegan_count: liveInvoiceData.sandwich_vegan_count,
          sandwich_vegan_price: liveInvoiceData.sandwich_vegan_price,
          pantry_cost: liveInvoiceData.pantry_cost,
          fruit_count: liveInvoiceData.fruit_count,
          fruit_price: liveInvoiceData.fruit_price,
          central_kitchen_cost: liveInvoiceData.central_kitchen_cost,
          in_unit_overhead: liveInvoiceData.in_unit_overhead,
          soup_portions: currentMonthTotals.soup.portions,
          soup_price: billingSettings.soup_price_per_portion,
          salad_bar_portions: currentMonthTotals.salad_bar.portions,
          salad_bar_price: billingSettings.salad_bar_price_per_portion,
          hot_dish_meat_portions: currentMonthTotals.hot_dish_meat.portions,
          hot_dish_meat_price: billingSettings.hot_dish_meat_fish_price_per_portion,
          hot_dish_veg_portions: currentMonthTotals.hot_dish_veg.portions,
          hot_dish_veg_price: billingSettings.hot_dish_veg_price_per_portion,
          food_subtotal: foodSubtotal,
          management_fee: managementFee,
          staff_subtotal: staffSubtotal,
          total_amount: totalAmount,
          status: 'draft',
          created_by: profile.id,
        }, {
          onConflict: 'location_id,invoice_month,invoice_year'
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Error saving invoice:', invoiceError);
        alert('Error saving invoice: ' + invoiceError.message);
        setIsSavingInvoice(false);
        return;
      }

      // Delete existing staff items for this invoice
      await supabase
        .from('invoice_staff_items')
        .delete()
        .eq('invoice_id', invoice.id);

      // Insert new staff items
      if (staffItems.length > 0) {
        const { error: staffError } = await supabase
          .from('invoice_staff_items')
          .insert(staffItems.map(item => ({
            ...item,
            invoice_id: invoice.id,
          })));

        if (staffError) {
          console.error('Error saving staff items:', staffError);
          alert('Error saving staff items: ' + staffError.message);
          setIsSavingInvoice(false);
          return;
        }
      }

      // Generate PDF invoice
      generateInvoicePDF();

      // Reload invoice history
      await loadInvoiceHistory();

      alert('Invoice saved successfully! PDF downloaded.');
      setIsSavingInvoice(false);
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Error saving invoice');
      setIsSavingInvoice(false);
    }
  };

  // Load existing invoice for current month
  const loadCurrentInvoice = async () => {
    if (!locationParam) return;

    try {
      // Map location param to database location name
      const dbLocationName = LOCATION_PARAM_MAPPING[locationParam];
      if (!dbLocationName) return;

      // Get location ID
      const { data: location } = await supabase
        .from('locations')
        .select('id')
        .eq('name', dbLocationName)
        .single();

      if (!location) return;

      const currentDate = new Date();
      const invoiceMonth = currentDate.getMonth() + 1;
      const invoiceYear = currentDate.getFullYear();

      // Load invoice for current month
      const { data: invoice } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_staff_items (*)
        `)
        .eq('location_id', location.id)
        .eq('invoice_month', invoiceMonth)
        .eq('invoice_year', invoiceYear)
        .single();

      if (invoice) {
        // Populate liveInvoiceData with saved values
        const staffDaysWorked: Record<string, number> = {};

        if (invoice.invoice_staff_items) {
          invoice.invoice_staff_items.forEach((item: any) => {
            if (item.staff_member_id) {
              staffDaysWorked[item.staff_member_id] = item.days_worked;
            }
          });
        }

        setLiveInvoiceData({
          breakfast_count: invoice.breakfast_count || 0,
          breakfast_price: invoice.breakfast_price || 4.93,
          sandwich_protein_count: invoice.sandwich_protein_count || 0,
          sandwich_protein_price: invoice.sandwich_protein_price || 3.10,
          sandwich_vegan_count: invoice.sandwich_vegan_count || 0,
          sandwich_vegan_price: invoice.sandwich_vegan_price || 3.10,
          pantry_cost: invoice.pantry_cost || 0,
          fruit_count: invoice.fruit_count || 0,
          fruit_price: invoice.fruit_price || 0,
          staff_days_worked: staffDaysWorked,
          central_kitchen_cost: invoice.central_kitchen_cost || 0,
          in_unit_overhead: invoice.in_unit_overhead || 0,
        });
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
    }
  };

  // Load all invoices for this location
  const loadInvoiceHistory = async () => {
    if (!locationParam) return;

    try {
      const dbLocationName = LOCATION_PARAM_MAPPING[locationParam];
      if (!dbLocationName) return;

      const { data: location } = await supabase
        .from('locations')
        .select('id')
        .eq('name', dbLocationName)
        .single();

      if (!location) return;

      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('location_id', location.id)
        .order('invoice_year', { ascending: false })
        .order('invoice_month', { ascending: false });

      if (invoices) {
        setInvoiceHistory(invoices);
      }
    } catch (error) {
      console.error('Error loading invoice history:', error);
    }
  };

  // Generate current month invoice
  const handleGenerateInvoice = async () => {
    // TODO: API call to generate invoice
    console.log('Generating invoice for current month');
  };

  // Send invoice
  const handleSendInvoice = async (invoice: any) => {
    // TODO: Implement email sending functionality
    alert('Email sending functionality will be implemented. Invoice: ' + invoice.invoice_number);
  };

  // Handle pantry invoice upload
  const handlePantryInvoiceUpload = async (files: FileList | File[]) => {
    if (!locationParam) return;

    setUploadingPantry(true);

    try {
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        // Validate file type
        if (file.type !== 'application/pdf') {
          alert(`${file.name} is not a PDF file. Only PDF files are accepted.`);
          continue;
        }

        // Create a file record
        const newInvoice = {
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          status: 'pending', // pending, processed, error
          file: file
        };

        setPantryInvoices(prev => [...prev, newInvoice]);

        // TODO: Upload to Supabase storage and process with OCR
        // For now, just store locally
      }

      alert(`${fileArray.length} invoice(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading pantry invoices:', error);
      alert('Error uploading invoices');
    } finally {
      setUploadingPantry(false);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handlePantryInvoiceUpload(e.target.files);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPantry(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPantry(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPantry(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handlePantryInvoiceUpload(e.dataTransfer.files);
    }
  };

  // Delete pantry invoice
  const handleDeletePantryInvoice = (invoiceId: number) => {
    setPantryInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
  };

  // Update staff member salary and hours
  const handleStaffSalaryUpdate = (staffId: string, field: string, value: number) => {
    setStaffMembers(prev =>
      prev.map(member =>
        member.id === staffId ? { ...member, [field]: value } : member
      )
    );
  };

  // Update manager salary and hours
  const handleManagerSalaryUpdate = (field: string, value: number) => {
    setLocationSettings((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Save staff salaries to database
  const handleSaveStaffSalaries = async () => {
    try {
      // Update site manager
      if (locationSettings?.id) {
        await supabase
          .from('location_settings')
          .update({
            site_manager_gross_monthly_salary: locationSettings.site_manager_gross_monthly_salary || 0,
            site_manager_contractual_hours: locationSettings.site_manager_contractual_hours || 40,
          })
          .eq('id', locationSettings.id);
      }

      // Update staff members
      for (const member of staffMembers) {
        if (member.id) {
          await supabase
            .from('location_staff')
            .update({
              gross_monthly_salary: member.gross_monthly_salary || 0,
              contractual_hours: member.contractual_hours || 40,
            })
            .eq('id', member.id);
        }
      }

      alert('Staff salaries saved successfully!');
    } catch (error) {
      console.error('Error saving staff salaries:', error);
      alert('Error saving staff salaries');
    }
  };

  // Show loading state
  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // PIN Unlock Modal
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <AdminQuickNav />
        {currentLocation && (
          <UniversalHeader
            title=""
            backPath=""
            locationLogo={currentLocation.logo}
            locationName={currentLocation.name}
            locationSubtitle={navLocationSlug?.startsWith('snapchat') ? `Building ${snapchatBuilding}` : currentLocation.subtitle}
            navItems={navLocationSlug ? [
              { label: 'Menu Overview', href: `/${navLocationSlug}/week-overview`, active: false },
              { label: 'Orders', href: `/${navLocationSlug}/orders`, active: false },
              { label: 'Soup & Salad Bar', href: `/${navLocationSlug}/soup-salad-bar`, active: false },
              { label: navLocationSlug === 'symphony' ? 'Banqueting' : 'Catering', href: navLocationSlug === 'symphony' ? `/symphony/banqueting` : `/${navLocationSlug}/catering`, active: false },
              { label: 'Settings', href: `/${navLocationSlug}/settings`, active: false },
              { label: 'Cost & Billing', href: `/${navLocationSlug}/cost-billing`, active: true },
            ] : undefined}
            actions={
              <UserProfileComponent userName={profile.full_name || 'User'} redirectPath="/home" />
            }
          />
        )}

        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4">
          <div className="bg-white border border-[#E8E8ED] rounded-xl p-8 w-full max-w-md shadow-sm">
            <div className="flex items-center justify-center w-16 h-16 bg-[#F5F5F7] rounded-full mx-auto mb-6">
              <span className="text-[32px]">🔒</span>
            </div>
            <h2 className="text-[22px] font-semibold text-[#1D1D1F] text-center mb-2">
              Protected Page
            </h2>
            <p className="text-[15px] text-[#6E6E73] text-center mb-6">
              Enter PIN to access Cost & Billing
            </p>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="Enter PIN"
                  className={`w-full px-4 py-3 border ${
                    pinError ? 'border-[#FF3B30]' : 'border-[#D2D2D7]'
                  } rounded-lg text-[15px] text-center tracking-widest focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20`}
                  maxLength={6}
                  autoFocus
                />
                {pinError && (
                  <p className="text-[13px] text-[#FF3B30] text-center mt-2">
                    Incorrect PIN. Please try again.
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="w-full px-4 py-3 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-colors"
              >
                Unlock
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main content (unlocked)
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AdminQuickNav />
      {currentLocation && (
        <UniversalHeader
          title=""
          backPath=""
          locationLogo={currentLocation.logo}
          locationName={currentLocation.name}
          locationSubtitle={navLocationSlug?.startsWith('snapchat') ? `Building ${snapchatBuilding}` : currentLocation.subtitle}
          navItems={navLocationSlug ? [
            { label: 'Menu Overview', href: `/${navLocationSlug}/week-overview`, active: false },
            { label: 'Orders', href: `/${navLocationSlug}/orders`, active: false },
            { label: 'Soup & Salad Bar', href: `/${navLocationSlug}/soup-salad-bar`, active: false },
            { label: 'Banqueting', href: `/symphony/banqueting`, active: false },
            { label: 'Settings', href: `/${navLocationSlug}/settings`, active: false },
            { label: 'Cost & Billing', href: `/${navLocationSlug}/cost-billing`, active: true },
          ] : undefined}
          actions={
            <UserProfileComponent userName={profile.full_name || 'User'} redirectPath="/home" />
          }
        />
      )}

      {/* SnapChat building selector */}
      {navLocationSlug?.startsWith('snapchat') && (
        <div className="max-w-6xl mx-auto px-8 pt-16 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[15px] text-[#6E6E73]">Building:</span>
            <div className="flex bg-[#F5F5F7] rounded-lg p-1">
              <button
                onClick={() => setSnapchatBuilding('119')}
                className={`px-4 py-2 text-[15px] font-medium rounded-md transition-all ${
                  snapchatBuilding === '119'
                    ? 'bg-white text-[#0071E3] shadow-sm'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                119
              </button>
              <button
                onClick={() => setSnapchatBuilding('165')}
                className={`px-4 py-2 text-[15px] font-medium rounded-md transition-all ${
                  snapchatBuilding === '165'
                    ? 'bg-white text-[#0071E3] shadow-sm'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                165
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-8 lg:px-12 py-8">
        {/* Date Heading */}
        <div className="mt-24 mb-6">
          <h2 className="text-[22px] font-semibold text-[#1D1D1F]">
            Invoice for {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('live_invoice')}
              className={`text-sm font-semibold transition-all ${
                activeTab === 'live_invoice'
                  ? 'text-[#0071E3]'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Live Invoice
            </button>
            <button
              onClick={() => setActiveTab('food_cost')}
              className={`text-sm font-semibold transition-all ${
                activeTab === 'food_cost'
                  ? 'text-[#0071E3]'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Food Cost
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
              onClick={() => setActiveTab('pantry')}
              className={`text-sm font-semibold transition-all ${
                activeTab === 'pantry'
                  ? 'text-[#0071E3]'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Pantry
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`text-sm font-semibold transition-all ${
                activeTab === 'invoices'
                  ? 'text-[#0071E3]'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Invoices
            </button>
          </div>
        </div>

        <div className="space-y-6">

          {/* TAB 1: Live Invoice */}
          <div className={activeTab !== 'live_invoice' ? 'hidden' : ''}>
            <div className="max-w-4xl mx-auto bg-white border-2 border-[#D2D2D7] rounded-sm overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#FAFAFA]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#E8E8ED]">
                        Aantal
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#E8E8ED]">
                        Omschrijving
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#E8E8ED]">
                        Bedrag
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#E8E8ED]">
                        Totaal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#E8E8ED]">
                    {/* 1. Breakfast - EDITABLE */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={liveInvoiceData.breakfast_count}
                          onChange={(e) => setLiveInvoiceData({ ...liveInvoiceData, breakfast_count: parseInt(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 text-[13px] border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                        />
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">Breakfast</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right">
                        €{liveInvoiceData.breakfast_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{(liveInvoiceData.breakfast_count * liveInvoiceData.breakfast_price).toFixed(2)}
                      </td>
                    </tr>

                    {/* 1b. Sandwiches Protein - EDITABLE */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={liveInvoiceData.sandwich_protein_count}
                          onChange={(e) => setLiveInvoiceData({ ...liveInvoiceData, sandwich_protein_count: parseInt(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 text-[13px] border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                        />
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">Sandwiches Protein</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right">
                        €{liveInvoiceData.sandwich_protein_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{(liveInvoiceData.sandwich_protein_count * liveInvoiceData.sandwich_protein_price).toFixed(2)}
                      </td>
                    </tr>

                    {/* 1c. Sandwiches Veg(an) - EDITABLE */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={liveInvoiceData.sandwich_vegan_count}
                          onChange={(e) => setLiveInvoiceData({ ...liveInvoiceData, sandwich_vegan_count: parseInt(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 text-[13px] border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                        />
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">Sandwiches Veg(an)</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right">
                        €{liveInvoiceData.sandwich_vegan_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{(liveInvoiceData.sandwich_vegan_count * liveInvoiceData.sandwich_vegan_price).toFixed(2)}
                      </td>
                    </tr>

                    {/* 2. Soup - AUTO from system */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors transition-colors">
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">{currentMonthTotals.soup.portions}</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">Soup</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right">
                        €{billingSettings.soup_price_per_portion.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{currentMonthTotals.soup.revenue.toFixed(2)}
                      </td>
                    </tr>

                    {/* 3. Salad Bar - AUTO from system */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">{currentMonthTotals.salad_bar.portions}</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">Salad Bar</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right">
                        €{billingSettings.salad_bar_price_per_portion.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{currentMonthTotals.salad_bar.revenue.toFixed(2)}
                      </td>
                    </tr>

                    {/* 4. Protein Salad Bar - AUTO (placeholder, to be developed later) */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors bg-[#FAFAFA]">
                      <td className="px-4 py-3 text-[13px] text-[#86868B]">0</td>
                      <td className="px-4 py-3 text-[13px] text-[#86868B] italic">Protein Salad Bar (coming soon)</td>
                      <td className="px-4 py-3 text-[13px] text-[#86868B] text-right">€0.00</td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#86868B] text-right">€0.00</td>
                    </tr>

                    {/* 5. Hot Dish Meat/Fish - AUTO from system */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">{currentMonthTotals.hot_dish_meat.portions}</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">Hot Dish Meat/Fish</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right">
                        €{billingSettings.hot_dish_meat_fish_price_per_portion.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{currentMonthTotals.hot_dish_meat.revenue.toFixed(2)}
                      </td>
                    </tr>

                    {/* 6. Hot Dish Veg - AUTO from system */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">{currentMonthTotals.hot_dish_veg.portions}</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">Hot Dish Veg</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right">
                        €{billingSettings.hot_dish_veg_price_per_portion.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{currentMonthTotals.hot_dish_veg.revenue.toFixed(2)}
                      </td>
                    </tr>

                    {/* 7. Pantry - EDITABLE (for now, then AUTO from pantry tab) */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">1</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">Pantry (inc. emballage)</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={liveInvoiceData.pantry_cost}
                          onChange={(e) => setLiveInvoiceData({ ...liveInvoiceData, pantry_cost: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 text-[13px] text-right border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                        />
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{liveInvoiceData.pantry_cost.toFixed(2)}
                      </td>
                    </tr>

                    {/* 8. Fruit Op je Werk - EDITABLE */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={liveInvoiceData.fruit_count}
                          onChange={(e) => setLiveInvoiceData({ ...liveInvoiceData, fruit_count: parseInt(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 text-[13px] border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                        />
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">Fruit Op je Werk</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={liveInvoiceData.fruit_price}
                          onChange={(e) => setLiveInvoiceData({ ...liveInvoiceData, fruit_price: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 text-[13px] text-right border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                        />
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{(liveInvoiceData.fruit_count * liveInvoiceData.fruit_price).toFixed(2)}
                      </td>
                    </tr>

                    {/* 9. Catering Orders - AUTO from system */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">{currentMonthTotals.catering.orders}</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">Catering (off-menu orders)</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right">
                        -
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{currentMonthTotals.catering.total_cost.toFixed(2)}
                      </td>
                    </tr>

                    {/* 10-12. STAFF SECTION - Individual staff members */}
                    {staffCosts.breakdown.map((member, idx) => (
                      <tr key={idx} className="hover:bg-[#F5F5F7] transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={liveInvoiceData.staff_days_worked[member.id] || 0}
                            onChange={(e) => setLiveInvoiceData({
                              ...liveInvoiceData,
                              staff_days_worked: {
                                ...liveInvoiceData.staff_days_worked,
                                [member.id]: parseInt(e.target.value) || 0
                              }
                            })}
                            className="w-16 px-2 py-1 text-[13px] border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                            placeholder="Days"
                          />
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">
                          {member.is_site_manager ? member.name : `Foodie ${member.name}`}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right">
                          €{(member.cost_per_day || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                          €{((liveInvoiceData.staff_days_worked[member.id] || 0) * (member.cost_per_day || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}

                    {/* 12. Kitchen Staff Cost - EDITABLE (for now, AUTO later) */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">1</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">Kitchen Staff Cost</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={liveInvoiceData.central_kitchen_cost}
                          onChange={(e) => setLiveInvoiceData({ ...liveInvoiceData, central_kitchen_cost: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 text-[13px] text-right border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                        />
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{liveInvoiceData.central_kitchen_cost.toFixed(2)}
                      </td>
                    </tr>

                    {/* 13. In Unit Overhead - EDITABLE */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">1</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">In Unit Overhead</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={liveInvoiceData.in_unit_overhead}
                          onChange={(e) => setLiveInvoiceData({ ...liveInvoiceData, in_unit_overhead: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 text-[13px] text-right border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                        />
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{liveInvoiceData.in_unit_overhead.toFixed(2)}
                      </td>
                    </tr>

                    {/* 14. Management Fee - AUTO (10% of FOOD cost only) */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">1</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">Management Fee</td>
                      <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right"></td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{(() => {
                          const foodCost =
                            (liveInvoiceData.breakfast_count * liveInvoiceData.breakfast_price) +
                            (liveInvoiceData.sandwich_protein_count * liveInvoiceData.sandwich_protein_price) +
                            (liveInvoiceData.sandwich_vegan_count * liveInvoiceData.sandwich_vegan_price) +
                            currentMonthTotals.soup.revenue +
                            currentMonthTotals.salad_bar.revenue +
                            currentMonthTotals.hot_dish_meat.revenue +
                            currentMonthTotals.hot_dish_veg.revenue +
                            liveInvoiceData.pantry_cost +
                            (liveInvoiceData.fruit_count * liveInvoiceData.fruit_price);
                          return (foodCost * 0.10).toFixed(2);
                        })()}
                      </td>
                    </tr>

                    {/* TOTAL EXCL. BTW ROW */}
                    <tr className="bg-[#F5F5F7] border-t-2 border-[#E8E8ED]">
                      <td colSpan={3} className="px-4 py-3 text-[15px] font-semibold text-[#1D1D1F] text-right">
                        Total exclusief btw
                      </td>
                      <td className="px-4 py-3 text-[17px] font-semibold text-[#0071E3] text-right">
                        €{(() => {
                          const foodCost =
                            (liveInvoiceData.breakfast_count * liveInvoiceData.breakfast_price) +
                            (liveInvoiceData.sandwich_protein_count * liveInvoiceData.sandwich_protein_price) +
                            (liveInvoiceData.sandwich_vegan_count * liveInvoiceData.sandwich_vegan_price) +
                            currentMonthTotals.soup.revenue +
                            currentMonthTotals.salad_bar.revenue +
                            currentMonthTotals.hot_dish_meat.revenue +
                            currentMonthTotals.hot_dish_veg.revenue +
                            liveInvoiceData.pantry_cost +
                            (liveInvoiceData.fruit_count * liveInvoiceData.fruit_price);

                          const staffCost = staffCosts.breakdown.reduce((sum, member) => {
                            const days = liveInvoiceData.staff_days_worked[member.id] || 0;
                            return sum + (days * (member.cost_per_day || 0));
                          }, 0);

                          const managementFee = foodCost * 0.10;

                          const totalCost =
                            foodCost +
                            staffCost +
                            liveInvoiceData.central_kitchen_cost +
                            liveInvoiceData.in_unit_overhead +
                            managementFee;

                          return totalCost.toFixed(2);
                        })()}
                      </td>
                    </tr>

                    {/* BTW LAAG (9% on food items) */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors">
                      <td colSpan={3} className="px-4 py-3 text-[13px] font-medium text-[#6E6E73] text-right">
                        BTW Laag (9%)
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{(() => {
                          const foodCost =
                            (liveInvoiceData.breakfast_count * liveInvoiceData.breakfast_price) +
                            (liveInvoiceData.sandwich_protein_count * liveInvoiceData.sandwich_protein_price) +
                            (liveInvoiceData.sandwich_vegan_count * liveInvoiceData.sandwich_vegan_price) +
                            currentMonthTotals.soup.revenue +
                            currentMonthTotals.salad_bar.revenue +
                            currentMonthTotals.hot_dish_meat.revenue +
                            currentMonthTotals.hot_dish_veg.revenue +
                            liveInvoiceData.pantry_cost +
                            (liveInvoiceData.fruit_count * liveInvoiceData.fruit_price);

                          const managementFee = foodCost * 0.10;
                          const foodTotal = foodCost + managementFee;
                          const btwLaag = foodTotal * 0.09;

                          return btwLaag.toFixed(2);
                        })()}
                      </td>
                    </tr>

                    {/* BTW HOOG (21% on staff costs) */}
                    <tr className="hover:bg-[#F5F5F7] transition-colors">
                      <td colSpan={3} className="px-4 py-3 text-[13px] font-medium text-[#6E6E73] text-right">
                        BTW Hoog (21%)
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                        €{(() => {
                          const staffCost = staffCosts.breakdown.reduce((sum, member) => {
                            const days = liveInvoiceData.staff_days_worked[member.id] || 0;
                            return sum + (days * (member.cost_per_day || 0));
                          }, 0);

                          const staffTotal = staffCost + liveInvoiceData.central_kitchen_cost + liveInvoiceData.in_unit_overhead;
                          const btwHoog = staffTotal * 0.21;

                          return btwHoog.toFixed(2);
                        })()}
                      </td>
                    </tr>

                    {/* TOTAL INCL. BTW ROW */}
                    <tr className="bg-[#0071E3] border-t-2 border-[#0071E3]">
                      <td colSpan={3} className="px-4 py-3 text-[15px] font-semibold text-white text-right">
                        Total inclusief btw
                      </td>
                      <td className="px-4 py-3 text-[17px] font-semibold text-white text-right">
                        €{(() => {
                          const foodCost =
                            (liveInvoiceData.breakfast_count * liveInvoiceData.breakfast_price) +
                            (liveInvoiceData.sandwich_protein_count * liveInvoiceData.sandwich_protein_price) +
                            (liveInvoiceData.sandwich_vegan_count * liveInvoiceData.sandwich_vegan_price) +
                            currentMonthTotals.soup.revenue +
                            currentMonthTotals.salad_bar.revenue +
                            currentMonthTotals.hot_dish_meat.revenue +
                            currentMonthTotals.hot_dish_veg.revenue +
                            liveInvoiceData.pantry_cost +
                            (liveInvoiceData.fruit_count * liveInvoiceData.fruit_price);

                          const staffCost = staffCosts.breakdown.reduce((sum, member) => {
                            const days = liveInvoiceData.staff_days_worked[member.id] || 0;
                            return sum + (days * (member.cost_per_day || 0));
                          }, 0);

                          const managementFee = foodCost * 0.10;
                          const foodTotal = foodCost + managementFee;
                          const staffTotal = staffCost + liveInvoiceData.central_kitchen_cost + liveInvoiceData.in_unit_overhead;

                          const btwLaag = foodTotal * 0.09;
                          const btwHoog = staffTotal * 0.21;

                          const totalInclBtw = foodTotal + staffTotal + btwLaag + btwHoog;

                          return totalInclBtw.toFixed(2);
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Save Button */}
              <div className="p-4 bg-[#F5F5F7] border-t border-[#D2D2D7] flex justify-end">
                <button
                  onClick={handleSaveInvoice}
                  disabled={isSavingInvoice}
                  className="px-6 py-2.5 text-[15px] font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingInvoice ? 'Saving...' : 'Save Invoice'}
                </button>
              </div>
            </div>
          </div>

          {/* TAB 2: Food Cost */}
          <div className={activeTab !== 'food_cost' ? 'hidden' : ''}>
            <div className="bg-white border border-[#E8E8ED] rounded-sm p-4">
              <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-4">Food Cost Settings</h2>

              {/* Portion Pricing */}
              <div className="bg-[#F5F5F7] border border-[#E8E8ED] rounded-sm p-4">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">Portion Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868B] mb-1.5">
                      Soup Price per Portion (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={billingSettings.soup_price_per_portion}
                      onChange={(e) => setBillingSettings({ ...billingSettings, soup_price_per_portion: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-[#D2D2D7] rounded-sm text-[15px] focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868B] mb-1.5">
                      Salad Bar Price per Portion (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={billingSettings.salad_bar_price_per_portion}
                      onChange={(e) => setBillingSettings({ ...billingSettings, salad_bar_price_per_portion: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-[#D2D2D7] rounded-sm text-[15px] focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868B] mb-1.5">
                      Hot Dish Meat/Fish (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={billingSettings.hot_dish_meat_fish_price_per_portion}
                      onChange={(e) => setBillingSettings({ ...billingSettings, hot_dish_meat_fish_price_per_portion: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-[#D2D2D7] rounded-sm text-[15px] focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-[#86868B] mb-1.5">
                      Hot Dish Veg (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={billingSettings.hot_dish_veg_price_per_portion}
                      onChange={(e) => setBillingSettings({ ...billingSettings, hot_dish_veg_price_per_portion: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-[#D2D2D7] rounded-sm text-[15px] focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#E8E8ED] flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    className="px-6 py-2.5 text-[15px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-colors"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TAB 3: Staff Cost */}
          <div className={activeTab !== 'staff_cost' ? 'hidden' : ''}>
            <div className="bg-white border border-[#E8E8ED] rounded-sm p-4">

            {/* Read-Only Staff Cost Summary Table */}
            <div className="bg-white border border-[#E8E8ED] rounded-sm overflow-hidden mb-6">
              <div className="p-4 bg-[#F5F5F7] border-b border-[#E8E8ED]">
                <p className="text-[11px] text-[#86868B]">{staffCosts.working_days_this_month} working days this month{locationParam === 'snowflake' ? ' (Mon-Thu)' : ''}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#FAFAFA]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Name</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Contract Hrs</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Gross Monthly</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Empl. Cost.</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Pension</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Hol.Pay</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Other</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Total Cost</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Cost/Day</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#E8E8ED]">
                    {staffCosts.breakdown.length > 0 ? (
                      staffCosts.breakdown.map((member, idx) => {
                        const werkgeverslasten = member.gross_salary * (billingSettings.employer_social_security_percentage / 100);
                        const pensioen = member.gross_salary * (billingSettings.pension_contribution_percentage / 100);
                        const vakantiegeld = member.gross_salary * (billingSettings.holiday_allowance_percentage / 100);
                        const other = member.gross_salary * (billingSettings.other_employer_costs_percentage / 100);
                        return (
                          <tr key={idx} className="hover:bg-[#F5F5F7] transition-colors">
                            <td className="px-4 py-3 text-[13px] font-medium text-[#1D1D1F]">{member.name}</td>
                            <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right">{member.contractual_hours || 38}</td>
                            <td className="px-4 py-3 text-[13px] text-[#1D1D1F] text-right">€{member.gross_salary.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[13px] text-[#FF9500] text-right">€{werkgeverslasten.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[13px] text-[#FF9500] text-right">€{pensioen.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[13px] text-[#FF9500] text-right">€{vakantiegeld.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[13px] text-[#FF9500] text-right">€{other.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[13px] font-semibold text-[#0071E3] text-right">€{member.total_cost.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[13px] font-semibold text-[#34C759] text-right">€{(member.cost_per_day || 0).toFixed(2)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-[13px] text-[#86868B]">
                          No staff data available. Expand "Edit Staff Data" below to add salaries.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Collapsible Edit Section */}
            <div className="bg-white border border-[#E8E8ED] rounded-sm mb-6">
              <button
                onClick={() => setShowStaffInputs(!showStaffInputs)}
                className="w-full px-4 py-3 flex items-center justify-between text-[13px] font-medium text-[#0071E3] hover:bg-[#F5F5F7] transition-colors"
              >
                <span>{showStaffInputs ? 'Hide' : 'Edit Staff Data'}</span>
                <span className="text-[16px]">{showStaffInputs ? '▼' : '▶'}</span>
              </button>

              {showStaffInputs && (
                <div className="p-4">
                  {/* Two Column Layout */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left: Editable Staff Table */}
                    <div>
                      <table className="w-full border border-[#E8E8ED] rounded-sm">
                        <thead className="bg-[#F5F5F7]">
                          <tr>
                            <th className="px-3 py-2 text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Name</th>
                            <th className="px-3 py-2 text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Role</th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Hrs</th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wider border-b border-[#D2D2D7]">Salary (€)</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-[#E8E8ED]">
                          {/* Site Manager Row */}
                          {locationSettings?.site_manager_name && (
                            <tr className="hover:bg-[#F5F5F7] transition-colors">
                              <td className="px-3 py-2 text-[13px] font-medium text-[#1D1D1F]">{locationSettings.site_manager_name}</td>
                              <td className="px-3 py-2 text-[13px] text-[#86868B]">Manager</td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  value={locationSettings.site_manager_contractual_hours || 38}
                                  onChange={(e) => handleManagerSalaryUpdate('site_manager_contractual_hours', parseInt(e.target.value) || 38)}
                                  className="w-16 px-2 py-1 text-[13px] text-right border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3]"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={locationSettings.site_manager_gross_monthly_salary || ''}
                                  onChange={(e) => handleManagerSalaryUpdate('site_manager_gross_monthly_salary', parseFloat(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 text-[13px] text-right border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3]"
                                  placeholder="3500"
                                />
                              </td>
                            </tr>
                          )}

                          {/* Staff Member Rows */}
                          {staffMembers.length > 0 ? (
                            staffMembers.map((member) => (
                              <tr key={member.id} className="hover:bg-[#F5F5F7] transition-colors">
                                <td className="px-3 py-2 text-[13px] font-medium text-[#1D1D1F]">{member.staff_name}</td>
                                <td className="px-3 py-2 text-[13px] text-[#86868B]">{member.staff_role || 'Staff'}</td>
                                <td className="px-3 py-2 text-right">
                                  <input
                                    type="number"
                                    value={member.contractual_hours || 38}
                                    onChange={(e) => handleStaffSalaryUpdate(member.id, 'contractual_hours', parseInt(e.target.value) || 38)}
                                    className="w-16 px-2 py-1 text-[13px] text-right border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3]"
                                  />
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={member.gross_monthly_salary || ''}
                                    onChange={(e) => handleStaffSalaryUpdate(member.id, 'gross_monthly_salary', parseFloat(e.target.value) || 0)}
                                    className="w-24 px-2 py-1 text-[13px] text-right border border-[#D2D2D7] rounded-sm focus:outline-none focus:border-[#0071E3]"
                                    placeholder="2800"
                                  />
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-3 py-6 text-center text-[13px] text-[#86868B]">
                                No staff members found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Right: Dutch Employer Cost Percentages */}
                    <div className="bg-white border border-[#E8E8ED] rounded-sm p-4">
                      <h4 className="text-[13px] font-semibold text-[#1D1D1F] mb-3">Employer Cost Percentages</h4>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[13px] text-[#86868B]">Empl. Cost. %</label>
                          <input
                            type="number"
                            step="0.01"
                            value={billingSettings.employer_social_security_percentage}
                            onChange={(e) => setBillingSettings({ ...billingSettings, employer_social_security_percentage: parseFloat(e.target.value) })}
                            className="w-20 px-2 py-1.5 border border-[#D2D2D7] rounded-sm text-[13px] text-right focus:outline-none focus:border-[#0071E3]"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-[13px] text-[#86868B]">Pension %</label>
                          <input
                            type="number"
                            step="0.01"
                            value={billingSettings.pension_contribution_percentage}
                            onChange={(e) => setBillingSettings({ ...billingSettings, pension_contribution_percentage: parseFloat(e.target.value) })}
                            className="w-20 px-2 py-1.5 border border-[#D2D2D7] rounded-sm text-[13px] text-right focus:outline-none focus:border-[#0071E3]"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-[13px] text-[#86868B]">Hol.Pay %</label>
                          <input
                            type="number"
                            step="0.01"
                            value={billingSettings.holiday_allowance_percentage}
                            onChange={(e) => setBillingSettings({ ...billingSettings, holiday_allowance_percentage: parseFloat(e.target.value) })}
                            className="w-20 px-2 py-1.5 border border-[#D2D2D7] rounded-sm text-[13px] text-right focus:outline-none focus:border-[#0071E3]"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-[13px] text-[#86868B]">Other %</label>
                          <input
                            type="number"
                            step="0.01"
                            value={billingSettings.other_employer_costs_percentage}
                            onChange={(e) => setBillingSettings({ ...billingSettings, other_employer_costs_percentage: parseFloat(e.target.value) })}
                            className="w-20 px-2 py-1.5 border border-[#D2D2D7] rounded-sm text-[13px] text-right focus:outline-none focus:border-[#0071E3]"
                          />
                        </div>

                        <div className="pt-2 mt-2 border-t border-[#E8E8ED] space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[13px] text-[#86868B]">Management Fee %</label>
                            <input
                              type="number"
                              step="0.01"
                              value={billingSettings.management_fee_percentage}
                              onChange={(e) => setBillingSettings({ ...billingSettings, management_fee_percentage: parseFloat(e.target.value) })}
                              className="w-20 px-2 py-1.5 border border-[#D2D2D7] rounded-sm text-[13px] text-right focus:outline-none focus:border-[#0071E3]"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-[13px] text-[#86868B]">Overhead %</label>
                            <input
                              type="number"
                              step="0.01"
                              value={billingSettings.overhead_percentage}
                              onChange={(e) => setBillingSettings({ ...billingSettings, overhead_percentage: parseFloat(e.target.value) })}
                              className="w-20 px-2 py-1.5 border border-[#D2D2D7] rounded-sm text-[13px] text-right focus:outline-none focus:border-[#0071E3]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Button - Full Width at Bottom */}
                  <div className="flex justify-end mt-4 pt-4 border-t border-[#E8E8ED]">
                    <button
                      onClick={handleSaveStaffSalaries}
                      className="px-6 py-2.5 text-[15px] font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-colors"
                    >
                      Save Staff Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>

          {/* TAB 4: Pantry */}
          <div className={activeTab !== 'pantry' ? 'hidden' : ''}>
            <div className="bg-white border border-[#E8E8ED] rounded-sm p-6">
              <h2 className="text-[17px] font-semibold text-[#1D1D1F] mb-6">Bidfood Invoices</h2>

              {/* Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-sm p-8 text-center transition-colors ${
                  isDraggingPantry
                    ? 'border-[#0071E3] bg-[#0071E3]/5'
                    : 'border-[#D2D2D7] bg-[#FAFAFA] hover:border-[#0071E3]'
                }`}
              >
                <div className="flex flex-col items-center gap-4">
                  {/* Upload Icon */}
                  <svg
                    className={`w-12 h-12 ${isDraggingPantry ? 'text-[#0071E3]' : 'text-[#86868B]'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>

                  <div>
                    <p className="text-[15px] font-medium text-[#1D1D1F] mb-1">
                      {isDraggingPantry ? 'Drop files here' : 'Upload Bidfood Invoices'}
                    </p>
                    <p className="text-[13px] text-[#86868B]">
                      Drag and drop PDF files here, or click to browse
                    </p>
                  </div>

                  {/* File Input */}
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                    id="pantry-invoice-upload"
                    disabled={uploadingPantry}
                  />
                  <label
                    htmlFor="pantry-invoice-upload"
                    className="px-6 py-2.5 text-[15px] font-semibold text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {uploadingPantry ? 'Uploading...' : 'Select Files'}
                  </label>

                  <p className="text-[11px] text-[#86868B]">
                    PDF files only • Multiple files supported
                  </p>
                </div>
              </div>

              {/* Uploaded Invoices List */}
              {pantryInvoices.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[15px] font-semibold text-[#1D1D1F] mb-3">Uploaded Invoices</h3>
                  <div className="space-y-2">
                    {pantryInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-3 bg-[#FAFAFA] border border-[#E8E8ED] rounded-sm hover:bg-[#F5F5F7] transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {/* PDF Icon */}
                          <svg className="w-8 h-8 text-[#FF3B30]" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                              clipRule="evenodd"
                            />
                          </svg>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[#1D1D1F] truncate">
                              {invoice.name}
                            </p>
                            <p className="text-[11px] text-[#86868B]">
                              {(invoice.size / 1024).toFixed(2)} KB • {new Date(invoice.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`px-2 py-1 text-[11px] font-medium rounded-full ${
                              invoice.status === 'processed'
                                ? 'bg-[#34C759]/10 text-[#34C759]'
                                : invoice.status === 'error'
                                ? 'bg-[#FF3B30]/10 text-[#FF3B30]'
                                : 'bg-[#FF9500]/10 text-[#FF9500]'
                            }`}
                          >
                            {invoice.status === 'processed' ? 'Processed' : invoice.status === 'error' ? 'Error' : 'Pending'}
                          </span>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeletePantryInvoice(invoice.id)}
                          className="ml-3 p-2 text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-sm transition-colors"
                          title="Delete invoice"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Info Message */}
                  <div className="mt-4 p-3 bg-[#0071E3]/5 border border-[#0071E3]/20 rounded-sm">
                    <p className="text-[13px] text-[#1D1D1F]">
                      <span className="font-semibold">Note:</span> Uploaded invoices will be automatically processed to extract totals and add them to your Live Invoice in a future update.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TAB 5: Invoices */}
          <div className={activeTab !== 'invoices' ? 'hidden' : ''}>
            <div className="bg-white border border-[#E8E8ED] rounded-sm overflow-hidden">
              <div className="p-4 bg-[#FAFAFA] border-b border-[#E8E8ED]">
                <h2 className="text-[17px] font-semibold text-[#1D1D1F]">Invoice History</h2>
              </div>

              {invoiceHistory.length === 0 ? (
                <div className="text-center py-12 text-[#86868B]">
                  <p className="text-[15px]">No invoices found</p>
                  <p className="text-[13px] mt-2">Save an invoice from the Live Invoice tab to see it here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#FAFAFA]">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#E8E8ED]">
                          Invoice #
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#E8E8ED]">
                          Period
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#E8E8ED]">
                          Total Amount
                        </th>
                        <th className="px-4 py-3 text-center text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#E8E8ED]">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-[11px] font-semibold text-[#86868B] uppercase tracking-wide border-b border-[#E8E8ED]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#E8E8ED]">
                      {invoiceHistory.map((invoice) => {
                        const monthName = new Date(invoice.invoice_year, invoice.invoice_month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
                        return (
                          <tr key={invoice.id} className="hover:bg-[#F5F5F7] transition-colors">
                            <td className="px-4 py-3 text-[13px] font-medium text-[#1D1D1F]">
                              {invoice.invoice_number}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-[#1D1D1F]">
                              {monthName}
                            </td>
                            <td className="px-4 py-3 text-[13px] font-semibold text-[#1D1D1F] text-right">
                              €{invoice.total_amount?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-3 py-1 text-[11px] font-medium rounded-full ${
                                invoice.status === 'draft' ? 'bg-[#86868B]/10 text-[#86868B]' :
                                invoice.status === 'finalized' ? 'bg-[#0071E3]/10 text-[#0071E3]' :
                                invoice.status === 'sent' ? 'bg-[#FF9500]/10 text-[#FF9500]' :
                                invoice.status === 'paid' ? 'bg-[#34C759]/10 text-[#34C759]' :
                                'bg-[#86868B]/10 text-[#86868B]'
                              }`}>
                                {invoice.status || 'draft'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleViewInvoice(invoice)}
                                  className="px-3 py-1.5 text-[13px] font-medium text-[#0071E3] hover:bg-[#0071E3]/10 rounded-sm transition-colors"
                                  title="View PDF"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleDownloadInvoice(invoice)}
                                  className="px-3 py-1.5 text-[13px] font-medium text-[#0071E3] hover:bg-[#0071E3]/10 rounded-sm transition-colors"
                                  title="Download PDF"
                                >
                                  Download
                                </button>
                                <button
                                  onClick={() => handleSendInvoice(invoice)}
                                  className="px-3 py-1.5 text-[13px] font-medium text-[#34C759] hover:bg-[#34C759]/10 rounded-sm transition-colors"
                                  title="Send via Email"
                                >
                                  Send
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* PDF Preview Modal */}
      {showPdfPreview && pdfPreviewUrl && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closePdfPreview}
        >
          <div
            className="bg-white rounded-sm shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E8ED]">
              <h3 className="text-[17px] font-semibold text-[#1D1D1F]">Invoice Preview</h3>
              <button
                onClick={closePdfPreview}
                className="text-[#86868B] hover:text-[#1D1D1F] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full"
                title="Invoice PDF Preview"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E8E8ED]">
              <button
                onClick={closePdfPreview}
                className="px-4 py-2 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] rounded-sm hover:bg-[#F5F5F7] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
