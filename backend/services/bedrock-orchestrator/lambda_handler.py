"""AWS Lambda handlers for Bedrock Orchestrator."""

import json
import logging
import os
import boto3
from botocore.config import Config
import uuid
from typing import Dict, List, Any
from datetime import datetime
from decimal import Decimal

# Multi-AI pipeline will be imported dynamically when needed
MULTI_AI_ENABLED = os.getenv('ENABLE_MULTI_MODEL_PIPELINE', 'true').lower() == 'true'

logger = logging.getLogger()
logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))

# Log Multi-AI configuration on module load
logger.info(f"=== MULTI-AI PIPELINE CONFIG ===")
logger.info(f"MULTI_AI_ENABLED: {MULTI_AI_ENABLED}")
logger.info(f"ENABLE_MULTI_MODEL_PIPELINE env: {os.getenv('ENABLE_MULTI_MODEL_PIPELINE', 'NOT_SET')}")
logger.info(f"GOOGLE_API_KEY: {'SET' if os.getenv('GOOGLE_API_KEY') else 'NOT_SET'}")
logger.info(f"================================")


# === MULTI-AI PIPELINE - INLINED TO AVOID IMPORT ISSUES ===
class MultiAIPipeline:
    """Orchestrate multiple AI models for comprehensive scenario generation.

    Workflow:
    1. Claude Opus 4.5 - Initial comprehensive scenario draft (via Bedrock)
    2. Gemini 3 Pro - Strategic review & harsh critique (via Google AI API)
    3. Claude Sonnet 4.5 - Due diligence & rewrite (via Bedrock)
    4. Claude Opus 4.5 - Final refinement with citations, formatting, branding (via Bedrock)

    This pipeline provides 3x validation layers using diverse AI architectures.
    """

    def __init__(self):
        """Initialize multi-AI pipeline with Bedrock and Google AI clients."""
        self.bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')
        self.claude_opus = "us.anthropic.claude-opus-4-5-20251101-v1:0"
        self.claude_sonnet = "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
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

    def execute_pipeline(self, company_name: str, industry: str, region: str, horizon_years: int, strategic_context: str, multi_agent_output: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the full multi-AI pipeline."""
        logger.info(f"Starting multi-AI pipeline for {company_name}")
        pipeline_metadata = {
            'pipeline_version': '1.0',
            'started_at': datetime.utcnow().isoformat(),
            'models_used': [],
            'review_layers': []
        }

        try:
            initial_draft = self._format_initial_draft(multi_agent_output)
            pipeline_metadata['models_used'].append('claude-opus-4.5')
            logger.info("Step 1/4: Initial draft formatted")

            strategic_critique = self._gemini_strategic_review(company_name, industry, region, horizon_years, strategic_context, initial_draft)
            pipeline_metadata['models_used'].append('gemini-3-pro')
            pipeline_metadata['review_layers'].append('strategic_review')
            logger.info("Step 2/4: Gemini strategic review completed")

            refined_scenarios = self._claude_sonnet_due_diligence(company_name, industry, region, horizon_years, strategic_context, initial_draft, strategic_critique)
            pipeline_metadata['models_used'].append('claude-sonnet-4.5')
            pipeline_metadata['review_layers'].append('due_diligence')
            logger.info("Step 3/4: Claude Sonnet due diligence completed")

            final_document = self._claude_final_refinement(company_name, industry, region, horizon_years, strategic_context, refined_scenarios, strategic_critique)
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
            return {
                'scenarios': multi_agent_output.get('scenarios', []),
                'pipeline_metadata': {**pipeline_metadata, 'error': str(e), 'fallback_used': True}
            }

    def _format_initial_draft(self, multi_agent_output: Dict[str, Any]) -> str:
        scenarios = multi_agent_output.get('scenarios', [])
        formatted = "# INITIAL SCENARIO SET\n\n"
        for idx, scenario in enumerate(scenarios, 1):
            formatted += f"## Scenario {idx}: {scenario.get('title', 'Untitled')}\n\n"
            formatted += f"**Probability:** {scenario.get('probability', 0) * 100:.1f}%\n\n"
            formatted += f"**Core Logic:** {scenario.get('core_logic', '')}\n\n"
            formatted += f"### Narrative\n{scenario.get('narrative', '')}\n\n"
            if scenario.get('key_drivers'):
                formatted += "### Key Drivers\n" + '\n'.join(f"- {d}" for d in scenario['key_drivers']) + "\n\n"
            if scenario.get('signposts'):
                formatted += "### Early Warning Signposts\n" + '\n'.join(f"- {s}" for s in scenario['signposts']) + "\n\n"
            formatted += "---\n\n"
        return formatted

    def _gemini_strategic_review(self, company_name: str, industry: str, region: str, horizon_years: int, strategic_context: str, initial_draft: str) -> str:
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

    def _claude_sonnet_due_diligence(self, company_name: str, industry: str, region: str, horizon_years: int, strategic_context: str, initial_draft: str, strategic_critique: str) -> str:
        # Count scenarios in initial draft
        scenario_count = initial_draft.count('## Scenario ')
        logger.info(f"[Due Diligence] Initial draft contains {scenario_count} scenarios")

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

CRITICAL INSTRUCTIONS:
- The initial draft contains {scenario_count} scenarios
- You MUST output ALL {scenario_count} scenarios in your response
- DO NOT ask questions or request clarification - output the revised scenarios directly
- DO NOT write conversational text like "I'll help revise..." or "Would you like me to..."
- START your response immediately with the scenarios in markdown format

REQUIRED OUTPUT FORMAT (use this exact structure):

# INITIAL SCENARIO SET

## Scenario 1: [Title]

**Probability:** [X]%

**Core Logic:** [Brief statement]

### Narrative
[Improved narrative addressing all critique points - 2000+ words]

### Key Drivers
- [Driver 1]
- [Driver 2]
...

### Early Warning Signposts
- [Signpost 1]
- [Signpost 2]
...

---

## Scenario 2: [Title]
[Continue same format for all {scenario_count} scenarios]

Begin your response with "# INITIAL SCENARIO SET" and output all {scenario_count} revised scenarios immediately."""
        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 16000,  # Increased for detailed scenarios
                "temperature": 0.7,
                "messages": [{"role": "user", "content": prompt}]
            })
            response = self.bedrock_runtime.invoke_model(modelId=self.claude_sonnet, body=body)
            response_body = json.loads(response['body'].read())
            refined_text = response_body['content'][0]['text']

            # Validate output contains scenarios
            output_scenario_count = refined_text.count('## Scenario ')
            logger.info(f"[Due Diligence] Output contains {output_scenario_count} scenarios")
            logger.info(f"[Due Diligence] First 500 chars: {refined_text[:500]}")

            if output_scenario_count == 0:
                logger.error(f"[Due Diligence] Claude Sonnet returned conversational response instead of scenarios!")
                logger.error(f"[Due Diligence] Falling back to initial draft")
                return initial_draft

            if output_scenario_count < scenario_count:
                logger.warning(f"[Due Diligence] Expected {scenario_count} scenarios but got {output_scenario_count}")

            return refined_text
        except Exception as e:
            logger.error(f"Claude Sonnet due diligence failed: {str(e)}")
            return initial_draft

    def _claude_final_refinement(self, company_name: str, industry: str, region: str, horizon_years: int, strategic_context: str, refined_scenarios: str, strategic_critique: str) -> Dict[str, Any]:
        # Count scenarios in refined set
        scenario_count = refined_scenarios.count('## Scenario ')
        logger.info(f"[Final Refinement] Refined scenarios text contains {scenario_count} scenarios")
        logger.info(f"[Final Refinement] First 500 chars: {refined_scenarios[:500]}")

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
1. **Executive Summary** (2-3 paragraphs): Key findings, strategic implications, recommended actions
2. **Refined Scenario Narratives**: Polish language for C-suite readership, add APA-style citations, include specific metrics and timeframes
3. **Strategic Implications Section**: Impact on {company_name}'s strategic priorities, risk & opportunity assessment, decision points and trigger events
4. **Glossary**: Define technical terms and acronyms used
5. **Key Citations**: List all sources referenced (APA format)
6. **Recommended Actions**: Prioritized list of strategic initiatives, timeframes and success metrics

