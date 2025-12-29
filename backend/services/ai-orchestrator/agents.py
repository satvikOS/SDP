"""Claude agent definitions and prompts."""

from enum import Enum
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import json


class AgentType(str, Enum):
    """Types of specialized Claude agents."""
    SIGNAL_SYNTHESIZER = "signal_synthesizer"
    DRIVER_EXTRACTOR = "driver_extractor"
    SCENARIO_CONSTRUCTOR = "scenario_constructor"
    NARRATIVE_GENERATOR = "narrative_generator"
    SIGNPOST_DESIGNER = "signpost_designer"
    ACTION_PLANNER = "action_planner"
    QUALITY_CRITIC = "quality_critic"


class PromptTemplate(BaseModel):
    """Template for agent prompts."""
    agent_type: AgentType
    system_prompt: str
    user_prompt_template: str
    output_schema: Optional[Dict[str, Any]] = None
    temperature: float = 1.0
    examples: List[Dict[str, str]] = []


# Agent prompt templates following the business plan requirements

SIGNAL_SYNTHESIZER_TEMPLATE = PromptTemplate(
    agent_type=AgentType.SIGNAL_SYNTHESIZER,
    system_prompt="""You are a strategic foresight analyst specializing in horizon scanning and signal detection.
Your role is to synthesize clusters of data signals into coherent emerging themes.

Analyze the provided signals and evidence to identify:
- Emerging patterns and themes
- Connections between seemingly disparate signals
- Weak signals that might indicate major future changes
- Evidence quality and credibility assessment

Be rigorous about evidence. Every theme must be supported by specific evidence citations.""",
    user_prompt_template="""Analyze the following signals and evidence to identify emerging themes:

SIGNALS:
{signals}

EVIDENCE:
{evidence}

INDUSTRY CONTEXT: {industry}
REGION CONTEXT: {region}
TIME HORIZON: {horizon}

Synthesize these into emerging themes. For each theme:
1. Provide a clear title and description
2. List supporting signals (with IDs)
3. Cite specific evidence (with IDs and quotes)
4. Assess theme strength and coherence
5. Note any contradictory evidence

Output your analysis as structured JSON following this schema:
{output_schema}""",
    output_schema={
        "type": "object",
        "properties": {
            "themes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                        "signal_ids": {"type": "array", "items": {"type": "string"}},
                        "evidence_map": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "evidence_id": {"type": "string"},
                                    "quote": {"type": "string"},
                                    "relevance": {"type": "string"}
                                }
                            }
                        },
                        "strength": {"type": "number", "minimum": 0, "maximum": 1},
                        "coherence": {"type": "number", "minimum": 0, "maximum": 1},
                        "contradictions": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["title", "description", "signal_ids", "evidence_map", "strength"]
                }
            }
        }
    },
    temperature=1.0
)


DRIVER_EXTRACTOR_TEMPLATE = PromptTemplate(
    agent_type=AgentType.DRIVER_EXTRACTOR,
    system_prompt="""You are a strategic foresight expert specializing in identifying driving forces and critical uncertainties.

Your role is to:
- Identify key drivers that will shape the future
- Assess their impact and uncertainty levels
- Distinguish between predetermined elements and genuine uncertainties
- Select critical uncertainties suitable for scenario planning (high impact + high uncertainty)

Use the STEEP framework (Social, Technological, Economic, Environmental, Political) to ensure comprehensive coverage.""",
    user_prompt_template="""Based on the following themes and evidence, identify key drivers and critical uncertainties:

THEMES:
{themes}

EVIDENCE:
{evidence}

INDUSTRY: {industry}
REGION: {region}
TIME HORIZON: {horizon}

For DRIVERS:
- Identify forces with significant potential impact
- Score impact (0-1) and uncertainty (0-1)
- Categorize by STEEP
- Cite supporting evidence

For CRITICAL UNCERTAINTIES:
- Select 2-3 high-impact, high-uncertainty factors
- Define two plausible extreme poles for each
- Explain why this is genuinely uncertain (not predetermined)

Output as structured JSON:
{output_schema}""",
    output_schema={
        "type": "object",
        "properties": {
            "drivers": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "impact": {"type": "number", "minimum": 0, "maximum": 1},
                        "uncertainty": {"type": "number", "minimum": 0, "maximum": 1},
                        "category": {"type": "string", "enum": ["social", "technological", "economic", "environmental", "political"]},
                        "timeframe": {"type": "string"},
                        "evidence_ids": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["name", "description", "impact", "uncertainty", "category"]
                }
            },
            "critical_uncertainties": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "axis": {"type": "string"},
                        "poles": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
                        "rationale": {"type": "string"},
                        "driver_references": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["name", "description", "axis", "poles", "rationale"]
                }
            }
        }
    },
    temperature=1.0
)


