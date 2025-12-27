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
        self.model_id = 'anthropic.claude-3-5-sonnet-20241022-v2:0'
        # Maximum detail - no latency concerns
        self.max_tokens = 32000  # Increased for exhaustive detail
        self.temperature = 0.8  # Higher for creative detailed scenarios

    def generate_scenarios(
        self,
        company_name: str,
        industry: str,
        region: str,
        horizon_years: int,
        strategic_context: str = ''
    ) -> List[Dict[str, Any]]:
        """Generate 4 scenarios using Claude via Bedrock."""

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

        prompt = f"""You are an elite strategic foresight consultant working for {company_name}, a leading {industry} company operating in {region}. You must generate 4 distinct, EXHAUSTIVELY DETAILED strategic scenarios for the next {horizon_years} years.
{context_section}

CRITICAL REQUIREMENTS - MAXIMUM DETAIL:
1. **Industry Specificity**: Use actual terminology, regulations, technologies, and competitive dynamics specific to {industry} in {region}
2. **Quantitative Rigor**: MANDATORY - Include specific numbers: costs in $ millions/billions, exact percentages, precise timelines, ROI calculations, NPV analysis, market shares, EBITDA margins, capex requirements
3. **Strategic Decisions**: Frame each scenario around 3-5 specific multi-billion dollar capital allocation decisions {company_name} executives must make
4. **Company-Specific**: Reference {company_name} throughout. NOT generic "companies" or "organizations"
5. **Actionable Intelligence**: Board-level decisions with quantified tradeoffs, risk analysis, competitive positioning

EXHAUSTIVE DETAIL REQUIREMENTS (NO BREVITY - MAXIMUM LENGTH):
- Each narrative must be 800-1200 words minimum
- Include at least 10 specific quantitative metrics per scenario
- Name actual competitors, regulations, technologies, geographic locations
- Provide decision trees with quantified outcomes for each branch
- Include sensitivity analysis (e.g., "If carbon pricing exceeds $X/tonne, then...")
- Specify exact timelines for regulatory changes, technology maturity, market shifts
- Detail supply chain impacts, workforce requirements, M&A implications

For {industry} specifically, incorporate:
- Regulatory frameworks with exact compliance costs
- Industry KPIs with benchmark data
- Named competitors with market share data where relevant
- Emerging technologies with adoption curves and cost trajectories
- Geopolitical/macroeconomic scenarios with GDP impacts, trade flow changes

OUTPUT FORMAT:
Return ONLY valid JSON array with exactly 4 scenarios:
[
  {{
    "title": "Compelling scenario name (7-10 words)",
    "core_logic": "Detailed driving force explanation (200-250 characters)",
    "narrative": "EXHAUSTIVE 800-1200 word narrative with maximum quantitative detail. Include: (1) Opening context with current baseline metrics, (2) 3-5 specific strategic decisions {company_name} must make with exact dollar amounts, (3) Competitive dynamics with named players, (4) Regulatory/technology timeline with specific dates, (5) Quantified outcomes for different decision paths with NPV/IRR analysis, (6) Risk factors with probability-weighted scenarios, (7) Implementation roadmap with phase gates and capital requirements. Use specific numbers for EVERYTHING - costs, percentages, timelines, market sizes, growth rates.",
    "probability": 0.XX
  }}
]

REMEMBER: Maximum exhaustive detail. No concern for brevity. This is Board-level strategic intelligence worth $100K+ per analysis."""

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
