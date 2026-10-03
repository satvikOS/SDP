import type { Metadata } from 'next';

import { SharedReport } from '@/components/SharedReport';

export const metadata: Metadata = { title: 'Shared report', robots: { index: false, follow: false } };

export default function SharePage() {
  return <SharedReport />;
}
