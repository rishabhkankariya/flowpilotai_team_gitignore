import pytest
import uuid
import datetime
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from main import app
from app.db.session import get_db
from app.db.models.user import User, UserRole

client = TestClient(app)


@pytest.fixture(autouse=True)
def override_auth():
    from app.api.deps import get_current_user
    from app.db.models.user import User, UserRole

    async def mock_get_current_user():
        return User(
            email="test@flowpilot.ai",
            full_name="Test User",
            hashed_password="...",
            role=UserRole.admin,
            is_active=True
        )

    app.dependency_overrides[get_current_user] = mock_get_current_user
    yield
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]


@pytest.mark.asyncio
async def test_admin_reset_demo():
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.rowcount = 5
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = client.post("/api/v1/admin/reset-demo")
        assert response.status_code == 200
        data = response.json()
        assert data["operation"] == "reset_demo"
        assert data["deleted_rows"] == 5
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_seed_demo():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock()

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = client.post("/api/v1/admin/seed-demo")
        assert response.status_code == 201
        data = response.json()
        assert data["operation"] == "seed_demo"
        assert data["seeded_rows"] == 5
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_list_users():
    mock_db = AsyncMock()
    mock_user = User(
        id=uuid.uuid4(),
        email="user@flowpilot.ai",
        full_name="Regular User",
        hashed_password="...",
        role=UserRole.user,
        is_active=True,
        created_at=datetime.datetime.now(datetime.timezone.utc),
        updated_at=datetime.datetime.now(datetime.timezone.utc),
    )
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_user]
    mock_db.execute = AsyncMock(return_value=mock_result)

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = client.get("/api/v1/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["email"] == "user@flowpilot.ai"
        assert data[0]["role"] == "user"
    finally:
        app.dependency_overrides.clear()
