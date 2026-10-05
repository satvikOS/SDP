'use client';

import { useEffect, useId, useState } from 'react';

import { decisionFlowDefinition, mermaidThemeVariables } from '@/lib/scenario-visuals';

export function ScenarioFlowDiagram() {
  const reactId = useId();
  const [svg, setSvg] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const render = async () => {
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        htmlLabels: false,
        theme: 'base',
        themeVariables: mermaidThemeVariables,
        flowchart: { curve: 'linear', nodeSpacing: 42, rankSpacing: 62 },
      });
      const id = `scenario-flow-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
      const rendered = await mermaid.render(id, decisionFlowDefinition);
      if (active) setSvg(rendered.svg);
    };
    void render().catch(() => active && setFailed(true));
    return () => { active = false; };
  }, [reactId]);

  if (failed) return <p className="diagram-fallback">Decision frame - critical drivers - scenarios - actions and signposts.</p>;
  if (!svg) return <div className="diagram-loading" aria-label="Rendering decision logic" />;

  return <div className="scenario-flow" role="img" aria-label="Decision logic from framing through drivers, scenarios, actions, and signposts" dangerouslySetInnerHTML={{ __html: svg }} />;
}
