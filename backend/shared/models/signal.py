"""Signal and cluster models."""

from datetime import datetime
from typing import List, Dict, Any, Optional
from enum import Enum
from pydantic import BaseModel, Field
from uuid import UUID, uuid4


class SignalStrength(str, Enum):
    """Strength of a signal."""
    WEAK = "weak"
    MODERATE = "moderate"
    STRONG = "strong"


class Signal(BaseModel):
    """An identified signal from horizon scanning."""
    id: UUID = Field(default_factory=uuid4)
    title: str
    description: str
    strength: SignalStrength
    evidence_ids: List[UUID] = Field(default_factory=list)
    first_detected: datetime
    last_updated: datetime
    trajectory: str  # emerging, strengthening, weakening, plateauing
    impact_score: float = Field(ge=0.0, le=1.0)
    uncertainty_score: float = Field(ge=0.0, le=1.0)
    timeframe: str  # near-term, mid-term, long-term
    industries: List[str] = Field(default_factory=list)
    regions: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "223e4567-e89b-12d3-a456-426614174000",
                "title": "Accelerating EV adoption in China",
                "description": "Multiple data points suggest rapid EV market penetration...",
                "strength": "strong",
                "evidence_ids": ["ev_001", "ev_002"],
                "first_detected": "2025-01-15T00:00:00Z",
                "last_updated": "2025-12-22T10:00:00Z",
                "trajectory": "strengthening",
                "impact_score": 0.8,
                "uncertainty_score": 0.3,
                "timeframe": "near-term",
                "industries": ["automotive", "energy"],
                "regions": ["Asia", "China"],
                "tags": ["electric vehicles", "clean tech"]
            }
        }


class SignalCluster(BaseModel):
    """A cluster of related signals forming a theme."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: str
    signal_ids: List[UUID] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    coherence_score: float = Field(ge=0.0, le=1.0)  # how well signals cluster
    metadata: Dict[str, Any] = Field(default_factory=dict)
