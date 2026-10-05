import type { ScenarioDraft } from '../scenario-schema';

// Character limits must lead to concise writing, not silently clipped prose.
export function reportProseProblems(draft: ScenarioDraft) {
  const sections: [string, string][] = [
    ['executiveSummary', draft.executiveSummary], ['dissent', draft.dissent],
    ...draft.drivers.map((d, i): [string, string] => [`drivers[${i}].assessment`, d.assessment]),
    ...draft.scenarios.flatMap((s, i): [string, string][] => [
      [`scenarios[${i}].thesis`, s.thesis], [`scenarios[${i}].narrative`, s.narrative], [`scenarios[${i}].avoid`, s.avoid],
      ...s.evidenceFactors.map((f, j): [string, string] => [`scenarios[${i}].evidenceFactors[${j}].rationale`, f.rationale]),
    ]),
    ...draft.robustActions.map((a, i): [string, string] => [`robustActions[${i}].rationale`, a.rationale]),
  ];
  const proseProblems = sections.flatMap(([path, text]) => {
    const ending = text.replace(/(?:\s*\[\d+\])+\s*$/, '').trim();
    const issues = [];
    if (!/[.!?][”"')]*$/.test(ending)) issues.push(`${path}: end with a complete sentence, not a clipped fragment. Rewrite more concisely within its character limit.`);
    if (/\b(?:probabilit\w*|weights?)\b[^.!?]*\bplaceholders?\b|\bplaceholders?\b[^.!?]*\b(?:probabilit\w*|weights?)\b/i.test(text)) issues.push(`${path}: remove internal placeholder instructions; the published weights are calculated by the server.`);
    return issues;
  });
  const axisProblems = Object.entries(draft.strategicAxes).flatMap(([axis, label]) => /[-,:;]\s*$|\b(?:and|or|the|to|of|with|for)\s*$/i.test(label)
    ? [`strategicAxes.${axis}: this label is clipped. Use a complete, concise label under 26 characters.`] : []);
  return [...proseProblems, ...axisProblems];
}
