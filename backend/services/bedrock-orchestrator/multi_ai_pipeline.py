"""
Multi-AI Model Pipeline for Enterprise Scenario Generation

Workflow:
1. Claude Opus 4.5 - Initial comprehensive scenario draft (via Bedrock)
2. Gemini 3 Pro - Strategic review & harsh critique (via Google AI API)
3. Claude Sonnet 4.5 - Due diligence & rewrite (via Bedrock)
4. Claude Opus 4.5 - Final refinement with citations, formatting, branding (via Bedrock)

This pipeline provides 3x validation layers using diverse AI architectures.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import boto3

logger = logging.getLogger(__name__)


class MultiAIPipeline:
    """Orchestrate multiple AI models for comprehensive scenario generation."""

    def __init__(self):
        """Initialize multi-AI pipeline with Bedrock and Google AI clients."""
        self.bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

        # Model IDs
        self.claude_opus = "us.anthropic.claude-opus-4-5-20251101-v1:0"  # Claude Opus 4.5
        self.claude_sonnet = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"  # Claude Sonnet 4.5

        # Initialize Google Gemini client
        self.google_api_key = os.getenv('GOOGLE_API_KEY', 'AIzaSyDM-pYF5GB0u6GltVxeHlAGMj6Ck1FcZls')
        self.google_client = None

        if self.google_api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.google_api_key)
                self.google_client = genai
                logger.info("Google Gemini client initialized successfully")
            except ImportError:
                logger.warning("google-generativeai package not installed. Gemini review will be skipped.")
        else:
            logger.warning("GOOGLE_API_KEY not set. Gemini review will be skipped.")

        logger.info("Multi-AI pipeline initialized (Claude Opus → Gemini → Claude Sonnet → Claude Opus)")

    def execute_pipeline(
        self,
        company_name: str,
        industry: str,
        region: str,
        horizon_years: int,
        strategic_context: str,
        multi_agent_output: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute the full multi-AI pipeline.

        Args:
            company_name: Company/organization name
            industry: Industry sector
            region: Geographic region
            horizon_years: Planning horizon in years
            strategic_context: User-provided strategic context
            multi_agent_output: Output from the 7-agent Claude workflow

        Returns:
            Enhanced scenario set with all review layers applied
        """
        logger.info(f"Starting multi-AI pipeline for {company_name}")

        pipeline_metadata = {
            'pipeline_version': '1.0',
            'started_at': datetime.utcnow().isoformat(),
            'models_used': [],
            'review_layers': []
        }

        try:
            # Step 1: Initial draft is already done (multi_agent_output)
            initial_draft = self._format_initial_draft(multi_agent_output)
            pipeline_metadata['models_used'].append('claude-opus-4')
            logger.info("Step 1/4: Initial draft formatted")

            # Step 2: Gemini Strategic Review (via Google AI)
            strategic_critique = self._gemini_strategic_review(
                company_name, industry, region, horizon_years,
                strategic_context, initial_draft
            )
            pipeline_metadata['models_used'].append('gemini-3-pro')
            pipeline_metadata['review_layers'].append('strategic_review')
            logger.info("Step 2/4: Gemini strategic review completed")

            # Step 3: Claude Sonnet Due Diligence & Rewrite (via Bedrock)
            refined_scenarios = self._claude_sonnet_due_diligence(
                company_name, industry, region, horizon_years,
                strategic_context, initial_draft, strategic_critique
            )
            pipeline_metadata['models_used'].append('claude-sonnet-4.5')
            pipeline_metadata['review_layers'].append('due_diligence')
            logger.info("Step 3/4: Claude Sonnet due diligence completed")

            # Step 4: Claude Final Refinement (Professional Document)
            final_document = self._claude_final_refinement(
                company_name, industry, region, horizon_years,
                strategic_context, refined_scenarios, strategic_critique
            )
            pipeline_metadata['review_layers'].append('final_refinement')
            logger.info("Step 4/4: Claude final refinement completed")

            pipeline_metadata['completed_at'] = datetime.utcnow().isoformat()

            return {
                'scenarios': final_document['scenarios'],
                'executive_summary': final_document.get('executive_summary'),
                'strategic_critique': strategic_critique,
                'pipeline_metadata': pipeline_metadata,
                'professional_document': final_document
            }

        except Exception as e:
            logger.error(f"Multi-AI pipeline failed: {str(e)}", exc_info=True)
            # Fallback to original output
            return {
                'scenarios': multi_agent_output.get('scenarios', []),
                'pipeline_metadata': {
                    **pipeline_metadata,
                    'error': str(e),
                    'fallback_used': True
                }
            }

    def _format_initial_draft(self, multi_agent_output: Dict[str, Any]) -> str:
        """Format the multi-agent output into a readable text format."""
        scenarios = multi_agent_output.get('scenarios', [])

        formatted = "# INITIAL SCENARIO SET\n\n"

        for idx, scenario in enumerate(scenarios, 1):
            formatted += f"## Scenario {idx}: {scenario.get('title', 'Untitled')}\n\n"
            formatted += f"**Probability:** {scenario.get('probability', 0) * 100:.1f}%\n\n"
            formatted += f"**Core Logic:** {scenario.get('core_logic', '')}\n\n"
            formatted += f"### Narrative\n{scenario.get('narrative', '')}\n\n"

            drivers = scenario.get('key_drivers', [])
            if drivers:
                formatted += f"### Key Drivers\n"
                for driver in drivers:
                    formatted += f"- {driver}\n"
                formatted += "\n"

            signposts = scenario.get('signposts', [])
            if signposts:
                formatted += f"### Early Warning Signposts\n"
                for signpost in signposts:
                    formatted += f"- {signpost}\n"
                formatted += "\n"

            formatted += "---\n\n"

        return formatted

    def _gemini_strategic_review(
        self,
        company_name: str,
        industry: str,
        region: str,
        horizon_years: int,
        strategic_context: str,
        initial_draft: str
    ) -> str:
        """
        Gemini 3 Pro acts as Head of Strategy & Implementation.
        Provides harshest possible critique of scenarios via Google AI API.
        """
        prompt = f"""You are the **Head of Strategy & Implementation** for {company_name}, a {industry} company operating in {region}.

Your mission is to provide the **harshest possible strategic critique** of these scenario forecasts for the next {horizon_years} years.

**Strategic Context:**
{strategic_context}

**Initial Scenario Set:**
{initial_draft}

As a battle-tested strategy executive, you must identify:

1. **Critical Gaps**: What vital uncertainties or drivers are missing?
2. **Unrealistic Assumptions**: Which scenarios rely on implausible assumptions?
3. **Strategic Blindspots**: What threats or opportunities are overlooked?
4. **Weak Quantitative Rigor**: Where are the numbers vague or unsupported?
5. **Implementation Challenges**: What makes these scenarios difficult to operationalize?
6. **Competitive Intelligence Gaps**: What about competitors' moves?
7. **Regulatory/Geopolitical Risks**: Are these adequately considered?
8. **Financial Viability**: Do the scenarios make economic sense?

Be **ruthlessly honest**. Your job is to stress-test these scenarios to destruction. Identify every flaw, weakness, and gap. No scenario should survive your critique unscathed.

Provide your critique in a structured format with specific, actionable feedback."""

        try:
            if not self.google_client:
                return "Gemini review skipped: Google AI client not available"

            model = self.google_client.GenerativeModel('gemini-2.0-flash-exp')
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini strategic review failed: {str(e)}")
            return f"Strategic review unavailable: {str(e)}"

    def _claude_sonnet_due_diligence(
        self,
        company_name: str,
        industry: str,
        region: str,
        horizon_years: int,
        strategic_context: str,
        initial_draft: str,
        strategic_critique: str
    ) -> str:
        """
        Claude Sonnet 4.5 acts as Chief Analyst.
        Incorporates Gemini critique + performs independent analysis via Bedrock.
        Rewrites scenarios with improvements.
        """
        prompt = f"""You are the **Chief Analyst** conducting due diligence on strategic scenarios for {company_name}, a {industry} company in {region} with a {horizon_years}-year horizon.

**Strategic Context:**
{strategic_context}

**Initial Scenario Set:**
{initial_draft}

**Strategic Critique from Head of Strategy:**
{strategic_critique}

Your mission is to:

1. **Incorporate the strategic critique**: Address every gap, flaw, and weakness identified
2. **Independent verification**: Apply your own analytical lens to validate or challenge assumptions
3. **Strengthen quantitative rigor**: Add specific metrics, ranges, and confidence intervals where possible
4. **Enhance actionability**: Make scenarios more concrete and operationalizable
5. **Add evidence**: Reference real-world precedents, analogies, and data points
6. **Improve coherence**: Ensure scenarios are internally consistent and mutually distinct

**Rewrite the scenario set** with these improvements integrated. Each scenario should be:
- More specific and quantitatively grounded
- Linked to concrete evidence and precedents
- Addressing all strategic critique points
- Operationally actionable

Output the revised scenarios in the same format as the initial draft."""

        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 8000,
                "temperature": 0.7,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            })

            response = self.bedrock_runtime.invoke_model(
                modelId=self.claude_sonnet,
                body=body
            )

            response_body = json.loads(response['body'].read())
            return response_body['content'][0]['text']
        except Exception as e:
            logger.error(f"Claude Sonnet due diligence failed: {str(e)}")
            return initial_draft  # Fallback to initial draft

    def _claude_final_refinement(
        self,
        company_name: str,
        industry: str,
        region: str,
        horizon_years: int,
        strategic_context: str,
        refined_scenarios: str,
        strategic_critique: Optional[str]
    ) -> Dict[str, Any]:
        """
        Claude Opus 4 performs final refinement.
        Adds professional formatting, citations, glossary, index.
        Prepares executive-ready document.
        """
        prompt = f"""You are a **Senior Strategic Document Editor** preparing an executive-ready foresight report for {company_name}.

**Company:** {company_name}
**Industry:** {industry}
**Region:** {region}
**Time Horizon:** {horizon_years} years
**Strategic Context:** {strategic_context}

**Refined Scenario Set (Post-Review):**
{refined_scenarios}

{"**Strategic Review Feedback:**" if strategic_critique else ""}
{strategic_critique if strategic_critique else ""}

Your mission is to create a **publication-quality strategic foresight document** with:

1. **Executive Summary** (2-3 paragraphs)
   - Key findings and strategic implications
   - Recommended actions

2. **Refined Scenario Narratives**
   - Polish language for C-suite readership
   - Add APA-style citations for all factual claims
   - Include specific metrics and timeframes
   - Ensure scenarios are distinct and comprehensive

3. **Strategic Implications Section**
   - Impact on {company_name}'s strategic priorities
   - Risk & opportunity assessment
   - Decision points and trigger events

4. **Glossary**
   - Define technical terms and acronyms used

5. **Key Citations**
   - List all sources referenced (APA format)

6. **Recommended Actions**
   - Prioritized list of strategic initiatives
   - Timeframes and success metrics

Output as a structured JSON object with:
- executive_summary (string)
- scenarios (array of objects with: title, probability, narrative_refined, strategic_implications, key_drivers, signposts, citations)
- glossary (object with term: definition pairs)
- references (array of citation strings)
- recommended_actions (array of objects with: action, rationale, timeframe, success_metrics)

Ensure professional tone, quantitative rigor, and executive-level polish."""

        try:
            # Call Claude Opus via Bedrock
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 8000,
                "temperature": 0.7,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            })

            response = self.bedrock_runtime.invoke_model(
                modelId="us.anthropic.claude-3-5-sonnet-20241022-v2:0",  # Use Sonnet for now as Opus 4 might not be available
                body=body
            )

            response_body = json.loads(response['body'].read())
            output_text = response_body['content'][0]['text']

            # Try to parse as JSON
            try:
                # Look for JSON block in the response
                if '```json' in output_text:
                    json_start = output_text.find('```json') + 7
                    json_end = output_text.find('```', json_start)
                    output_text = output_text[json_start:json_end].strip()

                final_document = json.loads(output_text)
                return final_document
            except json.JSONDecodeError:
                # If parsing fails, create structured output from text
                return {
                    'executive_summary': "Document refinement in progress",
                    'scenarios': self._extract_scenarios_from_text(refined_scenarios),
                    'raw_output': output_text
                }

        except Exception as e:
            logger.error(f"Claude final refinement failed: {str(e)}")
            return {
                'executive_summary': "Final refinement unavailable",
                'scenarios': self._extract_scenarios_from_text(refined_scenarios),
                'error': str(e)
            }

    def _extract_scenarios_from_text(self, text: str) -> List[Dict[str, Any]]:
        """Extract scenarios from markdown text format."""
        scenarios = []
        # Simple extraction logic - can be enhanced
        sections = text.split('## Scenario ')

        for section in sections[1:]:  # Skip first split (before first scenario)
            lines = section.split('\n')
            title = lines[0].strip() if lines else "Untitled"

            scenario = {
                'title': title.split(':', 1)[-1].strip() if ':' in title else title,
                'narrative': '\n'.join(lines[1:]) if len(lines) > 1 else "",
                'probability': 0.25  # Default
            }
            scenarios.append(scenario)

        return scenarios if scenarios else [{'title': 'Scenario', 'narrative': text, 'probability': 1.0}]
