import { describe, expect, it } from 'vitest';
import { assessScenarioProbabilities } from './probability';
import { scenarioDraftSchema } from './scenario-schema';

const scenarios = Array.from({ length: 4 }, (_, i) => ({
  title: `Conditional scenario ${i+1}`, thesis: 'A test premise for a conditional future, not a historical factual assertion.',
  narrative: 'This is an explicitly hypothetical test scenario used to verify reproducible weights. It is not evidence or an externally verified forecast. No business claim is made here.',
  probability: 25, coordinates: { x: 20+i*20, y: 20+i*20 }, keyDrivers: ['Test driver A', 'Test driver B'],
  signposts: ['Proposed observation A', 'Proposed observation B', 'Proposed observation C'], strategicMoves: ['Hypothetical response A', 'Hypothetical response B'], avoid: 'Avoid treating test fixtures as real evidence.',
  sourceIds: [1], evidenceFactors: [1,2,3].map((claimId) => ({ claimId, likelihood: 0.25+i*0.14+claimId*0.035, rationale: 'A hypothetical likelihood judgment for a test fixture.' })),
}));
const parsed = scenarioDraftSchema.shape.scenarios.parse(scenarios);
describe('conditional evidence weights', () => {
  it('is repeatable, sums to 100 and gives sensitivity bounds', () => {
    const result = assessScenarioProbabilities(parsed, [1,2,3]);
    expect(result).toEqual(assessScenarioProbabilities(parsed, [1,2,3]));
    expect(result.reduce((sum,s) => sum+s.probability,0)).toBeCloseTo(100, 8);
    result.forEach((s) => { expect(s.probabilityRange[0]).toBeLessThan(s.probability); expect(s.probabilityRange[1]).toBeGreaterThan(s.probability); });
    expect(new Set(result.map((s) => s.probability)).size).toBe(4);
  });
  it('refuses rejected, missing or duplicated weighting inputs', () => {
    expect(() => assessScenarioProbabilities(parsed, [1,2])).toThrow();
    expect(() => assessScenarioProbabilities(parsed.map((s,i) => i ? s : { ...s, evidenceFactors: [...s.evidenceFactors,s.evidenceFactors[0]] }), [1,2,3])).toThrow();
  });
  it('keeps valid small conditional weights readable and saveable', () => {
    const ids = [1,2,3,4,5,6];
    const extreme = parsed.map((s,i) => ({ ...s, evidenceFactors: ids.map((claimId) => ({claimId, likelihood: i === 0 ? 0.1 : 0.9, rationale:'A deliberately extreme hypothetical judgment for validation testing.'})) }));
    const result = assessScenarioProbabilities(extreme, ids);
    expect(result[0].probability).toBeLessThan(1);
    expect(() => scenarioDraftSchema.shape.scenarios.parse(result)).not.toThrow();
    expect(result.reduce((sum,s) => sum+s.probability,0)).toBeCloseTo(100,8);
  });
});
