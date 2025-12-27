'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient, type ScenarioGenerationRequest, type ScenarioSet } from '@/lib/api-client';
import { GlassCard, GlassButton, GlassInput } from '@/components/GlassCard';
import { CompanyAutocomplete } from '@/components/CompanyAutocomplete';
import { formatCurrency, formatDuration, cn } from '@/lib/utils';
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const INDUSTRIES = ['Energy', 'Healthcare', 'Finance', 'Technology', 'Defense', 'Manufacturing', 'Retail', 'Agriculture', 'Transportation', 'Telecommunications'];
const REGIONS = ['Global', 'North America', 'Europe', 'Asia-Pacific', 'Latin America', 'Middle East & Africa'];
const HORIZONS = [5, 10, 15, 20];

type Stage = 'idle' | 'generating' | 'success' | 'error';

const AGENT_STEPS = [
  'Signal Synthesizer',
  'Driver Extractor',
  'Scenario Constructor',
  'Narrative Generator',
  'Signpost Designer',
  'Action Planner',
  'Quality Critic',
];

export default function NewScenarioPage() {
  const [stage, setStage] = useState<Stage>('idle');
  const [formData, setFormData] = useState<ScenarioGenerationRequest>({
    company_name: '',
    industry: 'Energy',
    region: 'Global',
    horizon_years: 10,
    horizon_months: 0,
    horizon_weeks: 0,
    horizon_days: 0,
    strategic_context: '',
  });
  const [result, setResult] = useState<ScenarioSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStage('generating');
    setError(null);
    setCurrentStep(0);

    // Simulate step progression
    const interval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, AGENT_STEPS.length - 1));
    }, 20000); // Update every 20 seconds

    try {
      const scenarioSet = await apiClient.generateScenarios(formData);
      clearInterval(interval);
      setResult(scenarioSet);
      setStage('success');
      setCurrentStep(AGENT_STEPS.length);
    } catch (err: any) {
      clearInterval(interval);
      setError(err.response?.data?.detail || err.message || 'Failed to generate scenarios');
      setStage('error');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <main className="pt-16 pb-16 max-w-4xl mx-auto px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-[var(--text-primary)] mb-3 tracking-tight">
            Generate Scenario Set
          </h1>
          <p className="text-[var(--text-secondary)] font-light">
            Configure parameters for comprehensive strategic foresight analysis
          </p>
        </div>
        {stage === 'idle' && (
          <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            {/* Configuration Panel */}
            <GlassCard>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Company / Organization Name
                  </label>
                  <CompanyAutocomplete
                    value={formData.company_name}
                    onChange={(value) => setFormData({ ...formData, company_name: value })}
                  />
                  <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                    Start typing to see suggestions - legal entity names only
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Industry
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full glass-panel px-4 py-3 rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    {INDUSTRIES.map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Region
                  </label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full glass-panel px-4 py-3 rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500"
                  >
                    {REGIONS.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                    Planning Horizon
                  </label>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Years</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={formData.horizon_years}
                        onChange={(e) => setFormData({ ...formData, horizon_years: parseInt(e.target.value) || 0 })}
                        className="w-full glass-panel px-3 py-2 rounded text-sm text-[var(--text-primary)] text-center focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Months</label>
                      <input
                        type="number"
                        min="0"
                        max="11"
                        value={formData.horizon_months}
                        onChange={(e) => setFormData({ ...formData, horizon_months: parseInt(e.target.value) || 0 })}
                        className="w-full glass-panel px-3 py-2 rounded text-sm text-[var(--text-primary)] text-center focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Weeks</label>
                      <input
                        type="number"
                        min="0"
                        max="4"
                        value={formData.horizon_weeks}
                        onChange={(e) => setFormData({ ...formData, horizon_weeks: parseInt(e.target.value) || 0 })}
                        className="w-full glass-panel px-3 py-2 rounded text-sm text-[var(--text-primary)] text-center focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Days</label>
                      <input
                        type="number"
                        min="0"
                        max="6"
                        value={formData.horizon_days}
                        onChange={(e) => setFormData({ ...formData, horizon_days: parseInt(e.target.value) || 0 })}
                        className="w-full glass-panel px-3 py-2 rounded text-sm text-[var(--text-primary)] text-center focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                    </div>
                  </div>

                  <div className="mt-2 text-center">
                    <span className="text-xs text-[var(--text-tertiary)]">Total: </span>
                    <span className="text-sm font-medium text-accent-600">
                      {formData.horizon_years}y {formData.horizon_months}m {formData.horizon_weeks}w {formData.horizon_days}d
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Strategic Context - Enterprise Intelligence */}
            <GlassCard>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Strategic Context & Intelligence Briefing
                  <span className="ml-2 text-xs text-[var(--text-tertiary)] font-normal">(Critical for precision targeting)</span>
                </label>
                <textarea
                  value={formData.strategic_context}
                  onChange={(e) => setFormData({ ...formData, strategic_context: e.target.value })}
                  placeholder="Example for Defense: 'We are pursuing AUKUS Pillar 2 co-production agreements in Australia. Current JASSM-ER margins are 18% EBITDA. Key strategic question: Can we maintain margins if forced to transfer 40% of production to Australian facilities with 23% higher labor costs? Also evaluating $2.3B R&D investment in CJADC2 software-defined payloads - need analysis of Government Purpose Rights risk to our IP moat.'&#10;&#10;Example for Energy: 'Evaluating $4.5B green hydrogen electrolyzer facility. Current green H2 costs: $2.80/kg (target: $1.50/kg). Critical decision: Build 2GW facility + 800km pipeline now, or wait for technology maturity? Competitive threat: European players (Linde, Air Liquide) have 18-month head start on offtake contracts. Need quantitative break-even analysis factoring carbon pricing scenarios.'&#10;&#10;Provide: Current strategy, key investments under consideration, margin targets, competitive threats, regulatory constraints, quantitative metrics that matter."
                  rows={8}
                  className="w-full glass-panel px-4 py-3 rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none font-light text-sm leading-relaxed"
                />
                <div className="mt-2 flex items-start space-x-2 text-xs text-[var(--text-tertiary)]">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="flex-1">
                    <span className="font-medium text-[var(--text-secondary)]">The more specific, the better.</span> Include: quantitative metrics (margins, costs, timelines), strategic decisions under consideration, competitive dynamics, regulatory constraints, and the specific questions keeping your C-suite up at night. This transforms generic scenarios into Board-level strategic intelligence.
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* Info Panel */}
            <div className="glass-panel rounded-lg p-4 border-l-4 border-accent-600">
              <p className="text-sm text-[var(--text-secondary)] font-light">
                <span className="font-medium text-[var(--text-primary)]">Multi-Agent Analysis:</span> Seven specialized AI modules will execute a comprehensive foresight workflow.
                Estimated completion: 2-5 minutes. Processing cost: $0.10-0.30 per analysis
              </p>
            </div>

            {/* Submit Button */}
            <GlassButton type="submit" variant="primary" size="lg" className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Scenario Set
            </GlassButton>
          </form>
        )}

        {stage === 'generating' && (
          <div className="space-y-6 animate-fade-in">
            <GlassCard>
              <div className="text-center mb-8">
                <Loader2 className="w-12 h-12 text-accent-600 animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-medium text-[var(--text-primary)] mb-2 tracking-tight">
                  Processing Strategic Analysis
                </h2>
                <p className="text-sm text-[var(--text-secondary)] font-light">
                  Multi-agent intelligence architecture executing comprehensive foresight workflow (2-5 minutes)
                </p>
              </div>

              <div className="space-y-3">
                {AGENT_STEPS.map((step, idx) => (
                  <div
                    key={step}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                      idx < currentStep
                        ? 'bg-green-500/10'
                        : idx === currentStep
                        ? 'bg-accent-600/10'
                        : 'opacity-40'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      idx < currentStep
                        ? 'bg-green-500'
                        : idx === currentStep
                        ? 'bg-accent-600'
                        : 'bg-[var(--surface)]'
                    }`}>
                      {idx < currentStep ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : (
                        <span className="text-xs font-medium text-white">{idx + 1}</span>
                      )}
                    </div>
                    <span className="text-sm text-[var(--text-primary)] font-light">{step}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {stage === 'success' && result && (
          <div className="space-y-6 animate-fade-in">
            {/* Success Header */}
            <div className="glass-panel rounded-lg p-4 border-l-4 border-green-500">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <h2 className="text-base font-medium text-[var(--text-primary)] mb-2">
                    Strategic Analysis Complete
                  </h2>
                  <div className="flex items-center space-x-6 text-sm text-[var(--text-secondary)]">
                    <span>Processing Time: {formatDuration(result.generation_time_seconds)}</span>
                    <span>Analysis Cost: {formatCurrency(result.total_cost_usd)}</span>
                    <span>Scenarios Developed: {result.scenarios.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenarios */}
            {result.scenarios.map((scenario, idx) => (
              <ScenarioDetailCard key={idx} scenario={scenario} index={idx} />
            ))}

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <GlassButton onClick={() => { setStage('idle'); setResult(null); }} variant="secondary">
                Generate Another
              </GlassButton>
              <Link href="/scenarios">
                <GlassButton variant="primary">
                  View All Scenarios
                </GlassButton>
              </Link>
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel rounded-lg p-6 border-l-4 border-red-500">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h2 className="text-base font-medium text-[var(--text-primary)] mb-2">
                    Analysis Processing Error
                  </h2>
                  <p className="text-sm text-red-500 font-light">{error}</p>
                </div>
              </div>
            </div>
            <GlassButton onClick={() => { setStage('idle'); setError(null); }} variant="primary">
              Try Again
            </GlassButton>
          </div>
        )}
      </main>
    </div>
  );
}

// Expandable Scenario Detail Card Component
function ScenarioDetailCard({ scenario, index }: { scenario: any; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer">
      <GlassCard hover>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-600/20 flex items-center justify-center">
                <span className="text-sm font-medium text-accent-600">{index + 1}</span>
              </div>
              <h3 className="text-lg font-medium text-[var(--text-primary)] tracking-tight">
                {scenario.title}
              </h3>
              <div className="flex-shrink-0 px-2 py-1 rounded-full bg-accent-600/10 text-xs font-medium text-accent-600">
                {(scenario.probability * 100).toFixed(0)}% probability
              </div>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-4 font-light leading-relaxed italic">
              {scenario.core_logic}
            </p>

            <div className={cn(
              'glass-panel rounded-lg p-4 transition-all duration-300',
              isExpanded ? 'max-h-none' : 'max-h-24 overflow-hidden relative'
            )}>
              <p className="text-sm text-[var(--text-primary)] font-light leading-relaxed whitespace-pre-wrap">
                {scenario.narrative}
              </p>
              {!isExpanded && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--panel)] to-transparent" />
              )}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="ml-4 flex-shrink-0 p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={cn(
                'w-5 h-5 text-[var(--text-tertiary)] transition-transform duration-300',
                isExpanded && 'rotate-180'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-tertiary)]">Strategic Implications</span>
              <span className="text-[var(--text-secondary)]">Click to collapse</span>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
