import type { Metadata } from 'next';

import { ScenarioWorkbench } from '@/components/ScenarioWorkbench';

export const metadata: Metadata = { title: 'Scenario lab' };

export default function NewScenarioPage() {
  return (
    <div className="page-frame">
      <header className="page-topbar workbench-header">
        <div>
          <span className="section-kicker">Scenario lab</span>
          <h1>Frame the choice before forecasting the future.</h1>
          <p>Build four plausible operating environments, the signals that distinguish them, and actions that survive across the set.</p>
        </div>
      </header>
      <ScenarioWorkbench />
    </div>
  );
}
