'use client';

import { ArrowLeft, FileWarning } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { scenarioResultSchema, type ScenarioResult } from '@/lib/scenario-schema';
import { Brand } from './Brand';
import { ReportActions } from './ReportActions';
import { ScenarioResultView } from './ScenarioResultView';

export function SharedReport() {
  const [report, setReport] = useState<ScenarioResult | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    void import('lz-string').then(({ decompressFromEncodedURIComponent }) => {
      try {
        const payload = new URL(window.location.href).searchParams.get('report');
        const decoded = payload ? decompressFromEncodedURIComponent(payload) : null;
        const parsed = scenarioResultSchema.safeParse(decoded ? JSON.parse(decoded) : null);
        if (!parsed.success) throw new Error('Invalid report');
        setReport(parsed.data);
      } catch {
        setInvalid(true);
      }
    });
  }, []);

  if (invalid) {
    return <main className="shared-shell"><div className="empty-state glass-panel"><FileWarning size={28} /><h1>This report link is not valid</h1><Link className="button quiet-button" href="/"><ArrowLeft size={16} /> SDP home</Link></div></main>;
  }

  if (!report) return <main className="shared-shell"><div className="document-loading">Opening report…</div></main>;

  return (
    <div className="shared-shell">
      <header className="shared-header"><Brand /><span>Read-only report</span><ReportActions result={report} /></header>
      <main className="shared-report" id="main-content"><ScenarioResultView result={report} /></main>
    </div>
  );
}
