import { Suspense } from 'react';
import LocationManagementWeekOverviewContent from '../../location-management/week-overview/LocationManagementWeekOverviewContent';

export default function ManagementWeekOverviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7E22CE]"></div>
      </div>
    }>
      <LocationManagementWeekOverviewContent />
    </Suspense>
  );
}
