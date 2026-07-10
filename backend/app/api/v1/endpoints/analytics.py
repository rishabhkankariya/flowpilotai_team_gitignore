"""
Analytics API

Provides aggregated statistics about inbox submissions.
All queries are scoped to the currently authenticated user.
"""
import structlog
from typing import List
from fastapi import APIRouter, Query
from sqlalchemy import select, func, case, text

from app.api.deps import DBSession, CurrentUser
from app.db.models.inbox import InboxSubmission, WorkflowStatus
from app.schemas.analytics import (
    AnalyticsSummary,
    AgentBreakdown,
    DayBucket,
    AnalyticsByAgentResponse,
    AnalyticsByDayResponse,
)
from datetime import datetime, timedelta, timezone

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get(
    "/summary",
    response_model=AnalyticsSummary,
    summary="Get submission analytics summary for current user",
)
async def get_analytics_summary(
    db: DBSession,
    current_user: CurrentUser,
) -> AnalyticsSummary:
    """Returns high-level statistics for the current user's submissions."""
    result = await db.execute(
        select(
            func.count(InboxSubmission.id).label("total"),
            func.count(
                case((InboxSubmission.status == WorkflowStatus.completed, 1), else_=None)
            ).label("completed"),
            func.count(
                case((InboxSubmission.status == WorkflowStatus.failed, 1), else_=None)
            ).label("failed"),
            func.count(
                case((InboxSubmission.status == WorkflowStatus.pending, 1), else_=None)
            ).label("pending"),
            func.count(
                case((InboxSubmission.status == WorkflowStatus.processing, 1), else_=None)
            ).label("processing"),
            func.coalesce(func.avg(InboxSubmission.confidence_score), 0.0).label("avg_confidence"),
        ).where(InboxSubmission.user_id == current_user.id)
    )
    row = result.one()

    # By-agent counts
    agent_result = await db.execute(
        select(
            InboxSubmission.assigned_agent,
            func.count(InboxSubmission.id).label("cnt"),
        )
        .where(
            InboxSubmission.user_id == current_user.id,
            InboxSubmission.assigned_agent.isnot(None),
        )
        .group_by(InboxSubmission.assigned_agent)
    )
    by_agent = {}
    for r in agent_result:
        if r.assigned_agent is not None:
            by_agent[r.assigned_agent.value] = r.cnt

    return AnalyticsSummary(
        total_submissions=row.total,
        completed=row.completed,
        failed=row.failed,
        pending=row.pending,
        processing=row.processing,
        avg_confidence=float(row.avg_confidence),
        by_agent=by_agent,
    )


@router.get(
    "/by-agent",
    response_model=AnalyticsByAgentResponse,
    summary="Get per-agent analytics breakdown",
)
async def get_analytics_by_agent(
    db: DBSession,
    current_user: CurrentUser,
) -> AnalyticsByAgentResponse:
    result = await db.execute(
        select(
            InboxSubmission.assigned_agent,
            func.count(InboxSubmission.id).label("count"),
            func.coalesce(func.avg(InboxSubmission.confidence_score), 0.0).label("avg_confidence"),
            func.count(
                case((InboxSubmission.status == WorkflowStatus.completed, 1), else_=None)
            ).label("completed"),
            func.count(
                case((InboxSubmission.status == WorkflowStatus.failed, 1), else_=None)
            ).label("failed"),
        )
        .where(
            InboxSubmission.user_id == current_user.id,
            InboxSubmission.assigned_agent.isnot(None),
        )
        .group_by(InboxSubmission.assigned_agent)
        .order_by(func.count(InboxSubmission.id).desc())
    )

    agents = []
    for row in result:
        if row.assigned_agent is not None:
            agents.append(
                AgentBreakdown(
                    agent=row.assigned_agent.value,
                    count=row.count,
                    avg_confidence=float(row.avg_confidence),
                    completed=row.completed,
                    failed=row.failed,
                )
            )

    return AnalyticsByAgentResponse(agents=agents)


@router.get(
    "/by-day",
    response_model=AnalyticsByDayResponse,
    summary="Get daily submission counts",
)
async def get_analytics_by_day(
    db: DBSession,
    current_user: CurrentUser,
    days: int = Query(default=30, ge=1, le=90, description="Number of past days to include"),
) -> AnalyticsByDayResponse:
    """Returns daily submission counts for the last N days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(
            func.date_trunc("day", InboxSubmission.created_at).label("day"),
            func.count(InboxSubmission.id).label("cnt"),
        )
        .where(
            InboxSubmission.user_id == current_user.id,
            InboxSubmission.created_at >= since,
        )
        .group_by(text("day"))
        .order_by(text("day"))
    )

    # Build a complete day series (fill in missing days with 0)
    raw_buckets = {}
    for row in result:
        # row.day could be datetime or date depending on dialect
        day_str = row.day.strftime("%Y-%m-%d") if hasattr(row.day, "strftime") else str(row.day)[:10]
        raw_buckets[day_str] = row.cnt

    buckets: List[DayBucket] = []
    for i in range(days):
        day = (since + timedelta(days=i + 1)).strftime("%Y-%m-%d")
        buckets.append(DayBucket(date=day, count=raw_buckets.get(day, 0)))

    return AnalyticsByDayResponse(days=days, buckets=buckets)
