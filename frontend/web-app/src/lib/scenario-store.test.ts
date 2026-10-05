import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sample } from './scenario-fixtures.test-data';
const durable = vi.hoisted(() => new Map<string, unknown>());
vi.mock('./scenario-document-store', () => ({
  storeLibraryRecord: vi.fn(async (record) => { durable.set(record.id, record); }),
  persistScenarioPdf: vi.fn(async () => new Blob(['%PDF-test'])),
  deleteScenarioPdf: vi.fn(async () => {}),
  removeLibraryRecord: vi.fn(async (id) => { durable.delete(id); }),
  loadLibraryRecords: vi.fn(async () => [...durable.values()]),
}));
import { deleteScenarioResult, loadScenarioResults, restoreLibraryRecord, saveScenarioResult, permanentlyDeleteLibraryRecord } from './scenario-store';
beforeEach(() => {
  const values = new Map<string,string>();
  const events = new EventTarget();
  vi.stubGlobal('window', Object.assign(events, { localStorage: { getItem: (k:string) => values.get(k) ?? null, setItem: (k:string,v:string) => values.set(k,v) } }));
  durable.clear();
});
describe('recoverable report library', () => {
  it('keeps a durable analysis and PDF through removal, then restores it', async () => {
    await saveScenarioResult(sample);
    expect(loadScenarioResults()[0].id).toBe(sample.id);
    await deleteScenarioResult(sample.id);
    expect(loadScenarioResults()).toHaveLength(0);
    expect(durable.has(sample.id)).toBe(true);
    const storage = await import('./scenario-document-store');
    expect(storage.deleteScenarioPdf).not.toHaveBeenCalled();
    await restoreLibraryRecord(sample.id);
    expect(loadScenarioResults()[0].briefTitle).toBe(sample.briefTitle);
  });
  it('an invalid record does not hide other reports; expired horizons stay readable', () => {
    window.localStorage.setItem('sdp.scenario-results.v2', JSON.stringify([{}, { ...sample, request: { ...sample.request, horizonYear: 2020 } }]));
    expect(loadScenarioResults()).toHaveLength(1);
  });
  it('permanent deletion is an explicit separate operation', async () => {
    await saveScenarioResult(sample); await deleteScenarioResult(sample.id);
    await permanentlyDeleteLibraryRecord(sample.id);
    expect(durable.has(sample.id)).toBe(false);
    const storage = await import('./scenario-document-store');
    expect(storage.deleteScenarioPdf).toHaveBeenCalledWith(sample.id);
  });
});
