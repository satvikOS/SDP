'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Brand } from './Brand';

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
const greetings = openers.flatMap((opener) => continuations.map((line) => [opener, line] as const));

export function WelcomeHero() {
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
    }, 7_500);
    return () => {
      window.clearTimeout(initialize);
      window.clearInterval(timer);
    };
  }, []);

  const [greeting, continuation] = greetings[index];
  const displayedGreeting = returning && greeting === 'Welcome' ? 'Welcome back' : greeting;

  return (
    <main className="home-page" id="main-content">
      <div className="home-brand"><Brand /></div>
      <section className="welcome-core">
        <div className="greeting-window" aria-live="polite" key={`${displayedGreeting}-${continuation}`}>
          <span>{displayedGreeting}.</span>
          <p>{continuation || 'Ready when you are.'}</p>
        </div>
        <Link className="button home-cta" href="/workspace/new">Get started <ArrowRight size={16} /></Link>
      </section>
      <span className="home-caption">Scenario Development Process</span>
    </main>
  );
}