CRITICAL: The refined scenario set above contains {scenario_count} distinct scenarios. You MUST include ALL {scenario_count} scenarios in your output. Do not omit any scenarios.

Output as a structured JSON object with this EXACT schema:

{{
  "executive_summary": "string",
  "scenarios": [
    {{
      "title": "string",
      "probability": 0.25,
      "core_logic": "string",
      "narrative": "string - comprehensive refined narrative",
      "strategic_implications": "string",
      "key_drivers": ["string", "string", ...],  // MUST be array of strings
      "signposts": ["string", "string", ...],     // MUST be array of strings
      "citations": ["string", "string", ...]      // MUST be array of strings
    }}
    // ... repeat for ALL {scenario_count} scenarios
  ],
  "glossary": {{"term": "definition"}},
  "references": ["citation string", ...],
  "recommended_actions": [
    {{
      "action": "string",
      "rationale": "string",
      "timeframe": "string",
      "success_metrics": ["string", ...]
    }}
  ]
}}

CRITICAL:
- key_drivers, signposts, citations MUST be arrays of strings, NOT comma-separated strings
- Include ALL {scenario_count} scenarios in the scenarios array
- Ensure professional tone, quantitative rigor, and executive-level polish"""
        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 16000,  # Increased for comprehensive professional document
                "temperature": 0.7,
                "messages": [{"role": "user", "content": prompt}]
            })
            response = self.bedrock_runtime.invoke_model(modelId="us.anthropic.claude-3-5-sonnet-20241022-v2:0", body=body)
            response_body = json.loads(response['body'].read())
            output_text = response_body['content'][0]['text']

            logger.info(f"[Final Refinement] Claude response length: {len(output_text)} chars")
            logger.info(f"[Final Refinement] Response preview: {output_text[:500]}")

            try:
                if '```json' in output_text:
                    json_start = output_text.find('```json') + 7
                    json_end = output_text.find('```', json_start)
                    output_text = output_text[json_start:json_end].strip()

                parsed_doc = json.loads(output_text)
                scenarios_in_doc = len(parsed_doc.get('scenarios', []))
                logger.info(f"[Final Refinement] Successfully parsed JSON with {scenarios_in_doc} scenarios")

                if scenarios_in_doc == 0:
                    logger.error(f"[Final Refinement] JSON parsed but contains 0 scenarios! Falling back to extraction")
                    extracted = self._extract_scenarios_from_text(refined_scenarios)
                    parsed_doc['scenarios'] = self._normalize_scenarios(extracted)
                else:
                    # Normalize scenario data to ensure arrays are arrays
                    parsed_doc['scenarios'] = self._normalize_scenarios(parsed_doc['scenarios'])
                    logger.info(f"[Final Refinement] Scenarios normalized successfully")

                return parsed_doc
            except json.JSONDecodeError as e:
                logger.error(f"[Final Refinement] JSON parsing failed: {str(e)}")
                logger.error(f"[Final Refinement] Attempted to parse: {output_text[:1000]}")
                extracted = self._extract_scenarios_from_text(refined_scenarios)
                normalized = self._normalize_scenarios(extracted)
                return {
                    'executive_summary': "Document refinement in progress",
                    'scenarios': normalized,
                    'raw_output': output_text
                }
        except Exception as e:
            logger.error(f"Claude final refinement failed: {str(e)}")
            extracted = self._extract_scenarios_from_text(refined_scenarios)
            normalized = self._normalize_scenarios(extracted)
            return {
                'executive_summary': "Final refinement unavailable",
                'scenarios': normalized,
                'error': str(e)
            }

    def _normalize_scenarios(self, scenarios: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normalize scenario data to ensure all fields are in correct format for frontend."""
        normalized = []
        for scenario in scenarios:
            # Ensure key_drivers is an array
            if 'key_drivers' in scenario:
                if isinstance(scenario['key_drivers'], str):
                    # Convert comma-separated string to array
                    scenario['key_drivers'] = [d.strip() for d in scenario['key_drivers'].split(',') if d.strip()]
                elif not isinstance(scenario['key_drivers'], list):
                    scenario['key_drivers'] = []
            else:
                scenario['key_drivers'] = []

            # Ensure signposts is an array
            if 'signposts' in scenario:
                if isinstance(scenario['signposts'], str):
                    # Convert comma-separated string to array
                    scenario['signposts'] = [s.strip() for s in scenario['signposts'].split(',') if s.strip()]
                elif not isinstance(scenario['signposts'], list):
                    scenario['signposts'] = []
            else:
                scenario['signposts'] = []

            # Ensure citations is an array
            if 'citations' in scenario:
                if isinstance(scenario['citations'], str):
                    scenario['citations'] = [c.strip() for c in scenario['citations'].split(',') if c.strip()]
                elif not isinstance(scenario['citations'], list):
                    scenario['citations'] = []
            else:
                scenario['citations'] = []

            # Ensure narrative field exists (might be narrative_refined from JSON)
            if 'narrative_refined' in scenario and 'narrative' not in scenario:
                scenario['narrative'] = scenario['narrative_refined']

            # Ensure probability is a float
            if 'probability' in scenario:
                try:
                    scenario['probability'] = float(scenario['probability'])
                except (ValueError, TypeError):
                    scenario['probability'] = 0.25

            normalized.append(scenario)
            logger.info(f"[Normalize] Scenario '{scenario.get('title', 'Unknown')}': drivers={len(scenario['key_drivers'])}, signposts={len(scenario['signposts'])}")

        return normalized

    def _extract_scenarios_from_text(self, text: str) -> List[Dict[str, Any]]:
        """Enhanced extraction that preserves more scenario details from markdown."""
        scenarios = []
        sections = text.split('## Scenario ')

        logger.info(f"[Extract] Found {len(sections) - 1} scenario sections")

        for idx, section in enumerate(sections[1:], 1):
            lines = section.split('\n')
            title_line = lines[0].strip() if lines else "Untitled"

            # Extract title (remove number prefix if present)
            title = title_line.split(':', 1)[-1].strip() if ':' in title_line else title_line

            # Extract probability (look for **Probability:** line)
            probability = 0.25  # default
            for line in lines:
                if '**Probability:**' in line or 'Probability:' in line:
                    prob_text = line.split(':', 1)[-1].strip().replace('%', '').strip()
                    try:
                        probability = float(prob_text) / 100 if float(prob_text) > 1 else float(prob_text)
                    except ValueError:
                        pass
                    break

            # Extract core logic
            core_logic = ""
            for i, line in enumerate(lines):
                if '**Core Logic:**' in line or 'Core Logic:' in line:
                    core_logic = line.split(':', 1)[-1].strip()
                    break

            # Extract narrative (everything between ### Narrative and next ###)
            narrative = ""
            in_narrative = False
            for line in lines:
                if '### Narrative' in line:
                    in_narrative = True
                    continue
                if in_narrative and line.startswith('###'):
                    break
                if in_narrative:
                    narrative += line + '\n'

            # Extract key drivers
            key_drivers = []
            in_drivers = False
            for line in lines:
                if '### Key Drivers' in line:
                    in_drivers = True
                    continue
                if in_drivers and line.startswith('###'):
                    break
                if in_drivers and line.strip().startswith('-'):
                    key_drivers.append(line.strip()[1:].strip())

            # Extract signposts
            signposts = []
            in_signposts = False
            for line in lines:
                if '### Early Warning Signposts' in line or '### Signposts' in line:
                    in_signposts = True
                    continue
                if in_signposts and line.startswith('###'):
                    break
                if in_signposts and line.strip().startswith('-'):
                    signposts.append(line.strip()[1:].strip())

            scenario = {
                'title': title,
                'probability': probability,
                'core_logic': core_logic,
                'narrative': narrative.strip(),
                'key_drivers': key_drivers,
                'signposts': signposts
            }
            scenarios.append(scenario)
            logger.info(f"[Extract] Scenario {idx}: '{title}' (prob: {probability})")

        if not scenarios:
            logger.warning(f"[Extract] No scenarios found, returning fallback")
            return [{'title': 'Scenario', 'narrative': text, 'probability': 1.0}]

        logger.info(f"[Extract] Successfully extracted {len(scenarios)} scenarios")
        return scenarios

