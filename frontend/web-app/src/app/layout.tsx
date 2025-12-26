import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Foresight Platform - Enterprise Strategic Foresight',
  description: 'Enterprise-grade AI-powered strategic foresight and scenario planning for government and corporate decision-makers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="min-h-screen bg-[var(--bg)]">
          <Sidebar />
          <div className="lg:pl-72">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
