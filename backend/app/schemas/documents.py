from typing import Any, List, Optional
from pydantic import BaseModel, field_validator


class InvoiceExtractionRequest(BaseModel):
    file_url: str

    @field_validator("file_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith("https://"):
            raise ValueError("file_url must be an HTTPS URL")
        return v


class LineItem(BaseModel):
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    total: Optional[float] = None


class InvoiceExtractionResponse(BaseModel):
    document_type: str
    vendor_name: Optional[str]
    vendor_contact: Optional[str]
    invoice_number: Optional[str]
    invoice_date: Optional[str]
    due_date: Optional[str]
    payment_terms: Optional[str]
    currency: str
    subtotal: Optional[float]
    tax_amount: Optional[float]
    total_amount: Optional[float]
    line_items: List[LineItem]
    payment_recommendation: str
    anomalies: List[str]
    action_items: List[str]
    summary: str
    confidence: float
    raw_text_length: int  # How many chars OCR extracted
