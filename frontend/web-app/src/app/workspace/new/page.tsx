import type { Metadata } from 'next';

import { ScenarioWorkbench } from '@/components/ScenarioWorkbench';

export const metadata: Metadata = { title: 'New scenario' };

export default function NewScenarioPage() {
  return (
    <div className="workspace-page wide-page">
      <header className="workspace-header"><div><span className="eyebrow">New scenario</span><h1>Frame the decision</h1></div><p>Define the choice, horizon, and context before exploring alternatives.</p></header>
      <ScenarioWorkbench />
    </div>
  );
}
