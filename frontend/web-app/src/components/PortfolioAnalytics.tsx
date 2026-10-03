'use client';

import { useMemo } from 'react';

import { useScenarioResults } from '@/lib/scenario-store';

export function PortfolioAnalytics() {
  const results = useScenarioResults();

  const metrics = useMemo(() => {
    const scenarioCount = results.reduce((sum, result) => sum + result.scenarios.length, 0);
    const actionCount = results.reduce((sum, result) => sum + result.robustActions.length, 0);
    const unknownCount = results.reduce((sum, result) => sum + result.criticalUnknowns.length, 0);
    return { scenarioCount, actionCount, unknownCount };
  }, [results]);

  const highestWeights = results
    .flatMap((result) => result.scenarios.map((scenario) => ({ ...scenario, brief: result.briefTitle })))
    .toSorted((a, b) => b.probability - a.probability)
    .slice(0, 6);

  return (
    <>
      <section className="metric-strip">
        <div><span>Decision briefs</span><strong>{results.length}</strong><small>stored locally</small></div>
        <div><span>Alternative futures</span><strong>{metrics.scenarioCount}</strong><small>across the portfolio</small></div>
        <div><span>Robust actions</span><strong>{metrics.actionCount}</strong><small>candidates for review</small></div>
        <div><span>Critical unknowns</span><strong>{metrics.unknownCount}</strong><small>open research items</small></div>
      </section>

      <section className="analytics-layout">
        <div className="panel">
          <div className="panel-heading"><div><span className="section-kicker">Planning weight</span><h2>Most prominent futures</h2></div></div>
          {highestWeights.length > 0 ? (
            <div className="weight-list">
              {highestWeights.map((item, index) => (
                <div key={`${item.brief}-${item.title}`}>
                  <span>{item.title}<small>{item.brief}</small></span>
                  <i><b data-index={index % 4} style={{ width: `${item.probability}%` }} /></i>
                  <strong>{item.probability}%</strong>
                </div>
              ))}
            </div>
          ) : <p className="empty-copy">Build a scenario set to populate the portfolio view.</p>}
        </div>
        <div className="panel portfolio-note">
          <span className="section-kicker">Interpretation</span>
          <h2>Do not optimize the portfolio to this chart.</h2>
          <p>Planning weights help allocate attention. They are not calibrated probabilities and should not be aggregated into a forecast.</p>
          <p>The useful question is whether the same investment appears fragile across several independently constructed futures.</p>
        </div>
      </section>
    </>
  );
}
