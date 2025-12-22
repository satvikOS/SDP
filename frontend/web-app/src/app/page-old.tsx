'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Sparkles, TrendingUp, Target, Zap, ArrowRight } from 'lucide-react';

export default function Home() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [apiUrl, setApiUrl] = useState<string>('');

  useEffect(() => {
    setApiUrl(process.env.NEXT_PUBLIC_API_URL || 'Not configured');

    // Check API health
    apiClient.healthCheck()
      .then(() => setIsHealthy(true))
      .catch(() => setIsHealthy(false));
  }, []);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                AI Foresight Platform
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : isHealthy === false ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {isHealthy ? 'API Connected' : isHealthy === false ? 'API Disconnected' : 'Checking...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-extrabold text-slate-900 dark:text-white mb-6">
            Strategic Foresight
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600">
              Powered by AI
            </span>
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-12">
            Generate comprehensive scenario sets using AWS Bedrock's multi-model AI orchestration.
            Synthesize signals, identify drivers, and plan strategic actions with confidence.
          </p>

          <div className="flex justify-center space-x-4">
            <Link
              href="/scenarios/new"
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors"
            >
              Generate Scenarios
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/scenarios"
              className="inline-flex items-center px-8 py-3 border border-slate-300 dark:border-slate-600 text-base font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              View Scenarios
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<TrendingUp className="w-8 h-8 text-primary-600" />}
            title="Signal Synthesis"
            description="Extract emerging themes from weak signals and evidence using Claude Sonnet 4.5"
          />
          <FeatureCard
            icon={<Target className="w-8 h-8 text-primary-600" />}
            title="Scenario Construction"
            description="Build plausible futures based on critical uncertainties and key drivers"
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8 text-primary-600" />}
            title="Action Planning"
            description="Generate robust strategies that work across multiple scenarios"
          />
        </div>
      </section>

      {/* System Info */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            System Architecture
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoItem label="Backend" value="AWS Lambda (Serverless)" />
            <InfoItem label="AI Models" value="AWS Bedrock Multi-Model" />
            <InfoItem label="API Endpoint" value={apiUrl} />
            <InfoItem label="Deployment" value="GitHub Actions CI/CD" />
          </div>

          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              AI Agents (7 Specialized)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <AgentBadge name="Signal Synthesizer" model="Claude Sonnet 4.5" />
              <AgentBadge name="Driver Extractor" model="Claude Sonnet 4.5" />
              <AgentBadge name="Scenario Constructor" model="Claude Sonnet 4.5" />
              <AgentBadge name="Narrative Generator" model="Claude Sonnet 4.5" />
              <AgentBadge name="Signpost Designer" model="Claude Haiku 3.5" />
              <AgentBadge name="Action Planner" model="Claude Sonnet 4.5" />
              <AgentBadge name="Quality Critic" model="Claude Sonnet 4.5" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-slate-600 dark:text-slate-400">
            AI-Driven Strategic Foresight Platform • AWS Bedrock Multi-Model Orchestration
          </p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900 dark:text-white font-mono">{value}</dd>
    </div>
  );
}

function AgentBadge({ name, model }: { name: string; model: string }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 rounded-lg px-4 py-2">
      <span className="text-sm font-medium text-slate-900 dark:text-white">{name}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{model}</span>
    </div>
  );
}
