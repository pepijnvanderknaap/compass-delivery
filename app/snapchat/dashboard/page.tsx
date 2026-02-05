'use client';

import { redirect } from 'next/navigation';

export default function SnapChatDashboardPage() {
  // Redirect to week overview which will have the proper header
  redirect('/snapchat/week-overview');
}
