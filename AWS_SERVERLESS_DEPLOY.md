# AWS Serverless Deployment - Minimal Cost for Testing/Demos

## 💰 Cost Estimate: $5-15/month

Perfect for testing and presentations. You only pay when you use it!

---

## What You'll Deploy

- ✅ **Lambda Functions** - Your Python backend (pay per request)
- ✅ **API Gateway** - Public HTTPS endpoints
- ✅ **DynamoDB** - Database (pay per request, not per hour!)
- ✅ **S3** - Data storage
- ✅ **AWS Bedrock** - AI models (pay per use)

**No servers running 24/7 = Minimal cost when idle!**

---

## Cost Breakdown

### Pay-Per-Use Pricing

| Service | Free Tier | After Free Tier | Your Expected Cost |
|---------|-----------|-----------------|-------------------|
| **Lambda** | 1M requests/month free | $0.20 per 1M requests | $0-2/month |
| **API Gateway** | 1M requests/month free | $1.00 per 1M requests | $0-1/month |
| **DynamoDB** | 25GB + 25 WCU/RCU free | $0.25/GB/month | $0-2/month |
| **S3** | 5GB free | $0.023/GB/month | $0-1/month |
| **CloudWatch Logs** | 5GB free | $0.50/GB | $0-1/month |
| **Bedrock API** | No free tier | $0.25-$15 per 1M tokens | $5-10/month |
| | | **TOTAL** | **~$5-17/month** |

### For Testing/Demos Usage
- 10-20 demo scenarios/month
- ~100 API calls/month
- Data storage < 1GB
- **Estimated: $5-10/month**

### If You Don't Use It
- Lambda: $0 (no requests)
- API Gateway: $0 (no requests)
- DynamoDB: $0-1 (storage only)
- S3: $0-1 (storage only)
- **Idle cost: ~$0-2/month**

---

## Prerequisites

1. **AWS Account**
   - Sign up at aws.amazon.com
   - Credit card required (won't be charged much)
   - Enable AWS Bedrock (free to enable)

2. **Local Tools**
   ```bash
   # Install Node.js (for Serverless Framework)
   # Download from nodejs.org

   # Install Serverless Framework
   npm install -g serverless

   # Install AWS CLI
   pip install awscli
   ```

---

## Setup Steps

### 1. Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Enter:
# AWS Access Key ID: [your key]
# AWS Secret Access Key: [your secret]
# Default region: us-east-1
# Default output format: json
```

**Get credentials:**
1. Go to AWS Console → IAM
2. Users → Your user → Security credentials
3. Create access key → CLI
4. Copy Access Key ID and Secret

### 2. Enable Bedrock Models

```bash
# Go to AWS Console
# Services → Bedrock → Model access
# Request access to:
# - Anthropic: Claude Sonnet 4.5, Haiku 3.5
# - Amazon: Titan Text, Titan Embeddings
# - Meta: Llama 3.1 (optional)

# Wait 5-10 minutes for approval (usually instant)
```

### 3. Install Serverless Plugins

```bash
cd SDP

# Install plugins
npm install --save-dev serverless-python-requirements
npm install --save-dev serverless-offline

# Or create package.json first
cat > package.json <<EOF
{
  "name": "ai-foresight-platform",
  "version": "1.0.0",
  "description": "AI-Driven Strategic Foresight Platform",
  "devDependencies": {
    "serverless-python-requirements": "^6.0.0",
    "serverless-offline": "^13.0.0"
  }
}
EOF

npm install
```

### 4. Set Environment Variables

```bash
# Create .env file
cat > .env <<EOF
# Database (DynamoDB replaces PostgreSQL for serverless)
DATABASE_URL=dynamodb://ai-foresight-scenarios-dev

# Cache (DynamoDB replaces Redis)
REDIS_URL=dynamodb://ai-foresight-cache-dev

# Bedrock
COST_TRACKING_ENABLED=true
MONTHLY_BUDGET_USD=50
ENABLE_MODEL_FALLBACK=true

# Logging
LOG_LEVEL=INFO
EOF
```

### 5. Deploy to AWS

```bash
# Deploy to dev stage
serverless deploy --stage dev

# Output will show:
# ✔ Service deployed to stack ai-foresight-platform-dev
#
# endpoints:
#   GET - https://abc123.execute-api.us-east-1.amazonaws.com/health
#   GET - https://abc123.execute-api.us-east-1.amazonaws.com/agents
#   POST - https://abc123.execute-api.us-east-1.amazonaws.com/execute
#
# functions:
#   health: ai-foresight-platform-dev-health
#   executeAgent: ai-foresight-platform-dev-executeAgent
```

**Save that URL!** That's your public API endpoint.

### 6. Test Your Deployment

```bash
# Health check
curl https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/health

# List agents
curl https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/agents

# Execute an agent (this will use Bedrock)
curl -X POST https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agent_type": "signal_synthesizer",
    "context": {
      "signals": "Rising electric vehicle adoption globally",
      "evidence": "Multiple automakers announcing EV targets",
      "industry": "Energy",
      "region": "Global",
      "horizon": "2030"
    }
  }'
