"""
Finance Agent

Processes invoice and financial document submissions.
Extracts structured data, detects anomalies, and recommends payment actions.
"""
import json
import asyncio
import structlog
from typing import Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.agents.state import AgentState, add_step
from app.agents.types import AgentResponse
from app.core.config import settings
from app.db.models.inbox import AgentType

logger = structlog.get_logger(__name__)

FINANCE_SYSTEM_PROMPT = """You are an expert accounts payable AI assistant.
Analyze the financial document or invoice description and extract structured data.

Return ONLY this JSON (no markdown):
{
  "document_type": "<'invoice' | 'receipt' | 'purchase_order' | 'credit_note' | 'other'>",
  "vendor_name": "<vendor/supplier name or 'Unknown'>",
  "vendor_contact": "<vendor email or phone or null>",
  "invoice_number": "<invoice/receipt number or null>",
  "invoice_date": "<ISO date string YYYY-MM-DD or null>",
  "due_date": "<ISO date string YYYY-MM-DD or null>",
  "payment_terms": "<e.g. 'Net 30', 'Due on receipt', etc. or null>",
  "currency": "<3-letter ISO currency code, e.g. 'USD', 'EUR'>",
  "subtotal": <numeric float or null>,
  "tax_amount": <numeric float or null>,
  "total_amount": <numeric float or null>,
  "line_items": [
    {
      "description": "<item description>",
      "quantity": <numeric or null>,
      "unit_price": <numeric float or null>,
      "total": <numeric float or null>
    }
  ],
  "payment_recommendation": "<'approve' | 'hold' | 'review'>",
  "anomalies": ["<list of detected issues, e.g. 'Missing invoice number', 'Amount inconsistency'>"],
  "action_items": ["<3-5 AP team action items>"],
  "summary": "<2-3 sentence summary for the finance team>",
  "confidence": <float 0.0-1.0>
}

Payment recommendation guide:
- approve: All required fields present, amounts consistent, no anomalies
- hold: Missing payment details, amount ambiguous, pending PO match
- review: Anomalies detected, unusual amount, potential duplicate

Required fields for approval: vendor_name, invoice_number, total_amount, due_date"""


async def finance_agent_node(state: AgentState) -> dict[str, Any]:
    """LangGraph node: Process a financial document submission."""
    content = state.get("content", "")
    file_text = state.get("file_text")

    full_text = content
    if file_text:
        # For finance, document text takes priority
        full_text = f"User note: {content}\n\n--- Invoice/Document Content ---\n{file_text}"

    logger.info(
        "finance_agent_start",
        submission_id=state.get("submission_id"),
        has_file=bool(file_text),
    )

    try:
        raw_result = await _extract_invoice_data(full_text)
        response = _build_response(raw_result)

        logger.info(
            "finance_agent_complete",
            submission_id=state.get("submission_id"),
            document_type=raw_result.get("document_type"),
            total_amount=raw_result.get("total_amount"),
            recommendation=raw_result.get("payment_recommendation"),
        )

        return {
            "agent_response": response.to_dict(),
            **add_step(state, "finance_agent_node", {
                "document_type": raw_result.get("document_type"),
                "total_amount": raw_result.get("total_amount"),
                "recommendation": raw_result.get("payment_recommendation"),
                "anomalies_count": len(raw_result.get("anomalies", [])),
            }),
        }

    except Exception as exc:
        logger.error("finance_agent_error", submission_id=state.get("submission_id"), error=str(exc))
        return {
            "agent_error": f"Finance agent error: {str(exc)}",
            **add_step(state, "finance_agent_node", {}, error=str(exc)),
        }