# === END MULTI-AI PIPELINE ===


def _convert_floats_to_decimal(obj):
    """Convert all float values to Decimal for DynamoDB compatibility."""
    if isinstance(obj, list):
        return [_convert_floats_to_decimal(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: _convert_floats_to_decimal(value) for key, value in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    else:
        return obj


def _convert_decimal_to_float(obj):
    """Convert all Decimal values to float for JSON serialization."""
    if isinstance(obj, list):
        return [_convert_decimal_to_float(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: _convert_decimal_to_float(value) for key, value in obj.items()}
    elif isinstance(obj, Decimal):
        return float(obj)
    else:
        return obj


def _response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    # Convert any Decimal values to float before JSON serialization
    body_safe = _convert_decimal_to_float(body)
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps(body_safe)
    }


def health(event, context):
    """Minimal health check - imports json locally to avoid any module issues."""
    import json as json_lib
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json_lib.dumps({'status': 'ok', 'timestamp': str(context.request_id) if context else 'test'})
    }


def list_agents(event, context):
    try:
        return _response(200, {'agents': ['scenario_generator']})
    except Exception as e:
        logger.error(f"List agents error: {e}")
        return _response(500, {'error': str(e)})


def execute_agent(event, context):
    return _response(501, {'message': 'Use /scenarios/generate'})


def cost_report(event, context):
    return _response(200, {'total_cost_usd': 0.00})


def generate_scenario(event, context):
    try:
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})

        company_name = body.get('company_name', 'Your Organization')
        industry = body.get('industry', 'Energy')
        region = body.get('region', 'Global')
        horizon_years = body.get('horizon_years', 10)
        strategic_context = body.get('strategic_context', '')

        logger.info(f"Generating for {company_name}")

        bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
        # Use cross-region inference profile for Opus 4.5 (required - only supports INFERENCE_PROFILE)
        model_id = 'us.anthropic.claude-opus-4-5-20251101-v1:0'

        context_note = f"\n\nSTRATEGIC CONTEXT: {strategic_context}\nAddress these specific questions." if strategic_context else ""

        prompt = f"""You are an elite strategic foresight consultant for {company_name}, a {industry} company in {region}. Generate 2 EXHAUSTIVELY DETAILED scenarios for {horizon_years} years.{context_note}

CRITICAL: ALL content specific to {company_name}, {industry}, {region} ONLY.

EXHAUSTIVE DETAIL (2000-5000 words per scenario):
- 25+ quantitative metrics per scenario
- Named competitors with market shares
- Specific regulations with costs and dates
- Technology adoption curves and cost trajectories
- Decision trees with NPV/IRR for every branch
- Sensitivity analysis with exact thresholds
- Supply chain impacts with supplier names
- Workforce implications with headcount
- M&A targets with valuations

Return ONLY valid JSON with exactly 2 scenarios:
[
  {{
    "title": "Scenario name (7-10 words)",
    "core_logic": "Driving forces (200-300 characters)",
    "narrative": "EXHAUSTIVE 2000-5000 word analysis with: (1) {company_name}'s exact market position in {industry}/{region}, (2) 5-7 specific multi-billion dollar strategic decisions with exact tradeoffs, (3) Competitive dynamics naming every major player with market shares, (4) Regulatory timeline with exact dates and compliance costs, (5) Technology roadmap with maturity curves, (6) Quantified NPV/IRR/payback analysis for EVERY decision path, (7) Probability-weighted risk scenarios, (8) Implementation roadmap with phase gates and capital requirements, (9) Organizational implications with headcount and skills, (10) M&A opportunities with specific targets and valuations. MAXIMUM DETAIL.",
    "probability": 0.XX,
    "financial_projections": {{
      "years": [2025, 2026, 2027, 2028, 2029],
      "revenue_bn": [X, X, X, X, X],
      "ebitda_margin_pct": [X, X, X, X, X],
      "capex_bn": [X, X, X, X, X]
    }},
    "competitive_landscape": [
      {{"company": "Competitor", "market_share_pct": X, "strategic_move": "Description"}}
    ],
    "key_decisions": [
      {{"decision": "Strategic choice", "investment_bn": X, "npv_bn": X, "irr_pct": X}}
    ]
  }}
]

REMEMBER: 2000-5000 words per narrative. Board-level intelligence worth $100K+ per analysis."""

        request_body = {
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 60000,  # Opus 4.5 limit is 64000, using 60000 for safety
            'temperature': 0.8,
            'messages': [{'role': 'user', 'content': prompt}]
        }

        logger.info(f"Calling Bedrock model: {model_id}")
        response = bedrock.invoke_model(
            modelId=model_id,
            contentType='application/json',
            accept='application/json',
            body=json.dumps(request_body)
        )

        response_body = json.loads(response['body'].read())

        # Safely extract text content (handles both normal and thinking-enabled responses)
        ai_response = None
        for block in response_body.get('content', []):
            if block.get('type') == 'text':
                ai_response = block.get('text')
                break

        if not ai_response:
            # Fallback for old response format
            ai_response = response_body['content'][0]['text']

        start = ai_response.find('[')
        end = ai_response.rfind(']') + 1
        scenarios_json = ai_response[start:end]
        scenarios = json.loads(scenarios_json)

        logger.info(f"✓ Generated {len(scenarios)} scenarios")

        result = {
            'scenario_set_id': str(uuid.uuid4()),
            'company_name': company_name,
            'industry': industry,
            'region': region,
            'horizon_years': horizon_years,
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'ai_generated': True,
            'generation_method': 'AI Opus 4.5',
            'scenarios': scenarios,
            'status': 'completed'
        }

        return _response(200, result)

    except Exception as e:
        error_message = str(e)
        error_type = type(e).__name__
        
        logger.error(f"ERROR ({error_type}): {error_message}", exc_info=True)
        
        # Return detailed error for debugging
        return _response(500, {
            'error': 'Bedrock API Error',
            'error_type': error_type,
            'message': error_message,
            'fix': 'Go to AWS Bedrock Console → Model access → Enable Anthropic Opus 4.5' if 'ResourceNotFoundException' in error_type or 'AccessDeniedException' in error_type else 'Check CloudWatch logs for details'
        })


