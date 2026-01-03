# Multi-AI Pipeline Deployment Guide

## Status: Phase 1 Integration Complete ✅

All code for the Multi-AI Pipeline is complete and pushed to the repository. This guide walks through deploying to AWS Lambda.

---

## Architecture Overview

```
User Request
     ↓
AWS Lambda (Bedrock Orchestrator)
     ↓
┌─────────────────────────────────────────────┐
│ Step 1: Claude Opus 4.5 (Initial Draft)    │
│ - 7 specialized agents                      │
│ - Comprehensive scenario generation         │
│ - AWS Bedrock API                           │
└─────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────┐
│ Step 2: Gemini 3 Pro (Strategic Review)    │
│ - Role: Head of Strategy                   │
│ - Harshest possible critique                │
│ - Google AI API                             │
└─────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────┐
│ Step 3: Claude Sonnet 4.5 (Due Diligence)  │
│ - Incorporates Gemini critique              │
│ - Independent validation                    │
│ - AWS Bedrock API                           │
└─────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────┐
│ Step 4: Claude Opus 4.5 (Final Refinement) │
│ - Executive-ready document                  │
│ - APA citations, glossary, formatting       │
│ - AWS Bedrock API                           │
└─────────────────────────────────────────────┘
     ↓
Professional Document (PDF/PPTX/WORD)
```

---

## Prerequisites

1. **AWS Account** with Bedrock access
2. **Google AI API Key** for Gemini 3 Pro
3. **Node.js** (v18+) and **npm** installed
4. **Python 3.11** for Lambda runtime
5. **AWS CLI** configured
6. **Serverless Framework** (or SAM)

---

## Step 1: Environment Variables

Add these environment variables to your Lambda function:

### Required Variables

```bash
# Multi-AI Pipeline Control
ENABLE_MULTI_MODEL_PIPELINE=true

# Google Gemini API Key
GOOGLE_API_KEY=AIzaSyDM-pYF5GB0u6GltVxeHlAGMj6Ck1FcZls

# AWS Bedrock Configuration (usually auto-configured)
AWS_REGION=us-east-1

# Application Stage
STAGE=dev  # or prod
```

### Optional Variables

```bash
# Logging
LOG_LEVEL=INFO

# Cost Tracking
COST_TRACKING_ENABLED=true

# Performance
MAX_TOKENS=8000
TEMPERATURE=0.7
```

---

## Step 2: Install Python Dependencies

The following packages are required in your Lambda layer or deployment package:

```txt
boto3>=1.34.0
google-generativeai>=0.4.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
python-dotenv>=1.0.0
```

### Option A: Using Lambda Layers

```bash
cd backend/services/bedrock-orchestrator

# Create layer directory
mkdir -p python/lib/python3.11/site-packages

# Install dependencies
pip install -r requirements.txt -t python/lib/python3.11/site-packages

# Create layer zip
zip -r lambda-layer.zip python

# Upload to AWS Lambda Layers
aws lambda publish-layer-version \
  --layer-name ai-foresight-dependencies \
  --zip-file fileb://lambda-layer.zip \
  --compatible-runtimes python3.11
```

### Option B: Using Deployment Package

```bash
cd backend/services/bedrock-orchestrator

# Install dependencies locally
pip install -r requirements.txt -t .

# Deploy with serverless
serverless deploy --stage dev
```

---

## Step 3: Deploy Lambda Function

### Using Serverless Framework

```bash
cd backend/services/bedrock-orchestrator

# Install serverless dependencies
npm install

# Deploy to dev
serverless deploy --stage dev --verbose

# Deploy to production
serverless deploy --stage prod --verbose
```

### Using AWS SAM

```bash
cd backend/services/bedrock-orchestrator

# Build
sam build

# Deploy
sam deploy --guided
```

### Manual Deployment

1. **Create deployment package:**
   ```bash
   cd backend/services/bedrock-orchestrator
   zip -r deployment.zip . -x "*.git*" -x "node_modules/*" -x "*.md"
   ```

2. **Upload to Lambda:**
   - Go to AWS Lambda Console
   - Select your function
   - Upload `deployment.zip`
   - Set runtime to Python 3.11
   - Set handler to `lambda_handler.generate_scenario_async_worker`
   - Increase timeout to 900 seconds (15 minutes)
   - Increase memory to 2048 MB

3. **Configure environment variables** (see Step 1)

---

## Step 4: Verify Deployment

### Test the Pipeline

```bash
# Invoke Lambda directly
aws lambda invoke \
  --function-name bedrock-orchestrator-dev-generate \
  --payload '{"body": "{\"company_name\": \"Tesla\", \"industry\": \"Energy\", \"region\": \"North America\", \"horizon_years\": 5, \"strategic_context\": \"Electric vehicle market expansion\"}"}' \
  response.json

# Check response
cat response.json
```

### Check CloudWatch Logs

Look for these log messages indicating pipeline execution:

