'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient, type ScenarioGenerationRequest, type ScenarioSet } from '@/lib/api-client';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { ArrowLeft, Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const INDUSTRIES = [
  'Energy',
  'Healthcare',
  'Finance',
  'Technology',
  'Defense',
  'Manufacturing',
  'Retail',
  'Agriculture',
  'Transportation',
  'Telecommunications'
];

const REGIONS = [
  'Global',
  'North America',
  'Europe',
  'Asia-Pacific',
  'Latin America',
  'Middle East & Africa'
];

const HORIZONS = [5, 10, 15, 20];

type GenerationStage = 'idle' | 'generating' | 'success' | 'error';

export default function NewScenarioPage() {
  const router = useRouter();
  const [stage, setStage] = useState<GenerationStage>('idle');
  const [formData, setFormData] = useState<ScenarioGenerationRequest>({
    industry: 'Energy',
    region: 'Global',
    horizon_years: 10,
  });
  const [result, setResult] = useState<ScenarioSet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStage('generating');
    setError(null);

    try {
      const scenarioSet = await apiClient.generateScenarios(formData);
      setResult(scenarioSet);
      setStage('success');
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to generate scenarios');
      setStage('error');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Generate Scenarios
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {stage === 'idle' && (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                Scenario Configuration
              </h2>

              <div className="space-y-6">
                {/* Industry */}
                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Industry
                  </label>
                  <select
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    {INDUSTRIES.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Region */}
                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Region
                  </label>
                  <select
                    id="region"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    {REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Horizon */}
                <div>
                  <label htmlFor="horizon" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Planning Horizon (Years)
                  </label>
                  <select
                    id="horizon"
                    value={formData.horizon_years}
                    onChange={(e) => setFormData({ ...formData, horizon_years: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    {HORIZONS.map((years) => (
                      <option key={years} value={years}>
                        {years} years ({new Date().getFullYear() + years})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Pipeline Overview:</strong> This will execute all 7 AI agents sequentially:
                  Signal Synthesizer → Driver Extractor → Scenario Constructor → Narrative Generator (×4) →
                  Signpost Designer (×4) → Action Planner → Quality Critic
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-300 mt-2">
                  <strong>Expected time:</strong> 2-5 minutes | <strong>Estimated cost:</strong> $0.10-0.30
                </p>
              </div>

              <button
                type="submit"
                className="mt-8 w-full inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Scenario Set
              </button>
            </div>
          </form>
        )}

        {stage === 'generating' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-12">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-primary-600 animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Generating Scenarios...
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                This may take 2-5 minutes. Please don't close this page.
              </p>

              <div className="max-w-md mx-auto space-y-3 text-left">
                <ProgressStep label="Synthesizing signals into themes..." />
                <ProgressStep label="Extracting drivers and uncertainties..." />
                <ProgressStep label="Constructing scenario frameworks..." />
                <ProgressStep label="Generating scenario narratives..." />
                <ProgressStep label="Designing signposts..." />
                <ProgressStep label="Planning strategic actions..." />
                <ProgressStep label="Validating quality..." />
              </div>
            </div>
          </div>
        )}

        {stage === 'success' && result && (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-green-900 dark:text-green-100">
                    Scenarios Generated Successfully!
                  </h2>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-green-700 dark:text-green-300">Time: </span>
                      <span className="font-medium text-green-900 dark:text-green-100">
                        {formatDuration(result.generation_time_seconds)}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700 dark:text-green-300">Cost: </span>
                      <span className="font-medium text-green-900 dark:text-green-100">
                        {formatCurrency(result.total_cost_usd)}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700 dark:text-green-300">Scenarios: </span>
                      <span className="font-medium text-green-900 dark:text-green-100">
                        {result.scenarios.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenarios */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                Scenarios ({result.scenarios.length})
              </h3>
              <div className="space-y-6">
                {result.scenarios.map((scenario, idx) => (
                  <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      {idx + 1}. {scenario.title}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      {scenario.core_logic}
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">
                        {scenario.narrative}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                      <span>Signposts: {scenario.signposts?.length || 0}</span>
                      <span>Citations: {scenario.citations?.length || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Plan */}
            {result.action_plan && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  Strategic Actions
                </h3>
                <div className="space-y-4">
                  {result.action_plan.robust_actions?.map((action: any, idx: number) => (
                    <div key={idx} className="border-l-4 border-primary-600 pl-4">
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {action.action || action.title || `Action ${idx + 1}`}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {action.rationale || action.description || 'Strategic recommendation'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Report */}
            {result.quality_report && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                  Quality Assessment
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="text-4xl font-bold text-primary-600">
                    {result.quality_report.overall_quality_score?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Overall Quality Score (0-10)
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setStage('idle');
                  setResult(null);
                }}
                className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Generate Another
              </button>
              <button
                onClick={() => router.push('/scenarios')}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                View All Scenarios
              </button>
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Generation Failed
              </h2>
              <p className="text-red-600 dark:text-red-400 mb-8">
                {error}
              </p>
              <button
                onClick={() => {
                  setStage('idle');
                  setError(null);
                }}
                className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ProgressStep({ label }: { label: string }) {
  return (
    <div className="flex items-center space-x-3">
      <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse"></div>
      <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
    </div>
  );
}
