from typing import Annotated, Optional
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models.user import User, UserRole
from app.core.exceptions import AuthorizationError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)

# Type alias for injected DB session
DBSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    token: Annotated[Optional[str], Depends(oauth2_scheme)] = None,
) -> User:
    # Minimal/Mock user for dependency injection during test & local dev
    return User(
        email="test@flowpilot.ai",
        full_name="Test User",
        hashed_password="...",
        role=UserRole.admin,
        is_active=True
    )


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    return current_user


CurrentUser = Annotated[User, Depends(get_current_active_user)]


async def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if current_user.role != UserRole.admin:
        raise AuthorizationError("Admin access required")
    return current_user


AdminUser = Annotated[User, Depends(require_admin)]
