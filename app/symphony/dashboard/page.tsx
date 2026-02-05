import { redirect } from 'next/navigation';

export default function SymphonyDashboardPage() {
  // Redirect to week overview which will have the proper header
  redirect('/symphony/week-overview');
}
