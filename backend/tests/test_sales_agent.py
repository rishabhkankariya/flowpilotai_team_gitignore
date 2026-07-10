import json
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.agents.sales_agent import sales_agent_node
from app.agents.state import initial_state
from app.db.models.inbox import AgentType


@pytest.mark.asyncio
async def test_sales_agent_high_value_lead():
    mock_gpt_output = {
        "company_name": "Acme Corp",
        "contact_name": "John Smith",
        "contact_email": "john@acme.com",
        "deal_size_estimate": "$250,000",
        "product_interest": "Enterprise SaaS",
        "urgency": "hot",
        "lead_score": 95,
        "pain_points": ["Legacy system scaling limitations"],
        "action_items": [
            "Schedule discovery call within 24 hours",
            "Prepare customized platform architecture presentation",
            "Involve Solutions Engineer for technical assessment"
        ],
        "summary": "Acme Corp CTO John Smith interested in replacing legacy CRM. Highly qualified lead.",
        "follow_up_timeline": "Within 24 hours",
        "confidence": 0.95
    }

    state = initial_state(
        submission_id="550e8400-e29b-41d4-a716-446655440000",
        user_id="user-uuid",
        content="Acme Corp John Smith (john@acme.com) wants a demo. Deal is $250k."
    )

    with patch("app.agents.sales_agent.ChatOpenAI") as mock_chat_openai:
        mock_llm_instance = mock_chat_openai.return_value
        mock_response = MagicMock()
        mock_response.content = json.dumps(mock_gpt_output)
        mock_llm_instance.ainvoke = AsyncMock(return_value=mock_response)

        result = await sales_agent_node(state)

        assert "agent_error" not in result
        assert "agent_response" in result
        resp = result["agent_response"]
        assert resp["agent_type"] == "sales"
        assert resp["structured_data"]["company_name"] == "Acme Corp"
        assert resp["structured_data"]["lead_score"] == 95
        assert resp["structured_data"]["urgency"] == "hot"
        assert len(resp["action_items"]) == 3
        assert len(result["steps"]) == 1
        assert result["steps"][0]["step_name"] == "sales_agent_node"
        assert result["steps"][0]["status"] == "completed"


@pytest.mark.asyncio
async def test_sales_agent_vague_lead():
    mock_gpt_output = {
        "company_name": "Unknown",
        "contact_name": "Unknown",
        "contact_email": None,
        "deal_size_estimate": "Unknown",
        "product_interest": "General inquiry",
        "urgency": "cold",
        "lead_score": 25,
        "pain_points": [],
        "action_items": [
            "Send standard informational flyer",
            "Prompt for more information"
        ],
        "summary": "Vague question asking if we support B2C.",
        "follow_up_timeline": "Within 1 month",
        "confidence": 0.80
    }

    state = initial_state(
        submission_id="550e8400-e29b-41d4-a716-446655440000",
        user_id="user-uuid",
        content="Hi, do you guys sell to individuals?"
    )

    with patch("app.agents.sales_agent.ChatOpenAI") as mock_chat_openai:
        mock_llm_instance = mock_chat_openai.return_value
        mock_response = MagicMock()
        mock_response.content = json.dumps(mock_gpt_output)
        mock_llm_instance.ainvoke = AsyncMock(return_value=mock_response)

        result = await sales_agent_node(state)

        assert "agent_error" not in result
        resp = result["agent_response"]
        assert resp["structured_data"]["lead_score"] == 25
        assert resp["structured_data"]["urgency"] == "cold"


@pytest.mark.asyncio
async def test_sales_agent_json_parse_failure():
    state = initial_state(
        submission_id="550e8400-e29b-41d4-a716-446655440000",
        user_id="user-uuid",
        content="Broken JSON response test."
    )

    with patch("app.agents.sales_agent.ChatOpenAI") as mock_chat_openai:
        mock_llm_instance = mock_chat_openai.return_value
        mock_response = MagicMock()
        mock_response.content = "This is not valid JSON string."
        mock_llm_instance.ainvoke = AsyncMock(return_value=mock_response)

        result = await sales_agent_node(state)

        assert "agent_error" not in result
        assert "agent_response" in result
        resp = result["agent_response"]
        assert resp["structured_data"]["company_name"] == "Unknown"
        assert resp["structured_data"]["lead_score"] == 30
        assert resp["confidence"] == 0.3


@pytest.mark.asyncio
async def test_sales_agent_gpt_timeout_exception():
    state = initial_state(
        submission_id="550e8400-e29b-41d4-a716-446655440000",
        user_id="user-uuid",
        content="Timeout test."
    )

    with patch("app.agents.sales_agent.ChatOpenAI") as mock_chat_openai:
        mock_llm_instance = mock_chat_openai.return_value
        mock_llm_instance.ainvoke = AsyncMock(side_effect=asyncio.TimeoutError("Timeout occurred"))

        result = await sales_agent_node(state)

        assert "agent_error" in result
        assert "Timeout occurred" in result["agent_error"]
        assert len(result["steps"]) == 1
        assert result["steps"][0]["step_name"] == "sales_agent_node"
        assert result["steps"][0]["status"] == "failed"
        assert result["steps"][0]["error"] == "Timeout occurred"


@pytest.mark.asyncio
async def test_sales_agent_clamping_lead_score():
    mock_gpt_output = {
        "company_name": "Acme Corp",
        "contact_name": "John",
        "lead_score": 150,  # Invalid high lead score
        "confidence": 1.5,   # Invalid high confidence
        "action_items": "Single action item string"  # String instead of list
    }

    state = initial_state(
        submission_id="550e8400-e29b-41d4-a716-446655440000",
        user_id="user-uuid",
        content="Clamping check."
    )

    with patch("app.agents.sales_agent.ChatOpenAI") as mock_chat_openai:
        mock_llm_instance = mock_chat_openai.return_value
        mock_response = MagicMock()
        mock_response.content = json.dumps(mock_gpt_output)
        mock_llm_instance.ainvoke = AsyncMock(return_value=mock_response)

        result = await sales_agent_node(state)

        assert "agent_response" in result
        resp = result["agent_response"]
        assert resp["structured_data"]["lead_score"] == 100  # Clamped from 150
        assert resp["confidence"] == 1.0  # Clamped from 1.5
        assert isinstance(resp["action_items"], list)
        assert resp["action_items"] == ["Single action item string"]
