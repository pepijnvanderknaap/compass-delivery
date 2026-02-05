import { redirect } from 'next/navigation';

export default function JAADashboardPage() {
  // Redirect to week overview which will have the proper header
  redirect('/jaa/week-overview');
}
