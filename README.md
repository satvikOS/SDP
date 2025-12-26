# AI-Driven Strategic Foresight Platform

A fully AI-powered scenario planning platform using Anthropic Claude for automated strategic foresight, horizon scanning, and decision support across multiple industries.

## 🚀 Deployment Status

**Backend:** ✅ Live at `https://33kvywy84h.execute-api.us-east-1.amazonaws.com`
**Frontend:** 🚀 Deploying with API connection fix...
**Branch:** `claude/ai-foresight-platform-yEVtZ`
**Last Updated:** 2025-12-26

## 🎯 Overview

This platform automates the strategic foresight process by:
- **Continuously scanning** millions of data signals from global sources
- **Using AI agents** powered by AWS Bedrock (Claude, Llama, Titan, Cohere, and more) to synthesize insights, identify drivers, and generate scenarios
- **Intelligent multi-model orchestration** with automatic model selection and fallback for optimal cost and performance
- **Providing real-time monitoring** of scenario signposts and likelihood updates
- **Recommending robust actions** that work across multiple future scenarios
- **Serving enterprise clients** across defense, energy, healthcare, finance, technology, commodities, and consumer sectors

### 🚀 Key Innovation: AWS Bedrock Multi-Model AI

Unlike traditional single-model systems, this platform uses **AWS Bedrock** to orchestrate multiple AI models:
- **Claude Sonnet 4.5** for complex reasoning and scenario construction
- **Claude Haiku 3.5** for fast, cost-effective analytical tasks
- **Llama 70B** as intelligent fallback for complex tasks
- **Amazon Titan** for embeddings and simple text generation
- **Cohere** and **AI21** for specialized capabilities
- **Automatic failover** when primary models are unavailable
- **Cost optimization** by matching model capability to task complexity

## 🏗️ Architecture

### Microservices-Based Design

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌────────────┬────────────┬────────────┬────────────┐      │
│  │ Dashboard  │ Scenarios  │  Signals   │  Actions   │      │
│  └────────────┴────────────┴────────────┴────────────┘      │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST/GraphQL API
┌───────────────────────────┴─────────────────────────────────┐
│                      API Gateway                             │
└─────────────┬─────────────┬────────────┬────────────────────┘
              │             │            │
     ┌────────┴────┐ ┌──────┴──────┐ ┌──┴────────┐
     │             │ │             │ │           │
┌────▼──────┐ ┌───▼─────┐ ┌───▼────┐ ┌▼──────────┐
│ Ingestion │ │ Signal  │ │ Trend  │ │  Claude   │
│  Service  │ │ Service │ │Service │ │Orchestrator│
└─────┬─────┘ └────┬────┘ └───┬────┘ └─────┬─────┘
      │            │            │            │
┌─────▼─────────────▼────────────▼────────────▼──────┐
│              Data Lake + Vector Store               │
│         (S3/Iceberg + pgvector/Pinecone)            │
└────────────────────────────────────────────────────┘
```

### Core Services

1. **Ingestion Service** - Connects to data sources and ingests evidence
2. **Enrichment Service** - Normalizes, extracts entities, and enriches data
3. **Signal Service** - Detects patterns and weak signals
4. **Trend Service** - Time-series forecasting and trend analysis
5. **Vector Service** - Embeddings and RAG retrieval
6. **Claude Orchestrator** - AI agent orchestration with Anthropic Claude
7. **Scenario Engine** - Scenario generation and management
8. **Monitoring Service** - Signpost tracking and alerts
9. **Action Planner** - Strategic recommendations
10. **Audit Service** - Governance and compliance

## 🤖 AI Agent Architecture

The platform uses **7 specialized Claude agents**, each with tailored prompts and output schemas:

### Agent Types

1. **Signal Synthesizer** - Analyzes clustered signals to identify emerging themes
2. **Driver Extractor** - Identifies key driving forces and critical uncertainties
3. **Scenario Constructor** - Creates coherent scenario frameworks and logics
4. **Narrative Generator** - Writes rich, evidence-based scenario narratives
5. **Signpost Designer** - Designs monitoring indicators for scenarios
6. **Action Planner** - Recommends robust and contingent strategic actions
7. **Quality Critic** - Reviews scenario sets for quality, consistency, and completeness

### Agent Workflow

```
Evidence Data → Signal Synthesizer → Emerging Themes
                                         ↓
                                    Driver Extractor → Key Drivers + Uncertainties
                                                           ↓
                                                   Scenario Constructor → Scenario Logics
                                                                             ↓
                                                                       Narrative Generator → Rich Narratives
                                                                                                ↓
                                                                                          Signpost Designer → Monitoring Framework
                                                                                                                  ↓
                                                                                                             Action Planner → Strategic Recommendations
                                                                                                                                  ↓
                                                                                                                           Quality Critic → Validated Output
