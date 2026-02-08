import { Suspense } from 'react';
import SettingsPageContent from '@/app/location-management/settings/SettingsPageContent';

export default function JAASettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    }>
      <SettingsPageContent forcedLocation="jaa" />
    </Suspense>
  );
}
