"""FastAPI service for Claude Orchestrator."""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import logging

from orchestrator import orchestrator, OrchestratorRequest, OrchestratorResponse
from agents import AgentType
from config import settings

# Configure logging
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AI Foresight Platform - Claude Orchestrator",
    description="Orchestration service for Claude-powered scenario planning agents",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "claude-orchestrator",
        "version": "0.1.0"
    }


@app.get("/agents")
async def list_agents():
    """List available agent types."""
    return {
        "agents": [agent.value for agent in AgentType],
        "descriptions": {
            AgentType.SIGNAL_SYNTHESIZER.value: "Synthesize signals into emerging themes",
            AgentType.DRIVER_EXTRACTOR.value: "Extract key drivers and uncertainties",
            AgentType.SCENARIO_CONSTRUCTOR.value: "Construct scenario frameworks",
            AgentType.NARRATIVE_GENERATOR.value: "Generate rich scenario narratives",
            AgentType.SIGNPOST_DESIGNER.value: "Design monitoring signposts",
            AgentType.ACTION_PLANNER.value: "Plan strategic actions",
            AgentType.QUALITY_CRITIC.value: "Critique scenario quality"
        }
    }


@app.post("/execute", response_model=OrchestratorResponse)
async def execute_agent(request: OrchestratorRequest, background_tasks: BackgroundTasks):
    """Execute a Claude agent."""
    try:
        logger.info(f"Received request for agent: {request.agent_type.value}")

        # Execute orchestrator
        response = await orchestrator.execute(request)

        # Log metrics in background
        background_tasks.add_task(log_metrics, response)

        return response

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Internal error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


def log_metrics(response: OrchestratorResponse):
    """Log metrics for observability (background task)."""
    logger.info(f"Metrics - Agent: {response.agent_type.value}, "
               f"Tokens: {response.tokens_used}, "
               f"Latency: {response.latency_ms}ms, "
               f"Citations: {response.citations_count}, "
               f"Cached: {response.cached}")
    # In production, send to metrics system (Prometheus, DataDog, etc.)


@app.get("/metrics")
async def get_metrics():
    """Get service metrics."""
    # In production, integrate with proper metrics system
    return {
        "cache_size": len(orchestrator.cache),
        "cache_enabled": settings.cache_enabled,
        "pii_detection_enabled": settings.pii_detection_enabled
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
