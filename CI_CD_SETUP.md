# GitHub Actions CI/CD Setup Guide

## Overview

This platform uses GitHub Actions for **fully automated CI/CD**. Every push to the repository automatically:
1. Tests the code
2. Deploys to AWS Lambda
3. Deploys frontend (when ready)
4. Posts deployment status as comments

**Everything happens in the cloud - nothing stored locally on your iPad!**

---

## Setup Instructions

### 1. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Value | How to Get |
|-------------|-------|------------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key | AWS Console → IAM → Users → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key | Same as above |
| `API_ENDPOINT` | Will be set after first deployment | Output from deployment |
| `CLOUDFRONT_DISTRIBUTION_ID` | For frontend (later) | AWS CloudFront console |

#### Getting AWS Credentials

```bash
# Option 1: Create new IAM user for CI/CD
1. Go to AWS Console → IAM → Users
2. Click "Create user"
3. Username: github-actions-deploy
4. Attach policies:
   - AWSLambdaFullAccess
   - IAMFullAccess (for creating roles)
   - AmazonS3FullAccess
   - AmazonDynamoDBFullAccess
   - CloudFormationFullAccess
5. Create access key → CLI
6. Copy Access Key ID and Secret Access Key
7. Add to GitHub Secrets

# Option 2: Use your existing credentials
aws configure list
# Use the credentials shown
```

### 2. Enable GitHub Actions

1. Go to repository → Actions tab
2. Click "I understand my workflows, go ahead and enable them"
3. Actions are now enabled!

### 3. Trigger First Deployment

```bash
# Make any small change and commit
git commit --allow-empty -m "Trigger initial deployment"
git push
```

Watch deployment at: `https://github.com/YOUR_USERNAME/SDP/actions`

---

## How It Works

### Automatic Deployments

```
┌─────────────────────────────────────────────────────┐
│  1. You edit code in GitHub web editor (iPad)       │
│     OR commit from anywhere                         │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  2. GitHub Actions automatically triggered          │
│     - Workflow: .github/workflows/deploy-lambda.yml │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  3. CI/CD Pipeline Runs:                            │
│     ✓ Checkout code                                 │
│     ✓ Setup Node.js & Python                        │
│     ✓ Install dependencies                          │
│     ✓ Run tests                                     │
│     ✓ Deploy to AWS Lambda                          │
│     ✓ Smoke test (curl /health)                     │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  4. Deployment Complete!                            │
│     - Comment posted on commit with API URL         │
│     - Lambda functions updated                      │
│     - Ready to use immediately                      │
└─────────────────────────────────────────────────────┘
```

### Branch Strategy

| Branch | Deploys To | Auto-Deploy | Use For |
|--------|------------|-------------|---------|
| `claude/ai-foresight-platform-yEVtZ` | dev | ✅ Yes | Development |
| `main` | prod | ✅ Yes | Production |
| Other branches | - | ❌ No | Feature work |

### What Gets Deployed

**Backend triggers:**
- Changes in `backend/**`
- Changes in `serverless.yml`
- Changes in `.github/workflows/**`

**Frontend triggers:**
- Changes in `frontend/**`

**Manual trigger:**
- Go to Actions → Deploy to AWS Lambda → Run workflow

---

## Development Workflow (iPad Pro)

### Option 1: GitHub Web Editor (Easiest for iPad)

```bash
1. Go to https://github.com/YOUR_USERNAME/SDP
2. Press . (dot) to open VS Code web editor
3. Edit files directly in browser
4. Commit changes (bottom left panel)
5. Push → Auto-deploys!
```

### Option 2: GitHub Mobile App

```bash
1. Open GitHub app on iPad
2. Navigate to file
3. Tap ⋯ → Edit file
4. Make changes
5. Commit → Auto-deploys!
```

### Option 3: Cloud IDE (Codespaces)

```bash
1. Go to repository
2. Click Code → Codespaces → Create codespace
3. Full VS Code in browser!
4. Edit, commit, push
5. Auto-deploys!
```

**All options deploy automatically - no local storage needed!**

---

## Monitoring Deployments

### View Deployment Status

