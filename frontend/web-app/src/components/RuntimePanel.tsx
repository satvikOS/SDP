'use client';

import { Check, CircleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

type RuntimeHealth = {
  status: 'ready' | 'configuration_required';
  providers: {
    xai: boolean;
    google: boolean;
    openai: boolean;
    models: { xai: string; google: string; openai: string };
  };
};

export function RuntimePanel() {
  const [health, setHealth] = useState<RuntimeHealth | null>(null);

  useEffect(() => {
    fetch('/api/health', { cache: 'no-store' }).then((response) => response.json()).then(setHealth).catch(() => setHealth(null));
  }, []);

  const providers = health ? [
    { name: 'xAI', model: health.providers.models.xai, ready: health.providers.xai, role: 'Assumption challenger' },
    { name: 'Google', model: health.providers.models.google, ready: health.providers.google, role: 'Signal analyst' },
    { name: 'OpenAI', model: health.providers.models.openai, ready: health.providers.openai, role: 'Scenario synthesizer' },
  ] : [];

  return (
    <div className="runtime-grid">
      {providers.map((provider) => (
        <article className="runtime-card" data-ready={provider.ready} key={provider.name}>
          {provider.ready ? <Check size={18} /> : <CircleAlert size={18} />}
          <span>{provider.name}</span>
          <h2>{provider.model}</h2>
          <p>{provider.role}</p>
          <small>{provider.ready ? 'Credential injected at runtime' : 'Action secret not present in runtime'}</small>
        </article>
      ))}
      {!health && <div className="library-loading">Checking runtime…</div>}
    </div>
  );
}
