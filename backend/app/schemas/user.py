import uuid
from datetime import datetime
from pydantic import BaseModel
from app.db.models.user import UserRole


class UserResponse(BaseModel):
    """Public user profile returned by API endpoints."""
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