```

## 📊 Data Models

### Core Entities

- **Evidence** - Raw data from sources (news, research, patents, economic data)
- **Signal** - Detected patterns or weak signals
- **Trend** - Time-series trends with forecasts
- **Driver** - Key forces shaping the future
- **Uncertainty** - Critical uncertainties for scenario planning
- **Scenario** - Plausible future scenario with narrative
- **ScenarioSet** - Complete set of scenarios exploring uncertainty space
- **Signpost** - Monitoring indicator for scenario likelihood
- **Action** - Strategic recommendation
- **ActionPlan** - Complete action plan with robust and contingent actions

See `/backend/shared/models/` for full schema definitions.

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 15+ (with pgvector extension)
- Redis
- **AWS Account with Bedrock access** (primary option)
- *OR* Anthropic API key (alternative option)

### Installation

#### 1. Clone and Setup

```bash
git clone <repo-url>
cd SDP

# Backend setup - AWS Bedrock Orchestrator (Recommended)
cd backend/services/bedrock-orchestrator
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and configure AWS credentials
```

#### 2. Configure AWS Bedrock (Recommended)

```bash
# .env file
AWS_REGION=us-east-1
# Use IAM role (recommended) or access keys
# AWS_ACCESS_KEY_ID=your_key
# AWS_SECRET_ACCESS_KEY=your_secret

COST_TRACKING_ENABLED=true
MONTHLY_BUDGET_USD=10000
ENABLE_MODEL_FALLBACK=true
```

**Enable models in AWS Bedrock Console**:
- Anthropic: Claude Sonnet 4.5, Haiku 3.5
- Amazon: Titan Text, Titan Embeddings
- Meta: Llama 3.1 70B
- Others: Cohere, AI21

See [BEDROCK_DEPLOYMENT.md](docs/guides/BEDROCK_DEPLOYMENT.md) for detailed setup.

#### Alternative: Direct Anthropic API

```bash
cd backend/services/claude-orchestrator
pip install -r requirements.txt
cp .env.example .env
# Add ANTHROPIC_API_KEY=your_key
```

#### 3. Run Orchestrator

```bash
# Bedrock (recommended)
cd backend/services/bedrock-orchestrator
python multi_model_orchestrator.py

# OR Claude direct
cd backend/services/claude-orchestrator
python api.py
```

#### 4. Test the API

```bash
curl http://localhost:8001/health
curl http://localhost:8001/agents
```

### Example: Running an Agent

```python
import httpx
import asyncio

async def test_agent():
    async with httpx.AsyncClient() as client:
        # Prepare request
        request = {
            "agent_type": "signal_synthesizer",
            "context": {
                "signals": "...",  # Signal data
                "evidence": "...",  # Evidence data
                "industry": "Energy",
                "region": "Global",
                "horizon": "2030"
            }
        }

        # Call orchestrator
        response = await client.post(
            "http://localhost:8001/execute",
            json=request,
            timeout=60.0
        )

        result = response.json()
        print(f"Agent output: {result['output']}")
        print(f"Tokens used: {result['tokens_used']}")
        print(f"Citations: {result['citations_count']}")

asyncio.run(test_agent())
```

## 📁 Project Structure

```
SDP/
├── backend/
│   ├── services/
│   │   ├── claude-orchestrator/      # Claude AI orchestration
│   │   │   ├── agents.py             # Agent definitions & prompts
│   │   │   ├── orchestrator.py       # Core orchestrator
│   │   │   ├── api.py                # FastAPI service
│   │   │   ├── config.py             # Configuration
│   │   │   └── requirements.txt
│   │   ├── ingestion-service/        # Data ingestion
│   │   │   └── connectors/           # Data source connectors
│   │   ├── vector-service/           # RAG and embeddings
│   │   │   └── rag.py                # Context builder
│   │   └── [other services]/
│   └── shared/
│       ├── models/                   # Pydantic data models
│       │   ├── evidence.py
│       │   ├── signal.py
│       │   ├── trend.py
│       │   ├── driver.py
│       │   ├── scenario.py
│       │   └── action.py
│       ├── schemas/                  # JSON schemas
│       └── utils/                    # Shared utilities
├── frontend/
│   └── web-app/                      # Next.js application
├── infrastructure/
│   ├── kubernetes/                   # K8s manifests
│   ├── terraform/                    # IaC
│   └── docker/                       # Dockerfiles
├── ai/
│   ├── prompts/                      # Claude prompt templates
│   ├── agents/                       # Agent configurations
│   └── evaluation/                   # Model evaluation
└── docs/
    ├── architecture/                 # Architecture docs
    ├── api/                          # API documentation
    └── guides/                       # User guides
