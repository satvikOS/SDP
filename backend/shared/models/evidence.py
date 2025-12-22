"""Evidence and source models."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel, Field
from uuid import UUID, uuid4


class EvidenceSourceType(str, Enum):
    """Types of evidence sources."""
    NEWS = "news"
    RESEARCH = "research"
    PATENT = "patent"
    ECONOMIC_DATA = "economic_data"
    SOCIAL_MEDIA = "social_media"
    INTERNAL = "internal"
    LICENSED = "licensed"


class EvidenceSource(BaseModel):
    """Source of evidence."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    type: EvidenceSourceType
    url: Optional[str] = None
    credibility_score: float = Field(ge=0.0, le=1.0, default=0.5)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Evidence(BaseModel):
    """A piece of evidence from data sources."""
    id: UUID = Field(default_factory=uuid4)
    content: str
    summary: Optional[str] = None
    source: EvidenceSource
    timestamp: datetime
    relevance_score: float = Field(ge=0.0, le=1.0)
    entities: List[str] = Field(default_factory=list)
    topics: List[str] = Field(default_factory=list)
    sentiment: Optional[float] = Field(None, ge=-1.0, le=1.0)
    region: Optional[str] = None
    industry: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    embedding: Optional[List[float]] = None  # Vector embedding for RAG

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "content": "EU passes comprehensive carbon pricing legislation...",
                "summary": "EU carbon pricing expansion",
                "source": {
                    "name": "Reuters",
                    "type": "news",
                    "url": "https://reuters.com/article/123",
                    "credibility_score": 0.9
                },
                "timestamp": "2025-12-22T10:00:00Z",
                "relevance_score": 0.85,
                "entities": ["European Union", "Carbon Pricing"],
                "topics": ["climate policy", "regulation"],
                "sentiment": 0.2,
                "region": "Europe",
                "industry": "energy"
            }
        }
