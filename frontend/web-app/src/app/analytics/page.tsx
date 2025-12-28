'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { GlassCard } from '@/components/GlassCard';
import { ArrowLeft, TrendingUp, DollarSign, Clock, CheckCircle2, XCircle, BarChart3, Globe, Building2, Calendar } from 'lucide-react';
import { formatCurrency, formatDuration } from '@/lib/utils';

interface Analytics {
  overview: {
    total_scenarios: number;
    total_cost_usd: number;
    total_time_seconds: number;
    avg_cost_per_scenario: number;
    avg_time_per_scenario: number;
    failed_scenarios: number;
    processing_scenarios: number;
    success_rate: number;
  };
  distributions: {
    by_industry: Record<string, number>;
    by_region: Record<string, number>;
    by_horizon: Record<string, number>;
  };
  trends: {
    cost_by_day: Record<string, number>;
    scenarios_last_30_days: number;
  };
  top_companies: Array<{ name: string; count: number }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAnalytics();
      setAnalytics(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-accent-600 border-t-transparent mb-4"></div>
          <p className="text-sm text-[var(--text-secondary)]">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-4">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

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
                <BarChart3 className="w-5 h-5 text-accent-600" />
                <span className="text-base font-medium text-[var(--text-primary)] tracking-tight">
                  Scenario Development Analytics
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 max-w-7xl mx-auto px-6 lg:px-8">
        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Scenarios"
            value={analytics.overview.total_scenarios.toString()}
            icon={<BarChart3 className="w-5 h-5 text-accent-600" />}
            trend={`${analytics.trends.scenarios_last_30_days} in last 30 days`}
          />
          <MetricCard
            title="Total Cost"
            value={formatCurrency(analytics.overview.total_cost_usd)}
            icon={<DollarSign className="w-5 h-5 text-green-500" />}
            trend={`${formatCurrency(analytics.overview.avg_cost_per_scenario)} avg`}
          />
          <MetricCard
            title="Total Processing Time"
            value={formatDuration(analytics.overview.total_time_seconds)}
            icon={<Clock className="w-5 h-5 text-blue-500" />}
            trend={`${formatDuration(analytics.overview.avg_time_per_scenario)} avg`}
          />
          <MetricCard
            title="Success Rate"
            value={`${analytics.overview.success_rate.toFixed(1)}%`}
            icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
            trend={`${analytics.overview.failed_scenarios} failed`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Industry Distribution */}
          <GlassCard>
            <h3 className="text-base font-medium text-[var(--text-primary)] mb-4 flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-accent-600" />
              <span>Scenarios by Industry</span>
            </h3>
            <div className="space-y-3">
              {Object.entries(analytics.distributions.by_industry)
                .sort((a, b) => b[1] - a[1])
                .map(([industry, count]) => (
                  <DistributionBar
                    key={industry}
                    label={industry}
                    value={count}
                    max={Math.max(...Object.values(analytics.distributions.by_industry))}
                  />
                ))}
              {Object.keys(analytics.distributions.by_industry).length === 0 && (
                <p className="text-sm text-[var(--text-tertiary)] italic">No data yet</p>
              )}
            </div>
          </GlassCard>

          {/* Region Distribution */}
          <GlassCard>
            <h3 className="text-base font-medium text-[var(--text-primary)] mb-4 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-accent-600" />
              <span>Scenarios by Region</span>
            </h3>
            <div className="space-y-3">
              {Object.entries(analytics.distributions.by_region)
                .sort((a, b) => b[1] - a[1])
                .map(([region, count]) => (
                  <DistributionBar
                    key={region}
                    label={region}
                    value={count}
                    max={Math.max(...Object.values(analytics.distributions.by_region))}
                  />
                ))}
              {Object.keys(analytics.distributions.by_region).length === 0 && (
                <p className="text-sm text-[var(--text-tertiary)] italic">No data yet</p>
              )}
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Horizon Distribution */}
          <GlassCard>
            <h3 className="text-base font-medium text-[var(--text-primary)] mb-4 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-accent-600" />
              <span>Planning Horizon Distribution</span>
            </h3>
            <div className="space-y-3">
              {Object.entries(analytics.distributions.by_horizon)
                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                .map(([horizon, count]) => (
                  <DistributionBar
                    key={horizon}
                    label={`${horizon} years`}
                    value={count}
                    max={Math.max(...Object.values(analytics.distributions.by_horizon))}
                  />
                ))}
              {Object.keys(analytics.distributions.by_horizon).length === 0 && (
                <p className="text-sm text-[var(--text-tertiary)] italic">No data yet</p>
              )}
            </div>
          </GlassCard>

          {/* Top Companies */}
          <GlassCard>
            <h3 className="text-base font-medium text-[var(--text-primary)] mb-4 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-accent-600" />
              <span>Most Analyzed Companies</span>
            </h3>
            <div className="space-y-3">
              {analytics.top_companies.length > 0 ? (
                analytics.top_companies.map((company, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-accent-600/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-accent-600">{idx + 1}</span>
                      </div>
                      <span className="text-sm text-[var(--text-primary)] font-light truncate">{company.name}</span>
                    </div>
                    <span className="text-sm text-[var(--text-secondary)] font-medium">{company.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-tertiary)] italic">No data yet</p>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Cost Trend */}
        {Object.keys(analytics.trends.cost_by_day).length > 0 && (
          <GlassCard className="mt-6">
            <h3 className="text-base font-medium text-[var(--text-primary)] mb-4 flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-accent-600" />
              <span>Daily Cost Trend (Last 30 Days)</span>
            </h3>
            <div className="space-y-2">
              {Object.entries(analytics.trends.cost_by_day)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, cost]) => (
                  <div key={date} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">{new Date(date).toLocaleDateString()}</span>
                    <span className="text-[var(--text-primary)] font-medium">{formatCurrency(cost)}</span>
                  </div>
                ))}
            </div>
          </GlassCard>
        )}
      </main>
    </div>
  );
}

function MetricCard({ title, value, icon, trend }: { title: string; value: string; icon: React.ReactNode; trend: string }) {
  return (
    <GlassCard>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-[var(--text-secondary)]">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-light text-[var(--text-primary)] mb-1">{value}</div>
      <div className="text-xs text-[var(--text-tertiary)]">{trend}</div>
    </GlassCard>
  );
}

function DistributionBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-[var(--text-primary)] font-light">{label}</span>
        <span className="text-sm text-[var(--text-secondary)] font-medium">{value}</span>
      </div>
      <div className="w-full h-2 bg-[var(--surface)] rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-600 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