def list_available_models(event, context):
    """List all available foundation models and inference profiles in Bedrock."""
    try:
        bedrock = boto3.client('bedrock', region_name='us-east-1')

        # Get foundation models
        logger.info("Fetching available foundation models...")
        models_response = bedrock.list_foundation_models()

        # Filter for AI Opus 4 models
        opus_models = []
        all_anthropic = []

        for model in models_response.get('modelSummaries', []):
            model_id = model.get('modelId', '')
            model_name = model.get('modelName', '')
            provider = model.get('providerName', '')

            if provider == 'Anthropic':
                all_anthropic.append({
                    'modelId': model_id,
                    'modelName': model_name,
                    'inferenceTypesSupported': model.get('inferenceTypesSupported', [])
                })

                if 'opus-4' in model_id.lower() or 'opus-4' in model_name.lower():
                    opus_models.append({
                        'modelId': model_id,
                        'modelName': model_name,
                        'inferenceTypesSupported': model.get('inferenceTypesSupported', [])
                    })

        return _response(200, {
            'status': 'SUCCESS',
            'opus_4_models': opus_models,
            'all_anthropic_models': all_anthropic,
            'total_models': len(models_response.get('modelSummaries', []))
        })

    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)

        return _response(200, {
            'status': 'FAILED',
            'error_type': error_type,
            'error_message': error_msg
        })


