# AWS Lambda Setup Guide - Step by Step

**Platform:** iPad Pro (Web browser)
**Time Required:** 15-30 minutes
**Cost:** $0 setup + ~$5-15/month usage

---

## Overview

This guide will help you:
1. Create/configure AWS account
2. Create IAM user with permissions
3. Get AWS credentials
4. Add credentials to GitHub Secrets
5. Trigger first deployment
6. Test your Lambda functions

**All steps can be done from iPad Pro using Safari/Chrome!**

---

## Step 1: Create AWS Account (Skip if you have one)

### 1.1 Go to AWS
- Open Safari/Chrome on iPad
- Visit: https://aws.amazon.com
- Click **"Create an AWS Account"** (top right)

### 1.2 Enter Account Details
- **Email address:** Your email
- **AWS account name:** Choose a name (e.g., "AI Foresight Platform")
- Click **Continue**

### 1.3 Contact Information
- Select **"Personal"** or **"Professional"**
- Fill in name, phone, address
- Click **Continue**

### 1.4 Payment Information
- Enter credit/debit card details
- **Note:** AWS requires a card but won't charge you without usage
- Most services have free tiers
- Our setup: ~$5-15/month for testing
- Click **Verify and Continue**

### 1.5 Identity Verification
- Choose **"Text message (SMS)"** or **"Voice call"**
- Enter verification code received
- Click **Continue**

### 1.6 Choose Support Plan
- Select **"Basic support - Free"**
- Click **Complete sign up**

### 1.7 Wait for Activation
- AWS will send confirmation email (5-10 minutes)
- Check your email and confirm
- ✅ Your AWS account is ready!

---

## Step 2: Sign in to AWS Console

### 2.1 Go to AWS Console
- Visit: https://console.aws.amazon.com
- Click **"Sign In to the Console"**
- Select **"Root user"**
- Enter your email
- Click **Next**
- Enter password
- Click **Sign in**

### 2.2 Select Region
- Top right corner, click region dropdown
- Select **"US East (N. Virginia) us-east-1"**
- **Important:** Keep this region for all steps!

✅ You're now in the AWS Console!

---

## Step 3: Enable AWS Bedrock Models

**Critical:** AWS Bedrock models require manual enablement.

### 3.1 Navigate to Bedrock
- In AWS Console search bar (top), type: **"Bedrock"**
- Click **"Amazon Bedrock"**

### 3.2 Request Model Access
- Left sidebar → Click **"Model access"**
- Click **"Modify model access"** (orange button)

### 3.3 Enable Required Models
Check these boxes:
- ✅ **Anthropic**
  - ✅ Claude 3.5 Sonnet v2
  - ✅ Claude 3.5 Haiku
  - ✅ Claude 3 Sonnet
- ✅ **Meta** (optional, for future use)
  - ✅ Llama 3.1 models
- ✅ **Amazon**
  - ✅ Titan Text models
- ✅ **Cohere** (optional)
  - ✅ Command models

### 3.4 Submit Request
- Scroll to bottom
- Click **"Next"**
- Review selected models
- Click **"Submit"**

### 3.5 Wait for Approval
- **Anthropic Claude:** Usually instant (shows "Access granted" immediately)
- **Other models:** May take 5-30 minutes
- You'll receive email confirmation

**Status Check:**
- Refresh the "Model access" page
- All should show **"Access granted"** in green

✅ Bedrock models are now enabled!

---

## Step 4: Create IAM User for GitHub Actions

**Why?** We need secure credentials for GitHub to deploy to AWS.

### 4.1 Navigate to IAM
- AWS Console search bar → type: **"IAM"**
- Click **"IAM"** (Identity and Access Management)

### 4.2 Create User
- Left sidebar → Click **"Users"**
- Click **"Create user"** (orange button)

### 4.3 User Details
- **User name:** `github-actions-deploy`
- ✅ Check **"Provide user access to the AWS Management Console"** (optional, for debugging)
- If checked:
  - Select **"I want to create an IAM user"**
  - **Console password:** Custom password → Enter a strong password
  - ✅ Uncheck **"Users must create a new password at next sign-in"**
- Click **Next**

### 4.4 Set Permissions
- Select **"Attach policies directly"**
- Search and check these policies:

**Required Policies:**
1. ✅ **AWSLambdaFullAccess** (for deploying Lambda functions)
   - Search: "AWSLambdaFullAccess"
   - Check the box

2. ✅ **IAMFullAccess** (for creating Lambda execution roles)
   - Search: "IAMFullAccess"
   - Check the box

