import { Suspense } from 'react';
import CateringPageContent from '@/app/location-management/catering/CateringPageContent';

export default function SnapChat119CateringPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0071E3]"></div>
      </div>
    }>
      <CateringPageContent forcedLocation="snapchat-119" />
    </Suspense>
  );
}
