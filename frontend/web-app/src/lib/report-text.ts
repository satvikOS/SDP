import type { ScenarioResult } from './scenario-schema';

function neutralText(text: string) {
  // Remove legacy reviewer attributions, not legitimate company names in a
  // client brief, source title or bibliography. Keep the underlying argument.
  return text.replace(/\b(?:xAI|Grok(?:\s+[\d.]+)?|OpenAI|GPT(?:[-\s][\w.]+)?|Gemini(?:\s+Flash)?|Google)\s+(review|signal analysis|analysis|synthesis|challenger|response)\b/gi, (_, role: string) => `independent ${role.toLowerCase()}`);
}
export function neutralReport(result: ScenarioResult): ScenarioResult {
  return { ...result, executiveSummary: neutralText(result.executiveSummary), dissent: neutralText(result.dissent),
    drivers: result.drivers.map((d) => ({ ...d, assessment: neutralText(d.assessment) })),
    scenarios: result.scenarios.map((s) => ({ ...s, thesis: neutralText(s.thesis), narrative: neutralText(s.narrative), avoid: neutralText(s.avoid), keyDrivers: s.keyDrivers.map(neutralText), signposts: s.signposts.map(neutralText), strategicMoves: s.strategicMoves.map(neutralText) })),
    robustActions: result.robustActions.map((a) => ({ ...a, action: neutralText(a.action), rationale: neutralText(a.rationale) })),
  };
}
