import { describe, expect, it } from 'vitest';
import { sample } from '../scenario-fixtures.test-data';
import { reportProseProblems } from './report-quality';

describe('publication prose gate', () => {
  it('accepts complete prose, including trailing numbered citations', () => {
    expect(reportProseProblems({ ...sample, dissent: `${sample.dissent} [1][2]` })).toEqual([]);
  });
  it('rejects clipped sentences and internal probability placeholder text', () => {
    const clipped = { ...sample, executiveSummary: 'Scenario probabilities are placeholders, not probability estimates.', dissent: 'The analysis does not establish,', scenarios: sample.scenarios.map((s, i) => i === 0 ? { ...s, thesis: 'Preserve the opportunity while limiting single-' } : s) };
    expect(reportProseProblems(clipped).join(' ')).toContain('scenarios[0].thesis');
    expect(reportProseProblems(clipped).join(' ')).toContain('dissent');
    expect(reportProseProblems(clipped).join(' ')).toContain('remove internal placeholder instructions');
  });
});
