'use client';

import { redirect } from 'next/navigation';

export default function AtlassianDashboardPage() {
  // Redirect to week overview which will have the proper header
  redirect('/atlassian/week-overview');
}
