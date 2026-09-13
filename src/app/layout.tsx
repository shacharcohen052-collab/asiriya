import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'מרחב העשירייה — הבית הדיגיטלי של העשירייה שלך',
  description: 'מרחב דיגיטלי חברתי לעשירייה — שיעורים, תורנויות, משימות יומיות ומעקב אישי במקום אחד.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={plusJakartaSans.variable}>
      <body className={plusJakartaSans.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              fontFamily: 'var(--font-plus-jakarta-sans)',
              direction: 'rtl',
            },
          }}
        />

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fasiriya1671back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.20" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.3" /></body>
    </html>
  );
}