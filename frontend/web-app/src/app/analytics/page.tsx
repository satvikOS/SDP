import type { Metadata } from 'next';

import { PortfolioAnalytics } from '@/components/PortfolioAnalytics';

export const metadata: Metadata = { title: 'Portfolio' };

export default function AnalyticsPage() {
  return (
    <div className="page-frame">
      <header className="page-topbar">
        <div><span className="section-kicker">Portfolio</span><h1>Patterns across the decision set.</h1><p>Use the portfolio to spot repeated exposures and open research—not to collapse alternatives into one forecast.</p></div>
      </header>
      <PortfolioAnalytics />
    </div>
  );
}
