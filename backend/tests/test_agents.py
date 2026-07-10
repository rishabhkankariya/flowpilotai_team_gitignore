import json
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.agents.support_agent import support_agent_node
from app.agents.finance_agent import finance_agent_node
from app.agents.executive_agent import executive_agent_node
from app.agents.state import initial_state
from app.db.models.inbox import AgentType


# ─── Support Agent Tests ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_support_agent_critical_bug():
    mock_gpt_output = {
        "issue_type": "bug",
        "severity": "critical",
        "product_area": "authentication",
        "customer_impact": "Users cannot log in",
        "root_cause_hypothesis": "JWT validation failing",
        "response_draft": "We are investigating the login issues immediately.",
        "internal_notes": "Check JWT certs",
        "action_items": ["Verify JWT keys"],
        "sla_recommendation": "1 hour",
        "escalate_to_engineering": True,
        "summary": "Critical login failure bug.",
        "confidence": 0.95
    }

    state = initial_state(
        submission_id="test-uuid",
        user_id="user-uuid",
        content="URGENT: All users getting JWT signature errors on login."
    )

    with patch("app.agents.support_agent.ChatOpenAI") as mock_chat_openai:
        mock_llm_instance = mock_chat_openai.return_value
        mock_response = MagicMock()
        mock_response.content = json.dumps(mock_gpt_output)
        mock_llm_instance.ainvoke = AsyncMock(return_value=mock_response)

        result = await support_agent_node(state)

        assert "agent_error" not in result
        resp = result["agent_response"]
        assert resp["agent_type"] == "support"
        assert resp["structured_data"]["issue_type"] == "bug"
        assert resp["structured_data"]["severity"] == "critical"
        assert resp["structured_data"]["escalate_to_engineering"] is True
        assert len(result["steps"]) == 1


@pytest.mark.asyncio
async def test_support_agent_clamping_and_fallback():
    # catastrophic severity should map to medium
    mock_gpt_output = {
        "issue_type": "invalid_type",
        "severity": "catastrophic",
        "confidence": 1.2
    }

    state = initial_state(
        submission_id="test-uuid",
        user_id="user-uuid",
        content="General support inquiry."
    )

    with patch("app.agents.support_agent.ChatOpenAI") as mock_chat_openai:
        mock_llm_instance = mock_chat_openai.return_value
        mock_response = MagicMock()
        mock_response.content = json.dumps(mock_gpt_output)
        mock_llm_instance.ainvoke = AsyncMock(return_value=mock_response)

        result = await support_agent_node(state)

        resp = result["agent_response"]
        assert resp["structured_data"]["severity"] == "medium"  # Fallback
        assert resp["structured_data"]["issue_type"] == "general_inquiry"  # Fallback
        assert resp["confidence"] == 1.0  # Clamped


# ─── Finance Agent Tests ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_finance_agent_complete_invoice():
    mock_gpt_output = {
        "document_type": "invoice",
        "vendor_name": "ACME Supplies",
        "invoice_number": "INV-1002",
        "due_date": "2024-03-31",
        "total_amount": 1500.0,
        "payment_recommendation": "approve",
        "anomalies": [],
        "line_items": [{"description": "Office desks", "total": 1500.0}],
        "action_items": ["Proceed with invoice match"],
        "summary": "Invoice ACME Supplies INV-1002",
        "confidence": 0.95
    }

    state = initial_state(
        submission_id="test-uuid",
        user_id="user-uuid",
        content="Attached document contents"
    )
    state["file_text"] = "ACME Supplies INV-1002 Due 2024-03-31 Total $1500.00"

    with patch("app.agents.finance_agent.ChatOpenAI") as mock_chat_openai:
        mock_llm_instance = mock_chat_openai.return_value
        mock_response = MagicMock()
        mock_response.content = json.dumps(mock_gpt_output)
        mock_llm_instance.ainvoke = AsyncMock(return_value=mock_response)

        result = await finance_agent_node(state)

        resp = result["agent_response"]
        assert resp["agent_type"] == "finance"
        assert resp["structured_data"]["payment_recommendation"] == "approve"
        assert resp["structured_data"]["total_amount"] == 1500.0
        assert len(resp["structured_data"]["line_items"]) == 1


@pytest.mark.asyncio
async def test_finance_agent_anomalies_downgrade():
    mock_gpt_output = {
        "document_type": "invoice",
        "vendor_name": "ACME Supplies",
        "invoice_number": "INV-1002",
        "due_date": "2024-03-31",
        "total_amount": "not-a-number",  # Non-numeric
        "payment_recommendation": "approve",  # Recommended approve but anomalies exist
        "anomalies": ["Amount is non-numeric"],
        "line_items": []
    }

    state = initial_state(
        submission_id="test-uuid",
        user_id="user-uuid",
        content="Incomplete details"
    )

    with patch("app.agents.finance_agent.ChatOpenAI") as mock_chat_openai:
        mock_llm_instance = mock_chat_openai.return_value
        mock_response = MagicMock()
        mock_response.content = json.dumps(mock_gpt_output)
        mock_llm_instance.ainvoke = AsyncMock(return_value=mock_response)

        result = await finance_agent_node(state)

        resp = result["agent_response"]
        assert resp["structured_data"]["total_amount"] is None  # Cast failure
        # Auto-downgraded from approve to review
        assert resp["structured_data"]["payment_recommendation"] == "review"


# ─── Executive Agent Tests ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_executive_agent_escalation():
    mock_gpt_output = {
        "content_type": "escalation",
        "executive_summary": "Escalation review requested.",
        "key_themes": ["System help requested"],
        "key_metrics": [],
        "strategic_implications": ["Low user satisfaction if unresolved"],
        "recommended_decisions": {
            "immediate": ["Manual support check"],
            "short_term": [],
            "long_term": []
        },
        "stakeholders": ["Support Team"],
        "escalation_context": {
            "was_escalated": True,
            "escalation_reason": "Low confidence intent detection",
            "recommended_handler": "support_team",
            "confidence_note": "Unclear input"
        },
        "action_items": ["Contact user"],
        "priority": "high",
        "summary": "Escalation ticket processed.",
        "confidence": 0.85
    }

    state = initial_state(
        submission_id="test-uuid",
        user_id="user-uuid",
        content="i need help with the thingy"
    )
    state["escalated"] = True
    state["detected_intent"] = "customer_support"
    state["confidence_score"] = 0.2
    state["routing_reason"] = "Low confidence"

    with patch("app.agents.executive_agent.ChatOpenAI") as mock_chat_openai:
        mock_llm_instance = mock_chat_openai.return_value
        mock_response = MagicMock()
        mock_response.content = json.dumps(mock_gpt_output)
        mock_llm_instance.ainvoke = AsyncMock(return_value=mock_response)

        result = await executive_agent_node(state)

        resp = result["agent_response"]
        assert resp["agent_type"] == "executive"
        assert resp["structured_data"]["content_type"] == "escalation"
        assert resp["structured_data"]["escalation_context"]["was_escalated"] is True
        assert resp["structured_data"]["escalation_context"]["recommended_handler"] == "support_team"
        assert len(resp["structured_data"]["recommended_decisions"]["immediate"]) == 1
