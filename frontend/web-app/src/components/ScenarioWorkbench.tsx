'use client';

import { ArrowRight, Check, LoaderCircle, RotateCcw, Sparkles } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

import { scenarioResultSchema, type ScenarioResult } from '@/lib/scenario-schema';
import { saveScenarioResult } from '@/lib/scenario-store';
import { ModelStatus } from './ModelStatus';
import { ScenarioResultView } from './ScenarioResultView';

const currentYear = new Date().getFullYear();
const progressStages = [
  'Reading the decision brief',
  'Challenging hidden assumptions',
  'Mapping signals and causal drivers',
  'Constructing four alternative futures',
  'Testing actions across the set',
];

const initialForm = {
  organization: '',
  industry: '',
  region: 'Global',
  horizonYear: currentYear + 7,
  focalQuestion: '',
  strategicContext: '',
  knownUncertainties: '',
};

export function ScenarioWorkbench() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!isSubmitting) return;
    const timer = window.setInterval(
      () => setStage((value) => Math.min(value + 1, progressStages.length - 1)),
      7_000,
    );
    return () => window.clearInterval(timer);
  }, [isSubmitting]);

  const contextCount = form.strategicContext.length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setStage(0);
    setResult(null);

    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          knownUncertainties: form.knownUncertainties
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const message = typeof data === 'object' && data && 'error' in data
          ? String(data.error)
          : 'Scenario generation failed.';
        throw new Error(message);
      }

      const parsed = scenarioResultSchema.parse(data);
      saveScenarioResult(parsed);
      setResult(parsed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Scenario generation failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div>
        <div className="result-toolbar">
          <p><Check size={16} /> Saved to this browser</p>
          <button className="button button-secondary" onClick={() => setResult(null)} type="button">
            <RotateCcw size={16} /> Start another brief
          </button>
        </div>
        <ScenarioResultView result={result} />
      </div>
    );
  }

  return (
    <div className="workbench-layout">
      <form className="brief-form" onSubmit={handleSubmit}>
        <section className="form-section">
          <div className="form-section-heading">
            <span>01</span>
            <div><h2>Frame the decision</h2><p>Name the choice that must remain robust under uncertainty.</p></div>
          </div>
          <div className="form-grid three-up">
            <label>
              <span>Organization</span>
              <input required minLength={2} maxLength={120} value={form.organization} onChange={(event) => setForm({ ...form, organization: event.target.value })} placeholder="Northstar Energy" />
            </label>
            <label>
              <span>Industry</span>
              <input required minLength={2} maxLength={100} value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} placeholder="Energy infrastructure" />
            </label>
            <label>
              <span>Region</span>
              <input required minLength={2} maxLength={100} value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} placeholder="North America" />
            </label>
          </div>
          <div className="form-grid question-row">
            <label>
              <span>Focal question</span>
              <textarea required minLength={20} maxLength={500} rows={3} value={form.focalQuestion} onChange={(event) => setForm({ ...form, focalQuestion: event.target.value })} placeholder="Where should we place our next major infrastructure bet if demand and permitting move at different speeds?" />
            </label>
            <label>
              <span>Horizon year</span>
              <input required type="number" min={currentYear + 1} max={2100} value={form.horizonYear} onChange={(event) => setForm({ ...form, horizonYear: Number(event.target.value) })} />
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <span>02</span>
            <div><h2>Load the context</h2><p>Give the models the constraints they cannot safely infer.</p></div>
          </div>
          <label>
            <span>Strategic context <small>{contextCount}/4000</small></span>
            <textarea required minLength={40} maxLength={4000} rows={9} value={form.strategicContext} onChange={(event) => setForm({ ...form, strategicContext: event.target.value })} placeholder="Describe the decision, current portfolio, constraints, non-negotiables, timing, known economics, and what leadership already believes." />
          </label>
          <label>
            <span>Known uncertainties <small>one per line, optional</small></span>
            <textarea maxLength={1400} rows={5} value={form.knownUncertainties} onChange={(event) => setForm({ ...form, knownUncertainties: event.target.value })} placeholder={'Permitting reform durability\nCost of capital\nLoad growth from data centers'} />
          </label>
        </section>

        {error && <div className="form-error" role="alert"><strong>Generation stopped.</strong><span>{error}</span></div>}

        <div className="form-submit-row">
          <ModelStatus compact />
          <button className="button button-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
            {isSubmitting ? 'Building scenario set' : 'Build scenario set'}
            {!isSubmitting && <ArrowRight size={17} />}
          </button>
        </div>
      </form>

      <aside className="process-rail" aria-live="polite">
        <span className="section-kicker">Live process</span>
        <h2>Three perspectives, one traceable brief.</h2>
        <ol>
          {progressStages.map((item, index) => (
            <li data-active={isSubmitting && index === stage} data-complete={isSubmitting && index < stage} key={item}>
              <span>{index + 1}</span><p>{item}</p>
            </li>
          ))}
        </ol>
        <div className="model-stack">
          <div><strong>xAI 4.1</strong><span>Challenges assumptions</span></div>
          <div><strong>Gemini 3.5 Flash</strong><span>Maps signals and drivers</span></div>
          <div><strong>GPT-6 Luna</strong><span>Synthesizes the scenario set</span></div>
        </div>
      </aside>
    </div>
  );
}
