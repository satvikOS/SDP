# AI Foresight Platform - Deployment Guide

## 🎯 Deployment Overview

This platform is a **microservices architecture** requiring:
- Python backend services (FastAPI)
- PostgreSQL + Redis + Vector DB
- Message queue (Kafka)
- AWS Bedrock integration
- Real-time data processing

**❌ NOT suitable for Vercel** (frontend-only platform)
**✅ Recommended: AWS or Kubernetes-based deployment**

## 📋 Deployment Options Comparison

| Platform | Frontend | Backend | Database | AI Integration | Cost | Complexity |
|----------|----------|---------|----------|----------------|------|------------|
| **AWS (ECS/EKS)** | ✅ Amplify | ✅ Native | ✅ RDS | ✅ Bedrock | $$$ | Medium |
| **AWS (All-in)** | ✅ CloudFront | ✅ Fargate | ✅ Managed | ✅ Native | $$$$ | Low |
| **Google Cloud** | ✅ Cloud Run | ✅ Cloud Run | ✅ Cloud SQL | ⚠️ API calls | $$$ | Medium |
| **Azure** | ✅ Static Web | ✅ AKS | ✅ Azure DB | ⚠️ API calls | $$$ | Medium |
| **DigitalOcean** | ✅ App Platform | ✅ Kubernetes | ✅ Managed DB | ⚠️ API calls | $$ | Medium |
| **Self-hosted K8s** | ✅ Any | ✅ Any | ✅ Any | ⚠️ API calls | $ | High |

---

## ⭐ Option 1: AWS Full Stack (RECOMMENDED)

### Architecture

```
Internet
   ↓
CloudFront (Frontend CDN)
   ↓
[Next.js Static Site on S3]
   ↓
API Gateway
   ↓
Application Load Balancer
   ↓
┌──────────────────────────────────────┐
│   ECS Fargate / EKS Cluster          │
│                                      │
│  ┌─────────────────────────────┐    │
│  │ bedrock-orchestrator (2x)   │    │
│  │ - Port 8000                  │    │
│  │ - IAM Role for Bedrock       │    │
│  └─────────────────────────────┘    │
│                                      │
│  ┌─────────────────────────────┐    │
│  │ ingestion-service (3x)      │    │
│  └─────────────────────────────┘    │
│                                      │
│  ┌─────────────────────────────┐    │
│  │ vector-service (2x)         │    │
│  └─────────────────────────────┘    │
│                                      │
│  ┌─────────────────────────────┐    │
│  │ scenario-engine (2x)        │    │
│  └─────────────────────────────┘    │
└──────────────────────────────────────┘
   ↓
┌──────────────────────────────────────┐
│   Data Layer                         │
│                                      │
│  - RDS PostgreSQL (with pgvector)    │
│  - ElastiCache Redis                 │
│  - OpenSearch Service                │
│  - S3 Data Lake                      │
│  - MSK (Kafka) - optional            │
└──────────────────────────────────────┘
```

### Infrastructure as Code (Terraform)

Create `infrastructure/terraform/main.tf`:

