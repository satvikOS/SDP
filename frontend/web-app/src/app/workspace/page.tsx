import type { Metadata } from 'next';

import { WorkspaceOverview } from '@/components/WorkspaceOverview';

export const metadata: Metadata = { title: 'Workspace' };

export default function WorkspacePage() {
  return (
    <div className="workspace-page">
      <header className="workspace-header"><div><span className="eyebrow">Overview</span><h1>Decision workspace</h1></div><p>Scenario development, evidence, and outputs in one place.</p></header>
      <WorkspaceOverview />
    </div>
  );
}
