'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { useScenarioResults } from '@/lib/scenario-store';
import { ScenarioResultView } from './ScenarioResultView';

export function ScenarioDetail({ id }: { id: string }) {
  const result = useScenarioResults().find((item) => item.id === id) ?? null;

  if (result === null) {
    return (
      <section className="empty-library panel">
        <h2>This local brief is not available.</h2>
        <p>It may have been created in another browser or removed from local storage.</p>
        <Link className="button button-secondary" href="/scenarios"><ArrowLeft size={16} /> Back to library</Link>
      </section>
    );
  }

  return (
    <>
      <div className="detail-back"><Link href="/scenarios"><ArrowLeft size={16} /> Scenario library</Link></div>
      <ScenarioResultView result={result} />
    </>
  );
}
