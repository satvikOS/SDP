'use client';

import { ArrowDownRight, ArrowUpRight, Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AriaButton, AriaTextField } from './ui/AriaControls';

type Signal = {
  id: string;
  name: string;
  source: string;
  direction: 'Rising' | 'Stable' | 'Falling';
  note: string;
  updatedAt: string;
};

const KEY = 'sdp.signals.v1';

export function SignalsBoard() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [name, setName] = useState('');
  const [source, setSource] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setSignals(JSON.parse(window.localStorage.getItem(KEY) ?? '[]')); } catch { setSignals([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function persist(next: Signal[]) {
    setSignals(next);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }

  function add() {
    if (!name.trim()) return;
    persist([{ id: crypto.randomUUID(), name: name.trim(), source: source.trim() || 'Manual observation', direction: 'Stable', note: '', updatedAt: new Date().toISOString() }, ...signals]);
    setName('');
    setSource('');
  }

  const icons = { Rising: ArrowUpRight, Stable: Minus, Falling: ArrowDownRight };

  return (
    <div className="signals-layout">
      <section className="signal-entry glass-panel">
        <div className="panel-title"><div><span className="eyebrow">Add signal</span><h2>Record observable evidence</h2></div></div>
        <AriaTextField label="Signal" value={name} onChange={setName} placeholder="Regulatory approval times" />
        <AriaTextField label="Source" value={source} onChange={setSource} placeholder="Agency release, research, interview" />
        <AriaButton className="button primary-button" onPress={add}><Plus size={16} /> Add signal</AriaButton>
      </section>

      <section className="signal-list">
        {signals.map((signal) => {
          const Icon = icons[signal.direction];
          return (
            <article className="signal-card glass-panel" key={signal.id}>
              <div className="signal-icon"><Icon size={18} /></div>
              <div><span>{signal.source}</span><h2>{signal.name}</h2><input value={signal.note} onChange={(event) => persist(signals.map((item) => item.id === signal.id ? { ...item, note: event.target.value, updatedAt: new Date().toISOString() } : item))} placeholder="Add an observation" aria-label={`Observation for ${signal.name}`} /></div>
              <select value={signal.direction} onChange={(event) => persist(signals.map((item) => item.id === signal.id ? { ...item, direction: event.target.value as Signal['direction'] } : item))} aria-label={`Direction for ${signal.name}`}>
                <option>Rising</option><option>Stable</option><option>Falling</option>
              </select>
              <AriaButton aria-label={`Delete ${signal.name}`} onPress={() => persist(signals.filter((item) => item.id !== signal.id))}><Trash2 size={16} /></AriaButton>
            </article>
          );
        })}
        {signals.length === 0 && <div className="empty-state glass-panel"><h2>No signals tracked yet</h2><p>Add evidence that could strengthen, weaken, or distinguish a scenario.</p></div>}
      </section>
    </div>
  );
}
