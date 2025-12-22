"""AWS Lambda handlers for Bedrock Orchestrator."""

import json
import logging
import os
from typing import Dict, Any

# Import our orchestrator
from multi_model_orchestrator import multi_model_orchestrator
from agents import AgentType

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
    return _response(200, {
        'status': 'healthy',
        'service': 'bedrock-orchestrator',
        'version': '1.0.0',
        'stage': os.getenv('STAGE', 'dev')
    })


def list_agents(event, context):
    """List available agent types."""
    return _response(200, {
        'agents': [agent.value for agent in AgentType],
        'descriptions': {
            AgentType.SIGNAL_SYNTHESIZER.value: "Synthesize signals into emerging themes",
            AgentType.DRIVER_EXTRACTOR.value: "Extract key drivers and uncertainties",
            AgentType.SCENARIO_CONSTRUCTOR.value: "Construct scenario frameworks",
            AgentType.NARRATIVE_GENERATOR.value: "Generate rich scenario narratives",
            AgentType.SIGNPOST_DESIGNER.value: "Design monitoring signposts",
            AgentType.ACTION_PLANNER.value: "Plan strategic actions",
            AgentType.QUALITY_CRITIC.value: "Critique scenario quality"
        }
    })


async def execute_agent(event, context):
    """Execute an agent - main entry point."""
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})

        # Validate required fields
        if 'agent_type' not in body:
            return _response(400, {
                'error': 'Missing required field: agent_type'
            })

        if 'context' not in body:
            return _response(400, {
                'error': 'Missing required field: context'
            })

        logger.info(f"Executing agent: {body['agent_type']}")

        # Execute orchestrator
        response = await multi_model_orchestrator.execute(body)

        return _response(200, response)

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return _response(400, {
            'error': str(e)
        })

    except Exception as e:
        logger.error(f"Internal error: {e}", exc_info=True)
        return _response(500, {
            'error': 'Internal server error',
            'message': str(e)
        })


def cost_report(event, context):
    """Get cost tracking report."""
    try:
        report = multi_model_orchestrator.get_cost_report()
        return _response(200, report)

    except Exception as e:
        logger.error(f"Error getting cost report: {e}")
        return _response(500, {
            'error': 'Failed to get cost report',
            'message': str(e)
        })


async def generate_scenario(event, context):
    """
    Generate complete scenario set (executes all agents in sequence).

    Request body:
    {
        "industry": "Energy",
        "region": "Global",
        "horizon": "2030",
        "signals": [...],  # Optional
        "initial_context": {...}  # Optional
    }
    """
    try:
        # Parse request
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})

        industry = body.get('industry', 'Energy')
        region = body.get('region', 'Global')
        horizon = body.get('horizon', '2030')

        logger.info(f"Generating scenario set for {industry} - {region} - {horizon}")

        # This would orchestrate the full workflow
        # For now, return a structure showing the flow

        result = {
            'scenario_set_id': 'placeholder',
            'industry': industry,
            'region': region,
            'horizon': horizon,
            'status': 'generating',
            'message': 'Full scenario generation workflow not yet implemented. Use /execute endpoint for individual agents.',
            'workflow': [
                '1. Signal Synthesizer - Extract themes',
                '2. Driver Extractor - Identify drivers',
                '3. Scenario Constructor - Build scenarios',
                '4. Narrative Generator - Write narratives',
                '5. Signpost Designer - Create monitors',
                '6. Action Planner - Generate recommendations',
                '7. Quality Critic - Validate output'
            ]
        }

        return _response(200, result)

    except Exception as e:
        logger.error(f"Error generating scenario: {e}", exc_info=True)
        return _response(500, {
            'error': 'Failed to generate scenario',
            'message': str(e)
        })
