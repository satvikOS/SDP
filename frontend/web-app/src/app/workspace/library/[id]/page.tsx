import type { Metadata } from 'next';

import { ScenarioDetail } from '@/components/ScenarioDetail';

export const metadata: Metadata = { title: 'Decision brief' };

export default async function ScenarioPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { id } = await params;
  const { view } = await searchParams;
  return <div className="workspace-page wide-page"><ScenarioDetail id={id} view={view} /></div>;
}
