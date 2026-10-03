'use client';

import { Check, Download, FileText, Link as LinkIcon, Presentation } from 'lucide-react';
import { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from 'react-aria-components';

import type { ScenarioResult } from '@/lib/scenario-schema';

export function ReportActions({ result }: { result: ScenarioResult }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<'pdf' | 'pptx' | null>(null);

  async function exportFile(type: 'pdf' | 'pptx') {
    setBusy(type);
    try {
      const exports = await import('@/lib/report-export');
      if (type === 'pdf') await exports.exportScenarioPdf(result);
      else await exports.exportScenarioPptx(result);
    } finally {
      setBusy(null);
    }
  }

  async function copyShareLink() {
    const { compressToEncodedURIComponent } = await import('lz-string');
    const payload = compressToEncodedURIComponent(JSON.stringify(result));
    const url = `${window.location.origin}/share?report=${payload}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }

  return (
    <div className="report-actions">
      <Button className="button quiet-button" onPress={copyShareLink}>
        {copied ? <Check size={16} /> : <LinkIcon size={16} />}
        {copied ? 'Link copied' : 'Share'}
      </Button>
      <MenuTrigger>
        <Button className="button quiet-button"><Download size={16} /> Export</Button>
        <Popover className="action-popover">
          <Menu className="action-menu" aria-label="Export report">
            <MenuItem onAction={() => exportFile('pdf')} isDisabled={busy !== null}>
              <FileText size={17} /><span><strong>PDF brief</strong><small>Formatted for reading and print</small></span>
            </MenuItem>
            <MenuItem onAction={() => exportFile('pptx')} isDisabled={busy !== null}>
              <Presentation size={17} /><span><strong>PowerPoint deck</strong><small>Editable widescreen presentation</small></span>
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>
    </div>
  );
}
