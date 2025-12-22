"""Scenario and scenario set models."""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from uuid import UUID, uuid4


class QuantitativeAssumption(BaseModel):
    """A quantitative assumption in a scenario."""
    metric: str
    year: int
    value: float
    confidence: float = Field(ge=0.0, le=1.0)
    unit: Optional[str] = None


class Signpost(BaseModel):
    """An indicator to monitor for scenario likelihood."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: str
    type: str  # metric, event, threshold
    threshold: Optional[str] = None
    cadence: str  # daily, weekly, monthly, quarterly
    query: Optional[str] = None  # Monitoring query
    status: str = "active"  # active, triggered, dormant
    last_checked: Optional[datetime] = None
    triggered_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Carbon price adoption count",
                "description": "Number of countries with carbon pricing mechanisms",
                "type": "metric",
                "threshold": ">= 25 countries",
                "cadence": "monthly",
                "status": "active"
            }
        }


class Citation(BaseModel):
    """A citation linking to evidence."""
    evidence_id: UUID
    quote: str
    source: str
    timestamp: datetime
    page: Optional[str] = None


class Scenario(BaseModel):
    """A single plausible future scenario."""
    id: UUID = Field(default_factory=uuid4)
    title: str
    narrative: str  # Rich narrative description
    summary: Optional[str] = None
    uncertainty_positions: Dict[str, str] = Field(default_factory=dict)  # {axis: pole}
    quant_assumptions: List[QuantitativeAssumption] = Field(default_factory=list)
    signposts: List[Signpost] = Field(default_factory=list)
    citations: List[Citation] = Field(default_factory=list)
    likelihood: float = Field(default=0.25, ge=0.0, le=1.0)
    implications: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ScenarioHorizon(BaseModel):
    """Time horizon for scenarios."""
    near_term_months: int
    long_term_years: int


class ScenarioScope(BaseModel):
    """Scope definition for scenario set."""
    industry: str
    regions: List[str] = Field(default_factory=list)
    horizon: ScenarioHorizon
    focus_areas: List[str] = Field(default_factory=list)
    constraints: Dict[str, Any] = Field(default_factory=dict)


class ScenarioSet(BaseModel):
    """A complete set of scenarios exploring uncertainties."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: str
    scope: ScenarioScope
    drivers: List[UUID] = Field(default_factory=list, description="Driver IDs")
    critical_uncertainties: List[UUID] = Field(default_factory=list, description="Uncertainty IDs")
    scenarios: List[Scenario] = Field(default_factory=list)
    version: int = 1
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None
    tenant_id: Optional[UUID] = None
    status: str = "draft"  # draft, published, archived
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Global Energy Transition 2035",
                "description": "Scenarios exploring energy futures to 2035",
                "scope": {
                    "industry": "Energy",
                    "regions": ["Global"],
                    "horizon": {"near_term_months": 24, "long_term_years": 10}
                },
                "status": "published"
            }
        }
