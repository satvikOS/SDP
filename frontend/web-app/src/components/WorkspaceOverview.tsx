'use client';

import { ArrowUpRight, FileText, Plus, Radar, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { useScenarioResults } from '@/lib/scenario-store';

export function WorkspaceOverview() {
  const results = useScenarioResults();
  const latest = results[0];
  const totalActions = results.reduce((sum, result) => sum + result.robustActions.length, 0);
  const openQuestions = results.reduce((sum, result) => sum + result.criticalUnknowns.length, 0);

  return (
    <div className="overview-grid">
      <section className="overview-intro glass-panel">
        <div>
          <span className="eyebrow">Workspace</span>
          <h2>{latest ? latest.briefTitle : 'Begin with a decision.'}</h2>
          <p>{latest ? latest.request.focalQuestion : 'Create a scenario set, compare alternatives, and prepare a concise decision brief.'}</p>
        </div>
        <Link className="button primary-button" href="/workspace/new"><Plus size={17} /> New scenario</Link>
      </section>

      <section className="metric-grid">
        <article className="glass-panel"><FileText size={19} /><span>Scenario sets</span><strong>{results.length}</strong></article>
        <article className="glass-panel"><ShieldCheck size={19} /><span>Robust actions</span><strong>{totalActions}</strong></article>
        <article className="glass-panel"><Radar size={19} /><span>Open questions</span><strong>{openQuestions}</strong></article>
      </section>

      <section className="glass-panel recent-work">
        <div className="panel-title"><div><span className="eyebrow">Recent work</span><h2>Decision briefs</h2></div><Link href="/workspace/library">View library <ArrowUpRight size={15} /></Link></div>
        {results.length === 0 ? (
          <div className="empty-state"><p>No scenarios have been saved in this browser.</p><Link href="/workspace/new">Create the first scenario</Link></div>
        ) : (
          <div className="recent-list">
            {results.slice(0, 4).map((result) => (
              <Link href={`/workspace/library/${result.id}`} key={result.id}>
                <span>{result.request.organization}</span>
                <strong>{result.briefTitle}</strong>
                <small>{result.request.horizonYear} · {result.request.region}</small>
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="glass-panel workspace-shortcuts">
        <div className="panel-title"><div><span className="eyebrow">Tools</span><h2>Continue the analysis</h2></div></div>
        <div>
          <Link href="/workspace/compare"><strong>Compare scenarios</strong><span>Review multiple briefs side by side.</span></Link>
          <Link href="/workspace/signals"><strong>Monitor signals</strong><span>Track evidence that could change the view.</span></Link>
          <Link href="/workspace/documents"><strong>Review documents</strong><span>Open PDF and PowerPoint evidence in place.</span></Link>
          <Link href="/workspace/templates"><strong>Use a template</strong><span>Start from a proven decision structure.</span></Link>
        </div>
      </section>
    </div>
  );
}
