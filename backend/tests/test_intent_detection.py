import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from langchain_core.messages import AIMessage
from app.services.intent_detection import detect_intent, _cache


@pytest.fixture(autouse=True)
def clear_cache():
    """Fixture to clear the intent detection cache before each test."""
    _cache.clear()


@pytest.mark.asyncio
@patch("langchain_openai.ChatOpenAI.ainvoke")
async def test_detect_intent_sales_lead(mock_ainvoke):
    # Setup mock response
    mock_ainvoke.return_value = AIMessage(
        content='{"intent": "sales_lead", "reasoning": "Acme Corp wants to discuss pricing"}'
    )

    result = await detect_intent("We want to purchase licenses for Acme Corp.")
    assert result.intent == "sales_lead"
    assert result.reasoning == "Acme Corp wants to discuss pricing"
    assert result.from_cache is False

    mock_ainvoke.assert_called_once()


@pytest.mark.asyncio
@patch("langchain_openai.ChatOpenAI.ainvoke")
async def test_detect_intent_customer_support(mock_ainvoke):
    mock_ainvoke.return_value = AIMessage(
        content='{"intent": "customer_support", "reasoning": "User complains about login error"}'
    )

    result = await detect_intent("I am getting a 500 error when I try to log in.")
    assert result.intent == "customer_support"
    assert result.reasoning == "User complains about login error"
    assert result.from_cache is False


@pytest.mark.asyncio
@patch("langchain_openai.ChatOpenAI.ainvoke")
async def test_detect_intent_invoice_processing(mock_ainvoke):
    mock_ainvoke.return_value = AIMessage(
        content='{"intent": "invoice_processing", "reasoning": "Document lists billed amounts and due date"}'
    )

    result = await detect_intent(
        "Please find the invoice attached.",
        file_context="Invoice #999\nAmount Due: $1,200.00\nDue Date: Dec 1, 2026"
    )
    assert result.intent == "invoice_processing"
    assert result.reasoning == "Document lists billed amounts and due date"
    assert result.from_cache is False


@pytest.mark.asyncio
@patch("langchain_openai.ChatOpenAI.ainvoke")
async def test_detect_intent_executive_summary(mock_ainvoke):
    mock_ainvoke.return_value = AIMessage(
        content='{"intent": "executive_summary", "reasoning": "High-level board strategic deck summary"}'
    )

    result = await detect_intent("Board deck draft for the Q4 review session.")
    assert result.intent == "executive_summary"
    assert result.reasoning == "High-level board strategic deck summary"


@pytest.mark.asyncio
@patch("langchain_openai.ChatOpenAI.ainvoke")
async def test_detect_intent_unknown_category(mock_ainvoke):
    mock_ainvoke.return_value = AIMessage(
        content='{"intent": "unknown", "reasoning": "General chat query"}'
    )

    result = await detect_intent("What is the capital of Japan?")
    assert result.intent == "unknown"


@pytest.mark.asyncio
@patch("langchain_openai.ChatOpenAI.ainvoke")
async def test_detect_intent_caching(mock_ainvoke):
    # Setup mock response
    mock_ainvoke.return_value = AIMessage(
        content='{"intent": "sales_lead", "reasoning": "Discuss pricing"}'
    )

    content = "This content should be cached for subsequent requests."

    # First call: cache miss, triggers LLM
    result1 = await detect_intent(content)
    assert result1.intent == "sales_lead"
    assert result1.from_cache is False
    assert mock_ainvoke.call_count == 1

    # Second call: cache hit, bypasses LLM
    result2 = await detect_intent(content)
    assert result2.intent == "sales_lead"
    assert result2.from_cache is True
    assert mock_ainvoke.call_count == 1  # Still 1


@pytest.mark.asyncio
@patch("langchain_openai.ChatOpenAI.ainvoke")
async def test_detect_intent_timeout(mock_ainvoke):
    # Simulate a timeout by raising asyncio.TimeoutError
    mock_ainvoke.side_effect = asyncio.TimeoutError()

    result = await detect_intent("Should fail due to timeout.")
    assert result.intent == "unknown"
    assert result.reasoning == "Intent detection service unavailable"


@pytest.mark.asyncio
@patch("langchain_openai.ChatOpenAI.ainvoke")
async def test_detect_intent_invalid_json(mock_ainvoke):
    # Return malformed JSON content
    mock_ainvoke.return_value = AIMessage(
        content="This is not valid JSON string output."
    )

    result = await detect_intent("Malformed JSON response check.")
    assert result.intent == "unknown"
    assert result.reasoning == "Failed to parse intent response"


@pytest.mark.asyncio
@patch("langchain_openai.ChatOpenAI.ainvoke")
async def test_detect_intent_invalid_intent_value(mock_ainvoke):
    # Return an unsupported intent value e.g. "spam"
    mock_ainvoke.return_value = AIMessage(
        content='{"intent": "spam", "reasoning": "Unsolicited promotional content"}'
    )

    result = await detect_intent("Buy cheap watches today!")
    assert result.intent == "unknown"


@pytest.mark.asyncio
@patch("langchain_openai.ChatOpenAI.ainvoke")
async def test_detect_intent_truncation(mock_ainvoke):
    mock_ainvoke.return_value = AIMessage(
        content='{"intent": "unknown", "reasoning": "Truncated content review"}'
    )

    # Content longer than 6000 characters
    long_content = "x" * 7000

    await detect_intent(long_content)
    
    # Verify the human message passed to the model is truncated
    called_messages = mock_ainvoke.call_args[0][0]
    human_msg = called_messages[1].content
    
    assert "[Content truncated for analysis]" in human_msg
    assert len(human_msg) < 7000
