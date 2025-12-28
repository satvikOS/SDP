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

        return _response(200, {
            'status': 'SUCCESS',
            'message': 'Claude Opus 4.5 is accessible',
            'model': 'anthropic.claude-opus-4-5-20251101-v1:0',
            'response_preview': response_body['content'][0]['text'][:100]
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

        prompt = f"""You are an elite Shell/Royal Dutch Shell Scenario Planning consultant with 30+ years experience building rigorous 2x2 scenario matrices for {industry}. This is a SCENARIO DEVELOPMENT PROCESS, not a strategy document.

YOUR MISSION: Build a 2x2 scenario matrix that describes 4 DISTINCT EXTERNAL FUTURES for {region} {industry} over {horizon_years} years. These scenarios are OUTSIDE-IN (what the world does to {company_name}), NOT inside-out (what {company_name} does).{context_note}

STEP 1: IDENTIFY CRITICAL UNCERTAINTIES
First, identify the 2 most critical uncertainties that will shape {region} {industry} over {horizon_years} years. These must be:
1. HIGH IMPACT: Will fundamentally reshape the industry structure
2. HIGH UNCERTAINTY: Genuinely unknowable, not just "fast vs slow"
3. INDEPENDENT: The two axes should be orthogonal (not correlated)

Example framework for {industry} in {region}:
- Axis X (Horizontal): [Uncertainty 1 - e.g., "Degree of Global Economic Integration" ranging from "Fragmentation/Regionalization" to "Deep Integration/Globalization"]
- Axis Y (Vertical): [Uncertainty 2 - e.g., "Technology Disruption Pace" ranging from "Incremental Evolution" to "Radical Disruption"]

STEP 2: BUILD 4 SCENARIO WORLDS
Generate 4 scenarios, one for each quadrant. Each scenario describes a COMPLETE EXTERNAL ENVIRONMENT (geopolitical, economic, regulatory, technological, competitive).

CRITICAL METHODOLOGY REQUIREMENTS:
✓ STRUCTURAL BREAKS: Include discontinuities, inflection points, regime changes (NOT linear extrapolation)
✓ RANGES & RATIOS: Use "2-3x growth" or "$50-80B market size" (NOT false precision like "$67.3B")
✓ OUTSIDE-IN: Describe what the WORLD looks like (NOT what {company_name} should do)
✓ SIGNPOSTS: Provide 5-7 leading indicators per scenario to track which world is unfolding
✓ WIND TUNNEL TEST: Define no-regrets moves, big bets, and trigger points
✓ RESEARCH-BACKED: 15-25 APA citations per scenario from authoritative sources only

Each scenario: 3000-4000 words of deeply researched narrative.

Return ONLY valid JSON:
{{
  "matrix_framework": {{
    "axis_x": {{
      "name": "Critical Uncertainty 1 Name",
      "left_pole": "Left extreme (e.g., Fragmentation)",
      "right_pole": "Right extreme (e.g., Integration)",
      "description": "Why this uncertainty matters and why it's unknowable"
    }},
    "axis_y": {{
      "name": "Critical Uncertainty 2 Name",
      "bottom_pole": "Bottom extreme (e.g., Incremental change)",
      "top_pole": "Top extreme (e.g., Radical disruption)",
      "description": "Why this uncertainty matters and why it's unknowable"
    }}
  }},
  "scenarios": [
    {{
      "title": "Scenario Name (7-10 words)",
      "quadrant": "Bottom-Left|Bottom-Right|Top-Left|Top-Right",
      "quadrant_description": "This scenario combines [Axis X pole] + [Axis Y pole]",
      "probability": "Do NOT assign probabilities - all scenarios are plausible",
      "narrative": "Write an exhaustive 3000-4000 word OUTSIDE-IN description of this external world with in-text APA citations:

**SCENARIO LOGIC & STRUCTURAL BREAKS** (400 words):
[Explain the fundamental logic of this scenario. What are the 2-3 STRUCTURAL BREAKS or INFLECTION POINTS that distinguish this world from today? NOT linear extrapolation - identify DISCONTINUITIES (regime changes, technology S-curve jumps, geopolitical shocks, regulatory watersheds). Explain the pathway from today to this future, including critical branch points and the specific triggers that pushed the world down this path vs. alternative scenarios.]

**GEOPOLITICAL & MACROECONOMIC WORLD** (600 words):
[Describe the EXTERNAL geopolitical and economic environment in this scenario - NOT what {company_name} should do about it]
- Global/regional governance structures and power distribution (cite IR research, think tank analysis)
- Trade architectures: degree of openness, regional blocs, technology/data sovereignty regimes (cite trade policy research)
- Macroeconomic regime: growth patterns (use RANGES like "2-4% CAGR" not "2.7%"), inflation/interest rate environment, currency dynamics (cite IMF, central bank research)
- Capital flows and investment patterns: where capital goes, cost of capital ranges by region/sector (cite BIS, World Bank data)
- Geopolitical flashpoints and their economic spillovers (cite security studies, geopolitical risk research)

**INDUSTRY STRUCTURE & MARKET DYNAMICS** (600 words):
[Describe how the {industry} industry is STRUCTURED in this world - NOT specific company strategies]
- Market size and growth trajectory (use RANGES: "industry grows 2-3x" not "reaches $127.3B") (cite industry research)
- Concentration vs. fragmentation: how many players, what's the HHI range, degree of commoditization (cite competitive structure research)
- Value chain configuration: vertical integration vs. specialization, where margin pools concentrate (cite value chain analysis)
- Competitive basis: cost leadership, differentiation, network effects, regulatory moats (cite competitive strategy research)
- Customer behavior and demand drivers in this world (cite consumer research, behavioral economics)
- Barriers to entry/exit and capital intensity (cite industrial organization research)

**REGULATORY & POLICY REGIME** (500 words):
[Describe the REGULATORY ENVIRONMENT that exists in this world - NOT compliance strategies]
- Governance approach: market-driven vs. state-directed, degree of regulatory capture, enforcement effectiveness (cite political economy research)
- Industry-specific regulations: licensing, safety, environmental standards that DEFINE this scenario (cite regulatory research)
- Carbon/climate policy: pricing mechanisms (if any), ranges of carbon prices ($X-Y/ton), sectoral coverage (cite climate policy research)
- Trade policy: tariff levels, non-tariff barriers, local content requirements, foreign ownership caps (cite trade policy databases)
- Industrial policy: subsidies, state champions, strategic sector designation, government procurement preferences (cite industrial policy research)
- Tax regime: corporate rates (ranges), R&D incentives, capital allowances (cite tax policy databases)

**TECHNOLOGY LANDSCAPE** (500 words):
[Describe the STATE OF TECHNOLOGY in this world - NOT innovation strategies]
- Technology maturity: which technologies have crossed adoption thresholds, which are stuck in the 'trough of disillusionment' (cite technology lifecycle research)
- Dominant technical standards and platform dynamics: who controls key platforms, degree of interoperability (cite platform economics research)
- R&D intensity norms and innovation locus: where innovation happens (incumbents, startups, universities, state labs) (cite innovation research)
- Infrastructure availability: digital, physical, energy - use RANGES for costs and penetration rates (cite infrastructure research)
- Technology access regimes: open vs. proprietary, export controls, technology sovereignty (cite technology policy research)
- Skill availability and labor market dynamics for technical talent (cite labor economics research)

**COMPETITIVE LANDSCAPE** (600 words):
[Describe WHO the major players are and HOW they compete in this world - describe the environment, NOT {company_name}'s strategy]
- Industry leaders: name 3-5 dominant players, their core capabilities, relative market positions (cite industry analysis, company filings)
- Competitive dynamics: price competition intensity, degree of product differentiation, customer switching costs (cite competitive strategy research)
- New entrant activity: are new players entering, from where (adjacent industries, new geographies, digital natives), what advantages do they have (cite disruption research)
- Ecosystem and alliance structures: who partners with whom, what's the logic (cite network research, alliance databases)
- State champions and political economy: which players have regulatory advantages, government backing, protected home markets (cite political economy research)
- Profitability distribution: are margins concentrated or dispersed, RANGES for ROIC/margins by player type (cite financial analysis)

**FINANCIAL ENVIRONMENT** (400 words):
[Describe the FINANCIAL CONTEXT that exists in this world - cost of capital, valuation regimes, investor expectations]
- Cost of capital: ranges for WACC by industry/region in this scenario, debt availability and pricing (cite capital markets research)
- Valuation regimes: what multiples (ranges) do public markets assign to this industry, growth vs. value orientation (cite equity research, valuation studies)
- Investment requirements: typical CAPEX intensity (as % of sales or absolute ranges), payback expectations (cite industry benchmarking)
- Cash flow dynamics: working capital intensity, cash conversion patterns (cite financial analysis)
- Investor time horizons and risk appetites in this world (cite behavioral finance research)
- M&A market: deal activity levels, valuation multiples (ranges), strategic vs. financial buyers (cite M&A databases)

**CRITICAL UNCERTAINTIES WITHIN THIS SCENARIO** (300 words):
[Even within this scenario, what remains uncertain? What are the second-order unknowables that could push this world in different directions?]",

      "signposts": [
        {{
          "indicator": "Specific measurable leading indicator (e.g., 'WTI-Brent spread narrows below $3/bbl')",
          "timeframe": "When to monitor (e.g., '2025-2027')",
          "significance": "What this signals about which scenario is unfolding",
          "data_source": "Where to track this (e.g., 'Bloomberg commodity data, monthly')"
        }},
        {{
          "indicator": "Regulatory/policy signpost (e.g., 'EU passes Carbon Border Adjustment Mechanism phase 2')",
          "timeframe": "When to monitor",
          "significance": "What this signals",
          "data_source": "Where to track this"
        }},
        {{
          "indicator": "Technology adoption signpost (e.g., 'EV sales exceed 30% of new vehicle sales in China')",
          "timeframe": "When to monitor",
          "significance": "What this signals",
          "data_source": "Where to track this"
        }},
        {{
          "indicator": "Competitive dynamics signpost (e.g., 'Top 3 players control >60% market share')",
          "timeframe": "When to monitor",
          "significance": "What this signals",
          "data_source": "Where to track this"
        }},
        {{
          "indicator": "Geopolitical signpost (e.g., 'US-China FDI flows drop below $X billion annually')",
          "timeframe": "When to monitor",
          "significance": "What this signals",
          "data_source": "Where to track this"
        }}
      ],

      "structural_breaks": [
        {{"year_range": "2025-2027", "event": "First major discontinuity/regime change", "trigger": "What causes this break", "impact": "How this fundamentally reshapes the industry"}},
        {{"year_range": "2028-2032", "event": "Second structural break/inflection point", "trigger": "What causes this break", "impact": "How this reshapes the competitive landscape"}},
        {{"year_range": "2033-2040", "event": "Third structural break (if applicable)", "trigger": "What causes this break", "impact": "Long-term equilibrium that emerges"}}
      ],

      "industry_economics": {{
        "market_size_trajectory": "Use RANGES - e.g., 'Industry grows 2-3x to $XXX-YYY billion by 2040'",
        "profitability_ranges": "Typical EBITDA margins: XX-YY%, ROIC: XX-YY% for incumbents in this world",
        "capital_intensity": "CAPEX as % of revenue: XX-YY% range",
        "concentration": "HHI index range: XXX-YYY, implying [fragmented/concentrated] market",
        "typical_valuation_multiples": "EV/EBITDA ranges: X-Y for leaders, X-Y for challengers"
      }},

      "wind_tunnel_test": {{
        "no_regrets_moves": [
          {{"move": "Action that makes sense in ALL scenarios (e.g., 'Build data analytics capabilities')", "rationale": "Why this is valuable regardless of which world unfolds", "investment_range": "Typical investment size range"}},
          {{"move": "Another no-regrets action", "rationale": "Why robust across scenarios", "investment_range": "Cost range"}},
          {{"move": "Third no-regrets move", "rationale": "Cross-scenario value", "investment_range": "Investment required"}}
        ],
        "big_bets_for_this_scenario": [
          {{"bet": "Action that WINS BIG in this scenario but fails in others (e.g., 'Acquire offshore wind portfolio')", "rationale": "Why this bet pays off specifically in this world", "investment_range": "Required capital commitment range", "npv_range_if_correct": "Value creation if this scenario unfolds", "downside_if_wrong": "Loss if different scenario unfolds"}},
          {{"bet": "Second big bet specific to this scenario", "rationale": "Why this works here", "investment_range": "Capital required", "npv_range_if_correct": "Upside", "downside_if_wrong": "Downside in other scenarios"}},
          {{"bet": "Third scenario-specific bet", "rationale": "Why tailored to this world", "investment_range": "Investment", "npv_range_if_correct": "Upside", "downside_if_wrong": "Downside"}}
        ],
        "trigger_points": [
          {{"trigger": "Specific observable event that would trigger strategic pivot (e.g., 'Carbon price exceeds $100/ton in EU')", "action": "What decision this triggers", "timing": "When to decide", "reversibility": "Can this be undone? At what cost?"}},
          {{"trigger": "Second trigger condition", "action": "Required strategic response", "timing": "Decision window", "reversibility": "Reversibility and switching costs"}},
          {{"trigger": "Third trigger point", "action": "Strategic action", "timing": "When", "reversibility": "Reversibility"}}
        ],
        "hedging_options": [
          {{"option": "How to maintain strategic flexibility (e.g., 'Modular CAPEX staged over 3 phases')", "cost": "Cost of maintaining optionality", "value": "Value of flexibility in uncertain environment"}}
        ]
      }},

      "references": [
        "International Energy Agency. (2024). World Energy Outlook 2024. IEA Publications. https://www.iea.org/reports/world-energy-outlook-2024",
        "McKinsey & Company. (2023). Global Energy Perspective 2023. McKinsey Energy Insights.",
        "Wood Mackenzie. (2024). [Specific Industry Report Title]. Wood Mackenzie Research.",
        "World Bank. (2024). [Specific Country/Region Economic Report]. World Bank Publications.",
        "[Include 15-25 total high-quality sources in APA format - ONLY peer-reviewed journals, industry reports from S&P/Moody's/Wood Mackenzie/IEA, government publications, major consultancies]"
      ]
    }}
  ]
}}

GENERATE EXACTLY 4 SCENARIOS - one for each quadrant of the 2x2 matrix.

MANDATORY METHODOLOGY REQUIREMENTS:
✓ OUTSIDE-IN: Describe the EXTERNAL WORLD, not {company_name}'s strategy
✓ 2x2 MATRIX: Four distinct scenarios based on critical uncertainties, not binary best/worst case
✓ STRUCTURAL BREAKS: Include discontinuities and inflection points, NOT linear extrapolation
✓ RANGES NOT PRECISION: Use "2-3x growth" or "$50-80B market" NOT "$67.3B"
✓ SIGNPOSTS: 5-7 measurable leading indicators per scenario
✓ WIND TUNNEL TEST: Define no-regrets moves, big bets, trigger points for each scenario
✓ RESEARCH-BACKED: 15-25 APA citations per scenario from authoritative sources ONLY
✓ REALISTIC: Acknowledge state champions, regulatory capture, competitive realities, capital constraints
✓ BOARD-LEVEL: Write for sophisticated C-suite/board readers who understand political economy"""

        request_body = {
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 60000,  # Allow comprehensive output
            'temperature': 0.7,
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
        ai_response = response_body['content'][0]['text']

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
