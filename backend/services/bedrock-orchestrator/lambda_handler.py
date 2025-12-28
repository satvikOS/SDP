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

        prompt = f"""You are an elite McKinsey/BCG-level strategic foresight consultant with 20+ years experience in {industry}. Generate 2 EXHAUSTIVE, RESEARCH-BACKED scenarios for {company_name} in {region} over {horizon_years} years.{context_note}

CRITICAL REQUIREMENTS:
• Each scenario: 3000-4000 words of deeply researched narrative
• Use ONLY authoritative sources: peer-reviewed journals, industry reports from S&P/Moody's/Wood Mackenzie/IEA, government publications, major consultancies
• Include 15-25 in-text APA citations per scenario
• Account for: geopolitical realities, competitive dynamics, regulatory complexities, technology disruptions, capital constraints
• Be realistic about political economy - acknowledge state champions, local content requirements, regulatory capture
• Provide specific quantitative data with sources
• Include comprehensive references section

Return ONLY valid JSON:
[
  {{
    "title": "Scenario Name (7-10 words reflecting core logic)",
    "probability": 0.XX,
    "narrative": "Write an exhaustive 3000-4000 word strategic analysis with in-text APA citations:

**EXECUTIVE SUMMARY** (300 words):
[Strategic implications for {company_name}. Address: What are the 3-5 critical strategic choices? What is the fundamental bet this scenario requires? What are the irreversible commitments? What is the downside protection?]

**GEOPOLITICAL & MACROECONOMIC CONTEXT** (500 words):
- Regional political economy and power dynamics (cite specific governance indicators, World Bank/IMF forecasts)
- Macroeconomic trajectories: GDP growth, inflation, currency stability (cite central bank data, economic forecasts)
- Trade flows and investment patterns (cite UNCTAD, regional trade data)
- Sovereign wealth fund strategies and capital allocation (cite SWF Institute data)
- Geopolitical risks: sanctions, conflicts, regime stability (cite risk indices, political science research)

**MARKET DYNAMICS** (600 words):
- Supply-demand fundamentals with specific volumes, growth rates, and elasticities (cite industry reports, market research)
- Price formation mechanisms and historical volatility patterns (cite commodity data, pricing indices)
- Competitive landscape with named players, market shares, strategic positioning (cite company filings, industry analysis)
- Value chain evolution and margin pools by segment (cite value chain research, profitability studies)
- Customer behavior shifts and willingness-to-pay dynamics (cite consumer research, demand studies)
- Regional arbitrage opportunities and barriers to entry (cite competitive analysis)

**REGULATORY & POLICY ENVIRONMENT** (500 words):
- Specific regulations with bill numbers, implementation dates, compliance costs, enforcement track record (cite regulatory filings, legal databases)
- Carbon pricing mechanisms with price trajectories and coverage (cite emissions trading data, climate policy research)
- Local content requirements, licensing regimes, foreign ownership restrictions (cite regulatory codes, legal analysis)
- Tax policy including rates, incentives, transfer pricing considerations (cite tax codes, international tax databases)
- Trade agreements and their commercial implications (cite trade policy research)
- Government procurement rules and state champion favoritism (cite public procurement data)

**TECHNOLOGY & INNOVATION** (500 words):
- Technology S-curves and adoption timelines with historical analogues (cite technology diffusion research)
- R&D intensity requirements and innovation ecosystem maturity (cite R&D statistics, patent data)
- Digital infrastructure availability and costs (cite telecom data, infrastructure reports)
- Cybersecurity threats and required defensive investments (cite security indices, threat intelligence)
- Automation potential by function with displacement estimates (cite labor economics research, AI capability research)
- Breakthrough technology risks with probability-weighted scenarios (cite technology forecasting research)

**COMPETITIVE DYNAMICS** (600 words):
- Named competitors with specific strategies, capabilities, financial resources (cite company filings, competitive intelligence)
- Likely competitive responses to {company_name}'s moves (game theoretic analysis)
- Barriers to competitive advantage and sustainability (cite competitive strategy research)
- Alliances and ecosystem dynamics (cite partnership research, network effects studies)
- Regulatory/political advantages held by local champions (cite political economy research)
- Margin pressure from commoditization and disruption (cite pricing research, disruption literature)

**FINANCIAL IMPLICATIONS** (600 words):
- CAPEX requirements by category, year, with IRR hurdles and capital intensity benchmarks (cite capital markets data, industry benchmarks)
- Revenue build with addressable market, penetration rates, pricing (cite market sizing research, penetration curves)
- Cost structure evolution with operating leverage and scale economies (cite cost accounting research, economies of scale studies)
- Working capital implications and cash conversion cycles (cite financial analysis, working capital benchmarks)
- Valuation impacts with multiple ranges and comparable analysis (cite valuation research, trading multiples)
- Shareholder value creation hurdles vs. cost of capital (cite financial economics research)

**STRATEGIC DECISIONS & CAPITAL ALLOCATION** (400 words):
- Specific investment decisions with timing, sizing, NPV/IRR/payback, sensitivity to key assumptions (cite capital budgeting research)
- M&A targets with rationale, valuation ranges, integration risks (cite M&A research, deal databases)
- Build vs. buy vs. partner analysis for key capabilities (cite transaction cost economics)
- Geographic sequencing and market entry modes (cite international business research)
- Portfolio rebalancing and capital redeployment (cite portfolio management research)
- Optionality and staged investment approach (cite real options research)

**RISKS & MITIGATION** (300 words):
- Specific risk factors with probability estimates, impact quantification, early warning indicators (cite risk management research)
- Scenario stress testing and break-even analysis (cite scenario planning research)
- Hedging strategies and insurance mechanisms (cite derivatives research, insurance economics)
- Contingency planning and strategic flexibility (cite strategic management research)",

    "timeline": [
      {{"year": 2025, "milestone": "Specific event with geopolitical/regulatory trigger", "impact": "Quantified financial impact on {company_name} with citation"}},
      {{"year": 2028, "milestone": "Technology or competitive inflection point", "impact": "Market share/margin impact with source"}},
      {{"year": 2032, "milestone": "Regulatory or market structure change", "impact": "Strategic implication with citation"}},
      {{"year": 2037, "milestone": "Major capital deployment or harvest decision", "impact": "NPV/IRR impact with analytical source"}},
      {{"year": 2040, "milestone": "End-state market position", "impact": "Valuation impact vs. alternatives"}}
    ],

    "financial_projections": {{
      "years": [2025, 2028, 2032, 2035, 2037, 2040],
      "revenue_bn": [X, X, X, X, X, X],
      "ebitda_margin_pct": [X, X, X, X, X, X],
      "roic_pct": [X, X, X, X, X, X],
      "capex_bn": [X, X, X, X, X, X],
      "free_cash_flow_bn": [X, X, X, X, X, X],
      "market_share_pct": [X, X, X, X, X, X],
      "ev_ebitda_multiple": [X, X, X, X, X, X]
    }},

    "competitive_landscape": [
      {{"company": "Specific competitor name", "market_share_2025": X, "market_share_2040": X, "strategy": "Detailed positioning", "competitive_advantage": "Source of advantage", "threat_level": "High/Medium/Low", "likely_response": "Expected competitive reaction"}},
      {{"company": "Specific competitor name", "market_share_2025": X, "market_share_2040": X, "strategy": "Detailed positioning", "competitive_advantage": "Source of advantage", "threat_level": "High/Medium/Low", "likely_response": "Expected competitive reaction"}},
      {{"company": "Specific competitor name", "market_share_2025": X, "market_share_2040": X, "strategy": "Detailed positioning", "competitive_advantage": "Source of advantage", "threat_level": "High/Medium/Low", "likely_response": "Expected competitive reaction"}}
    ],

    "key_metrics": {{
      "operational_metric_1": [X, X, X, X, X, X],
      "operational_metric_2": [X, X, X, X, X, X],
      "efficiency_metric": [X, X, X, X, X, X],
      "sustainability_metric": [X, X, X, X, X, X]
    }},

    "key_decisions": [
      {{"decision": "Specific strategic choice", "timing": "Year", "investment_bn": X, "npv_bn": X, "irr_pct": X, "payback_years": X, "risk_level": "High/Medium/Low", "key_assumptions": "Critical assumptions", "decision_rule": "Trigger conditions"}},
      {{"decision": "Specific strategic choice", "timing": "Year", "investment_bn": X, "npv_bn": X, "irr_pct": X, "payback_years": X, "risk_level": "High/Medium/Low", "key_assumptions": "Critical assumptions", "decision_rule": "Trigger conditions"}},
      {{"decision": "Specific strategic choice", "timing": "Year", "investment_bn": X, "npv_bn": X, "irr_pct": X, "payback_years": X, "risk_level": "High/Medium/Low", "key_assumptions": "Critical assumptions", "decision_rule": "Trigger conditions"}}
    ],

    "risks": [
      {{"risk": "Specific risk factor with geopolitical/regulatory detail", "probability": "X%", "impact_bn": X, "timeframe": "Years", "early_warning_indicators": "Specific metrics to monitor", "mitigation": "Detailed mitigation strategy with cost"}},
      {{"risk": "Specific risk factor with competitive/technology detail", "probability": "X%", "impact_bn": X, "timeframe": "Years", "early_warning_indicators": "Specific metrics to monitor", "mitigation": "Detailed mitigation strategy with cost"}}
    ],

    "references": [
      "International Energy Agency. (2024). World Energy Outlook 2024. IEA Publications. https://www.iea.org/reports/world-energy-outlook-2024",
      "McKinsey & Company. (2023). Global Energy Perspective 2023. McKinsey Energy Insights.",
      "Wood Mackenzie. (2024). [Specific Industry Report Title]. Wood Mackenzie Research.",
      "World Bank. (2024). [Specific Country/Region Economic Report]. World Bank Publications.",
      "[15-25 total high-quality sources in APA format]"
    ]
  }}
]

MANDATORY QUALITY STANDARDS:
• Every quantitative claim must cite a source
• Use recent data (2023-2024) wherever possible
• Acknowledge political economy constraints (state champions, regulatory capture, local content requirements)
• Be realistic about competitive dynamics - don't assume easy market share gains
• Account for capital constraints and hurdle rates
• Include downside scenarios and risk mitigation
• Write at Board/C-suite level - assume sophisticated financial readers"""

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

        start = ai_response.find('[')
        end = ai_response.rfind(']') + 1
        scenarios_json = ai_response[start:end]
        scenarios = json.loads(scenarios_json)

        logger.info(f"[Job {job_id}] Generated {len(scenarios)} scenarios")

        # Calculate generation time
        generation_time = (datetime.utcnow() - start_time).total_seconds()

        # Estimate cost (rough approximation for Claude Opus 4.5)
        # Input: ~1000 tokens, Output: ~2000 tokens per scenario
        input_tokens = 1000
        output_tokens = len(scenarios) * 2000
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
            'generation_method': 'Claude Opus 4.5',
            'scenarios': scenarios,
            'status': 'completed',

            # Additional fields for UI compatibility
            'themes': [],
            'drivers': [],
            'uncertainties': [],
            'action_plan': {},
            'quality_report': {},
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
