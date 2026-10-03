import type { Metadata } from 'next';

import { RuntimePanel } from '@/components/RuntimePanel';

export const metadata: Metadata = { title: 'Runtime' };

export default function SettingsPage() {
  return (
    <div className="page-frame text-page">
      <header className="page-topbar">
        <div><span className="section-kicker">Runtime</span><h1>Every model has one explicit job.</h1><p>Provider credentials stay server-side and are injected by GitHub Actions during Vercel deployment.</p></div>
      </header>
      <RuntimePanel />
      <section className="panel runtime-guidance">
        <div><span className="section-kicker">Secret contract</span><h2>GitHub Actions</h2><p><code>XAI_API</code>, <code>GEMINI_API</code>, and <code>OPENAI_API</code> are the only provider secret names used by the application.</p></div>
        <div><span className="section-kicker">Deployment contract</span><h2>Vercel</h2><p>The deployment workflow passes the three values as encrypted runtime variables. No provider key is written to a repository environment file.</p></div>
      </section>
    </div>
  );
}