3. ✅ **AmazonS3FullAccess** (for deployment packages)
   - Search: "AmazonS3FullAccess"
   - Check the box

4. ✅ **AmazonDynamoDBFullAccess** (for future database)
   - Search: "AmazonDynamoDBFullAccess"
   - Check the box

5. ✅ **CloudFormationFullAccess** (Serverless Framework uses this)
   - Search: "CloudFormationFullAccess"
   - Check the box

6. ✅ **AmazonAPIGatewayAdministrator** (for API Gateway)
   - Search: "AmazonAPIGatewayAdministrator"
   - Check the box

7. ✅ **CloudWatchLogsFullAccess** (for viewing logs)
   - Search: "CloudWatchLogsFullAccess"
   - Check the box

**Tip:** Use search box to find each policy, type the name and check the box.

### 4.5 Review and Create
- Click **Next**
- Review selected policies (should see 7 policies)
- Click **Create user**

✅ User created! Now we need access keys.

---

## Step 5: Create Access Keys

### 5.1 Select User
- You should see success message
- Click on the user name: **github-actions-deploy**

### 5.2 Create Access Key
- Click **"Security credentials"** tab
- Scroll to **"Access keys"** section
- Click **"Create access key"**

### 5.3 Select Use Case
- Select **"Command Line Interface (CLI)"**
- ✅ Check **"I understand the above recommendation..."**
- Click **Next**

### 5.4 Description (Optional)
- Description tag: `GitHub Actions CI/CD`
- Click **Create access key**

### 5.5 **CRITICAL: Save Credentials**

You'll see:
- **Access key ID:** `AKIA...` (20 characters)
- **Secret access key:** `wJalrXUtn...` (40 characters)

**⚠️ IMPORTANT:**
1. Click **"Download .csv file"** - saves to your iPad
2. **OR** copy both values to a secure note app
3. You'll NEVER see the secret key again!
4. Keep these safe - they're like passwords

**Example (not real):**
```
Access key ID: AKIAIOSFODNN7EXAMPLE
Secret access key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

- Click **Done**

✅ You now have AWS credentials!

---

## Step 6: Add Credentials to GitHub Secrets

**Why?** GitHub Actions needs these to deploy to AWS.

### 6.1 Open Your GitHub Repository
- Safari/Chrome → Go to your repo:
  - `https://github.com/YOUR_USERNAME/SDP`

### 6.2 Navigate to Secrets
- Click **"Settings"** tab (top)
- Left sidebar → **"Secrets and variables"** → **"Actions"**

### 6.3 Add AWS_ACCESS_KEY_ID
- Click **"New repository secret"** (green button)
- **Name:** `AWS_ACCESS_KEY_ID`
- **Secret:** Paste your Access key ID (e.g., `AKIAIOSFODNN7EXAMPLE`)
- Click **"Add secret"**

### 6.4 Add AWS_SECRET_ACCESS_KEY
- Click **"New repository secret"** again
- **Name:** `AWS_SECRET_ACCESS_KEY`
- **Secret:** Paste your Secret access key (the 40-character one)
- Click **"Add secret"**

### 6.5 Verify Secrets Added
You should now see:
- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`

✅ GitHub can now deploy to AWS!

---

## Step 7: Trigger First Deployment

### Option 1: Push a Change (Automatic)

Since you just added GitHub Secrets, let's trigger deployment:

#### 7.1 Make a Small Change
- Go to your repo: `https://github.com/YOUR_USERNAME/SDP`
- Navigate to `README.md`
- Click **pencil icon** (Edit)
- Add a line at the bottom:
  ```markdown

  **Status:** Deploying to AWS Lambda
  ```
- Click **"Commit changes"**
- Click **"Commit changes"** again (confirm)

#### 7.2 Watch Deployment
- Click **"Actions"** tab (top)
- You should see workflow: **"Deploy to AWS Lambda"** running
- Click on it to see live logs

### Option 2: Manual Trigger

#### 7.1 Navigate to Actions
- GitHub repo → Click **"Actions"** tab

#### 7.2 Select Workflow
- Left sidebar → Click **"Deploy to AWS Lambda"**

#### 7.3 Run Workflow
- Click **"Run workflow"** button (right side)
- Branch: **claude/ai-foresight-platform-yEVtZ**
- Click **"Run workflow"** (green button)

#### 7.4 Watch Deployment
- Workflow will appear in list
- Click on it to see live logs
- Takes ~3-5 minutes

---

## Step 8: Monitor Deployment

