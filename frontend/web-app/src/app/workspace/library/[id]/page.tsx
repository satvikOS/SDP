import type { Metadata } from 'next';

import { ScenarioDetail } from '@/components/ScenarioDetail';

export const metadata: Metadata = { title: 'Decision brief' };

export default async function ScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="workspace-page wide-page"><ScenarioDetail id={id} /></div>;
}