```hcl
# infrastructure/terraform/main.tf

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "ai-foresight-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = false
  enable_dns_hostnames = true

  tags = {
    Environment = var.environment
    Project     = "AI-Foresight"
  }
}

# S3 Data Lake
resource "aws_s3_bucket" "data_lake" {
  bucket = "ai-foresight-data-lake-${var.environment}"

  tags = {
    Name        = "AI Foresight Data Lake"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "data_lake_versioning" {
  bucket = aws_s3_bucket.data_lake.id

  versioning_configuration {
    status = "Enabled"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier           = "ai-foresight-db"
  engine              = "postgres"
  engine_version      = "15.4"
  instance_class      = "db.t3.medium"
  allocated_storage   = 100
  storage_encrypted   = true

  db_name  = "foresight"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  multi_az               = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "ai-foresight-final-${var.environment}"

  tags = {
    Name        = "AI Foresight PostgreSQL"
    Environment = var.environment
  }
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "ai-foresight-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  tags = {
    Name        = "AI Foresight Redis"
    Environment = var.environment
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "ai-foresight-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "AI Foresight Cluster"
    Environment = var.environment
  }
}

# IAM Role for ECS Tasks (Bedrock access)
resource "aws_iam_role" "ecs_task_role" {
  name = "ai-foresight-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "bedrock_access" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonBedrockFullAccess"
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

# ECS Task Definition - Bedrock Orchestrator
resource "aws_ecs_task_definition" "bedrock_orchestrator" {
  family                   = "bedrock-orchestrator"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "bedrock-orchestrator"
      image     = "${var.ecr_registry}/bedrock-orchestrator:latest"
      essential = true

      portMappings = [
        {
          containerPort = 8000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "REDIS_URL"
          value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379/0"
        },
        {
          name  = "DATABASE_URL"
          value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/foresight"
        },
        {
          name  = "COST_TRACKING_ENABLED"
          value = "true"
        },
        {
          name  = "MONTHLY_BUDGET_USD"
          value = "10000"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/bedrock-orchestrator"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

# ECS Service - Bedrock Orchestrator
resource "aws_ecs_service" "bedrock_orchestrator" {
  name            = "bedrock-orchestrator"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.bedrock_orchestrator.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.bedrock_orchestrator.arn
    container_name   = "bedrock-orchestrator"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.main]
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "ai-foresight-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  tags = {
    Name        = "AI Foresight ALB"
    Environment = var.environment
  }
}

# Variables
variable "aws_region" {
  default = "us-east-1"
}

variable "environment" {
  default = "production"
}

variable "db_username" {
  sensitive = true
}

variable "db_password" {
  sensitive = true
}

variable "ecr_registry" {
  description = "ECR registry URL"
}
```

### Environment Variables for Production

Create `.env.production`:

```bash
# AWS Configuration
AWS_REGION=us-east-1

# Database
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/foresight
REDIS_URL=redis://elasticache-endpoint:6379/0

# Bedrock Configuration
COST_TRACKING_ENABLED=true
MONTHLY_BUDGET_USD=10000
ENABLE_MODEL_FALLBACK=true

# Security
PII_DETECTION_ENABLED=true
CONTENT_FILTERING_ENABLED=true
OUTPUT_VALIDATION_STRICT=true

# Observability
LOG_LEVEL=INFO
METRICS_ENABLED=true
TRACE_ENABLED=true

# Multi-tenancy
TENANT_ISOLATION_ENABLED=true
DEFAULT_TENANT_QUOTA_REQUESTS_PER_DAY=2000
```

### Deployment Steps

#### 1. Build Docker Images

```bash
# Build bedrock-orchestrator
cd backend/services/bedrock-orchestrator
docker build -t ai-foresight/bedrock-orchestrator:latest .

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
docker tag ai-foresight/bedrock-orchestrator:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/bedrock-orchestrator:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/bedrock-orchestrator:latest
```

#### 2. Deploy Infrastructure

```bash
cd infrastructure/terraform

# Initialize
terraform init

# Plan
terraform plan -out=tfplan

# Apply
terraform apply tfplan
```

#### 3. Deploy Frontend (Next.js)

```bash
# Option A: AWS Amplify
cd frontend/web-app
amplify init
amplify publish

# Option B: CloudFront + S3
npm run build
aws s3 sync out/ s3://your-frontend-bucket/
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## ⭐ Option 2: Simplified AWS (Lower Cost)

For smaller deployments or MVP:

```
Frontend: AWS Amplify
Backend: Lambda + API Gateway (serverless)
Database: RDS Serverless v2
Cache: ElastiCache Serverless
AI: AWS Bedrock
```

### Configuration

```yaml
# serverless.yml
service: ai-foresight-api

provider:
  name: aws
  runtime: python3.10
  region: us-east-1
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - bedrock:InvokeModel
          Resource: '*'

functions:
  orchestrator:
    handler: bedrock_orchestrator.handler
    timeout: 900  # 15 minutes
    memorySize: 2048
    events:
      - http:
          path: /execute
          method: post
    environment:
      AWS_REGION: ${self:provider.region}
      REDIS_URL: ${env:REDIS_URL}
      DATABASE_URL: ${env:DATABASE_URL}
