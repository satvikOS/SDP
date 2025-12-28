"""BR Transformation endpoint - transforms academic scenarios to boardroom format."""

import json
import logging
import os
import boto3
from botocore.config import Config
from typing import Dict, Any
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel(os.getenv('LOG_LEVEL', 'INFO'))


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
    body_safe = _convert_decimal_to_float(body)
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST,OPTIONS'
        },
        'body': json.dumps(body_safe)
    }


def transform_to_boardroom(event, context):
    """Transform academic scenario narrative to boardroom format using Claude."""
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})

        narrative = body.get('narrative', '')
        company_name = body.get('company_name', 'Your Organization')
        scenario_title = body.get('scenario_title', 'Scenario')

        if not narrative:
            return _response(400, {'error': 'Missing narrative field'})

        logger.info(f"Transforming scenario to boardroom format: {scenario_title}")

        # Configure boto3 with timeout
        boto_config = Config(
            read_timeout=120,  # 2 minutes for transformation
            connect_timeout=10,
            retries={'max_attempts': 2}
        )
        bedrock = boto3.client('bedrock-runtime', region_name='us-east-1', config=boto_config)
        model_id = 'us.anthropic.claude-opus-4-5-20251101-v1:0'

        # Transformation prompt
        prompt = f"""You are transforming an ACADEMIC scenario analysis into BOARDROOM format for Fortune 500 executives.

**INPUT (Academic Version):**
{narrative}

**YOUR TASK:**
Transform the above exhaustive scenario into a boardroom-ready format. Extract key information and present it as:

1. **BLUF (Bottom Line Up Front)** - 60-80 words with RECOMMENDATION
2. **Scenario Card** - Condensed bullets with metrics
3. **Kill/Double Framework** - Specific asset decisions
4. **Watchtower Dashboard** - Trigger-based actions

Return ONLY valid JSON:
{{
  "executive_summary_bluf": "60-80 word paragraph. Format: 'In this world, [what happens]. {company_name} faces [main threat]. Opportunity lies in [opportunity]. RECOMMENDATION: [specific action].'",

  "scenario_card": {{
    "structural_breaks": [
      {{"year": "YYYY-YYYY", "event": "Brief description", "impact": "Key impact"}},
      {{"year": "YYYY-YYYY", "event": "Brief description", "impact": "Key impact"}},
      {{"year": "YYYY-YYYY", "event": "Brief description", "impact": "Key impact"}}
    ],
    "critical_metrics": {{
      "gdp_growth": {{"range": "X-Y% CAGR", "status": "🔴 Slow|🟡 Moderate|🟢 Strong"}},
      "market_size": {{"range": "$XXX-YYY billion", "current": "$XXX billion"}},
      "cost_of_capital": {{"range": "X-Y% WACC", "status": "🔴 High|🟡 Moderate|🟢 Low"}},
      "regulation": {{"type": "Market-driven|State-directed|Hybrid", "carbon_price": "$XX-YY/ton"}},
      "technology": {{"maturity": "Incremental|Accelerating|Radical", "trend": "Key trend"}}
    }},
    "competitive_landscape": [
      "Top 3 players: XX-YY% share",
      "Key competitive basis: [cost|quality|platform]",
      "Industry EBITDA margins: XX-YY%"
    ],
    "company_impact": {{
      "overall_verdict": {{
        "financial": "Revenue: $XXX-YYY M (+/-X%), EBITDA: XX-YY%, ROIC: XX-YY%",
        "competitive_position": "Strengthens|Weakens|Neutral vs [competitors]",
        "risk_level": "🔴 High|🟡 Medium|🟢 Low",
        "capital_at_risk": "$XXX-YYY M (XX% of CapEx)"
      }},
      "what_breaks": [
        {{"asset": "Specific product/plant", "why": "15-word reason", "impact": "$XXX M loss", "status": "🔴"}},
        {{"asset": "Second asset", "why": "15-word reason", "impact": "$XXX M loss", "status": "🔴"}}
      ],
      "what_survives": [
        {{"asset": "Specific asset/capability", "why": "15-word reason", "impact": "$XXX M gain", "status": "🟢"}},
        {{"asset": "Second asset", "why": "15-word reason", "impact": "$XXX M gain", "status": "🟢"}}
      ]
    }}
  }},

  "decision_framework": {{
    "summary": "**IF THIS SCENARIO:** [One sentence]. **THEN {company_name} MUST:** [Kill X, Double Y]",
    "kill": {{
      "asset": "Specific asset/product/plant",
      "rationale": "Why uneconomic (15 words max)",
      "impact": "$XXX M write-down + $XX M annual savings",
      "timing": "Execute by Q/Year",
      "status": "🔴 Execute|🟡 Prepare|🟢 Monitor"
    }},
    "double": {{
      "asset": "Specific asset/product/capability",
      "rationale": "Why becomes profit engine (15 words max)",
      "impact": "$XXX M CapEx → $XXX M NPV, XX% IRR",
      "timing": "Start Q/Year",
      "status": "🟢 Fund|🟡 Prepare|🔴 Hold"
    }}
  }},

  "watchtower_dashboard": [
    {{
      "indicator": "Specific metric",
      "current": "Current value",
      "trigger": ">XX threshold",
      "action": "Pre-approved decision",
      "window": "Decision timeline",
      "status": "🟢 Safe|🟡 Monitor|🔴 Alert"
    }},
    {{
      "indicator": "Second metric",
      "current": "Value",
      "trigger": "Threshold",
      "action": "Action",
      "window": "Timeline",
      "status": "🟢|🟡|🔴"
    }},
    {{
      "indicator": "Third metric",
      "current": "Value",
      "trigger": "Threshold",
      "action": "Action",
      "window": "Timeline",
      "status": "🟢|🟡|🔴"
    }}
  ]
}}

CRITICAL RULES:
- Use BOLD NUMBERS extracted from narrative
- Use 🔴🟡🟢 status indicators
- Keep rationales to 15 words max
- Extract specific company assets mentioned
- Condense to board-scannable format"""

        request_body = {
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 8000,  # Boardroom format is much shorter
            'temperature': 0.3,  # Lower temperature for extraction/transformation
            'messages': [{'role': 'user', 'content': prompt}]
        }

        logger.info("Calling Bedrock for BR transformation")
        response = bedrock.invoke_model(
            modelId=model_id,
            contentType='application/json',
            accept='application/json',
            body=json.dumps(request_body)
        )

        response_body = json.loads(response['body'].read())
        ai_response = response_body['content'][0]['text']

        # Parse JSON response
        start = ai_response.find('{')
        end = ai_response.rfind('}') + 1
        boardroom_json = ai_response[start:end]
        boardroom_format = json.loads(boardroom_json)

        logger.info("BR transformation completed successfully")

        return _response(200, {
            'boardroom_format': boardroom_format,
            'original_scenario_title': scenario_title
        })

    except Exception as e:
        logger.error(f"Error in BR transformation: {str(e)}", exc_info=True)
        return _response(500, {
            'error': 'Failed to transform to boardroom format',
            'message': str(e)
        })
