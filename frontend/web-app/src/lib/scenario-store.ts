import { scenarioResultSchema, type ScenarioResult } from './scenario-schema';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'sdp.scenario-results.v2';
const COMPARE_KEY = 'sdp.compare.v1';
const EMPTY_RESULTS: ScenarioResult[] = [];
const EMPTY_IDS: string[] = [];
let cachedRaw: string | null = null;
let cachedResults = EMPTY_RESULTS;
let cachedCompareRaw: string | null = null;
let cachedCompareIds = EMPTY_IDS;

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

export function loadComparisonIds(): string[] {
  if (typeof window === 'undefined') return EMPTY_IDS;
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY) ?? '[]';
    if (raw === cachedCompareRaw) return cachedCompareIds;
    const parsed: unknown = JSON.parse(raw);
    cachedCompareRaw = raw;
    cachedCompareIds = Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string').slice(0, 3)
      : EMPTY_IDS;
    return cachedCompareIds;
  } catch {
    return EMPTY_IDS;
  }
}

export function useComparisonIds() {
  return useSyncExternalStore(subscribeToScenarioResults, loadComparisonIds, () => EMPTY_IDS);
}

export function toggleComparisonId(id: string) {
  const current = loadComparisonIds();
  const next = current.includes(id)
    ? current.filter((value) => value !== id)
    : [...current, id].slice(-3);
  window.localStorage.setItem(COMPARE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('sdp:storage'));
}
