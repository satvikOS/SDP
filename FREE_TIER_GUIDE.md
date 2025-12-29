# Free Tier Deployment Guide - Zero Cost for Months

## 🎯 Goal: Run the platform for FREE (or near-free) for development/testing

---

## ⭐ **Option 1: Local Development (100% Free)**

### Cost: **$0 infrastructure + ~$5-20/month Bedrock usage**

Perfect for development and testing. Everything runs on your laptop.

### Requirements
- Docker Desktop (free)
- 8GB RAM minimum
- AWS account (free tier)

### Setup

#### 1. Install Docker Desktop
```bash
# macOS
brew install --cask docker

# Windows
# Download from docker.com

# Linux
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

#### 2. Configure AWS Credentials
```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Region: us-east-1
```

#### 3. Start Everything
```bash
cd SDP

# Copy environment file
cp .env.local .env
# Edit .env and add your AWS credentials

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f bedrock-orchestrator
```

#### 4. Test It Works
```bash
# Check health
curl http://localhost:8000/health

# List agents
curl http://localhost:8000/agents

# Execute a simple agent (will use Bedrock)
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agent_type": "signal_synthesizer",
    "context": {
      "signals": "Test signal",
      "evidence": "Test evidence",
      "industry": "Energy",
      "region": "Global",
      "horizon": "2030"
    }
  }'
```

### Bedrock Costs (Only Cost)

Using **AI Haiku** (cheapest model):
- Input: $0.25 per 1M tokens
- Output: $1.25 per 1M tokens

**Typical development usage:**
- 100 test requests/month
- ~10K tokens per request
- **Cost: ~$5-10/month**

**Optimization tips:**
- Use caching (enabled by default)
- Use Haiku for most agents
- Only use Sonnet when testing complex scenarios
- Set `MONTHLY_BUDGET_USD=50` to prevent overspending

### Pros & Cons

✅ **Pros:**
- 100% free infrastructure
- Full control, fast iteration
- No deployment complexity
- All features available
- Easy debugging

❌ **Cons:**
- Only accessible on your machine
- Requires Docker running
- Small Bedrock API costs
- Not suitable for demos to others

---

## ⭐ **Option 2: Railway Free Tier (Great for MVP)**

### Cost: **$5/month credits (FREE)**

Railway gives $5 free credits per month - enough for light development.

### What You Get
- PostgreSQL database (free)
- Redis (free)
- 1-2 backend services (free tier)
- 500 hours compute/month

### Setup

#### 1. Sign Up
```bash
# Go to railway.app and sign up (free)
# Connect your GitHub account
```

#### 2. Create Project
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add --plugin postgres

# Add Redis
railway add --plugin redis
```

#### 3. Deploy Backend
```bash
# Create railway.json
cat > railway.json <<EOF
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "backend/services/bedrock-orchestrator/Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn api:app --host 0.0.0.0 --port 8000",
    "restartPolicyType": "ON_FAILURE"
  }
}
EOF

# Deploy
railway up
```

#### 4. Add Environment Variables
```bash
railway variables set AWS_REGION=us-east-1
railway variables set AWS_ACCESS_KEY_ID=your_key
railway variables set AWS_SECRET_ACCESS_KEY=your_secret
# Railway auto-injects DATABASE_URL and REDIS_URL
```

### Cost Breakdown

**Free tier includes:**
- $5 credits/month
- PostgreSQL: ~$2/month worth
- Redis: ~$1/month worth
- App service: ~$2/month worth
- **Total: Fits in $5 free tier** ✅

**Additional Bedrock costs:**
- ~$5-20/month depending on usage

### Pros & Cons

✅ **Pros:**
- Completely free infrastructure
- Public URL for demos
- Auto-deploys from Git
- Managed PostgreSQL + Redis
- Easy to set up

❌ **Cons:**
- Limited to $5/month compute
- Services sleep after inactivity
- Single region (US)
- Not production-grade

---

## ⭐ **Option 3: Render Free Tier**

### Cost: **$0/month infrastructure**

Render offers free tier for web services + databases.

### What You Get
- PostgreSQL database (free)
- Redis (free)
- Web services (free with sleep)
- Auto-deploy from Git

### Setup

#### 1. Sign Up
- Go to render.com
- Sign up with GitHub

#### 2. Create Services

**PostgreSQL:**
- New → PostgreSQL
- Name: ai-foresight-db
- Plan: Free
- Create

**Redis:**
- New → Redis
- Name: ai-foresight-cache
- Plan: Free
- Create

**Backend Service:**
- New → Web Service
- Connect repository
- Runtime: Docker
- Plan: Free
- Environment variables:
  ```
  AWS_REGION=us-east-1
  AWS_ACCESS_KEY_ID=...
  AWS_SECRET_ACCESS_KEY=...
  ```

### Limitations

❌ **Free tier limitations:**
- Services spin down after 15 min inactivity
- Cold starts take ~30 seconds
- 750 hours/month limit (OK for 1-2 services)
- Limited memory (512MB)

✅ **Good for:**
- Demos (just wake it up before showing)
- Light testing
- Portfolio projects

---

## ⭐ **Option 4: Google Cloud $300 Free Credits**

### Cost: **$0 for 90 days** (best for serious testing)

Google Cloud gives $300 free credits valid for 90 days.

### What You Get
- $300 credits (lasts ~3 months)
- All GCP services
- Can run full production stack
- No auto-charge after credits expire

### Setup

