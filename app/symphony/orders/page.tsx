import { Suspense } from 'react';
import OrdersPageContent from '@/app/orders/OrdersPageContent';

export default function SymphonyOrdersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    }>
      <OrdersPageContent forcedLocation="symphony" />
    </Suspense>
  );
}