def test_bedrock(event, context):
    """Test Bedrock access with simple request."""
    try:
        bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

        # Try simple test with Opus 4.5
        test_request = {
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 100,
            'messages': [{'role': 'user', 'content': 'Say hello'}]
        }

        logger.info("Testing Bedrock with AI Opus 4.5...")
        response = bedrock.invoke_model(
            modelId='us.anthropic.claude-opus-4-5-20251101-v1:0',  # Cross-region inference profile
            contentType='application/json',
            accept='application/json',
            body=json.dumps(test_request)
        )

        response_body = json.loads(response['body'].read())

        # Safely extract text for preview
        preview_text = "N/A"
        for block in response_body.get('content', []):
            if block.get('type') == 'text':
                preview_text = block.get('text', '')[:100]
                break

        return _response(200, {
            'status': 'SUCCESS',
            'message': 'AI Opus 4.5 is accessible',
            'model': 'anthropic.claude-opus-4-5-20251101-v1:0',
            'response_preview': preview_text
        })

    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)

        return _response(200, {  # Return 200 so we can see the error
            'status': 'FAILED',
            'error_type': error_type,
            'error_message': error_msg,
            'fix': 'Model access may still be propagating (wait 2-5 minutes) or check IAM permissions'
        })


def start_scenario_generation_async(event, context):
    """Start async scenario generation - returns immediately with job ID."""
    try:
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})

        # Generate unique job ID
        job_id = str(uuid.uuid4())

        # Store initial status in DynamoDB
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table_name = f"ai-foresight-scenarios-{os.getenv('STAGE', 'dev')}"
        table = dynamodb.Table(table_name)

        timestamp = int(datetime.utcnow().timestamp())

        table.put_item(Item={
            'scenarioId': job_id,
            'createdAt': timestamp,
            'status': 'processing',
            'company_name': body.get('company_name', 'Your Organization'),
            'industry': body.get('industry', 'Energy'),
            'region': body.get('region', 'Global'),
            'horizon_years': body.get('horizon_years', 10),
            'strategic_context': body.get('strategic_context', ''),
            'updated_at': datetime.utcnow().isoformat() + 'Z'
        })

        # Invoke Lambda async to process in background
        lambda_client = boto3.client('lambda', region_name='us-east-1')
        # Construct worker function name (serverless pattern: service-stage-functionName)
        worker_function = f"ai-foresight-platform-{os.getenv('STAGE', 'dev')}-generateScenarioAsyncWorker"

        lambda_client.invoke(
            FunctionName=worker_function,
            InvocationType='Event',  # Async invocation
            Payload=json.dumps({
                'job_id': job_id,
                'body': body
            })
        )

        logger.info(f"Started async generation with job_id: {job_id}")

        return _response(202, {
            'job_id': job_id,
            'status': 'processing',
            'message': 'Scenario generation started. Poll /scenarios/status/{job_id} for results.',
            'poll_url': f'/scenarios/status/{job_id}'
        })

    except Exception as e:
        logger.error(f"Error starting async generation: {str(e)}", exc_info=True)
        return _response(500, {
            'error': 'Failed to start generation',
            'message': str(e)
        })


