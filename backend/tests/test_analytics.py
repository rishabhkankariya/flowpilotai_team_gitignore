import pytest
import datetime
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from main import app
from app.db.session import get_db
from app.db.models.inbox import AgentType, WorkflowStatus

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
async def test_analytics_summary_route():
    mock_db = AsyncMock()

    # Mock row output for the general stats query
    mock_row = MagicMock()
    mock_row.total = 10
    mock_row.completed = 6
    mock_row.failed = 2
    mock_row.pending = 1
    mock_row.processing = 1
    mock_row.avg_confidence = 0.85

    # Mock agent count rows
    mock_agent_row1 = MagicMock()
    mock_agent_row1.assigned_agent = AgentType.sales
    mock_agent_row1.cnt = 4

    mock_agent_row2 = MagicMock()
    mock_agent_row2.assigned_agent = AgentType.support
    mock_agent_row2.cnt = 6

    # Set up db execute mock to yield these results sequentially
    mock_db.execute = AsyncMock()
    mock_db.execute.side_effect = [
        MagicMock(one=MagicMock(return_value=mock_row)),
        [mock_agent_row1, mock_agent_row2]
    ]

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = client.get("/api/v1/analytics/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total_submissions"] == 10
        assert data["completed"] == 6
        assert data["failed"] == 2
        assert data["avg_confidence"] == 0.85
        assert data["by_agent"]["sales"] == 4
        assert data["by_agent"]["support"] == 6
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_analytics_by_agent_route():
    mock_db = AsyncMock()
    mock_row = MagicMock()
    mock_row.assigned_agent = AgentType.sales
    mock_row.count = 5
    mock_row.avg_confidence = 0.9
    mock_row.completed = 4
    mock_row.failed = 1

    mock_db.execute = AsyncMock(return_value=[mock_row])

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        response = client.get("/api/v1/analytics/by-agent")
        assert response.status_code == 200
        data = response.json()
        assert len(data["agents"]) == 1
        assert data["agents"][0]["agent"] == "sales"
        assert data["agents"][0]["count"] == 5
        assert data["agents"][0]["avg_confidence"] == 0.9
        assert data["agents"][0]["completed"] == 4
        assert data["agents"][0]["failed"] == 1
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_analytics_by_day_route():
    mock_db = AsyncMock()
    mock_row = MagicMock()
    today = (datetime.datetime.now(datetime.timezone.utc)).date()
    mock_row.day = today
    mock_row.cnt = 3

    mock_db.execute = AsyncMock(return_value=[mock_row])

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db

    try:
        # Use days=7 to keep it simple
        response = client.get("/api/v1/analytics/by-day?days=7")
        assert response.status_code == 200
        data = response.json()
        assert data["days"] == 7
        assert len(data["buckets"]) == 7
        # One of the buckets should be 3, others 0
        counts = [b["count"] for b in data["buckets"]]
        assert 3 in counts
        assert sum(counts) == 3
    finally:
        app.dependency_overrides.clear()