async def _extract_invoice_data(text: str) -> dict[str, Any]:
    is_mock = settings.OPENAI_API_KEY.startswith("sk-placeholder") or settings.OPENAI_API_KEY == "openaiapikey"
    if is_mock:
        return {
            "document_type": "invoice",
            "vendor_name": "Cloudflare, Inc.",
            "vendor_contact": "payments@cloudflare.com",
            "invoice_number": "INV-2026-9081",
            "invoice_date": "2026-07-11",
            "due_date": "2026-07-25",
            "payment_terms": "Net 14",
            "currency": "USD",
            "subtotal": 1600.0,
            "tax_amount": 128.0,
            "total_amount": 1728.0,
            "line_items": [
                {
                    "description": "Enterprise Cloud Security Services - July 2026",
                    "quantity": 1,
                    "unit_price": 1250.0,
                    "total": 1250.0
                },
                {
                    "description": "Advanced DDoS Shielding & CDN",
                    "quantity": 1,
                    "unit_price": 350.0,
                    "total": 350.0
                }
            ],
            "payment_recommendation": "approve",
            "anomalies": [],
            "action_items": [
                "Verify Cloudflare payment banking details match internal records",
                "Log invoice INV-2026-9081 in accounting ERP ledger",
                "Approve payment of $1,728.00 before due date July 25, 2026"
            ],
            "summary": "Cloudflare invoice INV-2026-9081 for security services and CDN shielding totaling $1,728.00. No anomalies detected.",
            "confidence": 0.95
        }

    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0.0,
        openai_api_key=settings.OPENAI_API_KEY,  # type: ignore[call-arg]
        request_timeout=25,  # type: ignore[call-arg]
        model_kwargs={"response_format": {"type": "json_object"}},
    )
    truncated = text[:8000]  # Longer limit for OCR-heavy documents
    messages = [
        SystemMessage(content=FINANCE_SYSTEM_PROMPT),
        HumanMessage(content=f"Extract financial data from:\n\n{truncated}"),
    ]
    response = await asyncio.wait_for(llm.ainvoke(messages), timeout=25.0)

    raw = response.content
    if not isinstance(raw, str):
        raw = str(raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return _fallback_response()


def _build_response(data: dict[str, Any]) -> AgentResponse:
    valid_recommendations = {"approve", "hold", "review"}
    recommendation = data.get("payment_recommendation", "review")
    if recommendation not in valid_recommendations:
        recommendation = "review"

    total_amount = data.get("total_amount")
    if total_amount is not None:
        try:
            total_amount = float(total_amount)
        except (ValueError, TypeError):
            total_amount = None

    anomalies = data.get("anomalies", [])
    if not isinstance(anomalies, list):
        anomalies = []

    line_items = data.get("line_items", [])
    if not isinstance(line_items, list):
        line_items = []

    action_items = data.get("action_items", [])
    if not isinstance(action_items, list):
        action_items = [str(action_items)]

    confidence = float(data.get("confidence", 0.7))
    confidence = max(0.0, min(1.0, confidence))

    # Auto-hold if anomalies detected and recommendation is approve
    if anomalies and recommendation == "approve":
        recommendation = "review"

    return AgentResponse(
        agent_type=AgentType.finance,
        summary=data.get("summary", "Financial document processed."),
        structured_data={
            "document_type": data.get("document_type", "invoice"),
            "vendor_name": data.get("vendor_name", "Unknown"),
            "vendor_contact": data.get("vendor_contact"),
            "invoice_number": data.get("invoice_number"),
            "invoice_date": data.get("invoice_date"),
            "due_date": data.get("due_date"),
            "payment_terms": data.get("payment_terms"),
            "currency": data.get("currency", "USD"),
            "subtotal": data.get("subtotal"),
            "tax_amount": data.get("tax_amount"),
            "total_amount": total_amount,
            "line_items": line_items,
            "payment_recommendation": recommendation,
            "anomalies": anomalies,
        },
        action_items=action_items[:5],
        confidence=confidence,
        metadata={
            "has_anomalies": bool(anomalies),
            "recommendation": recommendation,
        },
    )


def _fallback_response() -> dict[str, Any]:
    return {
        "document_type": "invoice",
        "vendor_name": "Unknown",
        "vendor_contact": None,
        "invoice_number": None,
        "invoice_date": None,
        "due_date": None,
        "payment_terms": None,
        "currency": "USD",
        "subtotal": None,
        "tax_amount": None,
        "total_amount": None,
        "line_items": [],
        "payment_recommendation": "review",
        "anomalies": ["Automated extraction failed — manual review required"],
        "action_items": ["Manually review the attached document", "Contact vendor for clarification"],
        "summary": "Financial document received. Automated extraction failed — manual review required.",
        "confidence": 0.2,
    }
