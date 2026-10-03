'use client';

import { ArrowUpRight, Library, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { deleteScenarioResult, useScenarioResults } from '@/lib/scenario-store';

export function ScenarioLibrary() {
  const results = useScenarioResults();

  function remove(id: string) {
    deleteScenarioResult(id);
  }

  if (results.length === 0) {
    return (
      <section className="empty-library panel">
        <Library size={30} />
        <h2>No saved briefs in this browser.</h2>
        <p>Generated scenario sets stay on this device until shared persistence is connected.</p>
        <Link className="button button-primary" href="/scenarios/new"><Plus size={17} /> Build the first brief</Link>
      </section>
    );
  }

  return (
    <section className="library-list">
      {results.map((result) => (
        <article className="library-row" key={result.id}>
          <div className="library-date">
            <strong>{new Date(result.createdAt).getDate()}</strong>
            <span>{new Date(result.createdAt).toLocaleString(undefined, { month: 'short' })}</span>
          </div>
          <div className="library-main">
            <span>{result.request.organization} · {result.request.horizonYear}</span>
            <h2>{result.briefTitle}</h2>
            <p>{result.request.focalQuestion}</p>
          </div>
          <div className="library-scenarios" aria-label="Scenario planning weights">
            {result.scenarios.map((scenario, index) => (
              <div key={scenario.title}><i data-index={index} style={{ width: `${scenario.probability}%` }} /><span>{scenario.title}</span><strong>{scenario.probability}%</strong></div>
            ))}
          </div>
          <div className="library-actions">
            <Link href={`/scenarios/${result.id}`} aria-label={`Open ${result.briefTitle}`}><ArrowUpRight size={18} /></Link>
            <button type="button" onClick={() => remove(result.id)} aria-label={`Delete ${result.briefTitle}`}><Trash2 size={17} /></button>
          </div>
        </article>
      ))}
    </section>
  );
}
