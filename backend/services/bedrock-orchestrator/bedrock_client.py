"""AWS Bedrock client for AI-powered scenario generation."""

import json
import boto3
import logging
from typing import Dict, List, Any

logger = logging.getLogger()

class BedrockScenarioGenerator:
    """Generate scenarios using AWS Bedrock AI models."""

    def __init__(self):
        self.bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

        # ULTIMATE ENTERPRISE MODE: AI Opus 4.5 - Most powerful model available
        # - Absolute maximum reasoning depth and strategic foresight capability
        # - Upwards of 1000s of words with no artificial limits
        # - Client demands exhaustive detail regardless of cost or latency
        self.model_id = 'anthropic.claude-opus-4-5-20251101-v1:0'  # Opus 4.5 in Bedrock

        # NO LIMIT on output - client wants 1000s of words
        self.max_tokens = 200000  # Maximum possible - no artificial constraints
        self.temperature = 0.8  # Nuanced strategic scenarios

    def generate_scenarios(
        self,
        company_name: str,
        industry: str,
        region: str,
        horizon_years: int,
        strategic_context: str = ''
    ) -> List[Dict[str, Any]]:
        """Generate 4 scenarios using AI via Bedrock."""

        prompt = self._build_scenario_prompt(
            company_name, industry, region, horizon_years, strategic_context
        )

        logger.info(f"Calling Bedrock with model: {self.model_id}")
        logger.info(f"Request params - Company: {company_name}, Industry: {industry}, Region: {region}, Horizon: {horizon_years}y")

        try:
            # Build request payload
            request_body = {
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': self.max_tokens,
                'temperature': self.temperature,
                'messages': [
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ]
            }

            logger.info(f"Bedrock request body size: {len(json.dumps(request_body))} bytes")

            # Invoke Bedrock model
            response = self.bedrock.invoke_model(
                modelId=self.model_id,
                contentType='application/json',
                accept='application/json',
                body=json.dumps(request_body)
            )

            logger.info("Bedrock API call successful, parsing response...")

            # Parse response
            response_body = json.loads(response['body'].read())

            # Log response structure for debugging
            logger.info(f"Response keys: {list(response_body.keys())}")

            if 'content' not in response_body:
                logger.error(f"Unexpected response structure: {response_body}")
                raise ValueError("Bedrock response missing 'content' field")

            ai_response = response_body['content'][0]['text']

            logger.info(f"Received Bedrock response: {len(ai_response)} characters")

            scenarios = self._parse_scenarios_from_response(ai_response)

            logger.info(f"Successfully parsed {len(scenarios)} scenarios from AI response")

            return scenarios

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error in Bedrock response: {e}", exc_info=True)
            raise ValueError(f"Failed to parse Bedrock response JSON: {str(e)}")

        except KeyError as e:
            logger.error(f"Missing expected key in Bedrock response: {e}", exc_info=True)
            raise ValueError(f"Malformed Bedrock response structure: {str(e)}")

        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            logger.error(f"Bedrock API error ({error_type}): {error_msg}", exc_info=True)

            # Check for common error types
            if 'ValidationException' in error_type:
                raise ValueError(f"Bedrock validation error: {error_msg}")
            elif 'AccessDeniedException' in error_type:
                raise PermissionError(f"Bedrock access denied - check IAM permissions: {error_msg}")
            elif 'ResourceNotFoundException' in error_type:
                raise ValueError(f"Bedrock model not found - verify model access: {error_msg}")
            elif 'ThrottlingException' in error_type:
                raise RuntimeError(f"Bedrock API throttled - too many requests: {error_msg}")
            else:
                raise RuntimeError(f"Bedrock API error: {error_msg}")

    def _build_scenario_prompt(
        self,
        company_name: str,
        industry: str,
        region: str,
        horizon_years: int,
        strategic_context: str
    ) -> str:
        """Build the detailed prompt for scenario generation."""

        context_section = ""
        if strategic_context:
            context_section = f"""

STRATEGIC CONTEXT PROVIDED BY CLIENT:
{strategic_context}

You MUST address the specific strategic questions, metrics, and concerns mentioned in this context throughout your scenarios.
"""

        prompt = f"""You are an elite strategic foresight consultant working exclusively for {company_name}, a {industry} company operating in {region}. Generate 4 EXHAUSTIVELY DETAILED strategic scenarios for the next {horizon_years} years.
{context_section}

CRITICAL: OUTPUT MUST BE SPECIFIC TO {company_name}, {industry}, {region} ONLY. NO GENERIC CONTENT.

EXHAUSTIVE DETAIL REQUIREMENTS (UPWARDS OF 1000s OF WORDS - NO LIMIT):
- Each narrative: 2000-5000 words (NO brevity, exhaustive depth)
- Minimum 25+ specific quantitative metrics per scenario
- Named competitors with exact market share data
- Specific regulations with compliance costs and dates
- Technologies with adoption curves, cost trajectories, maturity timelines
- Decision trees with quantified NPV/IRR for every branch
- Sensitivity analysis with exact thresholds
- Supply chain impacts with supplier names and geographies
- Workforce implications with headcount and skill requirements
- M&A targets with valuation ranges and strategic rationale

STRUCTURED DATA FOR VISUALIZATIONS (MANDATORY):
Include these data structures for rendering charts/graphs:
1. **Financial Metrics Table**: Annual projections (revenue, EBITDA, FCF, capex)
2. **Decision Tree Data**: JSON tree structure with nodes, branches, outcomes, probabilities
3. **Timeline Chart**: Key milestones with dates and dependencies
4. **Sensitivity Analysis Matrix**: Variables vs outcomes with exact values
5. **Competitive Positioning**: Market share data for visualization
6. **Risk Heatmap**: Risk categories with probability and impact scores

OUTPUT FORMAT:
Return ONLY valid JSON with exactly 4 scenarios. Each scenario MUST include structured data for visualizations:

[
  {{
    "title": "Scenario name (7-10 words)",
    "core_logic": "Driving forces (200-300 characters)",
    "narrative": "EXHAUSTIVE 2000-5000 word Board-level narrative. NO LIMITS ON LENGTH. Include: (1) Current baseline with {company_name}'s exact market position, financials, competitive standing in {industry}/{region}, (2) 5-7 specific multi-billion dollar strategic decisions with exact amounts and tradeoffs, (3) Competitive dynamics naming every major player with market shares and strategic moves, (4) Regulatory timeline with exact dates and compliance costs, (5) Technology roadmap with maturity curves and adoption thresholds, (6) Quantified outcomes for EVERY decision path with full NPV/IRR/payback analysis, (7) Risk scenarios with probability-weighted outcomes, (8) Implementation roadmap with detailed phase gates, capital requirements, resource allocations, (9) Organizational implications with exact headcount, skills, structure changes, (10) M&A opportunities with specific targets and valuations. MAXIMUM DETAIL - this is $100K+ Board-level intelligence.",

    "probability": 0.XX,

    "financial_projections": {{
      "years": [2025, 2026, 2027, ...],
      "revenue_bn": [X, X, X, ...],
      "ebitda_margin_pct": [X, X, X, ...],
      "capex_bn": [X, X, X, ...],
      "fcf_bn": [X, X, X, ...]
    }},

    "decision_tree": {{
      "root": {{
        "decision": "Primary strategic choice for {company_name}",
        "options": [
          {{
            "choice": "Option A description",
            "investment_bn": X,
            "branches": [
              {{
                "outcome": "Outcome description",
                "probability": 0.X,
                "npv_bn": X,
                "irr_pct": X
              }}
            ]
          }}
        ]
      }}
    }},

    "timeline_milestones": [
      {{"year": 2025, "quarter": "Q2", "event": "Specific milestone for {company_name}", "impact": "Quantified impact"}},
      ...
    ],

    "sensitivity_matrix": {{
      "variables": ["Carbon price $/ton", "Commodity cost index", ...],
      "scenarios": [
        {{"variable_values": [X, X, ...], "outcome_npv_bn": X, "outcome_irr_pct": X}},
        ...
      ]
    }},

    "competitive_landscape": [
      {{"company": "Competitor name", "market_share_pct": X, "strategic_move": "Description"}},
      ...
    ],

    "risk_heatmap": [
      {{"risk": "Specific risk", "probability_pct": X, "impact_bn": X, "mitigation": "Strategy"}},
      ...
    ]
  }}
]

REMEMBER:
- 2000-5000 words per narrative (upwards of 1000s of words total)
- ALL content specific to {company_name}, {industry}, {region} - NO generic themes
- Complete structured data for ALL visualizations
- Board-level intelligence worth $100K+ per analysis"""

        return prompt

    def _parse_scenarios_from_response(self, ai_response: str) -> List[Dict[str, Any]]:
        """Parse JSON scenarios from Claude's response."""

        try:
            start = ai_response.find('[')
            end = ai_response.rfind(']') + 1

            if start == -1 or end == 0:
                raise ValueError("No JSON array found in response")

            json_str = ai_response[start:end]
            scenarios = json.loads(json_str)

            if not isinstance(scenarios, list) or len(scenarios) != 4:
                raise ValueError(f"Expected 4 scenarios, got {len(scenarios)}")

            for scenario in scenarios:
                required_fields = ['title', 'core_logic', 'narrative', 'probability']
                if not all(field in scenario for field in required_fields):
                    raise ValueError(f"Scenario missing required fields")

            logger.info(f"Successfully parsed {len(scenarios)} scenarios")
            return scenarios

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            raise ValueError(f"Invalid JSON in AI response: {e}")