1. Go to: `https://github.com/YOUR_USERNAME/SDP/actions`
2. See all deployments, live logs, success/failure
3. Click any workflow to see detailed logs

### Deployment Notifications

After each deployment, GitHub Actions posts a comment on your commit:

```
✅ Successfully deployed to AWS Lambda (dev)!

🔗 API Endpoint: https://abc123.execute-api.us-east-1.amazonaws.com
📊 Health: https://abc123.execute-api.us-east-1.amazonaws.com/health
🤖 Agents: https://abc123.execute-api.us-east-1.amazonaws.com/agents
```

### Check Deployment Logs

```bash
# Via GitHub Actions UI
Actions → Latest workflow → Click job → View logs

# Or via AWS CloudWatch (if needed)
AWS Console → CloudWatch → Log groups → /aws/lambda/ai-foresight-platform-dev-*
```

---

## Testing Deployments

### Automated Tests

The CI/CD pipeline automatically runs tests before deploying:

```yaml
# In .github/workflows/deploy-lambda.yml
- name: Run tests
  run: pytest backend/tests/
```

When tests are added, they'll run automatically on every push.

### Smoke Tests

After deployment, the pipeline automatically tests:

```bash
# Health check
curl https://YOUR-API.execute-api.us-east-1.amazonaws.com/health

# If this fails, deployment is marked as failed
```

### Manual Testing

After deployment succeeds:

```bash
# Test from any device (iPad, phone, laptop)
curl https://YOUR-API.execute-api.us-east-1.amazonaws.com/agents

# Execute an agent
curl -X POST https://YOUR-API.execute-api.us-east-1.amazonaws.com/execute \
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

---

## Cost of CI/CD

### GitHub Actions

**Free tier:**
- 2,000 minutes/month for private repos
- Unlimited for public repos

**Typical usage:**
- Each deployment: ~3-5 minutes
- 20 deployments/month = 100 minutes
- **Cost: $0** (well within free tier)

### AWS Costs

No additional costs for CI/CD. Same Lambda costs as before:
- **$5-15/month** for testing/demos

---

## Rollback Strategy

### Automatic Rollback

If deployment fails, previous version stays deployed (safe!).

### Manual Rollback

```bash
# Option 1: Via GitHub
1. Go to Actions → Failed workflow
2. Re-run previous successful workflow

# Option 2: Via Git
git revert HEAD
git push
# Automatically deploys previous version
```

---

## Advanced Features

### Deployment Environments

```yaml
# Already configured:
- dev environment (auto-deploy from claude/ai-foresight-platform-yEVtZ)
- prod environment (auto-deploy from main)
```

### Manual Approvals (Future)

```yaml
# Can add manual approval for production:
- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  environment:
    name: production
    url: https://api.ai-foresight.com
  # Requires approval in GitHub UI before deploying
```

### Slack Notifications (Future)

```yaml
# Add Slack webhook for deployment notifications
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK }}
    message: "Deployed to production! 🚀"
```

---

## Troubleshooting

### Deployment Fails

1. Check Actions tab for error logs
2. Common issues:
   - Missing GitHub secrets
   - AWS credentials expired
   - Syntax error in code
3. Fix issue and push again (auto-retries)

### Can't Find API Endpoint

1. Go to Actions → Latest successful deployment
2. Look for "Get deployment info" step
3. Copy endpoint URL
4. Or check AWS Console → Lambda → Applications

### Want to Deploy Without Pushing

```bash
# Go to GitHub repository
# Actions → Deploy to AWS Lambda → Run workflow
# Select branch → Run
```

---

## Summary

✅ **Setup once:** Add AWS credentials to GitHub Secrets
✅ **Edit anywhere:** iPad, phone, any browser
✅ **Auto-deploy:** Every push triggers deployment
✅ **Zero local storage:** Everything in the cloud
✅ **Cost:** $0 for CI/CD (using GitHub free tier)
✅ **Safe:** Automatic tests, rollback on failure

**Next Steps:**
1. Add GitHub Secrets (AWS credentials)
2. Push any change to trigger first deployment
3. Get API endpoint from deployment comment
4. Start developing! Every push auto-deploys.

---

**Your complete cloud development workflow is ready! 🚀**
