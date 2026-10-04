'use client';

import { ArrowRight, Check, LoaderCircle, RotateCcw } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Form } from 'react-aria-components';

import { getGeographies, industries, scenarioTemplates } from '@/data/taxonomy';
import { scenarioResultSchema, type ScenarioResult } from '@/lib/scenario-schema';
import { saveScenarioResult } from '@/lib/scenario-store';
import { AriaButton, AriaComboField, AriaTextArea, HorizonSlider, type Option } from './ui/AriaControls';
import { ReportActions } from './ReportActions';
import { ScenarioResultView } from './ScenarioResultView';

type CompanyResult = {
  name: string;
  ownership: 'public' | 'private';
  ticker?: string;
  exchange?: string;
};

const currentYear = new Date().getFullYear();
const progressStages = [
  'Reading the decision and constraints',
  'Testing the underlying assumptions',
  'Mapping drivers and observable signals',
  'Developing four distinct environments',
  'Testing actions across the scenario set',
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
  const [companyOptions, setCompanyOptions] = useState<Option[]>([]);
  const [isSearchingCompanies, setIsSearchingCompanies] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const selectedTemplate = window.localStorage.getItem('sdp.selected-template');
    if (selectedTemplate) {
      applyTemplate(selectedTemplate);
      window.localStorage.removeItem('sdp.selected-template');
    }
  }, []);

  useEffect(() => {
    if (!isSubmitting) return;
    const timer = window.setInterval(
      () => setStage((value) => Math.min(value + 1, progressStages.length - 1)),
      7_000,
    );
    return () => window.clearInterval(timer);
  }, [isSubmitting]);

  useEffect(() => {
    const query = form.organization.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (query.length < 2) {
        setCompanyOptions([]);
        return;
      }
      setIsSearchingCompanies(true);
      try {
        const response = await fetch(`/api/companies?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const payload = await response.json() as { items: CompanyResult[] };
        setCompanyOptions(payload.items.map((company) => ({
          id: company.ownership === 'public'
            ? `${company.exchange}:${company.ticker}`
            : `private:${company.name}`,
          name: company.name,
          description: company.ownership === 'public' ? company.exchange : undefined,
          badge: company.ownership === 'public' ? company.ticker : 'Private',
        })));
      } catch (caught) {
        if (!(caught instanceof DOMException && caught.name === 'AbortError')) setCompanyOptions([]);
      } finally {
        setIsSearchingCompanies(false);
      }
    }, query.length < 2 ? 0 : 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [form.organization]);

  const industryOptions = useMemo(() => industries
    .filter((industry) => industry.toLowerCase().includes(form.industry.toLowerCase()))
    .map((name) => ({ id: name, name })), [form.industry]);

  const geographyOptions = useMemo(() => getGeographies()
    .filter((item) => item.name.toLowerCase().includes(form.region.toLowerCase()))
    .slice(0, 80), [form.region]);

  function applyTemplate(templateId: string) {
    const template = scenarioTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setForm((current) => ({
      ...current,
      focalQuestion: template.question,
      knownUncertainties: template.uncertainties.join('\n'),
    }));
  }

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
          : 'The scenario could not be created.';
        throw new Error(message);
      }
      const parsed = scenarioResultSchema.parse(data);
      await saveScenarioResult(parsed);
      setResult(parsed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The scenario could not be created.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="result-workspace">
        <div className="result-toolbar glass-panel">
          <p><Check size={16} /> Saved to Library</p>
          <div>
            <ReportActions result={result} />
            <AriaButton className="button quiet-button" onPress={() => setResult(null)}>
              <RotateCcw size={16} /> New scenario
            </AriaButton>
          </div>
        </div>
        <ScenarioResultView result={result} />
      </div>
    );
  }

  return (
    <div className="workbench-grid">
      <Form className="scenario-form" onSubmit={handleSubmit} validationBehavior="native">
        <section className="form-block glass-panel">
          <header><span>Decision</span><h2>Set the scope</h2><p>Choose a template or define the decision directly.</p></header>
          <div className="template-strip" aria-label="Scenario templates">
            {scenarioTemplates.slice(0, 4).map((template) => (
              <AriaButton className="template-chip" key={template.id} onPress={() => applyTemplate(template.id)}>
                {template.name}
              </AriaButton>
            ))}
          </div>
          <div className="form-grid form-grid-three">
            <AriaComboField
              label="Organization"
              value={form.organization}
              options={companyOptions}
              onInputChange={(organization) => setForm((current) => ({ ...current, organization }))}
              placeholder="Search global companies or enter another"
              description="Global listings include exchange and ticker. Press Enter to use any other name."
              isRequired
              isLoading={isSearchingCompanies}
            />
            <AriaComboField
              label="Industry"
              value={form.industry}
              options={industryOptions}
              onInputChange={(industry) => setForm((current) => ({ ...current, industry }))}
              placeholder="Select or enter an industry"
              isRequired
            />
            <AriaComboField
              label="Geography"
              value={form.region}
              options={geographyOptions}
              onInputChange={(region) => setForm((current) => ({ ...current, region }))}
              placeholder="Country, region, or continent"
              isRequired
            />
          </div>
          <AriaTextArea
            label="Decision question"
            value={form.focalQuestion}
            onChange={(focalQuestion) => setForm((current) => ({ ...current, focalQuestion }))}
            placeholder="What decision must remain sound if the operating environment changes?"
            minLength={20}
            maxLength={500}
            rows={3}
            isRequired
          />
          <HorizonSlider
            value={form.horizonYear}
            onChange={(horizonYear) => setForm((current) => ({ ...current, horizonYear }))}
            min={currentYear + 1}
            max={currentYear + 30}
          />
        </section>

        <section className="form-block glass-panel">
          <header><span>Context</span><h2>Add what the analysis cannot infer</h2><p>Include constraints, economics, commitments, and current assumptions.</p></header>
          <AriaTextArea
            label="Strategic context"
            trailing={<small>{form.strategicContext.length}/4000</small>}
            value={form.strategicContext}
            onChange={(strategicContext) => setForm((current) => ({ ...current, strategicContext }))}
            placeholder="Describe the present position, constraints, non-negotiables, timing, and assumptions."
            minLength={40}
            maxLength={4000}
            rows={9}
            isRequired
          />
          <AriaTextArea
            label="Known uncertainties"
            trailing={<small>One per line</small>}
            value={form.knownUncertainties}
            onChange={(knownUncertainties) => setForm((current) => ({ ...current, knownUncertainties }))}
            placeholder={'Regulatory timing\nCost of capital\nCustomer adoption'}
            maxLength={1400}
            rows={5}
          />
        </section>

        {error && <div className="form-error" role="alert"><strong>Unable to continue</strong><span>{error}</span></div>}

        <div className="form-submit">
          <span>Generated reports are saved automatically to Library.</span>
          <AriaButton className="button primary-button" isDisabled={isSubmitting} type="submit">
            {isSubmitting ? <LoaderCircle className="spin" size={17} /> : null}
            {isSubmitting ? 'Developing scenarios' : 'Develop scenarios'}
            {!isSubmitting && <ArrowRight size={17} />}
          </AriaButton>
        </div>
      </Form>

      <aside className="analysis-rail glass-panel" aria-live="polite">
        <header><span>Progress</span><h2>{isSubmitting ? 'Developing the scenario set' : 'Ready to begin'}</h2></header>
        <ol>
          {progressStages.map((item, index) => (
            <li data-active={isSubmitting && index === stage} data-complete={isSubmitting && index < stage} key={item}>
              <i>{index + 1}</i><span>{item}</span>
            </li>
          ))}
        </ol>
        <p>Each scenario will include signals, strategic moves, risks, and actions that remain useful across the set.</p>
      </aside>
    </div>
  );
}
