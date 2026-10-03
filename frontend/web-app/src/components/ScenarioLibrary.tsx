'use client';

import { ArrowUpRight, FileText, GitCompareArrows, Library, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button, Checkbox } from 'react-aria-components';

import {
  deleteScenarioResult,
  toggleComparisonId,
  useComparisonIds,
  useScenarioResults,
} from '@/lib/scenario-store';

export function ScenarioLibrary() {
  const results = useScenarioResults();
  const comparisonIds = useComparisonIds();

  if (results.length === 0) {
    return (
      <section className="empty-state glass-panel">
        <Library size={28} />
        <h2>No scenarios saved yet</h2>
        <p>Create a scenario set to begin building the library.</p>
        <Link className="button primary-button" href="/workspace/new"><Plus size={17} /> New scenario</Link>
      </section>
    );
  }

  return (
    <>
      <div className="library-toolbar glass-panel">
        <span>Select up to three briefs for comparison.</span>
        <Link className="button quiet-button" data-disabled={comparisonIds.length < 2} href="/workspace/compare">
          <GitCompareArrows size={16} /> Compare {comparisonIds.length > 0 ? comparisonIds.length : ''}
        </Link>
      </div>
      <section className="library-list">
        {results.map((result) => (
          <article className="library-row glass-panel" key={result.id}>
            <Checkbox
              className="selection-check"
              isSelected={comparisonIds.includes(result.id)}
              onChange={() => toggleComparisonId(result.id)}
              aria-label={`Select ${result.briefTitle} for comparison`}
            >
              {({ isSelected }) => <span>{isSelected ? '✓' : ''}</span>}
            </Checkbox>
            <div className="library-main">
              <span>{result.request.organization} · {result.request.horizonYear}</span>
              <h2>{result.briefTitle}</h2>
              <p>{result.request.focalQuestion}</p>
              <small className="library-file"><FileText size={12} /> Saved PDF report</small>
            </div>
            <div className="library-scenarios" aria-label="Scenario planning weights">
              {result.scenarios.map((scenario, index) => (
                <div key={scenario.title}><i data-index={index} style={{ width: `${scenario.probability}%` }} /><span>{scenario.title}</span><strong>{scenario.probability}%</strong></div>
              ))}
            </div>
            <div className="library-actions">
              <Link href={`/workspace/library/${result.id}`} aria-label={`Open ${result.briefTitle}`}><ArrowUpRight size={18} /></Link>
              <Button onPress={() => deleteScenarioResult(result.id)} aria-label={`Delete ${result.briefTitle}`}><Trash2 size={17} /></Button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
