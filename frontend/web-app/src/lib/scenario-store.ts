import { scenarioResultSchema, type ScenarioResult } from './scenario-schema';
import { useSyncExternalStore } from 'react';
import type { LibraryRecord } from './scenario-document-store';

const STORAGE_KEY = 'sdp.scenario-results.v2';
const COMPARE_KEY = 'sdp.compare.v1';
const TRASH_KEY = 'sdp.scenario-trash.v1';
const IMPORT_KEY = 'sdp.imported-reports.v1';
const EMPTY_RECORDS: LibraryRecord[] = [];
const recordCache = new Map<string, { raw: string; records: LibraryRecord[] }>();
let hydrated = false;
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
    cachedRaw = raw;
    cachedResults = Array.isArray(stored) ? stored.flatMap((item) => {
      const parsed = scenarioResultSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }) : EMPTY_RESULTS;
    return cachedResults;
  } catch {
    return EMPTY_RESULTS;
  }
}

function subscribeToScenarioResults(callback: () => void) {
  if (!hydrated) {
    hydrated = true;
    void hydrateLibrary().catch(() => { hydrated = false; });
  }
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

export async function saveScenarioResult(result: ScenarioResult) {
  const { storeLibraryRecord, persistScenarioPdf } = await import('./scenario-document-store');
  // Commit a durable copy before exposing the report as saved.
  await storeLibraryRecord({ id: result.id, result });
  const blob = await persistScenarioPdf(result);
  const existing = loadScenarioResults().filter((item) => item.id !== result.id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([result, ...existing]));
  window.dispatchEvent(new Event('sdp:storage'));
  if ('storage' in navigator && 'persist' in navigator.storage) {
    void navigator.storage.persist().catch(() => false);
  }
  return { pdfSaved: Boolean(blob) };
}

// Removal is recoverable; neither analysis nor PDF is destroyed here.
export async function deleteScenarioResult(id: string) {
  const result = getScenarioResult(id);
  if (!result) return;
  const record = { id, result, deletedAt: new Date().toISOString() };
  await (await import('./scenario-document-store')).storeLibraryRecord(record);
  writeRecords(TRASH_KEY, [record, ...readRecords(TRASH_KEY).filter((r) => r.id !== id)]);
  const remaining = loadScenarioResults().filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  window.dispatchEvent(new Event('sdp:storage'));
}

function readRecords(key: string): LibraryRecord[] {
  if (typeof window === 'undefined') return EMPTY_RECORDS;
  const raw = window.localStorage.getItem(key) ?? '[]';
  if (recordCache.get(key)?.raw === raw) return recordCache.get(key)!.records;
  try {
    const value: unknown = JSON.parse(raw);
    const records = Array.isArray(value) ? value.filter((r): r is LibraryRecord => r && typeof r.id === 'string') : EMPTY_RECORDS;
    recordCache.set(key, { raw, records }); return records;
  } catch { return EMPTY_RECORDS; }
}
function writeRecords(key: string, records: LibraryRecord[]) {
  window.localStorage.setItem(key, JSON.stringify(records));
  window.dispatchEvent(new Event('sdp:storage'));
}
export function useLibraryTrash() { return useSyncExternalStore(subscribeToScenarioResults, () => readRecords(TRASH_KEY), () => EMPTY_RECORDS); }
export function useImportedReports() { return useSyncExternalStore(subscribeToScenarioResults, () => readRecords(IMPORT_KEY), () => EMPTY_RECORDS); }
export async function importLibraryPdf(file: File) {
  const record = await (await import('./scenario-document-store')).storeImportedPdf(file);
  writeRecords(IMPORT_KEY, [record, ...readRecords(IMPORT_KEY)]);
  if (navigator.storage?.persist) void navigator.storage.persist();
  return record.id;
}
export async function trashImportedReport(id: string) {
  const item = readRecords(IMPORT_KEY).find((r) => r.id === id);
  if (!item) return;
  const record = { ...item, deletedAt: new Date().toISOString() };
  await (await import('./scenario-document-store')).storeLibraryRecord(record);
  writeRecords(TRASH_KEY, [record, ...readRecords(TRASH_KEY).filter((r) => r.id !== id)]);
  writeRecords(IMPORT_KEY, readRecords(IMPORT_KEY).filter((r) => r.id !== id));
}
export async function restoreLibraryRecord(id: string) {
  const item = readRecords(TRASH_KEY).find((r) => r.id === id);
  if (!item) return;
  const record = { ...item, deletedAt: undefined };
  await (await import('./scenario-document-store')).storeLibraryRecord(record);
  if (record.result) window.localStorage.setItem(STORAGE_KEY, JSON.stringify([record.result, ...loadScenarioResults().filter((r) => r.id !== id)]));
  else writeRecords(IMPORT_KEY, [record, ...readRecords(IMPORT_KEY).filter((r) => r.id !== id)]);
  writeRecords(TRASH_KEY, readRecords(TRASH_KEY).filter((r) => r.id !== id));
}
export async function permanentlyDeleteLibraryRecord(id: string) {
  if (!readRecords(TRASH_KEY).some((record) => record.id === id)) throw new Error('Only a report already in Trash can be permanently deleted.');
  const storage = await import('./scenario-document-store');
  await storage.removeLibraryRecord(id);
  await storage.deleteScenarioPdf(id);
  writeRecords(TRASH_KEY, readRecords(TRASH_KEY).filter((r) => r.id !== id));
}
async function hydrateLibrary() {
  const storage = await import('./scenario-document-store');
  const saved = await storage.loadLibraryRecords();
  const active = loadScenarioResults(), trash = readRecords(TRASH_KEY), imports = readRecords(IMPORT_KEY);
  const byId = new Map(saved.map((r) => [r.id, r]));
  active.forEach((result) => { if (!byId.get(result.id)?.deletedAt) byId.set(result.id, { id: result.id, result }); });
  imports.forEach((r) => { if (!byId.get(r.id)?.deletedAt) byId.set(r.id, r); });
  trash.forEach((r) => byId.set(r.id, r));
  const records = [...byId.values()];
  await Promise.all(records.map((r) => storage.storeLibraryRecord(r)));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.filter((r) => !r.deletedAt && r.result).map((r) => r.result)));
  writeRecords(IMPORT_KEY, records.filter((r) => !r.deletedAt && r.name));
  writeRecords(TRASH_KEY, records.filter((r) => r.deletedAt));
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
