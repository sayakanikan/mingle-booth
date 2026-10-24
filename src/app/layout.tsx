import type { Metadata, Viewport } from 'next';
import { Outfit, Dancing_Script } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

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
  title: 'Mingle Booth — Photo Experience',
  description: 'Interactive photobooth experience for events. Capture moments, create photo strips and GIFs.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mingle Booth',
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
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