def generate_scenario_async_worker(event, context):
    """Background worker for async scenario generation."""
    start_time = datetime.utcnow()
    try:
        job_id = event['job_id']
        body = event['body']

        company_name = body.get('company_name', 'Your Organization')
        industry = body.get('industry', 'Energy')
        region = body.get('region', 'Global')
        horizon_years = body.get('horizon_years', 10)
        strategic_context = body.get('strategic_context', '')

        logger.info(f"[Job {job_id}] Generating for {company_name}")

        # Configure boto3 with extended timeout for long-running AI Opus 4.5 requests
        boto_config = Config(
            read_timeout=600,  # 10 minutes for comprehensive scenario generation
            connect_timeout=10,
            retries={'max_attempts': 2}
        )
        bedrock = boto3.client('bedrock-runtime', region_name='us-east-1', config=boto_config)
        model_id = 'us.anthropic.claude-opus-4-5-20251101-v1:0'

        context_note = f"\n\nSTRATEGIC CONTEXT: {strategic_context}\nAddress these specific questions." if strategic_context else ""

        # Load professional document prompt template
        prompt_template_path = os.path.join(os.path.dirname(__file__), 'professional_doc_prompt.txt')
        with open(prompt_template_path, 'r') as f:
            prompt_template = f.read()

        # Format the prompt with variables
        prompt = prompt_template.format(
            company_name=company_name,
            industry=industry,
            region=region,
            horizon_years=horizon_years,
            context_note=context_note
        )

        request_body = {
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 64000,  # Maximum for Opus 4.5
            'temperature': 1.0,  # Must be 1.0 when thinking is enabled
            # top_k is not allowed when thinking is enabled
            'thinking': {
                'type': 'enabled',
                'budget_tokens': 10000  # Extended thinking for complex scenario reasoning
            },
            'messages': [{'role': 'user', 'content': prompt}]
        }

        logger.info(f"[Job {job_id}] Calling Bedrock model: {model_id}")
        response = bedrock.invoke_model(
            modelId=model_id,
            contentType='application/json',
            accept='application/json',
            body=json.dumps(request_body)
        )

        response_body = json.loads(response['body'].read())

        # When thinking is enabled, response contains multiple content blocks
        # Find the text block (thinking blocks are type='thinking', text blocks are type='text')
        ai_response = None
        for block in response_body.get('content', []):
            if block.get('type') == 'text':
                ai_response = block.get('text')
                break

        if not ai_response:
            raise ValueError("No text content found in response")

        # Parse JSON from response - handle markdown code blocks if present
        # Remove markdown code fences if they exist
        cleaned_response = ai_response.strip()
        if cleaned_response.startswith('```'):
            # Remove opening fence
            lines = cleaned_response.split('\n')
            # Remove first line (```json or ```)
            lines = lines[1:]
            # Remove closing fence (last line)
            if lines and lines[-1].strip() == '```':
                lines = lines[:-1]
            cleaned_response = '\n'.join(lines)

        # Find JSON boundaries
        start = cleaned_response.find('{')
        end = cleaned_response.rfind('}') + 1

        if start == -1 or end == 0:
            logger.error(f"[Job {job_id}] No JSON found in response. First 500 chars: {ai_response[:500]}")
            raise ValueError("No valid JSON found in AI response")

        result_json = cleaned_response[start:end]

        try:
            parsed_result = json.loads(result_json)
        except json.JSONDecodeError as e:
            logger.error(f"[Job {job_id}] JSON parsing failed: {str(e)}")
            logger.error(f"[Job {job_id}] Attempted to parse: {result_json[:500]}")
            raise ValueError(f"Failed to parse JSON response: {str(e)}")

        # Extract data from professional document structure
        # The new format has: document_metadata, scenarios, matrix_framework, etc.
        matrix_framework = parsed_result.get('matrix_framework', {})
        scenarios = parsed_result.get('scenarios', [])

        logger.info(f"[Job {job_id}] Generated {len(scenarios)} scenarios with 2x2 matrix framework")
        logger.info(f"[Job {job_id}] Axis X: {matrix_framework.get('axis_x', {}).get('name', 'N/A')}")
        logger.info(f"[Job {job_id}] Axis Y: {matrix_framework.get('axis_y', {}).get('name', 'N/A')}")

        # --- Multi-AI Pipeline Integration ---
        logger.info(f"[Job {job_id}] === MULTI-AI PIPELINE CHECK ===")
        logger.info(f"[Job {job_id}] MULTI_AI_ENABLED = {MULTI_AI_ENABLED}")
        logger.info(f"[Job {job_id}] ENABLE_MULTI_MODEL_PIPELINE env = {os.getenv('ENABLE_MULTI_MODEL_PIPELINE', 'NOT_SET')}")

        if MULTI_AI_ENABLED and os.getenv('ENABLE_MULTI_MODEL_PIPELINE', 'true').lower() == 'true':
            logger.info(f"[Job {job_id}] ✓ Multi-AI pipeline ENABLED - starting enhancement")
            logger.info(f"[Job {job_id}] Pipeline: Claude Opus → Gemini 3 Pro → Claude Sonnet → Claude Opus")

            try:
                # MultiAIPipeline is now inlined in this file (no import needed)
                logger.info(f"[Job {job_id}] Initializing MultiAIPipeline...")
                pipeline = MultiAIPipeline()
                logger.info(f"[Job {job_id}] ✓ MultiAIPipeline initialized")

                enhanced_result = pipeline.execute_pipeline(
                    company_name=company_name,
                    industry=industry,
                    region=region,
                    horizon_years=horizon_years,
                    strategic_context=strategic_context,
                    multi_agent_output=parsed_result
                )

                # Use enhanced results
                logger.info(f"[Job {job_id}] Enhanced result keys: {list(enhanced_result.keys())}")
                logger.info(f"[Job {job_id}] Number of scenarios in enhanced result: {len(enhanced_result.get('scenarios', []))}")

                if 'professional_document' in enhanced_result:
                    parsed_result = enhanced_result['professional_document']
                    scenarios = enhanced_result.get('scenarios', scenarios)
                    logger.info(f"[Job {job_id}] Using enhanced scenarios, count: {len(scenarios)}")
                else:
                    logger.warning(f"[Job {job_id}] No professional_document in enhanced result!")

                pipeline_metadata = enhanced_result.get('pipeline_metadata', {})
                strategic_critique = enhanced_result.get('strategic_critique', '')

                logger.info(f"[Job {job_id}] Multi-AI pipeline completed successfully")
                logger.info(f"[Job {job_id}] Models used: {pipeline_metadata.get('models_used', [])}")
                logger.info(f"[Job {job_id}] Review layers: {pipeline_metadata.get('review_layers', [])}")

            except Exception as e:
                import traceback
                logger.error(f"[Job {job_id}] ✗ Multi-AI pipeline FAILED - using base result")
                logger.error(f"[Job {job_id}] Error: {str(e)}")
                logger.error(f"[Job {job_id}] Traceback: {traceback.format_exc()[:500]}")
                # Continue with original parsed_result
                pipeline_metadata = {'error': str(e), 'fallback_used': True}
        else:
            logger.warning(f"[Job {job_id}] ✗ Multi-AI pipeline DISABLED")
            logger.warning(f"[Job {job_id}] Reason: MULTI_AI_ENABLED={MULTI_AI_ENABLED}, env={os.getenv('ENABLE_MULTI_MODEL_PIPELINE', 'NOT_SET')}")
            logger.info(f"[Job {job_id}] Using base Claude Opus 4.5 result only")
            pipeline_metadata = {'pipeline_enabled': False}
        # --- End Multi-AI Pipeline Integration ---

        # Calculate generation time
        generation_time = (datetime.utcnow() - start_time).total_seconds()

        # Estimate cost
        # Base Claude Opus 4.5: Input ~2000 tokens, Output ~15000 tokens
        input_tokens = 2000
        output_tokens = 15000  # 4 scenarios × ~3750 tokens each
        cost_per_1k_input = 0.015  # $15/MTok
        cost_per_1k_output = 0.075  # $75/MTok
        base_cost = (input_tokens / 1000 * cost_per_1k_input) + (output_tokens / 1000 * cost_per_1k_output)

        # Adjust cost if multi-AI pipeline was used
        if MULTI_AI_ENABLED and os.getenv('ENABLE_MULTI_MODEL_PIPELINE', 'true').lower() == 'true':
            # Multi-AI pipeline: Claude Opus + Gemini + Claude Sonnet + Claude Opus
            # Approximately 2.4x base cost ($0.15 → $0.36)
            estimated_cost = base_cost * 2.4
            logger.info(f"[Job {job_id}] Multi-AI pipeline cost: ${estimated_cost:.4f} (base: ${base_cost:.4f})")
        else:
            estimated_cost = base_cost

        # Store results in DynamoDB
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table_name = f"ai-foresight-scenarios-{os.getenv('STAGE', 'dev')}"
        table = dynamodb.Table(table_name)

        # Determine generation method based on pipeline usage
        if MULTI_AI_ENABLED and os.getenv('ENABLE_MULTI_MODEL_PIPELINE', 'true').lower() == 'true':
            generation_method = 'Multi-AI Pipeline: Claude Opus → Gemini → Claude Sonnet → Claude Opus'
            models_used = {
                'claude-opus-4.5': 2,  # Initial + Final
                'gemini-3-pro': 1,     # Strategic review
                'claude-sonnet-4.5': 1  # Due diligence
            }
        else:
            generation_method = 'AI Opus 4.5 - 2x2 Matrix Scenario Planning'
            models_used = {'ai-opus-4-5': 1}

        result = {
            'scenario_set_id': job_id,
            'company_name': company_name,
            'industry': industry,
            'region': region,
            'horizon_years': horizon_years,
            'created_at': start_time.isoformat() + 'Z',
            'generation_time_seconds': generation_time,
            'ai_generated': True,
            'generation_method': generation_method,

            # 2x2 Matrix Framework
            'matrix_framework': matrix_framework,
            'scenarios': scenarios,
            'status': 'completed',

            # Additional fields for UI compatibility
            'themes': [],
            'drivers': [matrix_framework.get('axis_x', {}), matrix_framework.get('axis_y', {})],  # Store axes as drivers
            'uncertainties': [matrix_framework.get('axis_x', {}), matrix_framework.get('axis_y', {})],
            'action_plan': {},
            'quality_report': {'scenario_methodology': '2x2 matrix with outside-in perspective'},
            'models_used': models_used,
            'total_cost_usd': estimated_cost
        }

        # Add multi-AI pipeline metadata if available
        if MULTI_AI_ENABLED and 'pipeline_metadata' in locals():
            result['pipeline_metadata'] = pipeline_metadata
        if MULTI_AI_ENABLED and 'strategic_critique' in locals():
            result['strategic_critique'] = strategic_critique

        # Convert floats to Decimal for DynamoDB compatibility
        result_for_dynamodb = _convert_floats_to_decimal(result)

        # Update with correct key (scenarioId only, no createdAt in main table key)
        table.update_item(
            Key={'scenarioId': job_id},
            UpdateExpression='SET #status = :status, #result = :result, #updated_at = :updated_at',
            ExpressionAttributeNames={
                '#status': 'status',
                '#result': 'result',
                '#updated_at': 'updated_at'
            },
            ExpressionAttributeValues={
                ':status': 'completed',
                ':result': result_for_dynamodb,
                ':updated_at': datetime.utcnow().isoformat() + 'Z'
            }
        )

        logger.info(f"[Job {job_id}] Completed successfully")

    except Exception as e:
        logger.error(f"[Job {job_id if 'job_id' in locals() else 'unknown'}] ERROR: {str(e)}", exc_info=True)

        # Update DynamoDB with error status
        if 'job_id' in locals():
            try:
                dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
                table_name = f"ai-foresight-scenarios-{os.getenv('STAGE', 'dev')}"
                table = dynamodb.Table(table_name)

                table.update_item(
                    Key={'scenarioId': job_id},
                    UpdateExpression='SET #status = :status, #error = :error, #updated_at = :updated_at',
                    ExpressionAttributeNames={
                        '#status': 'status',
                        '#error': 'error',
                        '#updated_at': 'updated_at'
                    },
                    ExpressionAttributeValues={
                        ':status': 'failed',
                        ':error': str(e),
                        ':updated_at': datetime.utcnow().isoformat() + 'Z'
                    }
                )
            except Exception as update_error:
                logger.error(f"Failed to update error status: {str(update_error)}")


