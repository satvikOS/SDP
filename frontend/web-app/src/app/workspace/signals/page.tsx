import type { Metadata } from 'next';

import { SignalsBoard } from '@/components/SignalsBoard';

export const metadata: Metadata = { title: 'Signals' };

export default function SignalsPage() {
  return (
    <div className="workspace-page">
      <header className="workspace-header"><div><span className="eyebrow">Signals</span><h1>Evidence to monitor</h1></div><p>Track observable changes that would alter a scenario or decision.</p></header>
      <SignalsBoard />
    </div>
  );
}
