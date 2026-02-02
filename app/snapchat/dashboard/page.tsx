'use client';

import { useState } from 'react';
import LocationDashboard from '@/components/LocationDashboard';

export default function SnapChatDashboardPage() {
  const [selectedBuilding, setSelectedBuilding] = useState<'119' | '165'>('119');

  const buildingSwitcher = (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setSelectedBuilding('119')}
        className={`px-6 py-2.5 text-[15px] font-medium rounded-lg transition-colors ${
          selectedBuilding === '119'
            ? 'bg-[#0071E3] text-white hover:bg-[#0077ED]'
            : 'bg-white text-[#1D1D1F] border border-[#D2D2D7] hover:bg-[#F5F5F7]'
        }`}
      >
        Building 119
      </button>
      <button
        onClick={() => setSelectedBuilding('165')}
        className={`px-6 py-2.5 text-[15px] font-medium rounded-lg transition-colors ${
          selectedBuilding === '165'
            ? 'bg-[#0071E3] text-white hover:bg-[#0077ED]'
            : 'bg-white text-[#1D1D1F] border border-[#D2D2D7] hover:bg-[#F5F5F7]'
        }`}
      >
        Building 165
      </button>
    </div>
  );

  return (
    <LocationDashboard
      locationSlug={`snapchat-${selectedBuilding}`}
      locationLogo="/locations/snapchat-logo.jpg"
      locationName="SnapChat"
      loadingColor="border-yellow-500"
      buildingSwitcher={buildingSwitcher}
    />
  );
}
