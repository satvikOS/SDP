"""Scenario Generation Pipeline - Orchestrates all agents to generate complete scenarios."""

import logging
from typing import Dict, Any, List, Optional
from uuid import UUID, uuid4
from datetime import datetime

from multi_model_orchestrator import multi_model_orchestrator
from agents import AgentType
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))
from shared.models.scenario import ScenarioSet, Scenario, ScenarioScope, ScenarioHorizon

logger = logging.getLogger(__name__)


class ScenarioGenerationPipeline:
    """
    End-to-end pipeline for generating scenario sets.

    Workflow:
    1. Signal Synthesizer → Extract themes from signals
    2. Driver Extractor → Identify drivers and uncertainties
    3. Scenario Constructor → Build scenario frameworks
    4. Narrative Generator → Write narratives for each scenario
    5. Signpost Designer → Create monitoring framework
    6. Action Planner → Generate strategic recommendations
    7. Quality Critic → Validate and improve output
    """

    def __init__(self):
        """Initialize pipeline."""
        self.orchestrator = multi_model_orchestrator

    async def generate_scenario_set(
        self,
        industry: str,
        region: str,
        horizon_years: int,
        signals: Optional[List[Dict[str, Any]]] = None,
        evidence: Optional[List[Dict[str, Any]]] = None,
        user_constraints: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate a complete scenario set.

        Args:
            industry: Target industry (e.g., "Energy", "Healthcare")
            region: Geographic scope (e.g., "Global", "North America")
            horizon_years: Planning horizon in years (e.g., 5, 10)
            signals: Optional pre-collected signals
            evidence: Optional pre-collected evidence
            user_constraints: Optional user-defined constraints

        Returns:
            Complete scenario set with all artifacts
        """
        scenario_set_id = uuid4()
        start_time = datetime.now()

        logger.info(
            f"Starting scenario generation: {industry} - {region} - {horizon_years} years"
        )

        try:
            # Step 1: Synthesize signals into themes
            logger.info("Step 1/7: Synthesizing signals into themes...")
            themes_result = await self._synthesize_signals(
                signals or [],
                evidence or [],
                industry,
                region,
                str(horizon_years)
            )
            themes = themes_result.get('output', {}).get('themes', [])
            logger.info(f"✓ Identified {len(themes)} emerging themes")

            # Step 2: Extract drivers and uncertainties
            logger.info("Step 2/7: Extracting drivers and uncertainties...")
            drivers_result = await self._extract_drivers(
                themes,
                evidence or [],
                industry,
                region,
                str(horizon_years)
            )
            drivers = drivers_result.get('output', {}).get('drivers', [])
            uncertainties = drivers_result.get('output', {}).get('critical_uncertainties', [])
            logger.info(f"✓ Identified {len(drivers)} drivers and {len(uncertainties)} uncertainties")

            # Step 3: Construct scenario frameworks
            logger.info("Step 3/7: Constructing scenario frameworks...")
            scenarios_result = await self._construct_scenarios(
                drivers,
                uncertainties,
                industry,
                str(horizon_years)
            )
            scenario_frameworks = scenarios_result.get('output', {}).get('scenarios', [])
            logger.info(f"✓ Created {len(scenario_frameworks)} scenario frameworks")

            # Step 4: Generate narratives for each scenario
            logger.info("Step 4/7: Generating scenario narratives...")
            narratives = []
            for idx, framework in enumerate(scenario_frameworks):
                logger.info(f"  Generating narrative {idx + 1}/{len(scenario_frameworks)}: {framework['title']}")
                narrative_result = await self._generate_narrative(
                    framework,
                    drivers,
                    evidence or [],
                    industry,
                    datetime.now().year + horizon_years
                )
                narratives.append(narrative_result.get('output', {}))
            logger.info(f"✓ Generated {len(narratives)} scenario narratives")

            # Step 5: Design signposts for monitoring
            logger.info("Step 5/7: Designing signposts...")
            all_signposts = []
            for idx, (framework, narrative) in enumerate(zip(scenario_frameworks, narratives)):
                logger.info(f"  Designing signposts {idx + 1}/{len(scenario_frameworks)}")
                signposts_result = await self._design_signposts(
                    framework,
                    narrative,
                    drivers
                )
                all_signposts.append(signposts_result.get('output', {}).get('signposts', []))
            logger.info(f"✓ Designed monitoring framework")

            # Step 6: Generate action plan
            logger.info("Step 6/7: Generating action plan...")
            action_plan_result = await self._plan_actions(
                scenario_frameworks,
                narratives,
                user_constraints or {}
            )
            action_plan = action_plan_result.get('output', {})
            logger.info(f"✓ Generated {len(action_plan.get('robust_actions', []))} robust actions")

            # Step 7: Quality check
            logger.info("Step 7/7: Quality validation...")
            quality_result = await self._validate_quality(
                {
                    'scenarios': scenario_frameworks,
                    'narratives': narratives,
                    'drivers': drivers,
                    'uncertainties': uncertainties
                },
                evidence or []
            )
            quality_report = quality_result.get('output', {})
            logger.info(f"✓ Quality score: {quality_report.get('overall_quality_score', 0):.2f}")

            # Assemble final scenario set
            elapsed_time = (datetime.now() - start_time).total_seconds()

            result = {
                'scenario_set_id': str(scenario_set_id),
                'industry': industry,
                'region': region,
                'horizon_years': horizon_years,
                'created_at': start_time.isoformat(),
                'generation_time_seconds': elapsed_time,

                # Core outputs
                'themes': themes,
                'drivers': drivers,
                'uncertainties': uncertainties,
                'scenarios': [
                    {
                        **framework,
                        'narrative': narratives[idx].get('narrative', ''),
                        'signposts': all_signposts[idx],
                        'citations': narratives[idx].get('citations', [])
                    }
                    for idx, framework in enumerate(scenario_frameworks)
                ],
                'action_plan': action_plan,
                'quality_report': quality_report,

                # Metadata
                'models_used': self._collect_models_used(
                    themes_result, drivers_result, scenarios_result,
                    narratives, signposts_result, action_plan_result, quality_result
                ),
                'total_cost_usd': self._calculate_total_cost(
                    themes_result, drivers_result, scenarios_result,
                    narratives, action_plan_result, quality_result
                ),
                'status': 'completed'
            }

            logger.info(f"✅ Scenario generation completed in {elapsed_time:.1f}s")
            logger.info(f"💰 Total cost: ${result['total_cost_usd']:.4f}")

            return result

        except Exception as e:
            logger.error(f"❌ Scenario generation failed: {e}", exc_info=True)
            raise

    # Helper methods for each step

    async def _synthesize_signals(
        self,
        signals: List[Dict],
        evidence: List[Dict],
        industry: str,
        region: str,
        horizon: str
    ) -> Dict[str, Any]:
        """Step 1: Synthesize signals into themes."""
        return await self.orchestrator.execute({
            'agent_type': AgentType.SIGNAL_SYNTHESIZER.value,
            'context': {
                'signals': self._format_signals(signals),
                'evidence': self._format_evidence(evidence),
                'industry': industry,
                'region': region,
                'horizon': horizon
            }
        })

    async def _extract_drivers(
        self,
        themes: List[Dict],
        evidence: List[Dict],
        industry: str,
        region: str,
        horizon: str
    ) -> Dict[str, Any]:
        """Step 2: Extract drivers and uncertainties."""
        return await self.orchestrator.execute({
            'agent_type': AgentType.DRIVER_EXTRACTOR.value,
            'context': {
                'themes': self._format_themes(themes),
                'evidence': self._format_evidence(evidence),
                'industry': industry,
                'region': region,
                'horizon': horizon
            }
        })

    async def _construct_scenarios(
        self,
        drivers: List[Dict],
        uncertainties: List[Dict],
        industry: str,
        horizon: str
    ) -> Dict[str, Any]:
        """Step 3: Construct scenario frameworks."""
        return await self.orchestrator.execute({
            'agent_type': AgentType.SCENARIO_CONSTRUCTOR.value,
            'context': {
                'drivers': self._format_drivers(drivers),
                'uncertainties': self._format_uncertainties(uncertainties),
                'industry': industry,
                'horizon': horizon
            }
        })

    async def _generate_narrative(
        self,
        scenario: Dict,
        drivers: List[Dict],
        evidence: List[Dict],
        industry: str,
        target_year: int
    ) -> Dict[str, Any]:
        """Step 4: Generate scenario narrative."""
        return await self.orchestrator.execute({
            'agent_type': AgentType.NARRATIVE_GENERATOR.value,
            'context': {
                'title': scenario['title'],
                'logic': scenario['core_logic'],
                'positions': scenario['uncertainty_positions'],
                'drivers': [d['name'] for d in drivers],
                'evidence': self._format_evidence(evidence[:10]),  # Top 10 most relevant
                'quant_assumptions': scenario.get('quant_assumptions', []),
                'industry': industry,
                'target_year': target_year
            }
        })

    async def _design_signposts(
        self,
        scenario: Dict,
        narrative: Dict,
        drivers: List[Dict]
    ) -> Dict[str, Any]:
        """Step 5: Design signposts."""
        return await self.orchestrator.execute({
            'agent_type': AgentType.SIGNPOST_DESIGNER.value,
            'context': {
                'title': scenario['title'],
                'narrative': narrative.get('narrative', ''),
                'assumptions': scenario.get('quant_assumptions', []),
                'drivers': self._format_drivers(drivers)
            }
        })

    async def _plan_actions(
        self,
        scenarios: List[Dict],
        narratives: List[Dict],
        constraints: Dict
    ) -> Dict[str, Any]:
        """Step 6: Plan actions."""
        return await self.orchestrator.execute({
            'agent_type': AgentType.ACTION_PLANNER.value,
            'context': {
                'scenarios': self._format_scenarios_for_actions(scenarios, narratives),
                'context': constraints.get('organization_context', ''),
                'current_strategy': constraints.get('current_strategy', ''),
                'constraints': constraints
            }
        })

    async def _validate_quality(
        self,
        scenario_set: Dict,
        evidence: List[Dict]
    ) -> Dict[str, Any]:
        """Step 7: Validate quality."""
        return await self.orchestrator.execute({
            'agent_type': AgentType.QUALITY_CRITIC.value,
            'context': {
                'scenario_set': scenario_set,
                'evidence_summary': self._format_evidence(evidence[:20])
            }
        })

    # Formatting helpers

    def _format_signals(self, signals: List[Dict]) -> str:
        """Format signals for prompt."""
        if not signals:
            return "No pre-collected signals. Analyze provided evidence to identify signals."
        return "\n".join([
            f"[{s.get('id', 'N/A')}] {s.get('title', 'Untitled')}\n  {s.get('description', '')}"
            for s in signals[:20]
        ])

    def _format_evidence(self, evidence: List[Dict]) -> str:
        """Format evidence for prompt."""
        if not evidence:
            return "No evidence provided. Use general knowledge for this industry."
        return "\n".join([
            f"[{e.get('id', 'N/A')}] {e.get('summary', e.get('content', '')[:100])}..."
            for e in evidence[:20]
        ])

    def _format_themes(self, themes: List[Dict]) -> str:
        """Format themes for prompt."""
        return "\n".join([
            f"{t.get('title', 'Untitled')}\n  {t.get('description', '')}\n  Strength: {t.get('strength', 0):.2f}"
            for t in themes
        ])

    def _format_drivers(self, drivers: List[Dict]) -> str:
        """Format drivers for prompt."""
        return "\n".join([
            f"{d.get('name', 'Unnamed')} ({d.get('category', 'unknown')})\n  "
            f"{d.get('description', '')}\n  "
            f"Impact: {d.get('impact', 0):.2f}, Uncertainty: {d.get('uncertainty', 0):.2f}"
            for d in drivers
        ])

    def _format_uncertainties(self, uncertainties: List[Dict]) -> str:
        """Format uncertainties for prompt."""
        return "\n".join([
            f"{u.get('name', 'Unnamed')} ({u.get('axis', 'N/A')})\n  "
            f"Poles: {u.get('poles', ['?', '?'])[0]} ↔ {u.get('poles', ['?', '?'])[1]}\n  "
            f"{u.get('rationale', '')}"
            for u in uncertainties
        ])

    def _format_scenarios_for_actions(
        self,
        scenarios: List[Dict],
        narratives: List[Dict]
    ) -> str:
        """Format scenarios for action planning."""
        result = []
        for idx, (scenario, narrative) in enumerate(zip(scenarios, narratives)):
            result.append(
                f"Scenario {idx + 1}: {scenario['title']}\n"
                f"  Logic: {scenario['core_logic']}\n"
                f"  Summary: {narrative.get('summary', '')[:200]}"
            )
        return "\n\n".join(result)

    def _collect_models_used(self, *results) -> Dict[str, int]:
        """Collect which models were used and how often."""
        models = {}
        for result in results:
            if isinstance(result, list):
                for r in result:
                    if isinstance(r, dict):
                        model = r.get('model_used', 'unknown')
                        models[model] = models.get(model, 0) + 1
            elif isinstance(result, dict):
                model = result.get('model_used', 'unknown')
                models[model] = models.get(model, 0) + 1
        return models

    def _calculate_total_cost(self, *results) -> float:
        """Calculate total cost across all agent calls."""
        total = 0.0
        for result in results:
            if isinstance(result, list):
                for r in result:
                    if isinstance(r, dict):
                        total += r.get('cost_usd', 0.0)
            elif isinstance(result, dict):
                total += result.get('cost_usd', 0.0)
        return total


# Global pipeline instance
scenario_pipeline = ScenarioGenerationPipeline()
