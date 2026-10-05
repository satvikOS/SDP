import { CornerDownRight, Radar, ShieldCheck, TriangleAlert } from 'lucide-react';

import type { ScenarioResult } from '@/lib/scenario-schema';
import { ScenarioFlowDiagram } from './ScenarioFlowDiagram';
import { StrategicField } from './StrategicField';

export function ScenarioResultView({ result }: { result: ScenarioResult }) {
  return (
    <div className="result-stack">
      <section className="result-hero glass-panel">
        <div>
          <span className="eyebrow">Decision brief</span>
          <h2>{result.briefTitle}</h2>
          <p><CitedText text={result.executiveSummary} /></p>
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

      <section className="glass-panel field-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Scenario field</span>
            <h2>Four plausible operating environments</h2>
          </div>
          <p>Conditional weights, not forecasts. Use them to test exposure.</p>
        </div>
        <StrategicField scenarios={result.scenarios} axes={result.strategicAxes} />
        <details className="weight-method"><summary>Weight calculation and limits</summary><p>{result.probabilityMethod ?? 'This legacy analysis uses uncalibrated planning weights, not verified probabilities.'}</p></details>
      </section>

      <section className="glass-panel decision-flow-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Decision logic</span>
            <h2>How the scenario set supports action</h2>
          </div>
          <p>Signals refresh the assumptions behind the decision frame.</p>
        </div>
        <ScenarioFlowDiagram />
      </section>

      <section className="scenario-grid" aria-label="Scenario narratives">
        {result.scenarios.map((scenario, index) => (
          <article className="scenario-card glass-panel" data-index={index} key={scenario.title}>
            <header>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{scenario.title}</h3>
                <p><CitedText text={scenario.thesis} /></p>
              </div>
              <strong>{scenario.probability.toFixed(1)}%{scenario.probabilityRange && <small>{scenario.probabilityRange[0].toFixed(1)}–{scenario.probabilityRange[1].toFixed(1)}%</small>}</strong>
            </header>
            <p className="scenario-narrative"><CitedText text={scenario.narrative} /></p>
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
        <div className="glass-panel">
          <div className="panel-heading compact-heading">
            <div>
              <span className="eyebrow">Across all four scenarios</span>
              <h2>Robust actions</h2>
            </div>
            <ShieldCheck size={24} />
          </div>
          <ol className="action-list">
            {result.robustActions.map((item) => (
              <li key={item.action}>
                <span>{item.timing}</span>
                <div><strong>{item.action}</strong><p><CitedText text={item.rationale} /></p></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="glass-panel unknowns-panel">
          <span className="eyebrow">Open questions</span>
          <h2>What would change the view</h2>
          <ul>{result.criticalUnknowns.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="dissent-note">
            <strong>Alternative interpretation</strong>
            <p><CitedText text={result.dissent} /></p>
          </div>
        </div>
      </section>
      <section className="glass-panel evidence-panel">
        <div className="panel-heading"><div><span className="eyebrow">Evidence</span><h2>Sources and verification</h2></div></div>
        {result.evidence ? <>
          <p>{result.evidence.methodology}</p>
          <details><summary>{result.evidence.claims.filter((c) => c.verdict === 'accepted').length} accepted claims · {result.evidence.claims.filter((c) => c.verdict !== 'accepted').length} excluded from factual support</summary><ol className="evidence-claims">{result.evidence.claims.map((claim) => <li key={claim.id}><strong>Claim {claim.id} · {claim.verdict}</strong><p>{claim.verdict === 'accepted' ? <CitedText text={`${claim.text} ${claim.sourceIds.map((id) => `[${id}]`).join('')}`} /> : claim.reason}</p></li>)}</ol></details>
          <h3>References</h3><ol className="reference-list">{result.evidence.references.map((source) => <li key={source.id} id={`reference-${source.id}`}><span>[{source.id}]</span><div><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><small>{source.publisher} · Accessed {new Date(source.accessedAt).toLocaleDateString()}</small></div></li>)}</ol>
        </> : <p>This earlier analysis predates source verification. Its factual assertions have not been independently checked. Generate a new analysis for cited evidence.</p>}
      </section>
    </div>
  );
}

function CitedText({ text }: { text: string }) {
  return <>{text.split(/(\[\d+\])/g).map((part, index) => /^\[\d+\]$/.test(part) ? <a key={index} className="inline-citation" href={`#reference-${part.slice(1, -1)}`} aria-label={`Reference ${part.slice(1,-1)}`}>{part}</a> : part)}</>;
}
