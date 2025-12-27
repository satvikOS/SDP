"""AWS Lambda handlers for Bedrock Orchestrator - All in one file."""

import json
import logging
import os
import boto3
import uuid
from typing import Dict, List, Any
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))


def _response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create API Gateway response."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
        },
        'body': json.dumps(body)
    }


def health(event, context):
    """Health check endpoint."""
    try:
        return _response(200, {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'ai-foresight-platform',
            'bedrock_available': True,
            'model': 'claude-opus-4-5',
            'stage': os.getenv('STAGE', 'dev')
        })
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return _response(500, {
            'status': 'unhealthy',
            'error': str(e)
        })


def list_agents(event, context):
    """List available agent types."""
    try:
        agents = [
            'signal_synthesizer',
            'driver_extractor',
            'scenario_constructor',
            'narrative_generator',
            'signpost_designer',
            'action_planner',
            'quality_critic'
        ]
        return _response(200, {'agents': agents})
    except Exception as e:
        logger.error(f"List agents error: {e}")
        return _response(500, {'error': str(e)})


def execute_agent(event, context):
    """Execute an agent - placeholder."""
    try:
        return _response(501, {
            'error': 'Not Implemented',
            'message': 'Use /scenarios/generate'
        })
    except Exception as e:
        logger.error(f"Execute agent error: {e}")
        return _response(500, {'error': str(e)})


def cost_report(event, context):
    """Get cost tracking report."""
    try:
        return _response(200, {
            'total_cost_usd': 0.00,
            'requests_today': 0,
            'message': 'Cost tracking not yet implemented'
        })
    except Exception as e:
        logger.error(f"Cost report error: {e}")
        return _response(500, {'error': str(e)})


def generate_scenario(event, context):
    """Generate scenarios using Claude Opus 4.5."""
    try:
        # Parse request
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})

        company_name = body.get('company_name', 'Your Organization')
        industry = body.get('industry', 'Energy')
        region = body.get('region', 'Global')
        horizon_years = body.get('horizon_years', 10)
        strategic_context = body.get('strategic_context', '')

        logger.info(f"Generating scenarios for {company_name}")

        # Initialize Bedrock client
        bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
        model_id = 'anthropic.claude-opus-4-5-20251101-v1:0'

        # Build prompt
        prompt = f"""Generate 4 strategic scenarios for {company_name} ({industry}, {region}, {horizon_years} years).

Return ONLY valid JSON: [{{"title": "...", "core_logic": "...", "narrative": "2000+ word detailed analysis", "probability": 0.XX}}]"""

        # Call Bedrock
        request_body = {
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 200000,
            'temperature': 0.8,
            'messages': [{'role': 'user', 'content': prompt}]
        }

        logger.info("Calling Bedrock...")
        response = bedrock.invoke_model(
            modelId=model_id,
            contentType='application/json',
            accept='application/json',
            body=json.dumps(request_body)
        )

        response_body = json.loads(response['body'].read())
        ai_response = response_body['content'][0]['text']

        # Parse scenarios
        start = ai_response.find('[')
        end = ai_response.rfind(']') + 1
        scenarios_json = ai_response[start:end]
        scenarios = json.loads(scenarios_json)

        logger.info(f"Generated {len(scenarios)} scenarios")

        # Return result
        result = {
            'scenario_set_id': str(uuid.uuid4()),
            'company_name': company_name,
            'industry': industry,
            'region': region,
            'horizon_years': horizon_years,
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'ai_generated': True,
            'generation_method': 'AWS Bedrock - Claude Opus 4.5',
            'scenarios': scenarios,
            'status': 'completed'
        }

        return _response(200, result)

    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        return _response(500, {
            'error': 'Failed to generate scenario',
            'message': str(e)
        })
