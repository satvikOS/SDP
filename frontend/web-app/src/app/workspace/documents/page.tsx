import type { Metadata } from 'next';

import { DocumentStudio } from '@/components/DocumentStudio';

export const metadata: Metadata = { title: 'Documents' };

export default function DocumentsPage() {
  return (
    <div className="workspace-page wide-page">
      <header className="workspace-header"><div><span className="eyebrow">Documents</span><h1>Evidence viewer</h1></div><p>Review PDF and PowerPoint material inside the decision workspace.</p></header>
      <DocumentStudio />
    </div>
  );
}
