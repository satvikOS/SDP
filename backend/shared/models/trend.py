"""Trend and forecast models."""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from uuid import UUID, uuid4


class TrendDataPoint(BaseModel):
    """A single data point in a trend."""
    timestamp: datetime
    value: float
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Trend(BaseModel):
    """A detected trend in data."""
    id: UUID = Field(default_factory=uuid4)
    name: str
    description: str
    metric: str  # What is being measured
    unit: Optional[str] = None
    data_points: List[TrendDataPoint] = Field(default_factory=list)
    direction: str  # increasing, decreasing, stable, volatile
    strength: float = Field(ge=0.0, le=1.0)  # statistical significance
    change_rate: Optional[float] = None  # rate of change
    inflection_detected: bool = False
    signal_ids: List[UUID] = Field(default_factory=list)
    industries: List[str] = Field(default_factory=list)
    regions: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ForecastPoint(BaseModel):
    """A forecasted point in time."""
    timestamp: datetime
    value: float
    confidence_interval_low: float
    confidence_interval_high: float
    confidence: float = Field(ge=0.0, le=1.0)


class TrendForecast(BaseModel):
    """Forecast for a trend."""
    id: UUID = Field(default_factory=uuid4)
    trend_id: UUID
    model_type: str  # prophet, lstm, arima, etc.
    forecast_points: List[ForecastPoint] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    created_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)
