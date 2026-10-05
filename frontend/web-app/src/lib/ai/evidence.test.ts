import { describe, expect, it } from 'vitest';
import { sample } from '../scenario-fixtures.test-data';
import { assessEvidenceReview, assertCitations, canonicalUrl, mergeEvidenceSources } from './evidence';
import { evidenceReviewSchema, type EvidenceReview, type ScenarioResult } from '../scenario-schema';
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
  it('keeps independent review thresholds and excludes claims without admitted sources', () => {
    const references = citedFixture().evidence!.references.map((r, i) => ({ ...r, publisher: i < 2 ? 'Publisher A' : 'Publisher B' }));
    const review: EvidenceReview = {
      sourceAssessments: references.map((r) => ({ sourceId: r.id, admissible: true, reason: 'Test fixture only.' })),
      claims: Array.from({length:6}, (_,i) => ({id:i+10, text:'A hypothetical dated test assertion.', sourceIds:[1], supportingText:'Test evidence only.', verdict:'accepted', reason:'Test only.'})),
      argument:'A hypothetical counterargument for tests.',
    };
    expect(assessEvidenceReview(references, review).problems).toEqual([]);
    const unknown = { ...review, claims: review.claims.map((c) => ({ ...c, sourceIds:[99] })) };
    expect(assessEvidenceReview(references, unknown).accepted).toHaveLength(0);
    expect(assessEvidenceReview(references, unknown).claims.every((c) => c.verdict === 'uncertain')).toBe(true);
    expect(assessEvidenceReview(references, { ...review, claims: review.claims.map((c) => ({ ...c, id:1 })) }).problems.join(' ')).toContain('repeated');
    expect(assessEvidenceReview(references.map((r) => ({ ...r, publisher:'One publisher' })), review).problems.join(' ')).toContain('two publishers');
    const missing = { ...review, claims: review.claims.map((c) => ({ ...c, sourceIds: undefined })) };
    expect(evidenceReviewSchema.safeParse(missing).success).toBe(false);
  });
  it('adds verified independent sources without changing existing citation identities', () => {
    const references = citedFixture().evidence!.references;
    const merged = mergeEvidenceSources(references, [
      { ...references[0], url:`${references[0].url}?utm_source=test` },
      { ...references[0], url:'https://example.net/additional-primary-publication', publisher:'Independent publisher' },
    ]);
    expect(merged).toHaveLength(5);
    expect(merged.slice(0,4)).toEqual(references);
    expect(merged[4].id).toBe(5);
    expect(mergeEvidenceSources(references,merged,4)).toEqual(references);
  });
});
