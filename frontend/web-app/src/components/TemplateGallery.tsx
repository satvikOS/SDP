'use client';

import { ArrowRight, LayoutTemplate } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from 'react-aria-components';

import { scenarioTemplates } from '@/data/taxonomy';

export function TemplateGallery() {
  const router = useRouter();

  function selectTemplate(id: string) {
    window.localStorage.setItem('sdp.selected-template', id);
    router.push('/workspace/new');
  }

  return (
    <section className="template-gallery">
      {scenarioTemplates.map((template) => (
        <article className="template-card glass-panel" key={template.id}>
          <LayoutTemplate size={20} />
          <h2>{template.name}</h2>
          <p>{template.description}</p>
          <ul>{template.uncertainties.map((item) => <li key={item}>{item}</li>)}</ul>
          <Button onPress={() => selectTemplate(template.id)}>Use template <ArrowRight size={16} /></Button>
        </article>
      ))}
    </section>
  );
}
