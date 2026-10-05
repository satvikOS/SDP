'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useScenarioResults } from '@/lib/scenario-store';
import { AriaButton, AriaTextField } from './ui/AriaControls';
import { ConfirmButton } from './ui/ConfirmButton';

type Initiative = { id: string; name: string; owner: string; exposure: 'Low' | 'Moderate' | 'High' };
const KEY = 'sdp.initiatives.v1';

export function PortfolioAnalytics() {
  const results = useScenarioResults();
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setInitiatives(JSON.parse(window.localStorage.getItem(KEY) ?? '[]')); } catch { setInitiatives([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const metrics = useMemo(() => ({
    scenarios: results.reduce((sum, result) => sum + result.scenarios.length, 0),
    actions: results.reduce((sum, result) => sum + result.robustActions.length, 0),
    questions: results.reduce((sum, result) => sum + result.criticalUnknowns.length, 0),
  }), [results]);

  const prominent = results
    .flatMap((result) => result.scenarios.map((scenario) => ({ ...scenario, brief: result.briefTitle })))
    .toSorted((a, b) => b.probability - a.probability)
    .slice(0, 6);

  function persist(next: Initiative[]) {
    setInitiatives(next);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }

  function addInitiative() {
    if (!name.trim()) return;
    persist([...initiatives, { id: crypto.randomUUID(), name: name.trim(), owner: owner.trim() || 'Unassigned', exposure: 'Moderate' }]);
    setName('');
    setOwner('');
  }

  return (
    <div className="portfolio-layout">
      <section className="metric-grid portfolio-metrics">
        <article className="glass-panel"><span>Decision briefs</span><strong>{results.length}</strong></article>
        <article className="glass-panel"><span>Alternative scenarios</span><strong>{metrics.scenarios}</strong></article>
        <article className="glass-panel"><span>Robust actions</span><strong>{metrics.actions}</strong></article>
        <article className="glass-panel"><span>Open questions</span><strong>{metrics.questions}</strong></article>
      </section>

      <section className="glass-panel portfolio-chart">
        <div className="panel-title"><div><span className="eyebrow">Scenario set</span><h2>Most prominent environments</h2></div></div>
        {prominent.length > 0 ? prominent.map((item, index) => (
          <div className="weight-row" key={`${item.brief}-${item.title}`}>
            <span><strong>{item.title}</strong><small>{item.brief}</small></span>
            <i><b data-index={index % 4} style={{ width: `${item.probability}%` }} /></i>
            <em>{item.probability}%</em>
          </div>
        )) : <div className="empty-copy">Create a scenario set to populate this view.</div>}
      </section>

      <section className="glass-panel initiative-panel">
        <div className="panel-title"><div><span className="eyebrow">Initiatives</span><h2>Track current commitments</h2></div></div>
        <div className="initiative-form">
          <AriaTextField label="Initiative" value={name} onChange={setName} placeholder="Expansion program" />
          <AriaTextField label="Owner" value={owner} onChange={setOwner} placeholder="Strategy team" />
          <AriaButton className="button primary-button" onPress={addInitiative}><Plus size={16} /> Add</AriaButton>
        </div>
        <div className="initiative-list">
          {initiatives.map((initiative) => (
            <article key={initiative.id}>
              <div><strong>{initiative.name}</strong><span>{initiative.owner}</span></div>
              <select value={initiative.exposure} onChange={(event) => persist(initiatives.map((item) => item.id === initiative.id ? { ...item, exposure: event.target.value as Initiative['exposure'] } : item))} aria-label={`Exposure for ${initiative.name}`}>
                <option>Low</option><option>Moderate</option><option>High</option>
              </select>
              <ConfirmButton label={`Remove ${initiative.name}`} title="Remove this initiative?" description={`“${initiative.name}” will be permanently removed from the portfolio.`} confirmLabel="Remove initiative" onConfirm={() => persist(initiatives.filter((item) => item.id !== initiative.id))}><Trash2 size={16} /></ConfirmButton>
            </article>
          ))}
          {initiatives.length === 0 && <p className="empty-copy">Add initiatives to track exposure alongside the scenario portfolio.</p>}
        </div>
      </section>
    </div>
  );
}