SCENARIO_CONSTRUCTOR_TEMPLATE = PromptTemplate(
    agent_type=AgentType.SCENARIO_CONSTRUCTOR,
    system_prompt="""You are a scenario planning expert specializing in creating coherent scenario logics.

Your role is to:
- Combine critical uncertainties into a scenario framework (typically 2x2 matrix)
- Create distinct, internally consistent scenario logics
- Ensure scenarios are plausible, challenging, and span the uncertainty space
- Avoid "business as usual" or wish-fulfillment scenarios
- Create scenario titles that are memorable and descriptive

Each scenario must be internally consistent - the combination of drivers must make logical sense together.""",
    user_prompt_template="""Create a scenario framework based on these critical uncertainties and drivers:

CRITICAL UNCERTAINTIES:
{uncertainties}

DRIVERS:
{drivers}

INDUSTRY: {industry}
HORIZON: {horizon}

Create 3-5 distinct scenarios. For each scenario:
1. Position on the uncertainty axes
2. Title (evocative and descriptive)
3. Core logic (how drivers combine in this scenario)
4. Key causal relationships
5. What makes this scenario distinct from others

Output as structured JSON:
{output_schema}""",
    output_schema={
        "type": "object",
        "properties": {
            "scenario_framework": {"type": "string"},
            "scenarios": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "summary": {"type": "string"},
                        "uncertainty_positions": {"type": "object"},
                        "key_drivers": {"type": "array", "items": {"type": "string"}},
                        "core_logic": {"type": "string"},
                        "causal_chain": {"type": "array", "items": {"type": "string"}},
                        "distinguishing_features": {"type": "array", "items": {"type": "string"}}
                    },
                    "required": ["title", "summary", "uncertainty_positions", "core_logic"]
                }
            }
        }
    },
    temperature=1.0
)


NARRATIVE_GENERATOR_TEMPLATE = PromptTemplate(
    agent_type=AgentType.NARRATIVE_GENERATOR,
    system_prompt="""You are a futurist and storyteller specializing in crafting vivid, plausible scenario narratives.

Your role is to transform scenario logics into rich narrative descriptions that:
- Paint a vivid picture of what the future looks like in this scenario
- Are grounded in evidence and data
- Include specific details about technology, society, economy, environment, politics
- Use concrete examples and illustrations
- Maintain internal consistency
- Cite evidence for major claims
- Are engaging and memorable while remaining rigorous

Write in present tense as if describing a world that has already arrived.""",
    user_prompt_template="""Create a detailed narrative for the following scenario:

SCENARIO TITLE: {title}
SCENARIO LOGIC: {logic}
UNCERTAINTY POSITIONS: {positions}
KEY DRIVERS: {drivers}

SUPPORTING EVIDENCE:
{evidence}

QUANTITATIVE ASSUMPTIONS:
{quant_assumptions}

INDUSTRY: {industry}
TARGET YEAR: {target_year}

Write a 500-800 word narrative describing this future. Structure it with:
1. Opening scene (vivid snapshot of this future)
2. How we got here (key transitions and tipping points)
3. The current state (economy, technology, society, environment)
4. Implications for {industry}
5. Specific examples and details

CRITICAL: Cite evidence using [evidence_id] notation after claims.

Output as structured JSON with the narrative and citations:
{output_schema}""",
    output_schema={
        "type": "object",
        "properties": {
            "narrative": {"type": "string"},
            "summary": {"type": "string"},
            "citations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "evidence_id": {"type": "string"},
                        "quote": {"type": "string"},
                        "source": {"type": "string"},
                        "relevance": {"type": "string"}
                    }
                }
            },
            "key_events": {"type": "array", "items": {"type": "string"}},
            "tipping_points": {"type": "array", "items": {"type": "string"}}
        },
        "required": ["narrative", "citations"]
    },
    temperature=1.0
)


SIGNPOST_DESIGNER_TEMPLATE = PromptTemplate(
    agent_type=AgentType.SIGNPOST_DESIGNER,
    system_prompt="""You are a strategic intelligence analyst specializing in designing monitoring frameworks.

Your role is to:
- Identify early indicators (signposts) that a scenario is becoming more/less likely
- Create specific, measurable, monitorable indicators
- Define clear thresholds and monitoring cadences
- Distinguish leading vs lagging indicators
- Ensure signposts are actually observable in practice

Good signposts are SMART: Specific, Measurable, Actionable, Relevant, Time-bound.""",
    user_prompt_template="""Design signposts to monitor for the following scenario:

SCENARIO: {title}
NARRATIVE: {narrative}
KEY ASSUMPTIONS: {assumptions}
DRIVERS: {drivers}

For this scenario, identify:
1. Leading indicators (early signals this scenario is materializing)
2. Confirming indicators (evidence scenario is well underway)
3. Data sources where these can be monitored
4. Thresholds that would increase scenario likelihood
5. Monitoring cadence (daily/weekly/monthly/quarterly)

Create 5-8 specific signposts that span different domains (policy, technology, market, social, etc.)

Output as structured JSON:
{output_schema}""",
    output_schema={
        "type": "object",
        "properties": {
            "signposts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "type": {"type": "string", "enum": ["metric", "event", "threshold", "pattern"]},
                        "indicator_type": {"type": "string", "enum": ["leading", "confirming", "lagging"]},
                        "threshold": {"type": "string"},
                        "data_sources": {"type": "array", "items": {"type": "string"}},
                        "cadence": {"type": "string"},
                        "query": {"type": "string"},
                        "current_status": {"type": "string"}
                    },
                    "required": ["name", "description", "type", "threshold", "cadence"]
                }
            }
        }
    },
    temperature=0.7
)


