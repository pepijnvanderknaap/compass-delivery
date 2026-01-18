'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AccessGatePage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check password
    if (password === process.env.NEXT_PUBLIC_DEMO_PASSWORD || password === 'compass2024') {
      // Store access token in cookie and session storage
      document.cookie = 'demo_access=granted; path=/; max-age=86400'; // 24 hours
      sessionStorage.setItem('demo_access', 'granted');
      router.push('/demo');
    } else {
      setError('Invalid access code');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-indigo-100 rounded-full mb-4">
              <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Compass Delivery
            </h1>
            <p className="text-gray-600">
              Demo Access Required
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Access Code
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter access code"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 font-medium transition-colors"
            >
              Access Demo
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              This is a private demo application
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Built by{' '}
              <a href="https://pepijnvanderknaap.com" className="text-indigo-600 hover:text-indigo-700">
                Pepijn van der Knaap
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
