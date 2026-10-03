import type { Metadata } from 'next';

import { TemplateGallery } from '@/components/TemplateGallery';

export const metadata: Metadata = { title: 'Templates' };

export default function TemplatesPage() {
  return (
    <div className="workspace-page">
      <header className="workspace-header"><div><span className="eyebrow">Templates</span><h1>Start from a decision pattern</h1></div><p>Use a structure, then adapt it to the actual choice and constraints.</p></header>
      <TemplateGallery />
    </div>
  );
}
