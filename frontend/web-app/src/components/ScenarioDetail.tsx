'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Tabs, TabList, Tab, TabPanel } from 'react-aria-components';

import { useImportedReports, useScenarioResults } from '@/lib/scenario-store';
import { loadScenarioPdf } from '@/lib/scenario-document-store';
import { DocumentStudio } from './DocumentStudio';
import { ScenarioResultView } from './ScenarioResultView';
import { ReportActions } from './ReportActions';
import { ScenarioDocumentViewer } from './ScenarioDocumentViewer';

export function ScenarioDetail({ id, view = 'document' }: { id: string; view?: string }) {
  const result = useScenarioResults().find((item) => item.id === id) ?? null;
  const imported = useImportedReports().find((item) => item.id === id);
  const back = <Link href="/workspace/library"><ArrowLeft size={16} /> Library</Link>;
  if (imported) return <><div className="detail-toolbar">{back}</div><ImportedPdf id={id} name={imported.name!} /></>;

  if (result === null) {
    return (
      <section className="empty-state glass-panel">
        <h2>This local brief is not available.</h2>
        <p>Check Library → Trash to restore a removed report. Reports saved in a different browser are stored there.</p>
        <Link className="button quiet-button" href="/workspace/library"><ArrowLeft size={16} /> Back to library</Link>
      </section>
    );
  }

  return (
    <>
      <div className="detail-toolbar">
        {back}<ReportActions result={result} />
      </div>
      <Tabs className="report-tabs" defaultSelectedKey={view === 'analysis' ? 'analysis' : 'document'}>
        <TabList aria-label="Saved report views"><Tab id="analysis">Analysis</Tab><Tab id="document">PDF report</Tab></TabList>
        <TabPanel id="analysis"><ScenarioResultView result={result} /></TabPanel>
        <TabPanel id="document"><ScenarioDocumentViewer result={result} /></TabPanel>
      </Tabs>
    </>
  );
}

function ImportedPdf({ id, name }: { id: string; name: string }) {
  const [file, setFile] = useState<File | null>(null), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void loadScenarioPdf(id).then((blob) => {
      if (active) { if (blob) setFile(new File([blob], name, { type: 'application/pdf' })); else setError('The saved PDF is unavailable. Import the surviving copy again.'); }
    });
    return () => { active = false; };
  }, [id, name]);
  if (error) return <p role="alert" className="form-error">{error}</p>;
  return file ? <DocumentStudio initialFile={file} allowUpload={false} /> : <p>Loading saved PDF…</p>;
}
