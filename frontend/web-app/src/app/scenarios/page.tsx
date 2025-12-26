'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GlassCard, GlassButton } from '@/components/GlassCard';
import { Plus, FileText, ArrowLeft, Sparkles } from 'lucide-react';

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Future: Load scenarios from API
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-px h-6 bg-[var(--border)]" />
              <div className="flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-accent-600" />
                <span className="text-base font-medium text-[var(--text-primary)] tracking-tight">
                  Scenario Library
                </span>
              </div>
            </div>
            <Link href="/scenarios/new">
              <GlassButton variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                New Scenario
              </GlassButton>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 max-w-6xl mx-auto px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent-600 border-t-transparent"></div>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading scenarios...</p>
          </div>
        ) : scenarios.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map((scenario) => (
              <ScenarioCard key={scenario.id} scenario={scenario} />
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
      <FileText className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-6 opacity-50" />
      <h2 className="text-2xl font-light text-[var(--text-primary)] mb-3 tracking-tight">
        Scenario Library Empty
      </h2>
      <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto font-light">
        Initiate your first strategic foresight analysis to explore alternative futures and develop robust organizational strategies.
      </p>
      <Link href="/scenarios/new">
        <GlassButton variant="primary" size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Begin Analysis
        </GlassButton>
      </Link>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: any }) {
  return (
    <GlassCard hover>
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2 tracking-tight">
        {scenario.title}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] font-light">
        {scenario.description}
      </p>
    </GlassCard>
  );
}