```

---

## Cost Monitoring

### Set Up Budget Alerts

```bash
# Create a budget alert
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json

# budget.json:
{
  "BudgetName": "AI-Foresight-Monthly",
  "BudgetLimit": {
    "Amount": "50",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

### View Current Costs

```bash
# Via AWS CLI
aws ce get-cost-and-usage \
  --time-period Start=2025-12-01,End=2025-12-31 \
  --granularity MONTHLY \
  --metrics BlendedCost

# Or go to AWS Console → Billing Dashboard
```

### Check Bedrock Usage

```bash
# Get cost report from your API
curl https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/costs
```

---

## Development Workflow

### Local Testing (Before Deploying)

```bash
# Install dependencies
cd backend/services/bedrock-orchestrator
pip install -r requirements.txt

# Test locally with serverless-offline
serverless offline --stage dev

# Now test against localhost
curl http://localhost:3000/health
```

### Deploy Changes

```bash
# Deploy just one function (faster)
serverless deploy function -f executeAgent --stage dev

# Deploy everything
serverless deploy --stage dev
```

### View Logs

```bash
# Stream logs in real-time
serverless logs -f executeAgent --stage dev --tail

# View recent logs
aws logs tail /aws/lambda/ai-foresight-platform-dev-executeAgent --follow
```

---

## Cost Optimization Tips

### 1. Use Cheaper Models for Testing

```python
# In config.py or environment
SIGNAL_SYNTHESIZER_MODEL=us.anthropic.claude-haiku-3-5-v1:0  # $0.25 vs $3
NARRATIVE_GENERATOR_MODEL=us.anthropic.claude-haiku-3-5-v1:0
```

### 2. Enable Aggressive Caching

```python
CACHE_ENABLED=true
CACHE_TTL_SECONDS=7200  # 2 hours
```

### 3. Set Lambda Memory Appropriately

```yaml
# In serverless.yml
functions:
  executeAgent:
    memorySize: 1024  # Start low, increase if needed
```

### 4. Use DynamoDB On-Demand

Already configured! You pay per request, not per hour.

### 5. Set Bedrock Budget Alert

```python
MONTHLY_BUDGET_USD=50
COST_ALERT_THRESHOLD=0.8  # Alert at $40
```

---

## Cleanup (When Done Testing)

```bash
# Remove all AWS resources
serverless remove --stage dev

# This deletes:
# - Lambda functions
# - API Gateway
# - DynamoDB tables
# - S3 buckets (if empty)
# - CloudWatch logs

# Cost after removal: $0/month
```

---

## Scaling for Demos

### For Presentation Day

```yaml
# Increase limits temporarily
functions:
  executeAgent:
    timeout: 900
    memorySize: 3008  # Max performance
    reservedConcurrency: 5  # Handle 5 concurrent requests
```

Deploy before demo:
```bash
serverless deploy --stage demo
```

### After Demo

```bash
# Remove demo environment
serverless remove --stage demo

# Keep dev environment for future testing
```

---

## Troubleshooting

### Function Timeout

```yaml
# Increase timeout in serverless.yml
functions:
  executeAgent:
    timeout: 900  # Max 15 minutes
```

### Out of Memory

```yaml
# Increase memory
functions:
  executeAgent:
    memorySize: 2048  # or 3008 max
```

### Bedrock "Model Not Available"

```bash
# Check model access in AWS Console
# Bedrock → Model access → Request access
```

### High Costs

```bash
# Check what's expensive
aws ce get-cost-and-usage \
  --time-period Start=2025-12-01,End=2025-12-31 \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Usually it's Bedrock API calls
# Use Haiku instead of Sonnet for testing
```

---

## Comparison: Serverless vs. Traditional

| Aspect | Serverless (This Guide) | Traditional EC2 |
|--------|------------------------|-----------------|
| **Idle Cost** | $0-2/month | $20-50/month |
| **Testing Cost** | $5-15/month | $50-100/month |
| **Setup Time** | 10 minutes | 1-2 hours |
| **Maintenance** | None | Weekly updates |
| **Scaling** | Automatic | Manual |
| **Cold Start** | ~2 seconds | None |
| **Best For** | Testing, demos, low volume | Production, high volume |

---

## Ready for Production?

When you get real users and need to scale:

1. **Keep serverless** for cost efficiency
2. **Add RDS** for relational data (replace DynamoDB)
3. **Add ElastiCache** for better caching
4. **Add CloudFront** for global CDN
5. **Move to provisioned concurrency** (no cold starts)

Cost will increase to ~$200-500/month, but you'll have real users paying for it.

---

## Summary

**For Testing & Demos:**
- ✅ Deploy: `serverless deploy --stage dev`
- ✅ Cost: $5-15/month
- ✅ Public URL for demos
- ✅ Only pay when you use it
- ✅ No server management
- ✅ Easy to remove when done

**Get Started Now:**
```bash
cd SDP
npm install
serverless deploy --stage dev
```

**Your API will be live in ~5 minutes!**

---

**Questions?** Check CloudWatch Logs or AWS Billing Dashboard for detailed info.
