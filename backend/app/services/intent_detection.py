"""
Intent Detection Service

Uses GPT-4o to classify inbox submission intent into predefined categories.
"""
import json
import asyncio
import structlog
from typing import Optional
from cachetools import TTLCache
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.config import settings

logger = structlog.get_logger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────

ALLOWED_INTENTS = {
    "sales_lead",
    "customer_support",
    "invoice_processing",
    "executive_summary",
    "unknown",
}

SYSTEM_PROMPT = """You are an AI assistant that classifies business messages and documents
into intent categories. Analyze the given content and return ONLY a JSON object.

Available intent categories:
- "sales_lead": Messages about new prospects, sales opportunities, demos, pricing inquiries, or deal negotiations
- "customer_support": Bug reports, feature requests, user complaints, account issues, or technical problems
- "invoice_processing": Invoices, receipts, payment requests, financial documents, or billing disputes
- "executive_summary": Board updates, strategic reports, market analysis, KPI reviews, or high-level business summaries
- "unknown": Does not clearly fit any of the above categories

Return ONLY this JSON structure (no markdown, no explanation):
{
  "intent": "<one of the five categories above>",
  "reasoning": "<brief one-sentence explanation>"
}"""

# In-memory cache: key = content hash, value = (intent, reasoning)
# TTL = 1 hour, max 256 entries
_cache: TTLCache = TTLCache(maxsize=256, ttl=3600)
_cache_lock = asyncio.Lock()


# ─── Service ──────────────────────────────────────────────────────────────────

class IntentDetectionResult:
    def __init__(self, intent: str, reasoning: str, from_cache: bool = False):
        self.intent = intent
        self.reasoning = reasoning
        self.from_cache = from_cache

    def __repr__(self) -> str:
        return f"IntentDetectionResult(intent={self.intent!r}, reasoning={self.reasoning!r}, from_cache={self.from_cache!r})"


async def detect_intent(
    content: str,
    file_context: Optional[str] = None,
) -> IntentDetectionResult:
    """
    Detect the intent of the given content using GPT-4o.

    Args:
        content:      The user's text submission
        file_context: Optional OCR-extracted text from an attached document

    Returns:
        IntentDetectionResult with intent and reasoning
    """
    # Build full text for classification
    full_text = content
    if file_context:
        full_text = f"{content}\n\n--- Attached Document ---\n{file_context}"

    # Check if mock mode is active
    is_mock = settings.OPENAI_API_KEY.startswith("sk-placeholder") or settings.OPENAI_API_KEY == "openaiapikey"
    if is_mock:
        text_lower = full_text.lower()
        intent = "unknown"
        if "invoice" in text_lower or "inv-" in text_lower or "bill" in text_lower:
            intent = "invoice_processing"
        elif any(k in text_lower for k in ["procurement", "license", "pricing", "buy", "sales", "demo"]):
            intent = "sales_lead"
        elif any(k in text_lower for k in ["bug", "crash", "oauth", "support", "broken", "login"]):
            intent = "customer_support"
        elif any(k in text_lower for k in ["operations", "kpi", "arr", "report", "summary"]):
            intent = "executive_summary"
            
        reasoning = "Simulated intent detection (mock mode active for placeholder API key)"
        logger.info("intent_detected_mock", intent=intent)
        return IntentDetectionResult(intent=intent, reasoning=reasoning, from_cache=False)

    # Cache key based on content hash
    import hashlib
    cache_key = hashlib.sha256(full_text.encode("utf-8")).hexdigest()

    async with _cache_lock:
        if cache_key in _cache:
            cached = _cache[cache_key]
            logger.debug("intent_cache_hit", cache_key=cache_key[:8])
            return IntentDetectionResult(
                intent=cached["intent"],
                reasoning=cached["reasoning"],
                from_cache=True,
            )

    # Call GPT-4o
    try:
        result = await _call_gpt4o(full_text)
    except Exception as exc:
        logger.warning(
            "intent_detection_failed",
            error=str(exc),
            content_length=len(content),
        )
        return IntentDetectionResult(
            intent="unknown",
            reasoning="Intent detection service unavailable",
        )

    # Store in cache
    async with _cache_lock:
        _cache[cache_key] = {"intent": result.intent, "reasoning": result.reasoning}

    logger.info(
        "intent_detected",
        intent=result.intent,
        content_length=len(content),
    )
    return result


async def _call_gpt4o(text: str) -> IntentDetectionResult:
    """Internal: call GPT-4o with timeout and parse response."""
    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0.0,
        openai_api_key=settings.OPENAI_API_KEY,  # type: ignore[call-arg]
        request_timeout=15,  # type: ignore[call-arg]
        model_kwargs={"response_format": {"type": "json_object"}},
    )

    # Truncate to ~6000 chars to stay within token limits
    truncated = text[:6000]
    if len(text) > 6000:
        truncated += "\n[Content truncated for analysis]"

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"Classify this content:\n\n{truncated}"),
    ]

    response = await asyncio.wait_for(
        llm.ainvoke(messages),
        timeout=15.0,
    )

    raw = response.content
    if not isinstance(raw, str):
        raw = str(raw)

    return _parse_response(raw)


def _parse_response(raw: str) -> IntentDetectionResult:
    """Parse GPT-4o JSON response. Returns 'unknown' on any parse failure."""
    try:
        parsed = json.loads(raw)
        intent = parsed.get("intent", "unknown")
        reasoning = parsed.get("reasoning", "")

        if intent not in ALLOWED_INTENTS:
            logger.warning("intent_invalid_value", value=intent)
            intent = "unknown"

        return IntentDetectionResult(intent=intent, reasoning=reasoning)
    except (json.JSONDecodeError, AttributeError) as exc:
        logger.warning("intent_parse_failed", error=str(exc), raw=raw[:200])
        return IntentDetectionResult(
            intent="unknown",
            reasoning="Failed to parse intent response",
        )
