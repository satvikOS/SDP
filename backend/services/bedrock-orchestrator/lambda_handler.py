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

# Import multi-AI pipeline for enhanced scenario generation
try:
    from multi_ai_pipeline import MultiAIPipeline
    MULTI_AI_ENABLED = True
    logger_init = logging.getLogger()
    logger_init.info("Multi-AI pipeline imported successfully")
except ImportError as e:
    MULTI_AI_ENABLED = False
    logger_init = logging.getLogger()
    logger_init.warning(f"Multi-AI pipeline not available: {e}")

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
    """Health check - shows Multi-AI Pipeline status."""
    result = {'status': 'healthy'}

    # Check all components safely
    try:
        result['multi_ai_enabled'] = bool(MULTI_AI_ENABLED)
    except:
        result['multi_ai_enabled'] = False

    try:
        result['env_pipeline'] = os.getenv('ENABLE_MULTI_MODEL_PIPELINE', 'NOT_SET')
    except:
        result['env_pipeline'] = 'ERROR'

    try:
        result['env_google_key'] = 'SET' if os.getenv('GOOGLE_API_KEY') else 'NOT_SET'
    except:
        result['env_google_key'] = 'ERROR'

    # Try importing google-generativeai
    try:
        import google.generativeai
        result['gemini_sdk'] = 'INSTALLED'
    except ImportError as e:
        result['gemini_sdk'] = f'MISSING: {str(e)[:100]}'
    except Exception as e:
        result['gemini_sdk'] = f'ERROR: {str(e)[:100]}'

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(result)
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
        if MULTI_AI_ENABLED and os.getenv('ENABLE_MULTI_MODEL_PIPELINE', 'true').lower() == 'true':
            logger.info(f"[Job {job_id}] Starting multi-AI pipeline enhancement (Claude Opus → Gemini → Claude Sonnet → Claude Opus)")

            try:
                pipeline = MultiAIPipeline()

                enhanced_result = pipeline.execute_pipeline(
                    company_name=company_name,
                    industry=industry,
                    region=region,
                    horizon_years=horizon_years,
                    strategic_context=strategic_context,
                    multi_agent_output=parsed_result
                )

                # Use enhanced results
                if 'professional_document' in enhanced_result:
                    parsed_result = enhanced_result['professional_document']
                    scenarios = enhanced_result.get('scenarios', scenarios)

                pipeline_metadata = enhanced_result.get('pipeline_metadata', {})
                strategic_critique = enhanced_result.get('strategic_critique', '')

                logger.info(f"[Job {job_id}] Multi-AI pipeline completed successfully")
                logger.info(f"[Job {job_id}] Models used: {pipeline_metadata.get('models_used', [])}")
                logger.info(f"[Job {job_id}] Review layers: {pipeline_metadata.get('review_layers', [])}")

            except Exception as e:
                logger.warning(f"[Job {job_id}] Multi-AI pipeline failed, using base result: {e}")
                # Continue with original parsed_result
                pipeline_metadata = {'error': str(e), 'fallback_used': True}
        else:
            logger.info(f"[Job {job_id}] Multi-AI pipeline disabled, using base Claude result")
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
