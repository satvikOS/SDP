'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { GlassCard, GlassButton } from '@/components/GlassCard';
import { Sparkles, ArrowRight, Zap, TrendingUp, Target, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [agents, setAgents] = useState<string[]>([]);

  useEffect(() => {
    // Check API health
    apiClient.healthCheck()
      .then(() => setIsHealthy(true))
      .catch(() => setIsHealthy(false));

    // Get agents list
    apiClient.getAgents()
      .then(setAgents)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Main Content */}
      <main className="pt-16 pb-16">
        {/* Status Banner */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-8">
          <div className="glass-panel rounded-lg px-4 py-2 inline-flex items-center space-x-2">
            <div className={`w-1.5 h-1.5 rounded-full ${
              isHealthy ? 'bg-green-500' : isHealthy === false ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            <span className="text-sm text-[var(--text-secondary)]">
              {isHealthy ? 'System Online' : isHealthy === false ? 'System Offline' : 'Initializing...'}
            </span>
          </div>
        </div>

        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 lg:px-8 text-center mb-20">
          <h1 className="text-4xl lg:text-5xl font-light text-[var(--text-primary)] mb-6 tracking-tight leading-tight">
            Enterprise Strategic Foresight
            <span className="block mt-2 bg-gradient-to-r from-accent-500 to-accent-700 bg-clip-text text-transparent">
              Powered by Advanced AI
            </span>
          </h1>

          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-12 font-light leading-relaxed">
            Navigate uncertainty with confidence. Our AI-powered platform delivers comprehensive scenario analysis,
            enabling executive teams to make informed strategic decisions in rapidly evolving environments.
          </p>

          {/* CTA */}
          <div className="flex items-center justify-center space-x-4">
            <Link href="/scenarios/new">
              <GlassButton variant="primary" size="lg">
                <span>Generate Scenarios</span>
                <ArrowRight className="ml-2 w-4 h-4" />
              </GlassButton>
            </Link>
            <Link href="/scenarios">
              <GlassButton variant="secondary" size="lg">
                View Library
              </GlassButton>
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-6xl mx-auto px-6 lg:px-8 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-light text-[var(--text-primary)] mb-3 tracking-tight">
              Trusted by Leading Organizations
            </h2>
            <p className="text-[var(--text-secondary)] font-light">
              Deliver strategic clarity through rigorous, AI-driven foresight methodologies
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FeatureCard
              icon={<TrendingUp className="w-5 h-5" />}
              title="Weak Signal Detection"
              description="Identify emerging trends and strategic opportunities before competitors through systematic environmental scanning and pattern recognition"
            />
            <FeatureCard
              icon={<Target className="w-5 h-5" />}
              title="Multi-Horizon Scenarios"
              description="Construct rigorous alternative futures grounded in critical uncertainties, enabling resilient strategic planning across time horizons"
            />
            <FeatureCard
              icon={<Zap className="w-5 h-5" />}
              title="Robust Strategy Development"
              description="Generate actionable recommendations that perform well across diverse scenarios, reducing strategic risk and enhancing organizational agility"
            />
          </div>
        </section>

        {/* AI Agents */}
        <section className="max-w-4xl mx-auto px-6 lg:px-8">
          <GlassCard>
            <div className="mb-6">
              <h2 className="text-xl font-medium text-[var(--text-primary)] mb-2 tracking-tight">
                Multi-Agent Intelligence Architecture
              </h2>
              <p className="text-sm text-[var(--text-secondary)] font-light">
                Seven specialized AI modules orchestrate a comprehensive foresight workflow, ensuring methodological rigor and analytical depth
              </p>
            </div>

            <div className="space-y-2">
              {agents.length > 0 ? (
                agents.map((agent, idx) => (
                  <AgentRow key={agent} number={idx + 1} name={agent} />
                ))
              ) : (
                <div className="text-sm text-[var(--text-tertiary)] text-center py-8">
                  {isHealthy === false ? 'API disconnected' : 'Loading agents...'}
                </div>
              )}
            </div>
          </GlassCard>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-[var(--text-tertiary)] font-light">
            Enterprise Strategic Foresight Platform • Trusted by Fortune 500 Companies and Government Agencies
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <GlassCard hover>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent-600/10 flex items-center justify-center text-accent-600">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-medium text-[var(--text-primary)] mb-1 tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] font-light leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

function AgentRow({ number, name }: { number: number; name: string }) {
  const formatName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-[var(--surface)] transition-colors">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-600/10 flex items-center justify-center">
        <span className="text-xs font-medium text-accent-600">{number}</span>
      </div>
      <span className="text-sm text-[var(--text-primary)] font-light">
        {formatName(name)}
      </span>
      <div className="flex-1" />
      <CheckCircle2 className="w-4 h-4 text-green-500" />
    </div>
  );
}
