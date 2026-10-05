import type { ScenarioResult } from '@/lib/scenario-schema';

type FieldScenario = Pick<ScenarioResult['scenarios'][number], 'title' | 'probability' | 'coordinates'>;

export function StrategicField({ scenarios, axes }: { scenarios: FieldScenario[]; axes?: ScenarioResult['strategicAxes'] }) {
  return (
    <div className="strategic-field" aria-label="Scenario uncertainty field">
      <span className="axis-label axis-top">{axes?.yHigh ?? 'Higher structural change'}</span>
      <span className="axis-label axis-bottom">{axes?.yLow ?? 'Lower structural change'}</span>
      <span className="axis-label axis-left">{axes?.xLow ?? 'Constrained response'}</span>
      <span className="axis-label axis-right">{axes?.xHigh ?? 'Adaptive response'}</span>
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