```

## 🔧 Configuration

### Claude Orchestrator Settings

| Parameter | Default | Description |
|-----------|---------|-------------|
| `anthropic_api_key` | - | Anthropic API key (required) |
| `anthropic_default_model` | claude-sonnet-4-5-20250929 | Primary model |
| `anthropic_fast_model` | claude-haiku-3-5-20241022 | Fast model for simple tasks |
| `anthropic_max_tokens` | 4096 | Max output tokens |
| `cache_enabled` | true | Enable semantic caching |
| `cache_ttl_seconds` | 3600 | Cache TTL |
| `pii_detection_enabled` | true | PII detection in inputs |
| `output_validation_strict` | true | Strict JSON schema validation |
| `log_prompts` | true | Log prompts for debugging |
| `log_outputs` | true | Log outputs for audit |

## 🛡️ Security & Guardrails

### Implemented Safeguards

1. **PII Detection** - Scans input context for personally identifiable information
2. **Input Sanitization** - Removes potential prompt injection attempts
3. **Output Validation** - Validates against JSON schemas
4. **Rate Limiting** - Per-tenant quotas and rate limits
5. **Audit Logging** - Complete audit trail of all AI interactions
6. **Citation Enforcement** - Ensures all claims are evidence-backed
7. **Tenant Isolation** - Multi-tenant data segregation

### Data Privacy

- All prompts and outputs are logged with hash identifiers
- Context hashing for privacy-preserving caching
- Optional on-premise deployment for sensitive clients
- GDPR/CCPA compliance ready

## 📈 Observability

### Metrics Tracked

- Request latency by agent type
- Token usage (input/output)
- Cache hit rates
- Citation counts
- Validation pass/fail rates
- Error rates and types

### Logging

Structured JSON logging with:
- Request/trace IDs
- Tenant/user IDs
- Agent types
- Token counts
- Latencies
- Errors and stack traces

## 🧪 Testing

### Unit Tests

```bash
pytest backend/services/claude-orchestrator/tests/
```

### Integration Tests

```bash
pytest backend/tests/integration/
```

### Agent Quality Tests

```bash
pytest ai/evaluation/
```

## 📚 API Documentation

Once the orchestrator is running, access:

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/agents` | GET | List available agents |
| `/execute` | POST | Execute an agent |
| `/metrics` | GET | Service metrics |

## 🎓 Usage Patterns

### Scenario Generation Workflow

```python
# 1. Synthesize signals into themes
themes_response = await orchestrator.execute({
    "agent_type": "signal_synthesizer",
    "context": {...}
})

# 2. Extract drivers and uncertainties
drivers_response = await orchestrator.execute({
    "agent_type": "driver_extractor",
    "context": {
        "themes": themes_response['output']['themes'],
        ...
    }
})

# 3. Construct scenarios
scenarios_response = await orchestrator.execute({
    "agent_type": "scenario_constructor",
    "context": {
        "drivers": drivers_response['output']['drivers'],
        "uncertainties": drivers_response['output']['critical_uncertainties'],
        ...
    }
})

# 4. Generate narratives for each scenario
for scenario in scenarios_response['output']['scenarios']:
    narrative_response = await orchestrator.execute({
        "agent_type": "narrative_generator",
        "context": {
            "title": scenario['title'],
            "logic": scenario['core_logic'],
            ...
        }
    })

# 5. Design signposts
signposts_response = await orchestrator.execute({
    "agent_type": "signpost_designer",
    "context": {...}
})

# 6. Generate action plan
actions_response = await orchestrator.execute({
    "agent_type": "action_planner",
    "context": {
        "scenarios": [...],
        ...
    }
})

# 7. Quality check
quality_response = await orchestrator.execute({
    "agent_type": "quality_critic",
    "context": {
        "scenario_set": {...},
        ...
    }
})
```

## 🌍 Industry Use Cases

### Energy Sector

Generate scenarios for energy transition, renewable adoption, policy changes, and technology breakthroughs.

### Healthcare & Pharma

Plan for pandemic preparedness, personalized medicine, regulatory changes, and demographic shifts.

### Finance & Banking

Model macroeconomic scenarios, regulatory changes, fintech disruption, and market volatility.

### Defense & Security

Explore geopolitical scenarios, technological warfare, alliance shifts, and security threats.

### Technology & Telecom

Anticipate platform shifts, AI disruption, quantum computing, and regulatory impacts.

### Consumer & Retail

Track consumer behavior shifts, sustainability trends, economic cycles, and market disruptions.

## 🔄 Development Roadmap

### Phase 1: MVP (Current)
- [x] Core data models
- [x] Claude orchestrator with 7 agents
- [x] Data ingestion connectors
- [x] RAG context builder
- [ ] Basic frontend UI
- [ ] Scenario generation pipeline

### Phase 2: Beta
- [ ] Real-time data streaming
- [ ] Signpost monitoring service
- [ ] Alert system
- [ ] Multi-tenant isolation
- [ ] Enterprise authentication

### Phase 3: Enterprise v1
- [ ] Licensed data integrations
- [ ] Advanced visualizations
- [ ] Export/reporting tools
- [ ] Integration APIs
- [ ] On-premise deployment option

### Phase 4: Scale
- [ ] Industry-specific modules
- [ ] Advanced simulation
- [ ] Action automation
- [ ] Global expansion

## 🤝 Contributing

This is an internal project. For questions or contributions, contact the core team.

## 📄 License

Copyright © 2025. All rights reserved.

## 🙏 Acknowledgments

- Built with [Anthropic Claude](https://www.anthropic.com/claude)
- Strategic foresight methodology adapted from industry best practices
- Inspired by leading scenario planning frameworks

## 📞 Support

For technical support:
- Open an issue in the repository
- Contact the development team
- Check documentation in `/docs`

---

**Built for the future, powered by AI.**
