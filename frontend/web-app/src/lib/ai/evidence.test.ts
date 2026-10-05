import { describe, expect, it } from 'vitest';
import { sample } from '../scenario-fixtures.test-data';
import { assertCitations, canonicalUrl } from './evidence';
import type { ScenarioResult } from '../scenario-schema';
function citedFixture(): ScenarioResult {
  return { ...sample, executiveSummarySourceIds: [1], dissentSourceIds: [1],
    drivers: sample.drivers.map((d) => ({ ...d, sourceIds: [1] })),
    scenarios: sample.scenarios.map((s) => ({ ...s, sourceIds: [1], evidenceFactors: [{ claimId: 1, likelihood: 0.5, rationale: 'Test only, not a factual assertion.' }] })),
    robustActions: sample.robustActions.map((a) => ({ ...a, sourceIds: [1] })),
    evidence: { searchedAt: new Date().toISOString(), methodology: 'Test fixture only.', references: [1,2,3,4].map((id) => ({ id, title: 'Test reference', publisher: 'Test', url: `https://example.org/${id}`, accessedAt: new Date().toISOString() })), claims: [{ id: 1, text: 'Test claim only, not real evidence.', sourceIds: [1], supportingText: 'Test fixture.', verdict: 'accepted', reason: 'Test only.' }] } };
}
describe('reference gate', () => {
  it('rejects missing coverage, fabricated citation IDs and rejected weighting claims', () => {
    const good = citedFixture(); expect(() => assertCitations(good)).not.toThrow();
    expect(() => assertCitations({ ...good, executiveSummarySourceIds: [] })).toThrow();
    expect(() => assertCitations({ ...good, dissent: `${good.dissent} [99]` })).toThrow();
    expect(() => assertCitations({ ...good, evidence: { ...good.evidence!, claims: good.evidence!.claims.map((c) => ({ ...c, verdict: 'rejected' })) } })).toThrow();
  });
  it('removes tracking and fragment variations from source identities', () => {
    expect(canonicalUrl('https://example.org/research/?utm_source=test#section')).toBe('https://example.org/research');
  });
});
