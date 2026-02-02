'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const location = searchParams.get('location');
  const supabase = createClient();

  // Location branding data
  const locationBranding: Record<string, { logo: string; name: string; subtitle?: string; gradient: string }> = {
    'symphony': {
      logo: '/locations/symphony-offices.png',
      name: 'Symphony Offices',
      gradient: 'from-blue-600 via-blue-700 to-blue-800'
    },
    'atlassian': {
      logo: '/locations/atlassian-logo.png',
      name: 'Atlassian',
      gradient: 'from-blue-500 via-blue-600 to-blue-700'
    },
    'snowflake': {
      logo: '/locations/snowflake-logo.png',
      name: 'Snowflake',
      gradient: 'from-cyan-400 via-cyan-500 to-cyan-600'
    },
    'snapchat': {
      logo: '/locations/snapchat-logo.jpg',
      name: 'SnapChat',
      gradient: 'from-yellow-400 via-yellow-500 to-yellow-600'
    },
    'snapchat-119': {
      logo: '/locations/snapchat-logo.jpg',
      name: 'SnapChat',
      subtitle: 'Building 119',
      gradient: 'from-yellow-400 via-yellow-500 to-yellow-600'
    },
    'snapchat-165': {
      logo: '/locations/snapchat-logo.jpg',
      name: 'SnapChat',
      subtitle: 'Building 165',
      gradient: 'from-yellow-400 via-yellow-500 to-yellow-600'
    },
    'jaa': {
      logo: '/locations/jaa-logo.png',
      name: 'JAA Training',
      gradient: 'from-orange-500 via-orange-600 to-orange-700'
    },
  };

  const currentLocation = location ? locationBranding[location] : null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Fetch user profile to verify role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        // Verify user has access to Location Management (admin or manager roles)
        if (profile && (profile.role === 'admin' || profile.role === 'manager')) {
          const redirectPath = location ? `/location-management?location=${location}` : '/location-management';
          router.push(redirectPath);
          router.refresh();
        } else {
          setError('You do not have access to the Location Management area');
          await supabase.auth.signOut();
          setLoading(false);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${currentLocation ? currentLocation.gradient : 'from-emerald-600 via-teal-700 to-cyan-800'}`}>
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Link href="/home" className="inline-block mb-4 text-gray-600 hover:text-gray-900 text-sm">
              ← Back to Home
            </Link>
            {currentLocation ? (
              <div className="mb-4">
                <div className="flex items-center justify-center gap-2">
                  <Image
                    src={currentLocation.logo}
                    alt={currentLocation.name}
                    width={200}
                    height={80}
                    className="object-contain"
                  />
                  {currentLocation.subtitle && (
                    <div className="text-4xl font-bold text-gray-900">
                      {currentLocation.subtitle.replace('Building ', '')}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {currentLocation ? currentLocation.name : 'Location Management'}
            </h1>
            <p className="text-gray-600">Sign in to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Location Managers & Admin staff only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