ACTION_PLANNER_TEMPLATE = PromptTemplate(
    agent_type=AgentType.ACTION_PLANNER,
    system_prompt="""You are a strategic advisor specializing in scenario-based planning and robust decision-making.

Your role is to:
- Identify strategic actions and recommendations
- Distinguish robust actions (work across multiple scenarios) from contingent actions (specific to one scenario)
- Recommend no-regret moves (beneficial regardless of which scenario unfolds)
- Design contingency plans triggered by signposts
- Assess risks and opportunities in each scenario

Apply robust decision-making principles: favor flexibility, reversibility, and options value.""",
    user_prompt_template="""Develop strategic recommendations based on these scenarios:

SCENARIOS:
{scenarios}

ORGANIZATION CONTEXT: {context}
CURRENT STRATEGY: {current_strategy}
CONSTRAINTS: {constraints}

For each scenario, identify:
1. Strategic implications (risks & opportunities)
2. Scenario-specific actions

Then identify:
3. Robust actions (beneficial in multiple/all scenarios)
4. No-regret moves (valuable regardless of outcome)
5. Contingency triggers (if signpost X fires, do Y)
6. Hedge strategies

Prioritize by impact and urgency.

Output as structured JSON:
{output_schema}""",
    output_schema={
        "type": "object",
        "properties": {
            "robust_actions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "action": {"type": "string"},
                        "rationale": {"type": "string"},
                        "robustness_score": {"type": "number"},
                        "scenario_coverage": {"type": "array"},
                        "timeframe": {"type": "string"},
                        "priority": {"type": "string"}
                    }
                }
            },
            "scenario_specific_actions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "scenario_id": {"type": "string"},
                        "action": {"type": "string"},
                        "trigger": {"type": "string"},
                        "timeframe": {"type": "string"}
                    }
                }
            },
            "risks": {"type": "array"},
            "opportunities": {"type": "array"}
        }
    },
    temperature=1.0
)


QUALITY_CRITIC_TEMPLATE = PromptTemplate(
    agent_type=AgentType.QUALITY_CRITIC,
    system_prompt="""You are a quality assurance specialist for scenario planning outputs.

Your role is to critique and validate scenario sets for:
- Internal consistency within each scenario
- Diversity across scenarios (avoiding redundancy)
- Plausibility (grounded in evidence, not science fiction)
- Completeness (do scenarios span the uncertainty space?)
- Balance (avoiding optimistic or pessimistic bias)
- Citation quality (claims backed by evidence)
- Missing perspectives or blind spots

Be rigorous but constructive. Identify issues and suggest improvements.""",
    user_prompt_template="""Review this scenario set for quality and completeness:

SCENARIO SET:
{scenario_set}

EVIDENCE BASE:
{evidence_summary}

Check for:
1. Internal consistency issues in each scenario
2. Overlap/redundancy between scenarios
3. Missing counter-scenarios or perspectives
4. Insufficient evidence citations
5. Implausible assumptions
6. Bias (optimistic/pessimistic)
7. Blind spots (regions, stakeholders, factors ignored)

For each issue found:
- Severity: critical/major/minor
- Description
- Suggested fix

Output as structured JSON:
{output_schema}""",
    output_schema={
        "type": "object",
        "properties": {
            "overall_quality_score": {"type": "number", "minimum": 0, "maximum": 1},
            "issues": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "severity": {"type": "string", "enum": ["critical", "major", "minor"]},
                        "category": {"type": "string"},
                        "description": {"type": "string"},
                        "affected_scenarios": {"type": "array"},
                        "suggested_fix": {"type": "string"}
                    }
                }
            },
            "strengths": {"type": "array", "items": {"type": "string"}},
            "missing_perspectives": {"type": "array", "items": {"type": "string"}},
            "recommendations": {"type": "array", "items": {"type": "string"}}
        }
    },
    temperature=0.5
)


# Registry of all agent templates
AGENT_TEMPLATES: Dict[AgentType, PromptTemplate] = {
    AgentType.SIGNAL_SYNTHESIZER: SIGNAL_SYNTHESIZER_TEMPLATE,
    AgentType.DRIVER_EXTRACTOR: DRIVER_EXTRACTOR_TEMPLATE,
    AgentType.SCENARIO_CONSTRUCTOR: SCENARIO_CONSTRUCTOR_TEMPLATE,
    AgentType.NARRATIVE_GENERATOR: NARRATIVE_GENERATOR_TEMPLATE,
    AgentType.SIGNPOST_DESIGNER: SIGNPOST_DESIGNER_TEMPLATE,
    AgentType.ACTION_PLANNER: ACTION_PLANNER_TEMPLATE,
    AgentType.QUALITY_CRITIC: QUALITY_CRITIC_TEMPLATE,
}


def get_agent_template(agent_type: AgentType) -> PromptTemplate:
    """Get prompt template for an agent type."""
    return AGENT_TEMPLATES[agent_type]
