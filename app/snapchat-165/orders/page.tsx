import { Suspense } from 'react';
import OrdersPageContent from '@/app/orders/OrdersPageContent';

export default function SnapChat165OrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    }>
      <OrdersPageContent forcedLocation="snapchat-165" />
    </Suspense>
  );
}
