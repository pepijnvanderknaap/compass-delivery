import { redirect } from 'next/navigation';

export default function SnapchatWeekOverviewPage() {
  // Redirect generic snapchat to building 119 by default
  redirect('/snapchat-119/week-overview');
}
