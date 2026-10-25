import type { Metadata, Viewport } from 'next';
import { Outfit, Dancing_Script } from 'next/font/google';
import './globals.css';
import React from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { PwaRegister } from '@/components/pwa/PwaRegister';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Mingle Booth by Kala Kini — Photo Experience',
  description: 'Interactive photobooth experience for events. Capture moments, create photo strips and GIFs.',
  applicationName: 'Mingle Booth',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mingle Booth by Kala Kini',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${dancingScript.variable}`}>
      <body className="antialiased min-h-screen bg-[#0a0a0f] text-[#f1f0ff] selection:bg-purple-500/30 selection:text-white">
        <PwaRegister />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
