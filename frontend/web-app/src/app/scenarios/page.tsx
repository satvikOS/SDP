'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ArrowLeft, Sparkles, Plus, FileText, TrendingUp } from 'lucide-react';

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For now, show empty state
    // In future: apiClient.listScenarios().then(setScenarios)
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-8 h-8 text-primary-600" />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Scenario Library
                </h1>
              </div>
            </div>
            <Link
              href="/scenarios/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Scenario
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading scenarios...</p>
          </div>
        ) : scenarios.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenarios.map((scenario) => (
              <ScenarioCard key={scenario.scenario_set_id} scenario={scenario} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        No Scenarios Yet
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
        Generate your first scenario set to start exploring alternative futures for your industry.
      </p>
      <Link
        href="/scenarios/new"
        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors"
      >
        <Plus className="w-5 h-5 mr-2" />
        Generate First Scenario
      </Link>

      <div className="mt-16 max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          What you'll get:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Feature
            icon={<TrendingUp className="w-5 h-5 text-primary-600" />}
            title="Signal Analysis"
            description="Emerging themes and weak signals"
          />
          <Feature
            icon={<FileText className="w-5 h-5 text-primary-600" />}
            title="4 Scenarios"
            description="Plausible futures with rich narratives"
          />
          <Feature
            icon={<Sparkles className="w-5 h-5 text-primary-600" />}
            title="Signposts"
            description="Early warning indicators to monitor"
          />
          <Feature
            icon={<TrendingUp className="w-5 h-5 text-primary-600" />}
            title="Action Plan"
            description="Robust strategies across scenarios"
          />
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start space-x-3 bg-white dark:bg-slate-800 rounded-lg p-4">
      <div className="mt-0.5">{icon}</div>
      <div>
        <h4 className="font-medium text-slate-900 dark:text-white">{title}</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: any }) {
  return (
    <Link
      href={`/scenarios/${scenario.scenario_set_id}`}
      className="block bg-white dark:bg-slate-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6"
    >
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        {scenario.industry} - {scenario.region}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        {scenario.horizon_years} year horizon • {formatDate(scenario.created_at)}
      </p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-slate-400">Scenarios:</span>
          <span className="font-medium text-slate-900 dark:text-white">
            {scenario.scenarios?.length || 0}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-slate-400">Cost:</span>
          <span className="font-medium text-slate-900 dark:text-white">
            {formatCurrency(scenario.total_cost_usd)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600 dark:text-slate-400">Quality:</span>
          <span className="font-medium text-slate-900 dark:text-white">
            {scenario.quality_report?.overall_quality_score?.toFixed(1) || 'N/A'}/10
          </span>
        </div>
      </div>
    </Link>
  );
}
