import { Suspense } from 'react';
import LocationManagementWeekOverviewContent from './LocationManagementWeekOverviewContent';

export default function LocationManagementWeekOverviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    }>
      <LocationManagementWeekOverviewContent />
    </Suspense>
  );
}
