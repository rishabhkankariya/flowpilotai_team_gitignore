"""
Document Intelligence API

Provides standalone document processing endpoints without creating inbox submissions.
"""
import asyncio
import structlog
from fastapi import APIRouter, status
from app.api.deps import CurrentUser
from app.core.exceptions import ValidationError
from app.schemas.documents import InvoiceExtractionRequest, InvoiceExtractionResponse, LineItem
from app.services.ocr_service import extract_text_from_url
from app.agents.finance_agent import _extract_invoice_data, _build_response

logger = structlog.get_logger(__name__)
router = APIRouter()

EXTRACTION_TIMEOUT = 45.0


@router.post(
    "/extract-invoice",
    response_model=InvoiceExtractionResponse,
    status_code=status.HTTP_200_OK,
    summary="Extract structured invoice data from a document",
    description=(
        "Runs OCR on the provided file URL and uses AI to extract invoice fields. "
        "Does not create an inbox submission."
    ),
)
async def extract_invoice(
    body: InvoiceExtractionRequest,
    current_user: CurrentUser,
) -> InvoiceExtractionResponse:
    logger.info(
        "invoice_extraction_start",
        user_id=str(current_user.id),
        file_url=body.file_url[:80],
    )

    try:
        result = await asyncio.wait_for(
            _run_extraction(body.file_url),
            timeout=EXTRACTION_TIMEOUT,
        )
        return result
    except asyncio.TimeoutError:
        raise ValidationError("Document processing timed out. Please try a smaller file.")
    except Exception as exc:
        logger.error("invoice_extraction_failed", error=str(exc))
        raise ValidationError(f"Document processing failed: {str(exc)}")


async def _run_extraction(file_url: str) -> InvoiceExtractionResponse:
    """Run OCR + Finance Agent extraction pipeline."""
    # Step 1: OCR
    raw_text = await extract_text_from_url(file_url)

    if not raw_text:
        # No text extracted — still run finance agent with empty text
        raw_text = "[No text extracted from document]"

    # Step 2: Finance Agent extraction
    # Pass as "user note: (none)" + document content
    combined = f"User note: Direct invoice extraction request.\n\n--- Document Content ---\n{raw_text}"
    raw_result = await _extract_invoice_data(combined)

    # Step 3: Build response
    agent_response = _build_response(raw_result)
    structured = agent_response.structured_data

    line_items = [
        LineItem(
            description=item.get("description"),
            quantity=item.get("quantity"),
            unit_price=item.get("unit_price"),
            total=item.get("total"),
        )
        for item in structured.get("line_items", [])
    ]

    return InvoiceExtractionResponse(
        document_type=structured.get("document_type", "invoice"),
        vendor_name=structured.get("vendor_name"),
        vendor_contact=structured.get("vendor_contact"),
        invoice_number=structured.get("invoice_number"),
        invoice_date=structured.get("invoice_date"),
        due_date=structured.get("due_date"),
        payment_terms=structured.get("payment_terms"),
        currency=structured.get("currency", "USD"),
        subtotal=structured.get("subtotal"),
        tax_amount=structured.get("tax_amount"),
        total_amount=structured.get("total_amount"),
        line_items=line_items,
        payment_recommendation=structured.get("payment_recommendation", "review"),
        anomalies=structured.get("anomalies", []),
        action_items=agent_response.action_items,
        summary=agent_response.summary,
        confidence=agent_response.confidence,
        raw_text_length=len(raw_text),
    )
