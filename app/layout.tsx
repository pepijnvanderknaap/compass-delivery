import type { Metadata } from 'next';
import './globals.css';
import PreventNumberScrollChange from './PreventNumberScrollChange';

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
      <body>
        <PreventNumberScrollChange />
        {children}
      </body>
    </html>
  );
}
