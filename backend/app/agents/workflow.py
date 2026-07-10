from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.inbox import InboxSubmission, WorkflowStatus


async def run_inbox_workflow(
    submission: InboxSubmission, db: AsyncSession
) -> None:
    """Mock background workflow runner stub."""
    submission.status = WorkflowStatus.completed
    submission.detected_intent = "sales"
    submission.confidence_score = 0.95
    submission.assigned_agent = "sales"
    submission.result = {"message": "Success: Stub workflow completed."}