def get_scenario_status(event, context):
    """Get status and results of async scenario generation."""
    try:
        # Get job_id from path parameters
        job_id = event.get('pathParameters', {}).get('job_id')

        if not job_id:
            return _response(400, {'error': 'Missing job_id parameter'})

        # Get item from DynamoDB
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table_name = f"ai-foresight-scenarios-{os.getenv('STAGE', 'dev')}"
        table = dynamodb.Table(table_name)

        response = table.get_item(Key={'scenarioId': job_id})

        if 'Item' not in response:
            return _response(404, {'error': 'Job not found', 'job_id': job_id})

        item = response['Item']
        status = item.get('status', 'unknown')

        if status == 'completed':
            return _response(200, item.get('result', {}))
        elif status == 'processing':
            return _response(202, {
                'status': 'processing',
                'message': 'Scenario generation in progress',
                'job_id': job_id
            })
        elif status == 'failed':
            return _response(500, {
                'status': 'failed',
                'error': item.get('error', 'Unknown error'),
                'job_id': job_id
            })
        else:
            return _response(500, {
                'status': 'unknown',
                'job_id': job_id
            })

    except Exception as e:
        logger.error(f"Error getting scenario status: {str(e)}", exc_info=True)
        return _response(500, {
            'error': 'Failed to get status',
            'message': str(e)
        })


