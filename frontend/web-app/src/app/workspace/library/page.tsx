import type { Metadata } from 'next';
import { Plus } from 'lucide-react';
import Link from 'next/link';

import { ScenarioLibrary } from '@/components/ScenarioLibrary';

export const metadata: Metadata = { title: 'Library' };

export default function LibraryPage() {
  return (
    <div className="workspace-page">
      <header className="workspace-header"><div><span className="eyebrow">Library</span><h1>Saved scenarios</h1></div><Link className="button primary-button" href="/workspace/new"><Plus size={17} /> New scenario</Link></header>
      <ScenarioLibrary />
    </div>
  );
}
