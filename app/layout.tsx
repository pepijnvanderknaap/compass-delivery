import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Compass Kitchen Orders',
  description: 'Order management system for Compass Group production kitchen',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
