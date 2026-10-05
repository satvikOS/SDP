import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sample } from '../scenario-fixtures.test-data';

const mocks = vi.hoisted(() => ({ generateText: vi.fn(), verifySearchSources: vi.fn() }));
vi.mock('ai', async (original) => ({ ...await original<typeof import('ai')>(), generateText: mocks.generateText }));
vi.mock('./evidence', async (original) => ({ ...await original<typeof import('./evidence')>(), verifySearchSources: mocks.verifySearchSources }));
import { generateScenarioSet } from './scenario-engine';

const sources = Array.from({ length: 4 }, (_, i) => ({ sourceType: 'url', url: `https://example.org/test-${i}`, title: 'Hypothetical test publication' }));
const references = sources.map((s, i) => ({ id: i + 1, title: s.title, url: s.url, publisher: i < 2 ? 'Test publisher A' : 'Test publisher B', accessedAt: '2026-10-04T12:00:00.000Z' }));
const review = {
  sourceAssessments: references.map((r) => ({ sourceId: r.id, admissible: true, reason: 'Mocked test source only.' })),
  claims: Array.from({ length: 6 }, (_, i) => ({ id: i + 11, text: 'Hypothetical test observation.', sourceIds: [1], supportingText: 'Mocked evidence, not an actual fact.', verdict: 'accepted', reason: 'Test only.' })),
  argument: 'Hypothetical counterargument for orchestration testing.',
};
const draft = {
  ...sample, executiveSummarySourceIds: [1], dissentSourceIds: [1],
  drivers: sample.drivers.map((d) => ({ ...d, sourceIds: [1] })),
  robustActions: sample.robustActions.map((a) => ({ ...a, sourceIds: [1] })),
  scenarios: sample.scenarios.map((s, i) => ({ ...s, sourceIds: [1], evidenceFactors: [11, 12, 13].map((claimId) => ({ claimId, likelihood: 0.2 + i * 0.15, rationale: 'Hypothetical likelihood, not a measured frequency.' })) })),
};

describe('evidence-based orchestration', () => {
  beforeEach(() => {
    for (const key of ['XAI_API', 'GEMINI_API', 'OPENAI_API']) vi.stubEnv(key, 'test-placeholder-not-a-key');
    mocks.generateText.mockReset();
    mocks.verifySearchSources.mockResolvedValue(references);
  });
  afterEach(() => vi.unstubAllEnvs());

  function configure(groundedAudit = true, approved = true) {
    mocks.generateText.mockImplementation(async ({ prompt }: { prompt: string }) => {
      const live = { sources, toolCalls: [], text: 'Hypothetical freshly retrieved test findings.' };
      if (prompt.startsWith('Research this decision')) return live;
      if (prompt.startsWith('Independently challenge')) return { ...live, output: review };
      if (prompt.startsWith('Use live search to cross-check')) return { ...live, output: draft };
      if (prompt.startsWith('Retrieve these publications')) return groundedAudit ? live : { sources: [], toolCalls: [], text: 'I claim I browsed, but have no provider trace.' };
      if (prompt.startsWith('Independently audit')) return { sources: [], toolCalls: [], output: { approved, unsupportedClaims: approved ? [] : ['Test unsupported assertion.'], citationErrors: [], reasoning: 'Mocked test verdict only.' } };
      throw new Error('Unexpected model phase in orchestration test.');
    });
  }

  it('requires fresh retrieval before the structured verdict and keeps alternating provider roles', async () => {
    configure();
    const result = await generateScenarioSet(sample.request);
    expect(mocks.generateText).toHaveBeenCalledTimes(5);
    expect(result.provenance.map((p) => [p.provider, p.role])).toEqual([
      ['Google', 'researcher'], ['xAI', 'challenger'], ['OpenAI', 'synthesizer'], ['Google', 'fact auditor'],
    ]);
    const finalPrompt = mocks.generateText.mock.calls[4][0].prompt;
    expect(finalPrompt).toContain('Hypothetical freshly retrieved test findings.');
    expect(result.scenarios.reduce((total, s) => total + s.probability, 0)).toBeCloseTo(100);
  });
  it('does not ask for or accept a verdict when fresh audit retrieval has no trace', async () => {
    configure(false);
    await expect(generateScenarioSet(sample.request)).rejects.toThrow('Live research did not run during the final fact audit');
    expect(mocks.generateText).toHaveBeenCalledTimes(4);
  });
  it('repairs incomplete prose before starting the independent final audit', async () => {
    configure();
    const normal = mocks.generateText.getMockImplementation()!;
    let firstSynthesis = true;
    mocks.generateText.mockImplementation(async (options) => {
      if (options.prompt.startsWith('Use live search to cross-check') && firstSynthesis) {
        firstSynthesis = false;
        return { sources, toolCalls: [], output: { ...draft, dissent: 'This test sentence is incomplete,' } };
      }
      return normal(options);
    });
    const result = await generateScenarioSet(sample.request);
    expect(result.dissent).toBe(draft.dissent);
    expect(mocks.generateText).toHaveBeenCalledTimes(6);
    expect(mocks.generateText.mock.calls[3][0].prompt).toContain('dissent: end with a complete sentence');
  });
  it('withholds a rejected report after one bounded repair and a new independent audit', async () => {
    configure(true, false);
    await expect(generateScenarioSet(sample.request)).rejects.toThrow('The final reference and fact audit did not pass');
    expect(mocks.generateText).toHaveBeenCalledTimes(8);
  });
});
