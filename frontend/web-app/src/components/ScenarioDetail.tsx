'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { useScenarioResults } from '@/lib/scenario-store';
import { ScenarioResultView } from './ScenarioResultView';
import { ReportActions } from './ReportActions';

export function ScenarioDetail({ id }: { id: string }) {
  const result = useScenarioResults().find((item) => item.id === id) ?? null;

  if (result === null) {
    return (
      <section className="empty-state glass-panel">
        <h2>This local brief is not available.</h2>
        <p>It may have been created in another browser or removed from local storage.</p>
        <Link className="button quiet-button" href="/workspace/library"><ArrowLeft size={16} /> Back to library</Link>
      </section>
    );
  }

  return (
    <>
      <div className="detail-toolbar"><Link href="/workspace/library"><ArrowLeft size={16} /> Library</Link><ReportActions result={result} /></div>
      <ScenarioResultView result={result} />
    </>
  );
}
