import { describe, expect, it } from 'vitest';

import {
  normalizeProbabilities,
  scenarioDraftSchema,
  scenarioRequestSchema,
} from './scenario-schema';

const request = {
  organization: 'Northstar Energy',
  industry: 'Energy',
  region: 'North America',
  horizonYear: new Date().getFullYear() + 8,
  focalQuestion: 'Where should we place our next major infrastructure bet?',
  strategicContext: 'The company is balancing grid resilience, new load growth, and capital discipline across multiple regulated markets.',
  knownUncertainties: ['Permitting speed', 'Cost of capital'],
};

const baseScenario = {
  title: 'Measured transition',
  thesis: 'Infrastructure investment follows demand with disciplined staging.',
  narrative: 'A measured transition preserves flexibility while demand signals strengthen. Capital is released in stages, operating teams validate adoption, and leadership protects the option to accelerate when evidence clears the investment threshold.',
  probability: 10,
  coordinates: { x: 20, y: 20 },
  keyDrivers: ['Load growth', 'Permitting'],
  signposts: ['Interconnection queues fall for two consecutive quarters', 'Capacity contracts clear above the investment threshold', 'Permitting cycle time drops below eighteen months'],
  strategicMoves: ['Stage capital against verified demand', 'Secure options on constrained sites'],
  avoid: 'Avoid committing all capital before demand and permitting evidence converge.',
};

describe('scenario schemas', () => {
  it('accepts a complete bounded brief', () => {
    expect(scenarioRequestSchema.parse(request).organization).toBe('Northstar Energy');
  });

  it('rejects an underspecified focal question', () => {
    expect(() => scenarioRequestSchema.parse({ ...request, focalQuestion: 'What next?' })).toThrow();
  });

  it('normalizes scenario weights to 100', () => {
    const draft = scenarioDraftSchema.parse({
      briefTitle: 'Northstar infrastructure choices',
      executiveSummary: 'The decision depends on whether load growth and permitting reform arrive together. A staged portfolio protects downside while keeping acceleration options open across four plausible operating environments.',
      drivers: Array.from({ length: 4 }, (_, index) => ({
        name: `Driver ${index + 1}`,
        assessment: 'This driver changes both the timing and reversibility of the capital commitment.',
        impact: 'high',
        uncertainty: 'high',
        direction: 'uncertain',
      })),
      scenarios: Array.from({ length: 4 }, (_, index) => ({
        ...baseScenario,
        title: `Scenario ${index + 1}`,
        probability: (index + 1) * 10,
      })),
      robustActions: Array.from({ length: 3 }, (_, index) => ({
        action: `Sequence portfolio commitment ${index + 1}`,
        rationale: 'The action creates learning before the organization makes an irreversible capital commitment.',
        timing: 'now',
      })),
      criticalUnknowns: ['Actual load timing', 'Permitting reform durability', 'Long-run financing cost'],
      dissent: 'The challenger believes the organization may be overestimating how quickly demand converts into contracted revenue.',
    });

    expect(normalizeProbabilities(draft.scenarios).reduce((sum, item) => sum + item.probability, 0)).toBe(100);
  });
});
