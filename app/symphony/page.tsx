'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

interface DayMenu {
  day: string;
  dayNumber: number;
  soup: string;
  hot_dishes: Array<{ name: string; description?: string }>;
}

interface WeeklyMenu {
  sandwich: string;
  days: DayMenu[];
}

interface CompanyData {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  floor_number: string | null;
}

export default function SymphonyPublicPage() {
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loginCompanyName, setLoginCompanyName] = useState('');
  const [loginPinCode, setLoginPinCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if user is already logged in
    const companyData = sessionStorage.getItem('symphony_company');
    if (companyData) {
      setCompany(JSON.parse(companyData));
    }

    // Create placeholder menu
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const days: DayMenu[] = [];

    for (let dayNum = 1; dayNum <= 5; dayNum++) {
      days.push({
        day: dayNames[dayNum - 1],
        dayNumber: dayNum,
        soup: 'To be announced',
        hot_dishes: []
      });
    }

    setWeeklyMenu({
      sandwich: 'Sandwich of the day (to be announced)',
      days
    });
    setLoading(false);
  }, []);

  const getDayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getFormattedDate = () => {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getWeekRange = () => {
    const today = new Date();
    const weekStart = new Date(today);
    const diff = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
    weekStart.setDate(diff);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Friday

    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const month = weekEnd.toLocaleDateString('en-US', { month: 'short' });

    return `${startDay}-${endDay} ${month}`;
  };

  const handleOrderBanqueting = () => {
    if (company) {
      router.push('/symphony/banqueting-orders-new');
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const { data, error } = await supabase
        .from('symphony_companies')
        .select('*')
        .eq('company_name', loginCompanyName)
        .eq('pin_code', loginPinCode)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setLoginError('Invalid company name or PIN');
        setLoginLoading(false);
        return;
      }

      sessionStorage.setItem('symphony_company', JSON.stringify(data));
      setCompany(data);
      setShowLoginModal(false);
      router.push('/symphony/banqueting-orders-new');
    } catch (err) {
      console.error('Login error:', err);
      setLoginError('An error occurred. Please try again.');
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('symphony_company');
    setCompany(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/symphony-building.png"
          alt="Symphony Building"
          fill
          className="object-cover opacity-35"
          priority
        />
        <div className="absolute inset-0 bg-white/30"></div>
      </div>

      {/* Header */}
      <nav className="relative z-10 bg-transparent">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <Image
                src="/locations/symphony-offices.png"
                alt="Symphony Offices"
                width={180}
                height={60}
                className="object-contain"
              />
            </div>
            <div className="flex items-center gap-4">
              {company ? (
                <>
                  <div className="text-right">
                    <p className="text-[13px] font-medium text-[#86868B]">Logged in as</p>
                    <p className="text-[15px] font-semibold text-[#1D1D1F]">{company.company_name}</p>
                  </div>
                  <button
                    onClick={handleOrderBanqueting}
                    className="px-6 py-3 text-[15px] font-medium text-[#1D1D1F] bg-transparent border border-[#1D1D1F] hover:bg-[#1D1D1F] hover:text-white rounded-sm transition-colors"
                  >
                    Order Banqueting
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-3 text-[15px] font-medium text-[#1D1D1F] border border-[#D2D2D7] hover:bg-[#F5F5F7] rounded-sm transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={handleOrderBanqueting}
                  className="px-6 py-3 text-[15px] font-medium text-[#1D1D1F] bg-transparent border border-[#1D1D1F] hover:bg-[#1D1D1F] hover:text-white rounded-sm transition-colors"
                >
                  Order Banqueting
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-[70px] pb-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-[48px] font-medium text-[#1D1D1F] mb-4 tracking-tight">
            Symphony Restaurant
          </h1>
        </div>

        {/* Menu Section with White Blur Background */}
        <div className="max-w-6xl mx-auto backdrop-blur-md bg-white/25 rounded-2xl p-8 shadow-lg">
          {/* Week Date */}
          <div className="mb-8 text-center">
            <p className="text-[20px] font-medium text-[#1D1D1F]">
              Weekly Menu {getWeekRange()}
            </p>
          </div>

          {/* Weekly Menu Grid */}
          <div className="space-y-3 mb-12">
            {weeklyMenu?.days.map((dayMenu, index) => {
              const isToday = new Date().getDay() === dayMenu.dayNumber;
              return (
                <div
                  key={dayMenu.day}
                  className={`border-b border-[#E8E8ED] pb-3 ${
                    isToday ? 'border-[#0071E3]' : ''
                  }`}
                >
                  <div className="grid grid-cols-12 gap-6 items-start">
                    {/* Day Label */}
                    <div className="col-span-2">
                      <p className={`text-[18px] font-medium ${
                        isToday ? 'text-[#0071E3]' : 'text-[#1D1D1F]'
                      }`}>
                        {dayMenu.day}
                      </p>
                    </div>

                    {/* Soup */}
                    <div className="col-span-3">
                      <p className="text-[14px] text-[#86868B] uppercase tracking-wide mb-1">Soup</p>
                      <p className={`text-[17px] ${dayMenu.soup === 'To be announced' ? 'text-[#86868B] italic' : 'text-[#1D1D1F]'}`}>
                        {dayMenu.soup}
                      </p>
                    </div>

                    {/* Sandwich of the Day */}
                    <div className="col-span-3">
                      <p className="text-[14px] text-[#86868B] uppercase tracking-wide mb-1">Sandwich of the Day</p>
                      <p className="text-[17px] text-[#86868B] italic">
                        To be announced
                      </p>
                    </div>

                    {/* Hot Dishes */}
                    <div className="col-span-4">
                      <p className="text-[14px] text-[#86868B] uppercase tracking-wide mb-1">Hot Dishes</p>
                      {dayMenu.hot_dishes.length > 0 ? (
                        <div className="space-y-1">
                          {dayMenu.hot_dishes.map((dish, dishIndex) => (
                            <p key={dishIndex} className="text-[17px] text-[#1D1D1F]">
                              {dish.name}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[17px] text-[#86868B] italic">
                          To be announced
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[28px] font-semibold text-[#1D1D1F]">Office Manager Login</h2>
              <button
                onClick={() => setShowLoginModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="company" className="block text-[13px] font-medium text-[#86868B] mb-2">
                  Company Name
                </label>
                <input
                  id="company"
                  type="text"
                  value={loginCompanyName}
                  onChange={(e) => setLoginCompanyName(e.target.value)}
                  className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                  placeholder="e.g., TCS"
                  required
                />
              </div>

              <div>
                <label htmlFor="pin" className="block text-[13px] font-medium text-[#86868B] mb-2">
                  PIN Code
                </label>
                <input
                  id="pin"
                  type="password"
                  value={loginPinCode}
                  onChange={(e) => setLoginPinCode(e.target.value)}
                  className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                  placeholder="4-digit PIN"
                  maxLength={4}
                  required
                />
              </div>

              {loginError && (
                <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-sm p-3">
                  <p className="text-[13px] text-[#FF3B30]">{loginError}</p>
                </div>
              )}

              <div className="bg-[#F5F5F7] rounded-sm p-4">
                <p className="text-[13px] font-medium text-[#86868B] mb-2">Test Account</p>
                <p className="text-[15px] text-[#1D1D1F]">Company: <strong>TCS</strong></p>
                <p className="text-[15px] text-[#1D1D1F]">PIN: <strong>1234</strong></p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 px-6 py-3 border border-[#D2D2D7] text-[#1D1D1F] text-[15px] font-semibold rounded-sm hover:bg-[#F5F5F7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="flex-1 px-6 py-3 bg-[#0071E3] text-white text-[15px] font-semibold rounded-sm hover:bg-[#0077ED] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loginLoading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
