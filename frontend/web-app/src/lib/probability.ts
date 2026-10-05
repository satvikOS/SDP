import type { ScenarioDraft } from './scenario-schema';

// A fixed prior and explicit likelihood matrix make identical inputs reproducible.
// These are conditional judgments, not frequencies learned from historical outcomes.
export function assessScenarioProbabilities(scenarios: ScenarioDraft['scenarios'], acceptedClaimIds: number[]) {
  const sharedClaims = acceptedClaimIds.filter((id) => scenarios.every((s) => s.evidenceFactors.some((f) => f.claimId === id)));
  if (sharedClaims.length < 3) throw new Error('At least three shared, accepted evidence factors are required for scenario weighting.');
  const expected = [...sharedClaims].sort().join(',');
  if (scenarios.some((s) => s.evidenceFactors.map((f) => f.claimId).sort().join(',') !== expected)) throw new Error('Every scenario must use the same unique accepted evidence factors.');
  const calculate = (shift: number, target = -1) => {
    const logWeights = scenarios.map((scenario, index) => sharedClaims.reduce((sum, id) => {
      const likelihood = scenario.evidenceFactors.find((factor) => factor.claimId === id)!.likelihood;
      // Temper correlated evidence; one source cannot manufacture extreme certainty.
      const variation = index === target ? shift : -shift;
      return sum + Math.log(Math.min(0.95, Math.max(0.05, likelihood + variation))) / Math.sqrt(sharedClaims.length);
    }, Math.log(0.25)));
    const max = Math.max(...logWeights);
    const weights = logWeights.map((value) => Math.exp(value - max));
    const total = weights.reduce((sum, value) => sum + value, 0);
    return weights.map((value) => value / total * 100);
  };
  const center = calculate(0);
  const points = center.map((value, index) => [calculate(-0.1, index)[index], value, calculate(0.1, index)[index]]);
  const rounded = center.map((value) => Math.floor(value * 10) / 10);
  let remaining = Math.round((100 - rounded.reduce((sum, value) => sum + value, 0)) * 10);
  const order = center.map((value, index) => ({ index, remainder: value - rounded[index] })).sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; remaining > 0; i += 1, remaining -= 1) rounded[order[i % order.length].index] += 0.1;
  return scenarios.map((scenario, index) => ({
    ...scenario,
    probability: Number(rounded[index].toFixed(1)),
    probabilityRange: [Number(Math.min(...points[index]).toFixed(1)), Number(Math.max(...points[index]).toFixed(1))] as [number, number],
  }));
}

export const probabilityMethod = 'Equal 25% priors updated by the same accepted evidence factors for all four scenarios. Likelihood judgments are combined in log space and tempered for correlation, then normalized to 100%. Each sensitivity bound shifts the target scenario likelihoods by 0.10 and the competing likelihoods in the opposite direction (clamped to 0.05–0.95). These ranges are not empirical confidence intervals. Identical evidence and likelihood inputs produce identical weights; separate research runs may differ. Future scenarios cannot be known with certainty.';
