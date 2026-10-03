import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import Link from 'next/link';

import { ScenarioLibrary } from '@/components/ScenarioLibrary';

export const metadata: Metadata = { title: 'Scenario library' };

export default function ScenariosPage() {
  return (
    <div className="page-frame">
      <header className="page-topbar">
        <div><span className="section-kicker">Scenario library</span><h1>The decisions you have rehearsed.</h1><p>Generated briefs are currently stored in this browser while shared persistence is being connected.</p></div>
        <Link className="button button-primary" href="/scenarios/new"><Plus size={17} /> New brief</Link>
      </header>
      <ScenarioLibrary />
    </div>
  );
}
