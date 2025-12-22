"""Action and action plan models."""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from uuid import UUID, uuid4


class Action(BaseModel):
    """A strategic action recommendation."""
    id: UUID = Field(default_factory=uuid4)
    title: str
    description: str
    rationale: str
    timeframe: str  # 0-6 months, 6-12 months, 1-2 years, etc.
    effort: str  # low, medium, high
    impact: float = Field(ge=0.0, le=1.0)
    scenarios: List[UUID] = Field(default_factory=list, description="Scenario IDs this applies to")
    prerequisites: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    dependencies: List[UUID] = Field(default_factory=list)
    status: str = "proposed"  # proposed, approved, in-progress, completed, rejected
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RobustAction(BaseModel):
    """An action that performs well across multiple scenarios."""
    id: UUID = Field(default_factory=uuid4)
    action: str
    rationale: str
    robustness_score: float = Field(ge=0.0, le=1.0, description="How well it works across scenarios")
    scenario_coverage: List[UUID] = Field(default_factory=list, description="Scenarios where this is beneficial")
    timeframe: str
    priority: str  # critical, high, medium, low
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ConditionalAction(BaseModel):
    """An action triggered by specific signposts or conditions."""
    id: UUID = Field(default_factory=uuid4)
    action: str
    trigger_signposts: List[UUID] = Field(default_factory=list)
    trigger_conditions: List[str] = Field(default_factory=list)
    scenario_id: UUID
    timeframe: str
    prepared: bool = False  # Whether contingency is prepared
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ActionPlan(BaseModel):
    """Complete action plan for a scenario or scenario set."""
    id: UUID = Field(default_factory=uuid4)
    scenario_set_id: UUID
    scenario_id: Optional[UUID] = None  # If specific to one scenario
    robust_actions: List[RobustAction] = Field(default_factory=list)
    scenario_specific_actions: List[Action] = Field(default_factory=list)
    conditional_actions: List[ConditionalAction] = Field(default_factory=list)
    risks: List[Dict[str, str]] = Field(default_factory=list)
    opportunities: List[Dict[str, str]] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "example": {
                "scenario_set_id": "set_123",
                "robust_actions": [
                    {
                        "action": "Diversify supply chain sources",
                        "rationale": "Reduces risk in multiple future scenarios",
                        "robustness_score": 0.9,
                        "timeframe": "0-12 months",
                        "priority": "critical"
                    }
                ]
            }
        }
