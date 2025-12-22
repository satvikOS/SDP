# AWS Bedrock Multi-Model Orchestrator Deployment Guide

## Overview

The AI Foresight Platform now supports **AWS Bedrock** for multi-model AI orchestration. This provides:

- **Access to multiple AI models**: Claude, Llama, Titan, Cohere, AI21, and more
- **Automatic model selection**: Optimized model choice per agent type
- **Intelligent fallback**: Seamless failover to alternative models
- **Cost optimization**: Use expensive models only when needed
- **Better availability**: Reduced dependency on single model

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         Multi-Model Orchestrator                    │
│  ┌──────────────────────────────────────────────┐   │
│  │  Agent Type → Model Selector                 │   │
│  │  - Signal Synthesizer → Claude Sonnet 4.5    │   │
│  │  - Driver Extractor → Claude Sonnet 4.5      │   │
│  │  - Scenario Constructor → Claude Sonnet 4.5  │   │
│  │  - Narrative Generator → Claude Sonnet 4.5   │   │
│  │  - Signpost Designer → Claude Haiku 3.5      │   │
│  │  - Action Planner → Claude Sonnet 4.5        │   │
│  │  - Quality Critic → Claude Haiku 3.5         │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Fallback Strategy                           │   │
│  │  Primary fails → Secondary model             │   │
│  │  - Claude unavailable → Llama 70B            │   │
│  │  - Haiku unavailable → Titan Express         │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│             AWS Bedrock API                          │
│  ┌──────┬──────┬──────┬──────┬──────┬──────────┐    │
│  │Claude│ Titan│ Llama│Cohere│ AI21 │ Stability│    │
│  └──────┴──────┴──────┴──────┴──────┴──────────┘    │
└──────────────────────────────────────────────────────┘
```

## Model Selection Strategy

### High-Complexity Tasks (Claude Sonnet 4.5)

Best for tasks requiring strong reasoning, creativity, and complex analysis:
- **Signal Synthesizer** - Pattern recognition across diverse data
- **Driver Extractor** - Identifying causal forces
- **Scenario Constructor** - Logical scenario frameworks
- **Narrative Generator** - Creative yet rigorous storytelling
- **Action Planner** - Strategic decision-making

**Fallback**: Cohere Command R+, Llama 70B, or Claude Opus 4 depending on task

### Medium-Complexity Tasks (Claude Haiku 3.5 or Titan)

Suitable for analytical tasks with clear structure:
- **Signpost Designer** - Structured monitoring framework
- **Quality Critic** - Rule-based validation

**Fallback**: Amazon Titan Express, Cohere Command R

### Cost vs Performance

| Model | Cost/1M Tokens | Best For |
|-------|----------------|----------|
| Claude Opus 4 | $15 / $75 | Extremely complex reasoning (rarely needed) |
| Claude Sonnet 4.5 | $3 / $15 | Primary workhorse for complex tasks |
| Claude Haiku 3.5 | $0.25 / $1.25 | Fast, cost-effective for simpler tasks |
| Llama 3.1 70B | $0.99 / $0.99 | Good fallback for complex reasoning |
| Cohere Command R+ | $2.50 / $10 | Strong at structured output |
| Titan Express | $0.20 / $0.60 | Budget-friendly, decent quality |

## Prerequisites

### 1. AWS Account Setup

- AWS account with Bedrock access
- IAM role or user with Bedrock permissions
- Enabled models in your AWS region

### 2. Enable Bedrock Models

Go to AWS Bedrock Console and request access to:
- **Anthropic**: Claude Sonnet 4.5, Haiku 3.5, Opus 4
- **Amazon**: Titan Text Express, Titan Embeddings
- **Meta**: Llama 3.1 70B, 8B
- **Cohere**: Command R+, Command R
- **AI21**: Jamba Instruct

**Note**: Model availability varies by region. Use `us-east-1` or `us-west-2` for best coverage.

### 3. IAM Permissions

Create an IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude*",
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan*",
        "arn:aws:bedrock:us-east-1::foundation-model/meta.llama*",
        "arn:aws:bedrock:us-east-1::foundation-model/cohere.*",
        "arn:aws:bedrock:us-east-1::foundation-model/ai21.*"
      ]
    }
  ]
}
```

Attach this policy to:
- IAM role (if running on EC2/ECS/Lambda), or
- IAM user (for local development)

## Installation

### 1. Install Dependencies

```bash
cd backend/services/bedrock-orchestrator
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# AWS Configuration
AWS_REGION=us-east-1

# If using IAM user (not recommended for production)
# AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
# AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY

# For production, use IAM role attached to EC2/ECS/EKS

# Cost Tracking
COST_TRACKING_ENABLED=true
MONTHLY_BUDGET_USD=10000
COST_ALERT_THRESHOLD=0.8

# Fallback Configuration
ENABLE_MODEL_FALLBACK=true
```

### 3. Verify AWS Credentials

```bash
python -c "import boto3; print(boto3.client('bedrock-runtime', region_name='us-east-1').meta.region_name)"
```

Should output: `us-east-1` (or your configured region)

## Usage

### Running the Orchestrator

```python
from multi_model_orchestrator import multi_model_orchestrator

# Execute agent
response = await multi_model_orchestrator.execute({
    "agent_type": "signal_synthesizer",
    "context": {
        "signals": "...",
        "evidence": "...",
        "industry": "Energy",
        "region": "Global",
        "horizon": "2030"
    }
})

print(f"Model used: {response['model_used']}")
print(f"Cost: ${response['cost_usd']}")
print(f"Output: {response['output']}")
```

### Cost Tracking

