'use client';

import { useEffect, useState } from 'react';

type Health = {
  status: 'ready' | 'configuration_required';
  providers: {
    xai: boolean;
    google: boolean;
    openai: boolean;
  };
};

export function ModelStatus({ compact = false }: { compact?: boolean }) {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/health', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: Health) => active && setHealth(data))
      .catch(() => active && setHealth(null));
    return () => {
      active = false;
    };
  }, []);

  const ready = health?.status === 'ready';
  const label = ready
    ? 'Three-model runtime ready'
    : health
      ? 'Provider configuration required'
      : 'Checking model runtime';

  return (
    <div className="runtime-status" data-ready={ready} data-compact={compact}>
      <span className="status-pulse" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
