'use client';

import { useEffect, useState } from 'react';

import type { ScenarioResult } from '@/lib/scenario-schema';
import { loadScenarioPdf, persistScenarioPdf } from '@/lib/scenario-document-store';
import { DocumentStudio } from './DocumentStudio';

export function ScenarioDocumentViewer({ result }: { result: ScenarioResult }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadScenarioPdf(result.id)
      .then((saved) => saved ?? persistScenarioPdf(result))
      .then((blob) => {
        if (!active || !blob) throw new Error('Report unavailable');
        const name = `${result.briefTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'scenario-report'}.pdf`;
        setFile(new File([blob], name, { type: 'application/pdf' }));
      })
      .catch(() => active && setError('The saved report could not be prepared.'));
    return () => { active = false; };
  }, [result]);

  if (error) return <div className="form-error" role="alert">{error}</div>;
  if (!file) return <section className="report-preparing glass-panel">Preparing the saved PDF report…</section>;

  return <DocumentStudio initialFile={file} allowUpload={false} />;
}
