import type { Metadata, Viewport } from 'next';
import { Geist, Manrope } from 'next/font/google';

import { ThemeFlow } from '@/components/ThemeFlow';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'SDP Decision Room',
    template: '%s · SDP',
  },
  description: 'A structured workspace for developing and comparing strategic scenarios.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${manrope.variable}`} data-accent="blue">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <ThemeFlow />
        {children}
      </body>
    </html>
  );
}
