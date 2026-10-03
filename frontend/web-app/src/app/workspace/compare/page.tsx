import type { Metadata } from 'next';

import { ComparisonView } from '@/components/ComparisonView';

export const metadata: Metadata = { title: 'Compare scenarios' };

export default function ComparePage() {
  return (
    <div className="workspace-page wide-page">
      <header className="workspace-header"><div><span className="eyebrow">Comparison</span><h1>Review briefs side by side</h1></div><p>Compare scenarios, actions, and open questions without collapsing their differences.</p></header>
      <ComparisonView />
    </div>
  );
}
