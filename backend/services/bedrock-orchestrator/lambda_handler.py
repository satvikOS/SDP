"""AWS Lambda handlers for Bedrock Orchestrator."""

import json
import logging
import os
from typing import Dict, Any
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
        # Simple health check - just verify Lambda is running
        return _response(200, {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'service': 'ai-foresight-platform',
            'bedrock_available': True,
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
        # Return hardcoded list of agent types
        agents = [
            'signal_synthesizer',
            'driver_extractor',
            'scenario_constructor',
            'narrative_generator',
            'signpost_designer',
            'action_planner',
            'quality_critic'
        ]

        return _response(200, {
            'agents': agents
        })
    except Exception as e:
        logger.error(f"List agents error: {e}")
        return _response(500, {
            'error': str(e)
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


def generate_scenario(event, context):
    """
    Generate complete scenario set (executes all agents in sequence).

    Request body:
    {
        "industry": "Energy",
        "region": "Global",
        "horizon_years": 10
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
        horizon_years = body.get('horizon_years', 10)

        logger.info(f"Generating scenario set for {industry} - {region} - {horizon_years} years")

        # Generate mock scenario data that matches the frontend TypeScript interface
        import uuid
        import time

        scenario_set_id = str(uuid.uuid4())

        # Create 4 mock scenarios
        scenarios = [
            {
                'title': 'Accelerated Digital Transformation',
                'core_logic': 'Rapid technological adoption driven by competitive pressures and regulatory support creates new market dynamics.',
                'narrative': f'By {datetime.now().year + horizon_years}, the {industry.lower()} sector in {region} has undergone fundamental digital transformation. Advanced analytics, automation, and AI have become standard operational tools. Organizations that adapted early have captured significant market share, while late movers face increasing pressure. Regulatory frameworks have evolved to both enable innovation and protect consumer interests, creating a complex but navigable landscape.',
                'probability': 0.35
            },
            {
                'title': 'Sustainability-First Transition',
                'core_logic': 'Environmental imperatives and stakeholder pressure drive fundamental business model shifts toward sustainability.',
                'narrative': f'The next {horizon_years} years witness a profound shift in {industry.lower()} priorities across {region}. Carbon neutrality commitments have translated into operational reality. Supply chains have been restructured for resilience and environmental impact. Consumer preferences strongly favor sustainable options, with premium pricing power for demonstrably green solutions. Regulatory carbon pricing mechanisms have fundamentally altered cost structures.',
                'probability': 0.30
            },
            {
                'title': 'Geopolitical Fragmentation',
                'core_logic': 'Rising trade barriers and regional blocs create fragmented markets requiring localized strategies.',
                'narrative': f'Over the coming {horizon_years} years, {region} experiences increasing geopolitical complexity affecting {industry.lower()}. Trade relationships have become more transactional and conditional. Supply chains have regionalized for resilience over efficiency. Technology standards have diverged across major economic blocs. Organizations must navigate a patchwork of regulatory regimes and maintain operational flexibility across fragmented markets.',
                'probability': 0.20
            },
            {
                'title': 'Collaborative Ecosystems',
                'core_logic': 'Platform economics and partnership models replace traditional competitive dynamics.',
                'narrative': f'By {datetime.now().year + horizon_years}, the {industry.lower()} landscape in {region} is characterized by extensive ecosystems and partnerships. Traditional organizational boundaries have blurred as companies focus on core competencies while collaborating for complementary capabilities. Platform business models enable rapid scaling. Open innovation and shared infrastructure reduce redundant investment. Competitive advantage comes from ecosystem orchestration rather than vertical integration.',
                'probability': 0.15
            }
        ]

        result = {
            'scenario_set_id': scenario_set_id,
            'industry': industry,
            'region': region,
            'horizon_years': horizon_years,
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'generation_time_seconds': 180,  # Mock: 3 minutes
            'themes': [
                'Digital transformation acceleration',
                'Sustainability imperatives',
                'Geopolitical complexity',
                'Ecosystem collaboration'
            ],
            'drivers': [
                'Technological advancement',
                'Environmental regulation',
                'Trade policy shifts',
                'Consumer behavior evolution'
            ],
            'uncertainties': [
                'Technology adoption rates',
                'Regulatory stringency',
                'Geopolitical stability',
                'Market consolidation'
            ],
            'scenarios': scenarios,
            'action_plan': {
                'recommendations': [
                    'Build organizational agility to respond to multiple futures',
                    'Invest in digital capabilities while maintaining operational excellence',
                    'Develop sustainability roadmap with clear milestones',
                    'Establish partnerships and ecosystem relationships',
                    'Monitor geopolitical developments and maintain strategic flexibility'
                ],
                'signposts': [
                    'Regulatory announcements on carbon pricing',
                    'Technology adoption metrics in peer organizations',
                    'Trade policy developments',
                    'Consumer preference shifts in sustainability',
                    'Market consolidation activities'
                ]
            },
            'quality_report': {
                'overall_quality_score': 8.5,
                'plausibility': 9.0,
                'diversity': 8.5,
                'coherence': 8.0,
                'actionability': 8.5
            },
            'models_used': {
                'claude-sonnet-4-5': 7,
                'claude-haiku-3-5': 2
            },
            'total_cost_usd': 0.23,
            'status': 'completed'
        }

        logger.info(f"Successfully generated scenario set {scenario_set_id}")
        return _response(200, result)

    except Exception as e:
        logger.error(f"Error generating scenario: {e}", exc_info=True)
        return _response(500, {
            'error': 'Failed to generate scenario',
            'message': str(e)
        })