### 8.1 Watch the Workflow
You'll see these steps:
1. ✅ Checkout code
2. ✅ Setup Node.js
3. ✅ Setup Python
4. ✅ Configure AWS credentials
5. ✅ Install dependencies
6. ✅ Install Python dependencies
7. ✅ Run tests
8. ✅ Deploy to AWS Lambda (dev) ← **This takes 2-3 minutes**
9. ✅ Get deployment info
10. ✅ Smoke test deployment
11. ✅ Post deployment summary

### 8.2 Success Indicators
- All steps show ✅ green checkmarks
- Last step: **"Post deployment summary"**

### 8.3 Get API Endpoint

**Option A: From GitHub Actions Output**
- Click **"Get deployment info"** step
- Expand the logs
- Look for: `endpoint: https://...execute-api.us-east-1.amazonaws.com`
- Copy this URL

**Option B: From Commit Comment**
- Go back to your repo
- Click **"Commits"** (below the green "Code" button)
- Click on latest commit
- Scroll to comments section
- You'll see a comment from GitHub Actions:
  ```
  ✅ Successfully deployed to AWS Lambda (dev)!

  🔗 API Endpoint: https://abc123xyz.execute-api.us-east-1.amazonaws.com
  📊 Health: https://abc123xyz.execute-api.us-east-1.amazonaws.com/health
  🤖 Agents: https://abc123xyz.execute-api.us-east-1.amazonaws.com/agents
  ```

**Copy the API Endpoint URL!**

### 8.4 Add API Endpoint to GitHub Secrets

- Go to: Settings → Secrets and variables → Actions
- Click **"New repository secret"**
- **Name:** `API_ENDPOINT`
- **Secret:** Paste your API endpoint URL
- Click **"Add secret"**

✅ Deployment complete!

---

## Step 9: Test Your Lambda Functions

### 9.1 Test in Browser (Easiest for iPad)

**Health Check:**
- Open Safari/Chrome
- Go to: `https://YOUR-API-ENDPOINT/health`
- Replace `YOUR-API-ENDPOINT` with your actual endpoint

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:34:56",
  "service": "ai-foresight-platform",
  "bedrock_available": true
}
```

**List Agents:**
- Go to: `https://YOUR-API-ENDPOINT/agents`

**Expected Response:**
```json
{
  "agents": [
    "signal_synthesizer",
    "driver_extractor",
    "scenario_constructor",
    "narrative_generator",
    "signpost_designer",
    "action_planner",
    "quality_critic"
  ]
}
```

### 9.2 Test Scenario Generation (Advanced)

**Using Online API Tester (iPad-friendly):**

1. Go to: https://reqbin.com
2. **Method:** POST
3. **URL:** `https://YOUR-API-ENDPOINT/generate-scenarios`
4. **Headers:** Click "Add Header"
   - Name: `Content-Type`
   - Value: `application/json`
5. **Body:** Select "JSON" and paste:
   ```json
   {
     "industry": "Energy",
     "region": "Global",
     "horizon_years": 10
   }
   ```
6. Click **"Send"**
7. Wait 2-5 minutes (this is normal!)
8. You'll get back a complete scenario set with 4 scenarios

**Expected Response Structure:**
```json
{
  "scenario_set_id": "uuid-here",
  "industry": "Energy",
  "region": "Global",
  "horizon_years": 10,
  "scenarios": [
    {
      "title": "Scenario 1 Title",
      "narrative": "Full narrative text...",
      "signposts": [...]
    },
    ...
  ],
  "action_plan": {...},
  "quality_report": {...},
  "total_cost_usd": 0.15,
  "generation_time_seconds": 180
}
```

---

## Step 10: Verify in AWS Console (Optional)

### 10.1 View Lambda Functions
- AWS Console → Search: **"Lambda"**
- You should see functions:
  - `ai-foresight-platform-dev-executeAgent`
  - `ai-foresight-platform-dev-generateScenarios`
  - `ai-foresight-platform-dev-getAgents`
  - `ai-foresight-platform-dev-health`

### 10.2 View API Gateway
- AWS Console → Search: **"API Gateway"**
- You should see: **"dev-ai-foresight-platform"**
- Click it to see all endpoints

### 10.3 View CloudWatch Logs
- AWS Console → Search: **"CloudWatch"**
- Left sidebar → **"Logs"** → **"Log groups"**
- You'll see logs for each Lambda function
- Click any to see execution logs

### 10.4 Check Bedrock Usage
- AWS Console → Search: **"Bedrock"**
- Left sidebar → **"Usage"**
- You'll see model invocations and costs

---

## Troubleshooting

### ❌ Deployment Failed: "Access Denied"

**Problem:** IAM user doesn't have permissions

