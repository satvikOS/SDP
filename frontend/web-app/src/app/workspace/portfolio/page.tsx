import type { Metadata } from 'next';

import { PortfolioAnalytics } from '@/components/PortfolioAnalytics';

export const metadata: Metadata = { title: 'Portfolio' };

export default function PortfolioPage() {
  return (
    <div className="workspace-page">
      <header className="workspace-header"><div><span className="eyebrow">Portfolio</span><h1>Cross-scenario exposure</h1></div><p>Review recurring actions, uncertainties, and concentrations.</p></header>
      <PortfolioAnalytics />
    </div>
  );
}
