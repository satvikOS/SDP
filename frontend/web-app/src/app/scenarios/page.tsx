'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { GlassCard, GlassButton } from '@/components/GlassCard';
import { Plus, FileText, ArrowLeft, Sparkles, Loader2, BookOpen, TrendingUp, Trash2 } from 'lucide-react';
import { formatCurrency, formatDuration, cn } from '@/lib/utils';

interface ScenarioData {
  scenarioId: string;
  company_name: string;
  industry: string;
  region: string;
  horizon_years: number;
  createdAt: number;
  status: string;
  result?: any;
}

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      const response = await apiClient.listScenarios();
      setScenarios(response);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load scenarios:', err);
      setError(err.message || 'Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  };

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
            <Loader2 className="w-8 h-8 text-accent-600 animate-spin mx-auto mb-4" />
            <p className="text-sm text-[var(--text-secondary)]">Loading scenarios...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <GlassButton onClick={loadScenarios} variant="secondary">
              Retry
            </GlassButton>
          </div>
        ) : scenarios.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.scenarioId}
                scenario={scenario}
                onDelete={loadScenarios}
              />
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

function ScenarioCard({ scenario, onDelete }: { scenario: ScenarioData; onDelete?: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [brLoading, setBrLoading] = useState<{ [key: number]: boolean }>({});
  const [brFormats, setBrFormats] = useState<{ [key: number]: any }>({});
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBrTransform = async (scenarioData: any, index: number) => {
    try {
      setBrLoading({ ...brLoading, [index]: true });
      const result = await apiClient.transformToBoardroom(
        scenarioData.narrative,
        scenario.company_name,
        scenarioData.title
      );
      setBrFormats({ ...brFormats, [index]: result.boardroom_format });
    } catch (err: any) {
      console.error('BR transformation failed:', err);
      alert('Failed to transform to boardroom format: ' + (err.message || 'Unknown error'));
    } finally {
      setBrLoading({ ...brLoading, [index]: false });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this scenario for ${scenario.company_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/scenarios/${scenario.scenarioId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete scenario');
      }

      // Call onDelete callback to refresh the list
      onDelete?.();
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert('Failed to delete scenario: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const result = scenario.result;
  const createdDate = new Date(scenario.createdAt * 1000).toLocaleDateString();

  return (
    <GlassCard>
      <div className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <Sparkles className="w-5 h-5 text-accent-600" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] tracking-tight">
                {scenario.company_name} - {scenario.industry}
              </h3>
            </div>
            <div className="flex items-center space-x-4 text-sm text-[var(--text-secondary)]">
              <span>{scenario.region}</span>
              <span>•</span>
              <span>{scenario.horizon_years} year horizon</span>
              <span>•</span>
              <span>{createdDate}</span>
              {result && (
                <>
                  <span>•</span>
                  <span>{result.scenarios?.length || 0} scenarios</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
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

        {result && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-xs text-[var(--text-tertiary)]">
              <span>Cost: {formatCurrency(result.total_cost_usd || 0)}</span>
              <span>•</span>
              <span>Time: {formatDuration(result.generation_time_seconds || 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/scenarios/${scenario.scenarioId}`}>
                <GlassButton variant="primary" size="sm">
                  <FileText className="w-3 h-3 mr-1.5" />
                  View Document
                </GlassButton>
              </Link>
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3 mr-1.5" />
                    Delete
                  </>
                )}
              </GlassButton>
            </div>
          </div>
        )}
      </div>

      {isExpanded && result?.scenarios && (
        <div className="mt-6 pt-6 border-t border-[var(--border)] space-y-4">
          {result.scenarios.map((scenarioData: any, idx: number) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-600/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-accent-600">{idx + 1}</span>
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-[var(--text-primary)] tracking-tight">
                      {scenarioData.title}
                    </h4>
                    <p className="text-sm text-[var(--text-secondary)] italic mt-1">
                      {scenarioData.core_logic}
                    </p>
                  </div>
                </div>
                <GlassButton
                  variant={brFormats[idx] ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => handleBrTransform(scenarioData, idx)}
                  disabled={brLoading[idx]}
                >
                  {brLoading[idx] ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      Transforming...
                    </>
                  ) : brFormats[idx] ? (
                    <>
                      <TrendingUp className="w-3 h-3 mr-1.5" />
                      BR Active
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-3 h-3 mr-1.5" />
                      BR Transform
                    </>
                  )}
                </GlassButton>
              </div>

              {/* Academic Format */}
              {!brFormats[idx] && (
                <div className="glass-panel rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <BookOpen className="w-4 h-4 text-accent-600" />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">ACADEMIC FORMAT</span>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] font-light leading-relaxed whitespace-pre-wrap">
                    {scenarioData.narrative}
                  </p>
                </div>
              )}

              {/* Boardroom Format */}
              {brFormats[idx] && (
                <div className="space-y-3">
                  {/* BLUF */}
                  <div className="glass-panel rounded-lg p-4 border-l-4 border-accent-600">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-accent-600" />
                      <span className="text-xs font-medium text-accent-600">BLUF - BOTTOM LINE UP FRONT</span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] font-light leading-relaxed">
                      {brFormats[idx].executive_summary_bluf}
                    </p>
                  </div>

                  {/* Decision Framework */}
                  {brFormats[idx].decision_framework && (
                    <div className="glass-panel rounded-lg p-4">
                      <h5 className="text-xs font-medium text-[var(--text-secondary)] mb-3">KILL / DOUBLE FRAMEWORK</h5>
                      <p className="text-sm text-[var(--text-primary)] mb-4 font-light">
                        {brFormats[idx].decision_framework.summary}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-500/10 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-lg">🔴</span>
                            <span className="text-xs font-medium text-red-500">KILL</span>
                          </div>
                          <p className="text-xs text-[var(--text-primary)] font-medium mb-1">
                            {brFormats[idx].decision_framework.kill?.asset}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mb-2">
                            {brFormats[idx].decision_framework.kill?.rationale}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {brFormats[idx].decision_framework.kill?.impact}
                          </p>
                        </div>
                        <div className="bg-green-500/10 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-lg">🟢</span>
                            <span className="text-xs font-medium text-green-500">DOUBLE</span>
                          </div>
                          <p className="text-xs text-[var(--text-primary)] font-medium mb-1">
                            {brFormats[idx].decision_framework.double?.asset}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mb-2">
                            {brFormats[idx].decision_framework.double?.rationale}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)]">
                            {brFormats[idx].decision_framework.double?.impact}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Watchtower Dashboard */}
                  {brFormats[idx].watchtower_dashboard && (
                    <div className="glass-panel rounded-lg p-4">
                      <h5 className="text-xs font-medium text-[var(--text-secondary)] mb-3">WATCHTOWER DASHBOARD</h5>
                      <div className="space-y-2">
                        {brFormats[idx].watchtower_dashboard.map((item: any, wIdx: number) => (
                          <div key={wIdx} className="flex items-center justify-between text-xs bg-[var(--surface)] rounded p-2">
                            <span className="text-[var(--text-primary)] font-medium">{item.indicator}</span>
                            <span className="text-[var(--text-secondary)]">{item.trigger}</span>
                            <span className="text-lg">{item.status?.charAt(0) || '🟢'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Toggle back to Academic */}
                  <GlassButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const newFormats = { ...brFormats };
                      delete newFormats[idx];
                      setBrFormats(newFormats);
                    }}
                  >
                    <BookOpen className="w-3 h-3 mr-1.5" />
                    View Academic Format
                  </GlassButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