```

Deploy:
```bash
serverless deploy
```

---

## ⭐ Option 3: Google Cloud Platform

### Architecture
```
Frontend: Cloud Run (Next.js container)
Backend: Cloud Run (Python services)
Database: Cloud SQL PostgreSQL
Cache: Memorystore Redis
AI: AWS Bedrock (via API)
```

### Deployment

```yaml
# cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: bedrock-orchestrator
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "10"
    spec:
      containers:
      - image: gcr.io/PROJECT_ID/bedrock-orchestrator
        ports:
        - containerPort: 8000
        env:
        - name: AWS_REGION
          value: "us-east-1"
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: access-key-id
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: secret-access-key
        resources:
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

Deploy:
```bash
gcloud run deploy bedrock-orchestrator \
  --image gcr.io/PROJECT_ID/bedrock-orchestrator \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 📊 Cost Estimates (Monthly)

### AWS Full Stack (Production)
- ECS Fargate (5 services, 2 instances each): ~$300
- RDS PostgreSQL (db.t3.medium, Multi-AZ): ~$150
- ElastiCache Redis: ~$30
- ALB: ~$25
- S3 + CloudFront: ~$50
- **Bedrock API usage**: ~$50-500 (depends on usage)
- **Total**: ~$600-1,050/month

### AWS Serverless (Smaller Scale)
- Lambda invocations: ~$50
- API Gateway: ~$20
- RDS Serverless v2: ~$80
- **Bedrock API usage**: ~$50-200
- **Total**: ~$200-350/month

### Google Cloud Run
- Cloud Run services: ~$100
- Cloud SQL: ~$120
- Memorystore: ~$40
- **Bedrock API**: ~$50-200
- **Total**: ~$310-460/month

---

## 🔐 Security Checklist

- [ ] Enable AWS WAF on ALB
- [ ] Configure VPC with private subnets
- [ ] Use AWS Secrets Manager for credentials
- [ ] Enable RDS encryption at rest
- [ ] Configure Security Groups (least privilege)
- [ ] Enable CloudTrail for audit logging
- [ ] Set up AWS GuardDuty
- [ ] Configure IAM roles (no access keys in code)
- [ ] Enable MFA for AWS console access
- [ ] Set up CloudWatch alerts
- [ ] Configure backup policies
- [ ] Enable SSL/TLS everywhere

---

## 📈 Monitoring & Observability

### CloudWatch Dashboards
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", {"stat": "Average"}],
          [".", "MemoryUtilization", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "ECS Performance"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Bedrock", "Invocations"],
          [".", "ModelInvocationLatency"]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Bedrock Usage"
      }
    }
  ]
}
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1

    - name: Login to ECR
      run: |
        aws ecr get-login-password --region us-east-1 | \
        docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY }}

    - name: Build and push Docker image
      run: |
        cd backend/services/bedrock-orchestrator
        docker build -t bedrock-orchestrator .
        docker tag bedrock-orchestrator:latest ${{ secrets.ECR_REGISTRY }}/bedrock-orchestrator:latest
        docker push ${{ secrets.ECR_REGISTRY }}/bedrock-orchestrator:latest

    - name: Deploy to ECS
      run: |
        aws ecs update-service \
          --cluster ai-foresight-cluster \
          --service bedrock-orchestrator \
          --force-new-deployment
```

---

## 📦 Summary: Recommended Deployment

**For Production:** AWS ECS/Fargate + RDS + Bedrock
- **Framework**: Python FastAPI (backend), Next.js (frontend)
- **Root Directory**: Monorepo with /backend and /frontend
- **Build Output**: Docker containers → ECR
- **Environment Variables**: AWS Systems Manager Parameter Store
- **Cost**: ~$600-1,050/month
- **Complexity**: Medium
- **Scalability**: High
- **Bedrock Integration**: Native (same AWS account)

**Next Steps:**
1. Set up AWS account and enable Bedrock
2. Create ECR repositories
3. Build Docker images
4. Deploy infrastructure with Terraform
5. Configure CI/CD with GitHub Actions
6. Deploy frontend to Amplify/CloudFront

Would you like me to create the complete deployment files (Dockerfiles, terraform configs, GitHub Actions workflows)?