```python
# Get cost report
cost_report = multi_model_orchestrator.get_cost_report()

print(cost_report)
# {
#   "total_cost_usd": 12.5432,
#   "by_model": {
#     "us.anthropic.claude-sonnet-4-5-v1:0": 10.20,
#     "us.anthropic.claude-haiku-3-5-v1:0": 2.34
#   },
#   "by_agent": {
#     "signal_synthesizer": 3.50,
#     "driver_extractor": 4.20,
#     ...
#   },
#   "budget_usage_pct": 12.54
# }
```

### Custom Model Selection

Override default model for specific use case:

```python
# config.py
class AgentModelMapping(BaseSettings):
    # Use Llama for cost-sensitive scenario
    scenario_constructor_model: str = BedrockModelId.LLAMA_3_1_70B.value

    # Use Opus for critical analysis
    quality_critic_model: str = BedrockModelId.CLAUDE_OPUS_4.value
```

## Fallback Behavior

### Automatic Fallback

When primary model fails (throttling, unavailable, error):

```
1. Attempt: Claude Sonnet 4.5
   ↓ (ThrottlingException)
2. Fallback: Llama 70B
   ↓ (Success)
3. Return: Response with model_used = "meta.llama3-1-70b"
```

### Disable Fallback

```bash
# .env
ENABLE_MODEL_FALLBACK=false
```

With fallback disabled, failures will raise exceptions immediately.

## Cost Optimization

### Strategies

1. **Use Haiku for Simple Tasks**
   - Quality checks, signpost design, structured extraction

2. **Batch Requests**
   - Group similar requests to amortize overhead

3. **Cache Aggressively**
   - Enable Redis caching for repeated contexts

4. **Set Budget Alerts**
   ```bash
   MONTHLY_BUDGET_USD=5000
   COST_ALERT_THRESHOLD=0.8  # Alert at 80%
   ```

5. **Monitor by Agent Type**
   - Identify expensive agents and optimize

### Expected Costs (Per Scenario Generation)

Typical scenario generation workflow:

| Agent | Tokens In | Tokens Out | Model | Cost |
|-------|-----------|------------|-------|------|
| Signal Synthesizer | 10K | 2K | Sonnet 4.5 | $0.06 |
| Driver Extractor | 8K | 1.5K | Sonnet 4.5 | $0.05 |
| Scenario Constructor | 6K | 3K | Sonnet 4.5 | $0.06 |
| Narrative (×4 scenarios) | 5K × 4 | 2K × 4 | Sonnet 4.5 | $0.18 |
| Signpost Designer | 4K | 1K | Haiku 3.5 | $0.002 |
| Action Planner | 12K | 3K | Sonnet 4.5 | $0.08 |
| Quality Critic | 15K | 2K | Haiku 3.5 | $0.006 |
| **Total** | | | | **~$0.48** |

**Monthly Cost Estimate** (100 scenarios/month): ~$48

## Monitoring

### CloudWatch Metrics

Bedrock automatically logs:
- Invocation counts
- Token usage
- Latency
- Errors

Access in CloudWatch under `AWS/Bedrock` namespace.

### Application Metrics

The orchestrator tracks:
- Cost per model
- Cost per agent
- Model usage distribution
- Fallback frequency

```python
# Get metrics
metrics = multi_model_orchestrator.get_cost_report()
```

## Troubleshooting

### Model Not Available

```
Error: ModelNotFoundException
```

**Solution**: Check model is enabled in Bedrock console for your region.

### Throttling

```
Error: ThrottlingException
```

**Solution**:
1. Enable fallback models
2. Request quota increase in AWS Service Quotas
3. Implement client-side rate limiting

### High Costs

**Solution**:
1. Review cost report: `get_cost_report()`
2. Identify expensive agents
3. Consider downgrading model for those agents
4. Increase caching

### Wrong Region

```
Error: Region not supported
```

**Solution**: Use `us-east-1` or `us-west-2` for full model availability.

## Production Deployment

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bedrock-orchestrator
spec:
  replicas: 3
  template:
    spec:
      serviceAccountName: bedrock-service-account
      containers:
      - name: orchestrator
        image: ai-foresight/bedrock-orchestrator:latest
        env:
        - name: AWS_REGION
          value: "us-east-1"
        - name: MONTHLY_BUDGET_USD
          value: "10000"
        # Use IAM role for pods
        - name: AWS_WEB_IDENTITY_TOKEN_FILE
          value: /var/run/secrets/eks.amazonaws.com/serviceaccount/token
```

### IAM Role for Service Account (IRSA)

```bash
eksctl create iamserviceaccount \
  --name bedrock-service-account \
  --namespace default \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::ACCOUNT_ID:policy/BedrockAccessPolicy \
  --approve
```

## Best Practices

1. **Use IAM Roles** - Never hardcode AWS credentials
2. **Enable Cost Tracking** - Monitor spending actively
3. **Set Budget Alerts** - Prevent cost overruns
4. **Enable Fallback** - Improve resilience
5. **Cache Results** - Reduce redundant API calls
6. **Right-Size Models** - Use Haiku where possible
7. **Monitor Latency** - Track P95/P99 latencies
8. **Log Model Usage** - Audit which models are used when

## Migration from Direct Claude API

If migrating from direct Anthropic API:

1. **Same Agent Definitions** - Reuse existing prompts
2. **Same Data Models** - No schema changes
3. **Same Workflow** - End-to-end flow unchanged
4. **Better Resilience** - Fallback to other models
5. **Cost Visibility** - Built-in cost tracking

Simply update environment to use Bedrock orchestrator instead of Claude orchestrator.

---

**Questions?** Contact the platform team or refer to AWS Bedrock documentation.
