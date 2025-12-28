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

logger = logging.getLogger()
logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))


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
    try:
        return _response(200, {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'model': 'claude-opus-4-5',
            'bedrock_available': True
        })
    except Exception as e:
        logger.error(f"Health error: {e}")
        return _response(500, {'error': str(e)})


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
            'generation_method': 'Claude Opus 4.5',
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
            'fix': 'Go to AWS Bedrock Console → Model access → Enable Claude Opus 4.5' if 'ResourceNotFoundException' in error_type or 'AccessDeniedException' in error_type else 'Check CloudWatch logs for details'
        })


def list_available_models(event, context):
    """List all available foundation models and inference profiles in Bedrock."""
    try:
        bedrock = boto3.client('bedrock', region_name='us-east-1')

        # Get foundation models
        logger.info("Fetching available foundation models...")
        models_response = bedrock.list_foundation_models()

        # Filter for Claude Opus 4 models
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

        logger.info("Testing Bedrock with Claude Opus 4.5...")
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
            'message': 'Claude Opus 4.5 is accessible',
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

        # Configure boto3 with extended timeout for long-running Claude Opus 4.5 requests
        boto_config = Config(
            read_timeout=600,  # 10 minutes for comprehensive scenario generation
            connect_timeout=10,
            retries={'max_attempts': 2}
        )
        bedrock = boto3.client('bedrock-runtime', region_name='us-east-1', config=boto_config)
        model_id = 'us.anthropic.claude-opus-4-5-20251101-v1:0'

        context_note = f"\n\nSTRATEGIC CONTEXT: {strategic_context}\nAddress these specific questions." if strategic_context else ""

        prompt = f"""You are the Chief Strategy Officer for {company_name}, tasked with building scenarios that reveal ASYMMETRIC STRATEGIC ADVANTAGES, not just trend extrapolation.

Your job: Build 4 futures where {company_name} must make IRREVERSIBLE CAPITAL ALLOCATION decisions worth billions. Focus on FIRST PRINCIPLES and PHYSICS, not policy speculation.

**CRITICAL FRAMING:**
- THINK IN DECADES: Over {horizon_years} years, what FUNDAMENTALLY changes about how value is created in {industry}?
- THINK IN PHYSICS: What are the IMMUTABLE constraints (energy, compute, biology, materials science)?
- THINK IN ECOSYSTEMS: What creates IRREVERSIBLE LOCK-IN (standards, switching costs, network effects)?
- THINK IN DUAL-USE: Blur artificial boundaries—commercial/defense, consumer/industrial are the SAME technology base

**BEFORE YOU START - RESEARCH {company_name}:**
You MUST understand their business model. Use available knowledge about:
1. **Profit Engines**: Which 2-3 products/segments generate 60%+ of operating profit?
2. **Strategic Moats**: What makes them defensible? (patents, ecosystems, scale economies, regulatory barriers)
3. **Hidden Leverage**: What assets do they have that competitors DON'T? (manufacturing know-how, customer data, platform position)
4. **Existential Dependencies**: What do they NEED that they don't control? (suppliers, standards, regulations)

---

**STEP 1: IDENTIFY THE VALUE SHIFT**

What fundamentally changes about value creation in {industry} over {horizon_years} years?

Examples of VALUE SHIFTS (not trend extrapolation):
- Defense 2040: Value shifts from KINETIC (tanks) → COMPUTE (AI swarms). A weapon system flips from 90% hardware/10% software to 10% hardware/90% intelligence.
- Energy 2040: Value shifts from EXTRACTION (oil wells) → ORCHESTRATION (grid management). Electrons become software-defined.
- Healthcare 2040: Value shifts from TREATMENT (drugs) → PREDICTION (genomic risk models). Medicine becomes information arbitrage.

**Your value shift for {industry}:** [Identify in 2-3 sentences the PHYSICS or TECHNOLOGY constraint that forces this shift]

---

**STEP 2: BUILD THE 2x2 MATRIX**

Choose 2 uncertainties that CREATE ASYMMETRIC ADVANTAGES for different players:

**Axis X**: [Uncertainty that determines WHO CAPTURES VALUE]
- Examples: "Platform consolidation vs. Fragmentation", "Vertical integration vs. Horizontal specialization"

**Axis Y**: [Uncertainty that determines HOW MUCH VALUE EXISTS]
- Examples: "Exponential technology advance vs. Plateau", "Global integration vs. Regional blocs"

**CRITICAL**: These must be ORTHOGONAL and GENUINELY UNKNOWABLE (not "optimistic vs. pessimistic")

---

**STEP 3: BUILD 4 SCENARIOS**

For EACH scenario, answer these questions:

**PART A: THE EXTERNAL WORLD (800-1000 words)**

1. **Structural Breaks (150-200 words)**:
   - What 2-3 DISCONTINUITIES create this world? (Not linear extrapolation—identify PHASE TRANSITIONS)
   - What TRIGGERS the shift? (Technology threshold? Geopolitical crisis? Economic tipping point?)
   - Cite 2-3 sources on historical precedents or technology trajectories

2. **Geopolitical & Macro (250-300 words)**:
   - What power structures enable or constrain value creation?
   - GDP growth RANGES, cost of capital RANGES by risk profile
   - Capital flow patterns: Who can access capital? At what cost?
   - Currency dynamics, trade architectures
   - Cite IMF, BIS, World Bank, geopolitical research (3-4 sources)

3. **Industry Physics & Dynamics (250-300 words)**:
   - Market size RANGES (use multipliers: "2-3x larger", not "$67.3B")
   - Where does MARGIN concentrate? (Design? Manufacturing? Distribution? Data?)
   - Concentration metrics: HHI ranges, winner-take-most vs. fragmented
   - Customer behavior: What shifts willingness-to-pay? (Performance? Security? Convenience?)
   - Technology constraints: What are the PHYSICS limits? (Power efficiency, latency, material properties)
   - Cite industry research, technology roadmaps (3-4 sources)

4. **Competitive Landscape (300-400 words)**:
   - Name 3-5 specific competitors and their STRATEGIC POSITIONS (not just market share)
   - Who has ECOSYSTEM LOCK-IN? (Switching costs, installed base, standards ownership)
   - Who has PHYSICS ADVANTAGES? (Manufacturing scale, energy efficiency, compute density)
   - Profitability RANGES by player archetype (EBITDA %, ROIC %)
   - Regulatory dynamics: Market-driven vs. State-directed
   - Cite company filings, analyst reports, policy databases (3-4 sources)

**PART B: STRATEGIC IMPLICATIONS FOR {company_name} (600-800 words)**

5. **What BREAKS (250-300 words)**:
   - Name SPECIFIC products/assets that become OBSOLETE or UNECONOMIC
   - Why do they break? (Technology shift? Regulatory change? Value migration?)
   - Quantify: Revenue loss RANGES, margin compression, asset write-downs
   - Identify STRANDED CAPITAL: How much current CapEx loses value?
   - Cite industry benchmarks (2-3 sources)

6. **What SURVIVES & THRIVES (250-300 words)**:
   - Name SPECIFIC capabilities that create ASYMMETRIC ADVANTAGE
   - What makes them defensible? (Ecosystem lock-in? Physics advantages? Regulatory moats?)
   - Quantify: Revenue growth RANGES, margin expansion, market share gains
   - Identify HIDDEN OPTIONALITY: What becomes unexpectedly valuable?
   - Cite growth projections, competitive analysis (2-3 sources)

7. **Strategic Verdict (100-200 words)**:
   - Financial impact: Revenue RANGES, EBITDA margin RANGES, ROIC RANGES
   - Competitive position: Name specific competitors—who does {company_name} surpass? Who surpasses them?
   - Capital allocation: What % of CURRENT strategy becomes obsolete? What NEW capabilities require investment?
   - Strategic positioning: Leader? Challenger? Platform? Component supplier?

---

**MANDATORY STRATEGIC PRINCIPLES:**

1. **PHYSICS OVER POLICY**: If you mention regulation, explain the PHYSICS that forces it (e.g., "Power-constrained warfare favors compute-efficient chips")

2. **ECOSYSTEM EFFECTS**: Identify IRREVERSIBLE LOCK-IN (e.g., "90% of defense AI code uses CUDA—rewriting costs $20B and 5 years")

3. **EXPONENTIAL DYNAMICS**: Where do DOUBLINGS occur? (Compute, energy density, data generation)

4. **VALUE MIGRATION**: Don't just extrapolate current margins—identify where MARGIN POOLS MOVE (e.g., from hardware to software subscriptions)

5. **DUAL-USE THINKING**: Blur boundaries. "Defense" and "Commercial" use the SAME chip—model as unified TAM with different regulatory overlays

6. **LICENSING/PLATFORM OPTIONS**: Don't assume {company_name} must own everything. Can they LICENSE IP? Become a PLATFORM? (e.g., "Can't sell chips? Sell the blueprint at 95% margin")

7. **POWER LAW THINKING**: Identify if this is a winner-take-most market (network effects, standards) or fragmented (local preference, regulation)

---

**OUTPUT FORMAT:**

Return ONLY valid JSON with this structure:

{{
  "matrix_framework": {{
    "axis_x": {{
      "name": "Critical Uncertainty 1",
      "left_pole": "Left extreme",
      "right_pole": "Right extreme",
      "description": "Why this determines WHO CAPTURES VALUE"
    }},
    "axis_y": {{
      "name": "Critical Uncertainty 2",
      "bottom_pole": "Bottom extreme",
      "top_pole": "Top extreme",
      "description": "Why this determines HOW MUCH VALUE EXISTS"
    }}
  }},
  "scenarios": [
    {{
      "title": "Scenario Name (5-7 words, reveals the strategic insight)",
      "tagline": "One-sentence STRATEGIC thesis (not description)",
      "core_logic": "2-3 sentence explanation of the PHYSICS or ECONOMICS that make this world stable",
      "probability": 0.15-0.35,
      "quadrant": "Bottom-Left|Bottom-Right|Top-Left|Top-Right",

      "narrative": "FULL STRATEGIC ANALYSIS (1500-1800 words with 8-12 APA citations):

[Follow structure above: Structural Breaks → Geopolitical/Macro → Industry Physics → Competitive Landscape → What Breaks → What Survives → Verdict]

Use RANGES not precision. Focus on PHYSICS and ECOSYSTEMS over POLICY SPECULATION. Identify ASYMMETRIC ADVANTAGES.
Cite authoritative sources (company filings, central banks, think tanks, technology roadmaps, academic research).

Target audience: Board members making $10B+ irreversible capital allocation decisions.",

      "signposts": [
        {{
          "indicator": "MEASURABLE leading indicator with specific threshold (e.g., 'AI training compute costs drop below $X per PFLOP')",
          "timeframe": "Monitoring window",
          "significance": "What this reveals about value migration or technology trajectories",
          "data_source": "Specific data source"
        }},
        // ... 4-5 signposts covering: technology thresholds, regulatory shifts, competitive dynamics, customer behavior, capital flows
      ],

      "references": [
        "Source 1 (Author, Year, Title, Institution)",
        // ... 8-12 references in APA style
      ]
    }}
    // ... 4 scenarios total
  ]
}}

---

**FINAL CHECKS BEFORE SUBMITTING:**

1. ✓ Did you identify a VALUE SHIFT (what fundamentally changes about value creation)?
2. ✓ Did you use PHYSICS/TECHNOLOGY constraints (not just policy speculation)?
3. ✓ Did you identify ECOSYSTEM LOCK-IN and switching costs?
4. ✓ Did you model EXPONENTIAL DYNAMICS (not linear extrapolation)?
5. ✓ Did you use DUAL-USE thinking (blur artificial boundaries)?
6. ✓ Did you identify LICENSING/PLATFORM strategies (not just direct sales)?
7. ✓ Did you quantify with RANGES (not false precision)?
8. ✓ Did you name SPECIFIC assets/competitors (not generic categories)?
9. ✓ Did you cite 8-12 AUTHORITATIVE sources per scenario?
10. ✓ Did you focus on ASYMMETRIC ADVANTAGES (what makes {company_name} unique)?

{context_note}

BUILD THE SCENARIOS NOW."""

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

        # Parse the new structure which is a JSON object with matrix_framework and scenarios
        start = ai_response.find('{')
        end = ai_response.rfind('}') + 1
        result_json = ai_response[start:end]
        parsed_result = json.loads(result_json)

        matrix_framework = parsed_result.get('matrix_framework', {})
        scenarios = parsed_result.get('scenarios', [])

        logger.info(f"[Job {job_id}] Generated {len(scenarios)} scenarios with 2x2 matrix framework")
        logger.info(f"[Job {job_id}] Axis X: {matrix_framework.get('axis_x', {}).get('name', 'N/A')}")
        logger.info(f"[Job {job_id}] Axis Y: {matrix_framework.get('axis_y', {}).get('name', 'N/A')}")

        # Calculate generation time
        generation_time = (datetime.utcnow() - start_time).total_seconds()

        # Estimate cost (rough approximation for Claude Opus 4.5)
        # Input: ~2000 tokens (longer prompt), Output: ~15000 tokens (4 comprehensive scenarios)
        input_tokens = 2000
        output_tokens = 15000  # 4 scenarios × ~3750 tokens each
        cost_per_1k_input = 0.015  # $15/MTok
        cost_per_1k_output = 0.075  # $75/MTok
        estimated_cost = (input_tokens / 1000 * cost_per_1k_input) + (output_tokens / 1000 * cost_per_1k_output)

        # Store results in DynamoDB
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table_name = f"ai-foresight-scenarios-{os.getenv('STAGE', 'dev')}"
        table = dynamodb.Table(table_name)

        result = {
            'scenario_set_id': job_id,
            'company_name': company_name,
            'industry': industry,
            'region': region,
            'horizon_years': horizon_years,
            'created_at': start_time.isoformat() + 'Z',
            'generation_time_seconds': generation_time,
            'ai_generated': True,
            'generation_method': 'Claude Opus 4.5 - 2x2 Matrix Scenario Planning',

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
            'models_used': {'claude-opus-4-5': 1},
            'total_cost_usd': estimated_cost
        }

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
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        table_name = f"ai-foresight-scenarios-{os.getenv('STAGE', 'dev')}"
        table = dynamodb.Table(table_name)

        # Scan all scenarios (completed and failed)
        response = table.scan()
        all_scenarios = response.get('Items', [])

        completed = [s for s in all_scenarios if s.get('status') == 'completed']
        failed = [s for s in all_scenarios if s.get('status') == 'failed']
        processing = [s for s in all_scenarios if s.get('status') == 'processing']

        # Calculate aggregate metrics
        total_scenarios = len(completed)
        total_cost = sum([s.get('result', {}).get('total_cost_usd', 0) for s in completed])
        total_time = sum([s.get('result', {}).get('generation_time_seconds', 0) for s in completed])

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
            horizon = s.get('horizon_years', 0)
            horizon_dist[str(horizon)] = horizon_dist.get(str(horizon), 0) + 1

        # Recent activity (last 30 days)
        from datetime import datetime, timedelta
        thirty_days_ago = int((datetime.utcnow() - timedelta(days=30)).timestamp())
        recent_scenarios = [s for s in completed if s.get('createdAt', 0) >= thirty_days_ago]

        # Cost trend (group by day for last 30 days)
        cost_by_day = {}
        for s in recent_scenarios:
            created_date = datetime.fromtimestamp(s.get('createdAt', 0)).strftime('%Y-%m-%d')
            cost = s.get('result', {}).get('total_cost_usd', 0)
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