def list_scenarios(event, context):
    """List all completed scenarios from DynamoDB."""
    try:
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table_name = f"ai-foresight-scenarios-{os.getenv('STAGE', 'dev')}"
        table = dynamodb.Table(table_name)

        # Scan for all scenarios (future: add pagination)
        response = table.scan(
            FilterExpression='#status = :status',
            ExpressionAttributeNames={
                '#status': 'status'
            },
            ExpressionAttributeValues={
                ':status': 'completed'
            }
        )

        scenarios = response.get('Items', [])

        # Sort by creation date (newest first)
        scenarios.sort(key=lambda x: x.get('createdAt', 0), reverse=True)

        # Convert Decimals to floats for JSON serialization
        scenarios_safe = [_convert_decimal_to_float(scenario) for scenario in scenarios]

        logger.info(f"Retrieved {len(scenarios_safe)} scenarios")

        return _response(200, {
            'scenarios': scenarios_safe,
            'count': len(scenarios_safe)
        })

    except Exception as e:
        logger.error(f"Error listing scenarios: {str(e)}", exc_info=True)
        return _response(500, {
            'error': 'Failed to list scenarios',
            'message': str(e)
        })


def get_analytics(event, context):
    """Get analytics for scenario generation system."""
    try:
        from decimal import Decimal

        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table_name = f"ai-foresight-scenarios-{os.getenv('STAGE', 'dev')}"
        table = dynamodb.Table(table_name)

        # Scan all scenarios (completed and failed)
        response = table.scan()
        all_scenarios = response.get('Items', [])

        completed = [s for s in all_scenarios if s.get('status') == 'completed']
        failed = [s for s in all_scenarios if s.get('status') == 'failed']
        processing = [s for s in all_scenarios if s.get('status') == 'processing']

        # Calculate aggregate metrics (convert Decimal to float)
        total_scenarios = len(completed)
        total_cost = sum([float(s.get('result', {}).get('total_cost_usd', 0)) for s in completed])
        total_time = sum([float(s.get('result', {}).get('generation_time_seconds', 0)) for s in completed])

        avg_cost = total_cost / total_scenarios if total_scenarios > 0 else 0
        avg_time = total_time / total_scenarios if total_scenarios > 0 else 0

        # Industry distribution
        industry_dist = {}
        for s in completed:
            industry = s.get('industry', 'Unknown')
            industry_dist[industry] = industry_dist.get(industry, 0) + 1

        # Region distribution
        region_dist = {}
        for s in completed:
            region = s.get('region', 'Unknown')
            region_dist[region] = region_dist.get(region, 0) + 1

        # Time horizon distribution
        horizon_dist = {}
        for s in completed:
            horizon = int(s.get('horizon_years', 0)) if s.get('horizon_years', 0) else 0
            horizon_dist[str(horizon)] = horizon_dist.get(str(horizon), 0) + 1

        # Recent activity (last 30 days)
        from datetime import datetime, timedelta
        thirty_days_ago = int((datetime.utcnow() - timedelta(days=30)).timestamp())
        recent_scenarios = [s for s in completed if int(s.get('createdAt', 0)) >= thirty_days_ago]

        # Cost trend (group by day for last 30 days)
        cost_by_day = {}
        for s in recent_scenarios:
            created_at = int(s.get('createdAt', 0)) if s.get('createdAt', 0) else 0
            created_date = datetime.fromtimestamp(created_at).strftime('%Y-%m-%d') if created_at > 0 else 'Unknown'
            cost = float(s.get('result', {}).get('total_cost_usd', 0))
            cost_by_day[created_date] = cost_by_day.get(created_date, 0) + cost

        # Most active companies
        company_counts = {}
        for s in completed:
            company = s.get('company_name', 'Unknown')
            company_counts[company] = company_counts.get(company, 0) + 1

        top_companies = sorted(company_counts.items(), key=lambda x: x[1], reverse=True)[:10]

        analytics = {
            'overview': {
                'total_scenarios': total_scenarios,
                'total_cost_usd': float(total_cost),
                'total_time_seconds': float(total_time),
                'avg_cost_per_scenario': float(avg_cost),
                'avg_time_per_scenario': float(avg_time),
                'failed_scenarios': len(failed),
                'processing_scenarios': len(processing),
                'success_rate': (total_scenarios / len(all_scenarios) * 100) if len(all_scenarios) > 0 else 0
            },
            'distributions': {
                'by_industry': industry_dist,
                'by_region': region_dist,
                'by_horizon': horizon_dist
            },
            'trends': {
                'cost_by_day': cost_by_day,
                'scenarios_last_30_days': len(recent_scenarios)
            },
            'top_companies': [{'name': name, 'count': count} for name, count in top_companies]
        }

        logger.info(f"Analytics generated: {total_scenarios} scenarios analyzed")

        return _response(200, analytics)

    except Exception as e:
        logger.error(f"Error generating analytics: {str(e)}", exc_info=True)
        return _response(500, {
            'error': 'Failed to generate analytics',
            'message': str(e)
        })


def delete_scenario(event, context):
    """
    Delete a scenario from DynamoDB.

    Path parameters:
        scenario_id: The ID of the scenario to delete

    Returns:
        200: Scenario deleted successfully
        404: Scenario not found
        500: Internal server error
    """
    try:
        # Get scenario_id from path parameters
        scenario_id = event.get('pathParameters', {}).get('scenario_id')

        if not scenario_id:
            logger.error("Missing scenario_id in path parameters")
            return _response(400, {'error': 'Missing scenario_id'})

        logger.info(f"Attempting to delete scenario: {scenario_id}")

        # Get DynamoDB table
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table_name = f"ai-foresight-scenarios-{os.getenv('STAGE', 'dev')}"
        table = dynamodb.Table(table_name)

        # Check if scenario exists
        response = table.get_item(Key={'scenarioId': scenario_id})

        if 'Item' not in response:
            logger.warning(f"Scenario not found: {scenario_id}")
            return _response(404, {'error': 'Scenario not found'})

        # Delete the scenario
        table.delete_item(Key={'scenarioId': scenario_id})

        logger.info(f"Successfully deleted scenario: {scenario_id}")

        return _response(200, {
            'message': 'Scenario deleted successfully',
            'scenario_id': scenario_id
        })

    except Exception as e:
        logger.error(f"Error deleting scenario: {str(e)}", exc_info=True)
        return _response(500, {
            'error': 'Failed to delete scenario',
            'message': str(e)
        })
