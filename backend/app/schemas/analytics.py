from typing import Dict, List, Optional
from pydantic import BaseModel


class AgentBreakdown(BaseModel):
    agent: str
    count: int
    avg_confidence: float
    completed: int
    failed: int


class DayBucket(BaseModel):
    date: str          # ISO date string "YYYY-MM-DD"
    count: int


class AnalyticsSummary(BaseModel):
    total_submissions: int
    completed: int
    failed: int
    pending: int
    processing: int
    avg_confidence: float
    by_agent: Dict[str, int]


class AnalyticsByAgentResponse(BaseModel):
    agents: List[AgentBreakdown]


class AnalyticsByDayResponse(BaseModel):
    days: int
    buckets: List[DayBucket]
