import { redirect } from 'next/navigation';

export default function SnowflakeDashboardPage() {
  // Redirect to week overview which will have the proper header
  redirect('/snowflake/week-overview');
}
