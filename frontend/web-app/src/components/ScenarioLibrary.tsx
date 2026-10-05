'use client';
import { ArrowUpRight, FileText, GitCompareArrows, Library, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button, Checkbox, FileTrigger } from 'react-aria-components';
import { deleteScenarioResult, importLibraryPdf, permanentlyDeleteLibraryRecord, restoreLibraryRecord, trashImportedReport, toggleComparisonId, useComparisonIds, useImportedReports, useLibraryTrash, useScenarioResults } from '@/lib/scenario-store';
import { ConfirmButton } from './ui/ConfirmButton';

export function ScenarioLibrary() {
  const results = useScenarioResults(), imports = useImportedReports(), trash = useLibraryTrash(), comparisonIds = useComparisonIds();
  const [showTrash, setShowTrash] = useState(false), [error, setError] = useState(''), [importing, setImporting] = useState(false);
  return <>
    <div className="library-toolbar glass-panel">
      <span>{showTrash ? 'Reports remain in Trash until you restore or permanently delete them.' : 'Saved analysis and PDF reports. Select up to three briefs to compare.'}</span>
      <div className="library-toolbar-actions">
        <FileTrigger acceptedFileTypes={['application/pdf', '.pdf']} onSelect={async (files) => {
          if (!files?.[0]) return;
          setImporting(true); setError('');
          try { await importLibraryPdf(files[0]); setShowTrash(false); }
          catch (caught) { setError(caught instanceof Error ? caught.message : 'The PDF could not be saved.'); }
          finally { setImporting(false); }
        }}><Button isDisabled={importing} className="button quiet-button"><Upload size={15} /> {importing ? 'Saving…' : 'Import PDF'}</Button></FileTrigger>
        <Button className="button quiet-button" onPress={() => setShowTrash(!showTrash)}><Trash2 size={15} /> {showTrash ? 'Library' : `Trash (${trash.length})`}</Button>
        {!showTrash && comparisonIds.length >= 2 && <Link className="button quiet-button" href="/workspace/compare"><GitCompareArrows size={15} /> Compare {comparisonIds.length}</Link>}
      </div>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {showTrash ? <section className="library-list">
      {trash.map((item) => <article className="library-row imported-row glass-panel" key={item.id}>
        <FileText size={20} /><div className="library-main"><h2>{item.result?.briefTitle ?? item.name}</h2><small>In Trash · {new Date(item.deletedAt!).toLocaleDateString()}</small></div>
        <div className="library-actions">
          <Button aria-label={`Restore ${item.result?.briefTitle ?? item.name}`} onPress={async () => { try { await restoreLibraryRecord(item.id); } catch { setError('Restore failed. The report remains in Trash.'); } }}><RotateCcw size={17} /></Button>
          <ConfirmButton label={`Permanently delete ${item.result?.briefTitle ?? item.name}`} title="Permanently delete this report?" description="The saved analysis and PDF will be erased from this browser. This cannot be undone. Download a copy first if you need to keep it." confirmLabel="Delete permanently" onConfirm={() => permanentlyDeleteLibraryRecord(item.id)}><Trash2 size={17} /></ConfirmButton>
        </div>
      </article>)}
      {!trash.length && <div className="empty-state glass-panel"><Trash2 size={24} /><h2>Trash is empty</h2></div>}
    </section> : <section className="library-list">
      {results.map((result) => <article className="library-row glass-panel" key={result.id}>
        <Checkbox className="selection-check" isSelected={comparisonIds.includes(result.id)} onChange={() => toggleComparisonId(result.id)} aria-label={`Select ${result.briefTitle} for comparison`}>{({ isSelected }) => <span>{isSelected ? '✓' : ''}</span>}</Checkbox>
        <div className="library-main"><span>{result.request.organization} · {result.request.horizonYear}</span><h2>{result.briefTitle}</h2><p>{result.request.focalQuestion}</p><small className="library-file"><FileText size={12} /> Analysis + PDF · {result.evidence ? `${result.evidence.references.length} references` : 'Legacy analysis'}</small></div>
        <div className="library-scenarios" aria-label="Conditional scenario weights">{result.scenarios.map((s, i) => <div key={s.title}><i data-index={i} style={{ width: `${s.probability}%` }} /><span>{s.title}</span><strong>{s.probability.toFixed(1)}%</strong></div>)}</div>
        <div className="library-actions"><Link href={`/workspace/library/${result.id}`} aria-label={`Open ${result.briefTitle}`}><ArrowUpRight size={18} /></Link><ConfirmButton label={`Delete ${result.briefTitle}`} title="Move this report to Trash?" description="The analysis and PDF will leave the library. Both can be restored from Trash until you permanently delete them." confirmLabel="Move to Trash" onConfirm={() => deleteScenarioResult(result.id)}><Trash2 size={17} /></ConfirmButton></div>
      </article>)}
      {imports.map((item) => <article className="library-row imported-row glass-panel" key={item.id}><FileText size={20} /><div className="library-main"><h2>{item.name?.replace(/\.pdf$/i, '').replace(/-/g, ' ')}</h2><small className="library-file">Imported PDF · {new Date(item.createdAt!).toLocaleDateString()}</small></div><div className="library-actions"><Link href={`/workspace/library/${item.id}`} aria-label={`Open ${item.name}`}><ArrowUpRight size={18} /></Link><ConfirmButton label={`Delete ${item.name}`} title="Move this PDF to Trash?" description="The PDF can be restored from Trash. It will not be permanently deleted." confirmLabel="Move to Trash" onConfirm={() => trashImportedReport(item.id)}><Trash2 size={17} /></ConfirmButton></div></article>)}
      {!results.length && !imports.length && <div className="empty-state glass-panel"><Library size={28} /><h2>No reports saved yet</h2><p>Create a scenario or import an existing PDF.</p><Link className="button primary-button" href="/workspace/new"><Plus size={17} /> New scenario</Link></div>}
    </section>}
    <p className="library-storage-note">Saved in this browser, without an expiry. Download important reports as a backup; clearing browser data removes local storage.</p>
  </>;
}
