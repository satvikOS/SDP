import { scenarioResultSchema, type ScenarioResult } from './scenario-schema';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'sdp.scenario-results.v2';
const EMPTY_RESULTS: ScenarioResult[] = [];
let cachedRaw: string | null = null;
let cachedResults = EMPTY_RESULTS;

export function loadScenarioResults(): ScenarioResult[] {
  if (typeof window === 'undefined') return EMPTY_RESULTS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? '[]';
    if (raw === cachedRaw) return cachedResults;
    const stored: unknown = JSON.parse(raw);
    const parsed = scenarioResultSchema.array().safeParse(stored);
    cachedRaw = raw;
    cachedResults = parsed.success ? parsed.data : EMPTY_RESULTS;
    return cachedResults;
  } catch {
    return EMPTY_RESULTS;
  }
}

function subscribeToScenarioResults(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('sdp:storage', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('sdp:storage', callback);
  };
}

export function useScenarioResults() {
  return useSyncExternalStore(subscribeToScenarioResults, loadScenarioResults, () => EMPTY_RESULTS);
}

export function saveScenarioResult(result: ScenarioResult) {
  const existing = loadScenarioResults().filter((item) => item.id !== result.id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([result, ...existing].slice(0, 30)));
  window.dispatchEvent(new Event('sdp:storage'));
}

export function deleteScenarioResult(id: string) {
  const remaining = loadScenarioResults().filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  window.dispatchEvent(new Event('sdp:storage'));
}

export function getScenarioResult(id: string) {
  return loadScenarioResults().find((item) => item.id === id);
}
