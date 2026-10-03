import type { Metadata, Viewport } from 'next';
import { Sora } from 'next/font/google';

import { Sidebar } from '@/components/Sidebar';
import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'SDP Decision Room',
    template: '%s · SDP',
  },
  description: 'A multi-model scenario development process for decisions that must survive uncertainty.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#071311',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sora.variable}>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <div className="app-shell">
          <Sidebar />
          <main className="app-content" id="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
