'use client';

import { ArrowLeft, GitCompareArrows, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { useComparisonIds, useScenarioResults } from '@/lib/scenario-store';

export function ComparisonView() {
  const ids = useComparisonIds();
  const results = useScenarioResults().filter((result) => ids.includes(result.id));

  if (results.length < 2) {
    return (
      <section className="empty-state glass-panel">
        <GitCompareArrows size={28} />
        <h2>Select at least two briefs</h2>
        <p>Choose up to three saved scenarios from the library.</p>
        <Link className="button quiet-button" href="/workspace/library"><ArrowLeft size={16} /> Open library</Link>
      </section>
    );
  }

  return (
    <div className="comparison-board">
      <div className="comparison-scroll">
        {results.map((result) => (
          <article className="comparison-column glass-panel" key={result.id}>
            <header>
              <span>{result.request.organization}</span>
              <h2>{result.briefTitle}</h2>
              <p>{result.request.region} · {result.request.horizonYear}</p>
            </header>
            <section><h3>Decision</h3><p>{result.request.focalQuestion}</p></section>
            <section><h3>Scenarios</h3>{result.scenarios.map((scenario) => <div className="compare-scenario" key={scenario.title}><strong>{scenario.title}</strong><span>{scenario.probability}%</span><p>{scenario.thesis}</p></div>)}</section>
            <section><h3><ShieldCheck size={15} /> Robust actions</h3><ul>{result.robustActions.map((item) => <li key={item.action}>{item.action}</li>)}</ul></section>
            <section><h3>Open questions</h3><ul>{result.criticalUnknowns.map((item) => <li key={item}>{item}</li>)}</ul></section>
          </article>
        ))}
      </div>
    </div>
  );
}
