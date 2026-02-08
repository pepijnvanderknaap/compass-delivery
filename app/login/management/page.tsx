'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function RegionalManagementLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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

        // Verify user has access to Regional Management (admin only)
        if (profile && profile.role === 'admin') {
          router.push('/management/dashboard');
          router.refresh();
        } else {
          setError('You do not have access to the Regional Management area');
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
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl border-2 border-[#E8E8ED] shadow-sm p-8">
          <div className="text-center mb-8">
            <Link href="/home" className="inline-block mb-4 text-[#6E6E73] hover:text-[#1D1D1F] text-sm">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-[#1D1D1F] mb-2">
              Regional Management
            </h1>
            <p className="text-[#6E6E73]">Sign in to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#6E6E73] mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] transition-all"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#6E6E73] mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-[#D2D2D7] rounded-lg focus:ring-2 focus:ring-[#0078D4]/20 focus:border-[#0078D4] transition-all"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0078D4] hover:bg-[#106EBE] text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#6E6E73]">
              Admin staff only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