**Solution:**
1. AWS Console → IAM → Users → github-actions-deploy
2. "Permissions" tab
3. Verify all 7 policies are attached
4. If missing, click "Add permissions" → "Attach policies directly"

### ❌ Deployment Failed: "Bedrock AccessDeniedException"

**Problem:** Bedrock models not enabled

**Solution:**
1. AWS Console → Bedrock → Model access
2. Click "Modify model access"
3. Enable Claude 3.5 Sonnet and Haiku
4. Wait for "Access granted" status

### ❌ "Could not find credentials" Error

**Problem:** GitHub Secrets not set correctly

**Solution:**
1. GitHub repo → Settings → Secrets and variables → Actions
2. Verify both secrets exist:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
3. If wrong, delete and re-add

### ❌ Health Endpoint Returns 403 Forbidden

**Problem:** API Gateway configuration issue

**Solution:**
1. Redeploy: GitHub Actions → Run workflow manually
2. Wait 3-5 minutes
3. Try health endpoint again

### ❌ Scenario Generation Times Out

**Problem:** Lambda timeout (default 6 seconds)

**Solution:**
- Already configured in `serverless.yml`:
  ```yaml
  timeout: 900  # 15 minutes
  ```
- If still timing out, check CloudWatch Logs for errors

---

## Cost Monitoring

### Set Up Billing Alerts (Recommended)

#### 1. Enable Billing Alerts
- AWS Console → Search: **"Billing"**
- Left sidebar → **"Billing Preferences"**
- ✅ Check **"Receive Billing Alerts"**
- Click **"Save preferences"**

#### 2. Create Budget Alert
- Left sidebar → **"Budgets"**
- Click **"Create budget"**
- **Template:** "Monthly cost budget"
- **Budget name:** "AI Foresight Platform"
- **Budgeted amount:** `$20` (or your preference)
- **Email:** Your email
- Click **"Create budget"**

You'll receive email if costs exceed your budget!

### Expected Costs

**Testing/Demo Usage (20 scenario generations/month):**
- Lambda: $0.20
- API Gateway: $0.10
- Bedrock (Claude): $2-6
- DynamoDB: $0 (free tier)
- CloudWatch: $0 (free tier)
- **Total:** ~$5-15/month

**Production Usage:**
- Scales with usage
- Pay only for what you use
- Monitor in: AWS Console → Billing Dashboard

---

## Next Steps

✅ **AWS Lambda is now set up!**

### You Can Now:

1. **Deploy automatically:**
   - Edit code on iPad → Commit → Push → Auto-deploys!

2. **Test APIs:**
   - Health check: `https://YOUR-API/health`
   - Generate scenarios: `POST https://YOUR-API/generate-scenarios`

3. **View logs:**
   - AWS Console → CloudWatch → Log groups

4. **Monitor costs:**
   - AWS Console → Billing Dashboard

### Next Phase:

1. **Deploy Frontend:**
   - Create S3 bucket
   - Deploy Next.js app
   - Connect to Lambda API

2. **Test Full Platform:**
   - Generate scenarios via web UI
   - View results with visualizations

3. **Add Features:**
   - DynamoDB for scenario history
   - Authentication (Cognito)
   - Real-time monitoring

---

## Quick Reference

### Important URLs

- **AWS Console:** https://console.aws.amazon.com
- **GitHub Repo:** https://github.com/YOUR_USERNAME/SDP
- **GitHub Actions:** https://github.com/YOUR_USERNAME/SDP/actions
- **Your API Endpoint:** (saved in GitHub Secrets as `API_ENDPOINT`)

### GitHub Secrets Needed

- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`
- ✅ `API_ENDPOINT`
- ⏳ `CLOUDFRONT_DISTRIBUTION_ID` (for frontend, later)

### AWS Services Used

- ✅ Lambda (compute)
- ✅ API Gateway (HTTP endpoints)
- ✅ Bedrock (AI models)
- ✅ CloudWatch (logs)
- ✅ IAM (permissions)
- ⏳ DynamoDB (future: database)
- ⏳ S3 (future: frontend hosting)

---

## Support

### If You Get Stuck:

1. **Check GitHub Actions logs:**
   - Actions tab → Click failed workflow → Expand failed step

2. **Check AWS CloudWatch logs:**
   - AWS Console → CloudWatch → Log groups → Click function

3. **Check this guide:** Review the troubleshooting section above

4. **AWS Support:**
   - Free Basic Support included
   - AWS Console → Support Center

---

**You're all set! Your Lambda functions are deployed and ready to use.** 🚀

Next step: Deploy the frontend or test the API directly!
