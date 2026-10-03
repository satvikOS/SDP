import { z } from 'zod';

const conciseText = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

export const scenarioRequestSchema = z.object({
  organization: conciseText(2, 120),
  industry: conciseText(2, 100),
  region: conciseText(2, 100),
  horizonYear: z.number().int().min(new Date().getFullYear() + 1).max(2100),
  focalQuestion: conciseText(20, 500),
  strategicContext: conciseText(40, 4000),
  knownUncertainties: z.array(conciseText(3, 180)).max(8).default([]),
});

export const scenarioDraftSchema = z.object({
  briefTitle: conciseText(4, 100),
  executiveSummary: conciseText(80, 1400),
  drivers: z.array(
    z.object({
      name: conciseText(2, 80),
      assessment: conciseText(20, 300),
      impact: z.enum(['high', 'medium']),
      uncertainty: z.enum(['high', 'medium', 'low']),
      direction: z.enum(['accelerating', 'steady', 'slowing', 'uncertain']),
    }),
  ).min(4).max(8),
  scenarios: z.array(
    z.object({
      title: conciseText(3, 70),
      thesis: conciseText(20, 220),
      narrative: conciseText(120, 1500),
      probability: z.number().min(1).max(97),
      coordinates: z.object({
        x: z.number().min(8).max(92),
        y: z.number().min(8).max(92),
      }),
      keyDrivers: z.array(conciseText(3, 100)).min(2).max(5),
      signposts: z.array(conciseText(8, 180)).min(3).max(6),
      strategicMoves: z.array(conciseText(8, 180)).min(2).max(5),
      avoid: conciseText(10, 220),
    }),
  ).length(4),
  robustActions: z.array(
    z.object({
      action: conciseText(8, 180),
      rationale: conciseText(20, 320),
      timing: z.enum(['now', 'next 90 days', 'this year']),
    }),
  ).min(3).max(6),
  criticalUnknowns: z.array(conciseText(8, 180)).min(3).max(8),
  dissent: conciseText(30, 500),
});

export const modelContributionSchema = z.object({
  provider: z.enum(['xAI', 'Google', 'OpenAI']),
  model: z.string(),
  role: z.enum(['challenger', 'signal analyst', 'synthesizer']),
  durationMs: z.number().nonnegative(),
});

export const scenarioResultSchema = scenarioDraftSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  request: scenarioRequestSchema,
  provenance: z.array(modelContributionSchema).length(3),
});

export type ScenarioRequest = z.infer<typeof scenarioRequestSchema>;
export type ScenarioDraft = z.infer<typeof scenarioDraftSchema>;
export type ScenarioResult = z.infer<typeof scenarioResultSchema>;

export function normalizeProbabilities(scenarios: ScenarioDraft['scenarios']) {
  const total = scenarios.reduce((sum, scenario) => sum + scenario.probability, 0);

  if (total <= 0) {
    return scenarios.map((scenario, index) => ({
      ...scenario,
      probability: index === 0 ? 25 : 25,
    }));
  }

  const normalized = scenarios.map((scenario) => ({
    ...scenario,
    probability: Math.max(1, Math.round((scenario.probability / total) * 100)),
  }));
  const difference = 100 - normalized.reduce((sum, scenario) => sum + scenario.probability, 0);
  normalized[0] = {
    ...normalized[0],
    probability: normalized[0].probability + difference,
  };

  return normalized;
}
