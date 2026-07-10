# Re-export all models so Alembic's env.py can discover them
from app.db.models.user import User, UserRole
from app.db.models.inbox import InboxSubmission, AgentType, WorkflowStatus

__all__ = [
    "User",
    "UserRole",
    "InboxSubmission",
    "AgentType",
    "WorkflowStatus",
]