#### 1. Sign Up
- Go to cloud.google.com/free
- Enter credit card (won't be charged)
- Get $300 credits

#### 2. Deploy via Cloud Run
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Initialize
gcloud init

# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/bedrock-orchestrator
gcloud run deploy bedrock-orchestrator \
  --image gcr.io/PROJECT_ID/bedrock-orchestrator \
  --platform managed \
  --region us-central1 \
  --set-env-vars AWS_REGION=us-east-1,AWS_ACCESS_KEY_ID=...,AWS_SECRET_ACCESS_KEY=...
```

#### 3. Add Cloud SQL (PostgreSQL)
```bash
gcloud sql instances create foresight-db \
  --tier=db-f1-micro \
  --region=us-central1

gcloud sql databases create foresight \
  --instance=foresight-db
```

### Cost Estimate with $300 Credits

- Cloud Run: ~$20/month
- Cloud SQL: ~$10/month
- Memorystore Redis: ~$30/month
- **Total: ~$60/month**
- **$300 / $60 = 5 months free!** ✅

Plus Bedrock API costs (~$10-50/month)

### Pros & Cons

✅ **Pros:**
- Generous free credits
- Production-grade infrastructure
- No sleep/cold starts
- Can handle real load
- 3-5 months completely free

❌ **Cons:**
- Requires credit card
- Credits expire after 90 days
- Must manually stop services before expiry

---

## ⭐ **Option 5: AWS Free Tier (12 Months)**

### Cost: **~$10-30/month** (some services free, some paid)

AWS free tier lasts 12 months but has limitations.

### What's Free (12 months)

✅ **Free:**
- EC2: t2.micro (750 hours/month)
- RDS: db.t2.micro (750 hours/month)
- S3: 5GB storage
- Lambda: 1M requests/month

❌ **NOT Free:**
- ElastiCache Redis (~$15/month minimum)
- ECS Fargate (~$20/month minimum)
- Application Load Balancer (~$20/month)

### Recommended Free Setup

```
EC2 t2.micro: Run all services with Docker Compose
RDS t2.micro: PostgreSQL
S3: Data storage
Bedrock: Pay per use
```

#### Setup

```bash
# 1. Launch t2.micro EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t2.micro \
  --key-name your-key

# 2. SSH and install Docker
ssh -i your-key.pem ec2-user@instance-ip
sudo yum install docker
sudo service docker start

# 3. Clone repo and run
git clone your-repo
cd SDP
docker-compose up -d
```

### Cost Breakdown

- EC2 t2.micro: **Free**
- RDS t2.micro: **Free**
- S3: **Free** (5GB limit)
- Data transfer: ~$1-5/month
- **Bedrock API: $10-50/month**
- **Total: ~$10-55/month**

---

## 📊 **Comparison Table**

| Option | Infrastructure Cost | Bedrock Cost | Total/Month | Duration | Best For |
|--------|-------------------|--------------|-------------|----------|----------|
| **Local Docker** | $0 | $5-20 | **$5-20** | Unlimited | Development |
| **Railway** | $0 (free tier) | $5-20 | **$5-20** | Unlimited | Light MVP |
| **Render** | $0 (free tier) | $5-20 | **$5-20** | Unlimited | Demos |
| **GCP $300** | $0 (credits) | $10-50 | **$0-50** | 3-5 months | Serious testing |
| **AWS Free Tier** | $10-30 | $10-50 | **$20-80** | 12 months | Long-term dev |

---

## 🏆 **My Recommendation for You**

### Phase 1: Development (Months 1-3)
**Use Local Docker Compose**
- Cost: ~$10/month (Bedrock only)
- Full features, fast iteration
- No deployment hassle

### Phase 2: Demo/Testing (Months 3-6)
**Upgrade to GCP $300 Credits**
- Cost: $0 (using credits)
- Public URL for demos
- Production-like environment
- 3+ months free

### Phase 3: Pilot/Production (Month 6+)
**Move to AWS with optimization**
- Cost: ~$300-600/month
- Full production setup
- By then you'll know usage patterns

---

## 💰 Bedrock Cost Optimization Tips

1. **Use Haiku for development** ($0.25 vs $3 per 1M tokens)
   ```bash
   # In .env
   SIGNAL_SYNTHESIZER_MODEL=us.anthropic.ai-haiku-3-5-v1:0
   ```

2. **Enable aggressive caching**
   ```bash
   CACHE_ENABLED=true
   CACHE_TTL_SECONDS=7200  # 2 hours
   ```

3. **Set budget alerts**
   ```bash
   MONTHLY_BUDGET_USD=50
   COST_ALERT_THRESHOLD=0.8  # Alert at 80%
   ```

4. **Batch requests** when testing

5. **Use mock mode** for UI development
   ```python
   # In config
   BEDROCK_MOCK_MODE=true  # Returns fake data, $0 cost
   ```

---

## 🚀 Quick Start (Recommended Path)

```bash
# 1. Start local environment (FREE except Bedrock)
docker-compose up -d

# 2. Develop and test locally ($5-10/month Bedrock)

# 3. When ready for demos, deploy to Railway (FREE)
railway init
railway up

# 4. For serious testing, use GCP credits ($0 for 3 months)

# 5. For production, AWS with cost optimization (~$300/month)
```

---

## ✅ Summary

**For FREE development:**
→ **Local Docker Compose** (my top recommendation)

**Why:**
- $0 infrastructure
- Only pay ~$5-20/month for Bedrock API usage
- Full features
- Fast iteration
- Can run for months/years

**Next step:** When you need to demo or share, upgrade to Railway (still free) or GCP credits (free for 3 months).

Would you like me to create the Dockerfiles and docker-compose.yml for local development now?
