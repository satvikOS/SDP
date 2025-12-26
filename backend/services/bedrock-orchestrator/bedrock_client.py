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

        try:
            response = self.bedrock.invoke_model(
                modelId=self.model_id,
                contentType='application/json',
                accept='application/json',
                body=json.dumps({
                    'anthropic_version': 'bedrock-2023-05-31',
                    'max_tokens': 16000,
                    'temperature': 0.7,
                    'messages': [
                        {
                            'role': 'user',
                            'content': prompt
                        }
                    ]
                })
            )

            response_body = json.loads(response['body'].read())
            ai_response = response_body['content'][0]['text']

            logger.info(f"Received Bedrock response: {len(ai_response)} characters")

            scenarios = self._parse_scenarios_from_response(ai_response)

            return scenarios

        except Exception as e:
            logger.error(f"Bedrock API error: {e}", exc_info=True)
            raise

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

        prompt = f"""You are an elite strategic foresight consultant working for {company_name}, a leading {industry} company operating in {region}. You must generate 4 distinct, highly specific strategic scenarios for the next {horizon_years} years.
{context_section}

CRITICAL REQUIREMENTS:
1. **Industry Specificity**: Use actual terminology, regulations, technologies, and competitive dynamics specific to the {industry} sector in {region}
2. **Quantitative Rigor**: Include specific numbers - costs, percentages, timelines, ROI, NPV, market shares, margins
3. **Strategic Decisions**: Frame each scenario around specific capital allocation decisions {company_name} must make
4. **Company-Specific**: Reference {company_name} throughout, not generic "companies"
5. **Actionable Intelligence**: Focus on decisions keeping the C-suite up at night, not academic analysis

For {industry} specifically, incorporate:
- Relevant regulatory frameworks
- Industry-specific metrics
- Competitive dynamics with named competitors where relevant
- Technology trends reshaping the sector
- Geopolitical or macroeconomic factors affecting {region}

OUTPUT FORMAT:
Return ONLY valid JSON array with exactly 4 scenarios:
[
  {{
    "title": "Scenario name",
    "core_logic": "One sentence driving force (max 150 chars)",
    "narrative": "Detailed 400-600 word narrative with quantitative details, strategic tradeoffs, and specific decisions {company_name} must make",
    "probability": 0.XX
  }}
]

Generate enterprise-grade scenarios NOW. Return ONLY the JSON array."""

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
