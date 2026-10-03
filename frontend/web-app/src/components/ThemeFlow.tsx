'use client';

import { useEffect } from 'react';

const MIN_DELAY = 75_000;
const DELAY_RANGE = 40_000;

export function ThemeFlow() {
  useEffect(() => {
    const root = document.documentElement;
    let timer: number;

    const schedule = () => {
      timer = window.setTimeout(() => {
        const current = root.dataset.accent === 'moss' ? 'moss' : 'blue';
        root.dataset.accent = current === 'blue' ? 'moss' : 'blue';
        schedule();
      }, MIN_DELAY + Math.random() * DELAY_RANGE);
    };

    if (!root.dataset.accent) {
      root.dataset.accent = Math.random() > 0.5 ? 'moss' : 'blue';
    }
    schedule();
    return () => window.clearTimeout(timer);
  }, []);

  return <div className="ambient-flow" aria-hidden="true"><i /><i /><i /></div>;
}
