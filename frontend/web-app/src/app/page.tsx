import { ArrowUpRight, CircleDot, Plus, Radar, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { ModelStatus } from '@/components/ModelStatus';
import { StrategicField } from '@/components/StrategicField';

const fieldScenarios = [
  { title: 'Ordered acceleration', probability: 32, coordinates: { x: 72, y: 76 } },
  { title: 'Local resilience', probability: 27, coordinates: { x: 28, y: 68 } },
  { title: 'Capacity squeeze', probability: 24, coordinates: { x: 68, y: 26 } },
  { title: 'Fragmented retreat', probability: 17, coordinates: { x: 24, y: 22 } },
];

const signals = [
  { name: 'Permitting velocity', movement: '+18%', note: 'Faster in two priority markets' },
  { name: 'Contracted load', movement: '+11%', note: 'Concentration risk is rising' },
  { name: 'Cost of capital', movement: '+42 bps', note: 'Threshold now under review' },
];

export default function Home() {
  return (
    <div className="page-frame dashboard-page">
      <header className="page-topbar">
        <div>
          <span className="section-kicker">Friday decision briefing</span>
          <h1>Where the plan breaks first.</h1>
        </div>
        <div className="topbar-actions">
          <ModelStatus compact />
          <Link className="button button-primary" href="/scenarios/new"><Plus size={17} /> New brief</Link>
        </div>
      </header>

      <section className="decision-banner">
        <div className="decision-marker"><CircleDot size={18} /><span>Active decision</span></div>
        <div>
          <h2>Northstar 2033 infrastructure allocation</h2>
          <p>Which capacity bets remain defensible if demand growth and permitting reform do not arrive together?</p>
        </div>
        <Link href="/scenarios/new">Reframe brief <ArrowUpRight size={16} /></Link>
      </section>

      <section className="dashboard-grid">
        <div className="panel field-panel dashboard-field">
          <div className="panel-heading">
            <div><span className="section-kicker">Strategic field</span><h2>The scenario set is widening.</h2></div>
            <p>Distance shows how differently each future behaves.</p>
          </div>
          <StrategicField scenarios={fieldScenarios} />
        </div>

        <aside className="panel decision-brief-panel">
          <span className="section-kicker">Decision posture</span>
          <div className="posture-score"><strong>68</strong><span>readiness<br />index</span></div>
          <p>Current capital staging is robust in three futures. Capacity squeeze remains the material exposure.</p>
          <div className="brief-callout">
            <Radar size={18} />
            <div><strong>What changes the view</strong><span>Two consecutive quarters of contracted demand above 14% growth.</span></div>
          </div>
          <div className="brief-callout">
            <ShieldCheck size={18} />
            <div><strong>No-regret move</strong><span>Secure site options before committing construction capital.</span></div>
          </div>
        </aside>
      </section>

      <section className="signal-board">
        <div className="signal-heading"><span className="section-kicker">Signal watch</span><h2>Evidence moving this week</h2></div>
        {signals.map((signal) => (
          <article key={signal.name}>
            <span>{signal.name}</span>
            <strong>{signal.movement}</strong>
            <p>{signal.note}</p>
          </article>
        ))}
      </section>

      <section className="recent-table panel">
        <div className="panel-heading compact-heading">
          <div><span className="section-kicker">Working library</span><h2>Recent decision briefs</h2></div>
          <Link href="/scenarios">Open library <ArrowUpRight size={15} /></Link>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Decision</th><th>Horizon</th><th>Dominant uncertainty</th><th>Posture</th></tr></thead>
            <tbody>
              <tr><td>Infrastructure allocation</td><td>2033</td><td>Permitting × load growth</td><td><span className="table-status good">Ready to stage</span></td></tr>
              <tr><td>Market entry sequence</td><td>2030</td><td>Policy × channel power</td><td><span className="table-status watch">Research open</span></td></tr>
              <tr><td>Supply network redesign</td><td>2029</td><td>Trade blocs × automation</td><td><span className="table-status neutral">Brief due</span></td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
