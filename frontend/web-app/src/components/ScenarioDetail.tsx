'use client';

import { ArrowLeft, PanelsTopLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from 'react-aria-components';

import { useScenarioResults } from '@/lib/scenario-store';
import { ScenarioResultView } from './ScenarioResultView';
import { ReportActions } from './ReportActions';
import { ScenarioDocumentViewer } from './ScenarioDocumentViewer';

export function ScenarioDetail({ id }: { id: string }) {
  const result = useScenarioResults().find((item) => item.id === id) ?? null;
  const [showAnalysis, setShowAnalysis] = useState(false);

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
      <div className="detail-toolbar">
        <Link href="/workspace/library"><ArrowLeft size={16} /> Library</Link>
        <div>
          <Button className="button quiet-button" onPress={() => setShowAnalysis((value) => !value)}><PanelsTopLeft size={16} /> {showAnalysis ? 'Hide analysis' : 'View analysis'}</Button>
          <ReportActions result={result} />
        </div>
      </div>
      <ScenarioDocumentViewer result={result} />
      {showAnalysis ? <div className="saved-analysis"><ScenarioResultView result={result} /></div> : null}
    </>
  );
}
