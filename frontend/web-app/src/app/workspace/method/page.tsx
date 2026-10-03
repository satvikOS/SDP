import type { Metadata } from 'next';
import { GitBranch, Radar, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = { title: 'Method' };

const steps = [
  { icon: Radar, title: 'Frame the decision', body: 'Start with a choice and horizon. A topic produces an essay; a decision produces useful scenarios.' },
  { icon: GitBranch, title: 'Develop alternatives', body: 'Build meaningfully different assumptions before synthesis can average them away.' },
  { icon: ShieldCheck, title: 'Test the plan', body: 'Compare actions across all four scenarios. Prefer moves that create learning, options, or resilience.' },
];

const principles = [
  ['Separate evidence from inference', 'Unsupported claims become explicit research questions.'],
  ['Preserve disagreement', 'The final brief records the assumption behind a meaningful difference in interpretation.'],
  ['Review the complete set', 'Planning weight is not a forecast. Test the strategy beyond the preferred future.'],
  ['Connect futures to signals', 'Each scenario names what to monitor and what change should trigger action.'],
];

export default function MethodPage() {
  return (
    <div className="workspace-page method-page">
      <header className="workspace-header"><div><span className="eyebrow">Method</span><h1>Rehearse decisions. Do not predict.</h1></div><p>Make the assumptions carrying the decision visible, then decide what evidence should change the plan.</p></header>
      <section className="method-flow">
        {steps.map((step) => (
          <article key={step.title}><step.icon size={20} /><h2>{step.title}</h2><p>{step.body}</p></article>
        ))}
      </section>
      <section className="principle-grid">
        {principles.map(([title, body]) => <article key={title}><h2>{title}</h2><p>{body}</p></article>)}
      </section>
    </div>
  );
}
