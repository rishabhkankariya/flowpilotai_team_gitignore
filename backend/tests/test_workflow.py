import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ocr_service import extract_text_from_url, OCRError
from app.services.intent_detection import detect_intent
from app.services.confidence_scoring import compute_confidence
from app.services.agent_router import route, RoutingDecision
from app.agents.workflow import run_inbox_workflow, build_workflow_graph
from app.db.models.inbox import InboxSubmission, WorkflowStatus, AgentType
from main import app


# ─── OCR Service Mock Test ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ocr_extraction_success():
    mock_url = "https://example.supabase.co/file.png"
    mock_file_bytes = b"fake image bytes"
    mock_content_type = "image/png"

    with patch("app.services.ocr_service._download_file") as mock_download, \
         patch("app.services.ocr_service.Image.open") as mock_img_open, \
         patch("app.services.ocr_service.pytesseract.image_to_string") as mock_tesseract:
        
        mock_download.return_value = (mock_file_bytes, mock_content_type)
        mock_img = MagicMock()
        mock_img.mode = "RGB"
        mock_img_open.return_value = mock_img
        mock_tesseract.return_value = "INVOICE #INV-1234 Total: $4500.00"

        text = await extract_text_from_url(mock_url)
        assert "INVOICE" in text
        assert "INV-1234" in text


# ─── LangGraph Workflow Execution Test ────────────────────────────────────────

@pytest.mark.asyncio
async def test_workflow_orchestration():
    mock_db = AsyncMock(spec=AsyncSession)
    
    # Mock submission
    submission = InboxSubmission(
        id="550e8400-e29b-41d4-a716-446655440000",
        user_id="550e8400-e29b-41d4-a716-446655440001",
        content="We have a new lead from ABC Corp. Deal size is $50k.",
        file_url=None,
        status=WorkflowStatus.pending
    )

    # Mock services
    mock_intent_res = MagicMock()
    mock_intent_res.intent = "sales_lead"
    mock_intent_res.reasoning = "lead mentioned"
    mock_intent_res.from_cache = False

    mock_routing_decision = RoutingDecision(
        agent_type=AgentType.sales,
        escalated=False,
        original_intent="sales_lead",
        confidence_score=0.9,
        reason="high confidence sales lead"
    )

    mock_sales_agent_output = {
        "company_name": "ABC Corp",
        "contact_name": "Unknown",
        "lead_score": 75,
        "urgency": "warm",
        "action_items": ["Follow up"],
        "summary": "Sales lead ABC Corp.",
        "confidence": 0.9
    }

    # Mock the execute queries
    mock_scalar = MagicMock()
    mock_scalar.scalar_one.return_value = submission
    mock_db.execute.return_value = mock_scalar

    with patch("app.agents.workflow.detect_intent", AsyncMock(return_value=mock_intent_res)), \
         patch("app.agents.workflow.compute_confidence", AsyncMock(return_value=0.9)), \
         patch("app.agents.workflow.route", return_value=mock_routing_decision), \
         patch("app.agents.sales_agent._extract_sales_data", AsyncMock(return_value=mock_sales_agent_output)), \
         patch("app.agents.sales_agent.ChatOpenAI") as mock_openai:

        # Ensure LangChain LLM won't be called directly
        mock_openai.return_value.ainvoke = AsyncMock()

        await run_inbox_workflow(submission, mock_db)

        assert submission.status == WorkflowStatus.completed
        assert submission.assigned_agent == AgentType.sales
        assert submission.detected_intent == "sales_lead"
        assert submission.result is not None
        assert len(submission.result["steps"]) > 0


# ─── Standalone Document Extraction Route Test ────────────────────────────────

def test_extract_invoice_route():
    # Create test client
    client = TestClient(app)

    mock_ocr_output = "INVOICE #INV-4412 Vendor: TechCorp Total: $800.00"
    mock_finance_output = {
        "document_type": "invoice",
        "vendor_name": "TechCorp",
        "vendor_contact": None,
        "invoice_number": "INV-4412",
        "invoice_date": None,
        "due_date": None,
        "payment_terms": None,
        "currency": "USD",
        "subtotal": 800.0,
        "tax_amount": None,
        "total_amount": 800.0,
        "line_items": [],
        "payment_recommendation": "approve",
        "anomalies": [],
        "action_items": ["Proceed with invoice payment"],
        "summary": "Invoice TechCorp INV-4412",
        "confidence": 0.95
    }

    with patch("app.api.v1.endpoints.documents.extract_text_from_url", AsyncMock(return_value=mock_ocr_output)), \
         patch("app.api.v1.endpoints.documents._extract_invoice_data", AsyncMock(return_value=mock_finance_output)):

        response = client.post(
            "/api/v1/documents/extract-invoice",
            json={"file_url": "https://example.supabase.co/invoice.pdf"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["vendor_name"] == "TechCorp"
        assert data["invoice_number"] == "INV-4412"
        assert data["total_amount"] == 800.0
        assert data["payment_recommendation"] == "approve"
        assert data["raw_text_length"] == len(mock_ocr_output)
