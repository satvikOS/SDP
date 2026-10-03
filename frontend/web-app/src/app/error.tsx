'use client';

import { RotateCcw } from 'lucide-react';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page-frame">
      <section className="empty-library panel">
        <span className="section-kicker">Application error</span>
        <h2>This view could not be assembled.</h2>
        <p>Retry the operation. If it repeats, inspect the deployment logs before changing the brief.</p>
        <button className="button button-secondary" onClick={reset} type="button"><RotateCcw size={16} /> Retry</button>
      </section>
    </div>
  );
}
