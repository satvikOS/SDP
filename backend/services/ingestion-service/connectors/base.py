"""Base connector interface for data ingestion."""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import UUID
import sys
import os

# Add parent directory to path to import shared models
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))
from shared.models.evidence import Evidence, EvidenceSource, EvidenceSourceType


class DataConnector(ABC):
    """Base class for all data connectors."""

    def __init__(self, source_type: EvidenceSourceType, config: Dict[str, Any]):
        """Initialize connector."""
        self.source_type = source_type
        self.config = config
        self.source_name = config.get("name", "Unknown")

    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to data source."""
        pass

    @abstractmethod
    async def fetch(
        self,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Evidence]:
        """Fetch evidence from source."""
        pass

    @abstractmethod
    async def disconnect(self):
        """Close connection."""
        pass

    def create_evidence(
        self,
        content: str,
        summary: Optional[str],
        url: Optional[str],
        timestamp: datetime,
        metadata: Dict[str, Any]
    ) -> Evidence:
        """Helper to create evidence object."""
        source = EvidenceSource(
            name=self.source_name,
            type=self.source_type,
            url=url,
            credibility_score=self.config.get("credibility_score", 0.5),
            metadata=metadata
        )

        return Evidence(
            content=content,
            summary=summary,
            source=source,
            timestamp=timestamp,
            relevance_score=0.5,  # Will be calculated later
            entities=[],  # Will be extracted later
            topics=[],  # Will be extracted later
            region=metadata.get("region"),
            industry=metadata.get("industry"),
            metadata=metadata
        )


class StreamingConnector(DataConnector):
    """Base class for real-time streaming connectors."""

    @abstractmethod
    async def stream(self, callback):
        """Stream data in real-time with callback."""
        pass
