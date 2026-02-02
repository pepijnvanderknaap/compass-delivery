import { Suspense } from 'react';
import BanquetingPageContent from '@/app/location-management/banqueting/BanquetingPageContent';

export default function SnapChat165BanquetingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    }>
      <BanquetingPageContent forcedLocation="snapchat-165" />
    </Suspense>
  );
}