```
[Job xxx] Starting multi-AI pipeline enhancement (Claude Opus → Gemini → Claude Sonnet → Claude Opus)
[Job xxx] Step 1/4: Initial draft formatted
[Job xxx] Step 2/4: Gemini strategic review completed
[Job xxx] Step 3/4: Claude Sonnet due diligence completed
[Job xxx] Step 4/4: Claude final refinement completed
[Job xxx] Multi-AI pipeline completed successfully
[Job xxx] Models used: ['claude-opus-4', 'gemini-3-pro', 'claude-sonnet-4.5']
[Job xxx] Review layers: ['strategic_review', 'due_diligence', 'final_refinement']
[Job xxx] Multi-AI pipeline cost: $0.3600 (base: $0.1500)
```

---

## Step 5: Testing Checklist

- [ ] Lambda function deploys successfully
- [ ] Environment variable `GOOGLE_API_KEY` is set
- [ ] Environment variable `ENABLE_MULTI_MODEL_PIPELINE=true`
- [ ] google-generativeai package installed (no ImportError)
- [ ] Generate test scenario for "Tesla" in "Energy" sector
- [ ] Verify 4 models are called (check CloudWatch logs)
- [ ] Check Gemini critique appears in DynamoDB results
- [ ] Verify Claude Sonnet improvements applied
- [ ] Check final document has professional formatting
- [ ] Measure total cost per scenario (~$0.36)
- [ ] Export to PDF/PPTX/WORD works correctly

---

## Cost Analysis

### Per Scenario Generation

| Stage | Model | Tokens (est.) | Cost |
|-------|-------|---------------|------|
| Initial Draft | Claude Opus 4.5 | 2K in, 15K out | $0.20 |
| Strategic Review | Gemini 3 Pro | 15K in, 5K out | $0.01 |
| Due Diligence | Claude Sonnet 4.5 | 20K in, 10K out | $0.05 |
| Final Refinement | Claude Opus 4.5 | 10K in, 5K out | $0.10 |
| **TOTAL** | **4 Models** | **~50K total** | **~$0.36** |

**Comparison:**
- Base (Claude only): $0.15
- Multi-AI Pipeline: $0.36
- **Cost increase**: 2.4x
- **Quality increase**: 5-10x (estimated)

### Monthly Cost Projections

| Scenarios/Month | Base Cost | Multi-AI Cost | Difference |
|----------------|-----------|---------------|------------|
| 100 | $15 | $36 | +$21 |
| 500 | $75 | $180 | +$105 |
| 1,000 | $150 | $360 | +$210 |
| 5,000 | $750 | $1,800 | +$1,050 |

---

## Troubleshooting

### ImportError: google.generativeai

**Problem:** `ModuleNotFoundError: No module named 'google.generativeai'`

**Solution:**
```bash
# Add to requirements.txt
echo "google-generativeai>=0.4.0" >> requirements.txt

# Reinstall dependencies
pip install -r requirements.txt -t .

# Redeploy
serverless deploy --stage dev
```

### Gemini API Error: 403 Forbidden

**Problem:** `Gemini strategic review failed: 403 Forbidden`

**Solution:**
- Verify `GOOGLE_API_KEY` is set correctly in Lambda environment
- Check API key is valid: https://aistudio.google.com/app/apikey
- Ensure Gemini API is enabled in Google Cloud Console

### Pipeline Times Out

**Problem:** Lambda times out before pipeline completes

**Solution:**
- Increase Lambda timeout to 900 seconds (15 minutes)
- Increase memory to 2048 MB or higher
- Check CloudWatch logs to identify which stage is slow

### Pipeline Falls Back to Base Result

**Problem:** Logs show "Multi-AI pipeline failed, using base result"

**Solution:**
- Check CloudWatch logs for specific error message
- Verify all API keys are set correctly
- Ensure AWS Bedrock has access to Claude models
- Check network connectivity from Lambda to external APIs

---

## Disabling Multi-AI Pipeline

If you want to temporarily disable the pipeline and use only Claude:

```bash
# Set environment variable
ENABLE_MULTI_MODEL_PIPELINE=false

# Or remove the variable entirely
```

The system will fall back to the base Claude Opus 4.5 scenario generation.

---

## Next Steps After Deployment

### Phase 2: Document Enhancements (2-3 weeks)
1. Company logo upload API
2. Brand theme customization (colors, fonts)
3. Automated chart/graph generation
4. Enhanced APA citation validation
5. Custom cover page templates

### Phase 3: Data Signals & Intelligence (8-12 weeks)
1. Multi-source data ingestion (news, reports, filings)
2. Signal intelligence pipeline
3. Weak signal detection
4. Trend analysis & clustering

### Phase 4: Enterprise Platform (8-12 weeks)
1. SSO integration (SAML/OIDC)
2. RBAC (role-based access control)
3. Multi-tenant architecture
4. Audit logs & compliance
5. Advanced observability

---

## Support

If you encounter issues:

1. Check CloudWatch logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure dependencies are installed in Lambda environment
4. Test each API key independently

**Documentation:**
- Phase 1 Status: `PHASE_1_COMPLETE.md`
- Multi-AI Pipeline Code: `multi_ai_pipeline.py`
- Lambda Handler: `lambda_handler.py`
- Feature Audit: `FEATURE_AUDIT.md`

---

**Status:** Ready for deployment! All code is committed and pushed to `claude/ai-foresight-platform-yEVtZ` branch.
