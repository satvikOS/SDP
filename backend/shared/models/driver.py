"""Driver and uncertainty models."""

from typing import List, Dict, Any
from pydantic import BaseModel, Field
from uuid import UUID, uuid4


class Driver(BaseModel):
    """A key driving force shaping the future."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: str
    impact: float = Field(ge=0.0, le=1.0, description="Potential impact on future")
    uncertainty: float = Field(ge=0.0, le=1.0, description="Level of uncertainty")
    timeframe: str  # near-term, mid-term, long-term
    category: str  # technological, economic, political, social, environmental
    evidence_ids: List[UUID] = Field(default_factory=list)
    trend_ids: List[UUID] = Field(default_factory=list)
    signal_ids: List[UUID] = Field(default_factory=list)
    industries: List[str] = Field(default_factory=list)
    regions: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "323e4567-e89b-12d3-a456-426614174000",
                "name": "Carbon policy stringency",
                "description": "The pace and strictness of climate regulations globally",
                "impact": 0.9,
                "uncertainty": 0.8,
                "timeframe": "mid-term",
                "category": "political",
                "evidence_ids": ["ev_123", "ev_987"],
                "industries": ["energy", "manufacturing", "transportation"],
                "regions": ["Global"]
            }
        }


class Uncertainty(BaseModel):
    """A critical uncertainty for scenario planning."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: str
    axis: str  # X or Y for 2x2 matrix, or other for multi-dimensional
    poles: List[str] = Field(min_length=2, max_length=2, description="Two extreme outcomes")
    driver_ids: List[UUID] = Field(default_factory=list)
    rationale: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Policy speed",
                "description": "How quickly climate policies are adopted globally",
                "axis": "X",
                "poles": ["Slow adoption", "Rapid adoption"],
                "rationale": "This uncertainty has high impact and is genuinely unpredictable"
            }
        }
