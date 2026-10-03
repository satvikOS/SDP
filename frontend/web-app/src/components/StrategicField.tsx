import type { ScenarioResult } from '@/lib/scenario-schema';

type FieldScenario = Pick<ScenarioResult['scenarios'][number], 'title' | 'probability' | 'coordinates'>;

export function StrategicField({ scenarios }: { scenarios: FieldScenario[] }) {
  return (
    <div className="strategic-field" aria-label="Scenario uncertainty field">
      <span className="axis-label axis-top">Environment more permissive</span>
      <span className="axis-label axis-bottom">Environment more constrained</span>
      <span className="axis-label axis-left">Demand fragments</span>
      <span className="axis-label axis-right">Demand concentrates</span>
      <div className="axis axis-x" />
      <div className="axis axis-y" />
      {scenarios.map((scenario, index) => (
        <div
          className="scenario-node"
          data-index={index}
          key={`${scenario.title}-${index}`}
          style={{ left: `${scenario.coordinates.x}%`, top: `${100 - scenario.coordinates.y}%` }}
        >
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div>
            <strong>{scenario.title}</strong>
            <small>{scenario.probability}% planning weight</small>
          </div>
        </div>
      ))}
    </div>
  );
}
