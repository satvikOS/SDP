'use client';

import { ArrowRight, Compass, FileStack, GitCompareArrows, Radar } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const openers = [
  'Hello', 'Hi', 'Welcome', 'Hey', 'Good day', 'Good to see you', 'Glad you’re here',
  'Nice to see you', 'Welcome in', 'Ready when you are', 'Let’s begin', 'Let’s get oriented',
  'You’re back', 'Sup',
];
const continuations = [
  '', 'Build a clearer view.', 'Start with the decision.', 'Make uncertainty useful.',
  'Pressure-test the plan.', 'Explore what changes.', 'See the options.', 'Prepare for more than one future.',
  'Find the robust move.', 'Turn signals into choices.', 'Map the uncertainty.', 'Challenge the default path.',
  'Rehearse the decision.', 'Look beyond the forecast.', 'Test the assumptions.', 'Open a new perspective.',
  'Trace the consequences.', 'Find the decision edge.', 'Build a resilient position.', 'Start with what is uncertain.',
];

const capabilities = [
  { icon: Compass, title: 'Frame', body: 'Define the choice, constraints, geography, industry, and planning horizon.' },
  { icon: Radar, title: 'Explore', body: 'Build distinct operating environments and the signals that separate them.' },
  { icon: GitCompareArrows, title: 'Compare', body: 'Test actions across scenarios and identify exposure shared across the portfolio.' },
  { icon: FileStack, title: 'Present', body: 'Review evidence and export a concise decision brief for discussion.' },
];

export function WelcomeHero() {
  const greetings = useMemo(() => openers.flatMap((opener) => continuations.map((line) => [opener, line] as const)), []);
  const [index, setIndex] = useState(0);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    const initialize = window.setTimeout(() => {
      const seen = window.localStorage.getItem('sdp.visited') === 'true';
      setReturning(seen);
      window.localStorage.setItem('sdp.visited', 'true');
      setIndex(Math.floor(Math.random() * greetings.length));
    }, 0);
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 17) % greetings.length);
    }, 9_000);
    return () => {
      window.clearTimeout(initialize);
      window.clearInterval(timer);
    };
  }, [greetings.length]);

  const [greeting, continuation] = greetings[index];
  const displayedGreeting = returning && greeting === 'Welcome' ? 'Welcome back' : greeting;

  return (
    <main className="welcome-page" id="main-content">
      <section className="welcome-hero">
        <div className="greeting-window" aria-live="polite">
          <span key={`${displayedGreeting}-${continuation}`}>{displayedGreeting}.</span>
        </div>
        <h1>Develop scenarios that improve the decision.</h1>
        <p>{continuation || 'A structured workspace for decisions shaped by uncertainty.'}</p>
        <div className="welcome-actions">
          <Link className="button primary-button" href="/workspace/new">Start a scenario <ArrowRight size={17} /></Link>
          <Link className="button quiet-button" href="/workspace">Open workspace</Link>
        </div>
      </section>

      <section className="capability-row" aria-label="Workflow">
        {capabilities.map((item) => (
          <article key={item.title}>
            <item.icon size={20} aria-hidden="true" />
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
