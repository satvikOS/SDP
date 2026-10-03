import { Clock3, CornerDownRight, Radar, ShieldCheck, TriangleAlert } from 'lucide-react';

import type { ScenarioResult } from '@/lib/scenario-schema';
import { StrategicField } from './StrategicField';

export function ScenarioResultView({ result }: { result: ScenarioResult }) {
  return (
    <div className="result-stack">
      <section className="result-hero panel panel-accent">
        <div>
          <span className="section-kicker">Decision brief</span>
          <h2>{result.briefTitle}</h2>
          <p>{result.executiveSummary}</p>
        </div>
        <dl className="brief-meta">
          <div>
            <dt>Organization</dt>
            <dd>{result.request.organization}</dd>
          </div>
          <div>
            <dt>Horizon</dt>
            <dd>{result.request.horizonYear}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{new Date(result.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </section>

      <section className="panel field-panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Uncertainty field</span>
            <h2>Four plausible operating environments</h2>
          </div>
          <p>Planning weights are not forecasts. Use them to test exposure.</p>
        </div>
        <StrategicField scenarios={result.scenarios} />
      </section>

      <section className="scenario-grid" aria-label="Scenario narratives">
        {result.scenarios.map((scenario, index) => (
          <article className="scenario-card" data-index={index} key={scenario.title}>
            <header>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{scenario.title}</h3>
                <p>{scenario.thesis}</p>
              </div>
              <strong>{scenario.probability}%</strong>
            </header>
            <p className="scenario-narrative">{scenario.narrative}</p>
            <div className="scenario-columns">
              <div>
                <h4><Radar size={15} /> Watch for</h4>
                <ul>{scenario.signposts.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <h4><CornerDownRight size={15} /> Strategic moves</h4>
                <ul>{scenario.strategicMoves.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
            <p className="avoid-line"><TriangleAlert size={15} /> <span><strong>Avoid:</strong> {scenario.avoid}</span></p>
          </article>
        ))}
      </section>

      <section className="action-layout">
        <div className="panel">
          <div className="panel-heading compact-heading">
            <div>
              <span className="section-kicker">Across all four futures</span>
              <h2>Robust actions</h2>
            </div>
            <ShieldCheck size={24} />
          </div>
          <ol className="action-list">
            {result.robustActions.map((item) => (
              <li key={item.action}>
                <span>{item.timing}</span>
                <div><strong>{item.action}</strong><p>{item.rationale}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="panel unknowns-panel">
          <span className="section-kicker">Research queue</span>
          <h2>What would change the view</h2>
          <ul>{result.criticalUnknowns.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="dissent-note">
            <strong>Model dissent</strong>
            <p>{result.dissent}</p>
          </div>
        </div>
      </section>

      <section className="provenance-row" aria-label="Model provenance">
        {result.provenance.map((item) => (
          <div key={item.provider}>
            <Clock3 size={14} />
            <span><strong>{item.provider}</strong> · {item.role}</span>
            <small>{item.model} · {(item.durationMs / 1000).toFixed(1)}s</small>
          </div>
        ))}
      </section>
    </div>
  );
}
