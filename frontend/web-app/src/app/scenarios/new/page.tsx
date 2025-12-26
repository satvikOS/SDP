'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiClient, type ScenarioGenerationRequest, type ScenarioSet } from '@/lib/api-client';
import { GlassCard, GlassButton, GlassInput } from '@/components/GlassCard';
import { formatCurrency, formatDuration } from '@/lib/utils';
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
    industry: 'Energy',
    region: 'Global',
    horizon_years: 10,
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
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Planning Horizon
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {HORIZONS.map((years) => (
                      <button
                        key={years}
                        type="button"
                        onClick={() => setFormData({ ...formData, horizon_years: years })}
                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                          formData.horizon_years === years
                            ? 'bg-accent-600 text-white'
                            : 'glass-panel text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {years} years
                      </button>
                    ))}
                  </div>
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
              <GlassCard key={idx} hover>
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-3 tracking-tight">
                  {idx + 1}. {scenario.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4 font-light leading-relaxed">
                  {scenario.core_logic}
                </p>
                <div className="glass-panel rounded-lg p-4">
                  <p className="text-sm text-[var(--text-primary)] font-light line-clamp-4">
                    {scenario.narrative}
                  </p>
                </div>
              </GlassCard>
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
