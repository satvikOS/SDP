import type { Metadata } from 'next';
import { ArrowDown, GitBranch, Radar, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = { title: 'Method' };

const steps = [
  { icon: Radar, title: 'Frame', body: 'Start with a decision and horizon. A topic produces essays; a choice produces useful scenarios.' },
  { icon: GitBranch, title: 'Diverge', body: 'Use independent models to expose different assumptions before any synthesis can average them away.' },
  { icon: ShieldCheck, title: 'Test', body: 'Compare actions across all four futures. Prefer moves that create learning, options, or resilience.' },
];

export default function HelpPage() {
  return (
    <div className="page-frame text-page">
      <header className="page-topbar">
        <div><span className="section-kicker">Method</span><h1>Scenarios are rehearsals, not predictions.</h1><p>SDP helps a team notice which assumptions carry the decision—and what evidence should change its posture.</p></div>
      </header>
      <section className="method-flow">
        {steps.map((step, index) => (
          <article key={step.title}>
            <step.icon size={22} />
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
            {index < steps.length - 1 && <ArrowDown className="method-arrow" size={18} />}
          </article>
        ))}
      </section>
      <section className="principle-grid">
        <article><span className="section-kicker">Rule one</span><h2>Keep evidence and inference separate.</h2><p>The models are not a source. Current claims need current evidence; unsupported claims become research questions.</p></article>
        <article><span className="section-kicker">Rule two</span><h2>Preserve disagreement.</h2><p>Dissent is a feature. If the models diverge, the final brief records what assumption caused the split.</p></article>
        <article><span className="section-kicker">Rule three</span><h2>Review the set, not the favorite.</h2><p>Planning weight is not a forecast. The job is to expose strategies that depend on one narrow future.</p></article>
        <article><span className="section-kicker">Rule four</span><h2>Attach every future to a signal.</h2><p>A scenario becomes operational when the team knows what to monitor and what action threshold follows.</p></article>
      </section>
    </div>
  );
}
