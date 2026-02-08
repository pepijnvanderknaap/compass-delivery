import { Suspense } from 'react';
import SettingsPageContent from '@/app/location-management/settings/SettingsPageContent';

export default function AtlassianSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <SettingsPageContent forcedLocation="atlassian" />
    </Suspense>
  );
}
