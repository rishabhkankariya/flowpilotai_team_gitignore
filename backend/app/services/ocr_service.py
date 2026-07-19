"""
OCR Service

Downloads files from Supabase Storage URLs and extracts text using Tesseract.

System requirements:
  - tesseract-ocr: sudo apt-get install tesseract-ocr
  - poppler-utils: sudo apt-get install poppler-utils  (for PDF support)
"""
import asyncio
import io
import re
import os
import structlog
from typing import Optional
import httpx
from PIL import Image
import pytesseract

logger = structlog.get_logger(__name__)

# Windows: set tesseract path if not in system PATH
_tess_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(_tess_path):
    pytesseract.pytesseract.tesseract_cmd = _tess_path

SUPPORTED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg"}
PDF_CONTENT_TYPE = "application/pdf"
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15MB
OCR_TIMEOUT_SECONDS = 30
OCR_DPI = 300
OCR_LANG = "eng"


class OCRError(Exception):
    """Raised when OCR processing fails unrecoverably."""
    pass


async def extract_text_from_url(file_url: str) -> str:
    """
    Download a file from a Supabase Storage URL and extract text via OCR.

    Args:
        file_url: HTTPS public URL from Supabase Storage

    Returns:
        Extracted text string (empty string if no text found)

    Raises:
        OCRError: If file cannot be downloaded or is unsupported type
    """
    try:
        return await asyncio.wait_for(
            _extract(file_url),
            timeout=OCR_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        logger.warning("ocr_timeout", file_url=file_url, timeout=OCR_TIMEOUT_SECONDS)
        return ""
    except OCRError:
        raise
    except Exception as exc:
        logger.error("ocr_unexpected_error", file_url=file_url, error=str(exc))
        return ""


async def _extract(file_url: str) -> str:
    """Internal extraction logic."""
    # Download file
    file_bytes, content_type = await _download_file(file_url)

    if not file_bytes:
        return ""

    # Determine file type
    ext = _get_extension(file_url).lower()
    is_pdf = (content_type == PDF_CONTENT_TYPE) or (ext == ".pdf")
    is_image = (content_type in SUPPORTED_IMAGE_TYPES) or (
        ext in {".png", ".jpg", ".jpeg"}
    )

    if is_pdf:
        return await asyncio.to_thread(_ocr_pdf, file_bytes)
    elif is_image:
        return await asyncio.to_thread(_ocr_image, file_bytes)
    else:
        logger.warning("ocr_unsupported_type", content_type=content_type, ext=ext)
        return ""


async def _download_file(url: str) -> tuple[bytes, str]:
    """Download file from URL. Returns (bytes, content_type)."""
    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        response = await client.get(url)
        response.raise_for_status()

        content_type = response.headers.get("content-type", "").split(";")[0].strip()
        content_length_str = response.headers.get("content-length")
        content_length = int(content_length_str) if content_length_str else 0

        if content_length > MAX_FILE_SIZE_BYTES:
            raise OCRError(f"File too large for OCR: {content_length} bytes")

        file_bytes = response.content
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise OCRError("File exceeds maximum size for OCR processing")

        logger.info(
            "ocr_file_downloaded",
            url=url[:80],
            size_bytes=len(file_bytes),
            content_type=content_type,
        )

        return file_bytes, content_type


def _ocr_pdf(file_bytes: bytes) -> str:
    """Convert PDF to images and run OCR on each page. Blocking — run in thread."""
    from pdf2image import convert_from_bytes

    try:
        images = convert_from_bytes(
            file_bytes,
            dpi=OCR_DPI,
            fmt="PNG",
        )
    except Exception as exc:
        logger.error("pdf_conversion_failed", error=str(exc))
        return ""

    if not images:
        return ""

    page_texts = []
    for i, image in enumerate(images, start=1):
        try:
            text = pytesseract.image_to_string(image, lang=OCR_LANG)
            cleaned = _clean_text(text)
            if cleaned:
                if len(images) > 1:
                    page_texts.append(f"--- Page {i} ---\n{cleaned}")
                else:
                    page_texts.append(cleaned)
        except Exception as exc:
            logger.warning("ocr_page_failed", page=i, error=str(exc))
            continue

    result = "\n\n".join(page_texts)
    logger.info("ocr_pdf_complete", pages=len(images), chars_extracted=len(result))
    return result


def _ocr_image(file_bytes: bytes) -> str:
    """Run OCR on a single image. Blocking — run in thread."""
    try:
        image = Image.open(io.BytesIO(file_bytes))
        # Convert to RGB if necessary (e.g., RGBA PNG)
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")  # type: ignore[assignment]

        text = pytesseract.image_to_string(image, lang=OCR_LANG)
        result = _clean_text(text)
        logger.info("ocr_image_complete", chars_extracted=len(result))
        return result
    except Exception as exc:
        logger.error("ocr_image_failed", error=str(exc))
        return ""


def _clean_text(raw: str) -> str:
    """Clean OCR output: normalize whitespace, remove garbage characters."""
    if not raw:
        return ""

    # Remove non-printable characters except newlines and tabs
    cleaned = re.sub(r"[^\x20-\x7E\n\t]", "", raw)
    # Normalize multiple spaces to single space
    cleaned = re.sub(r" {3,}", "  ", cleaned)
    # Normalize multiple newlines to max 2
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    # Strip leading/trailing whitespace
    cleaned = cleaned.strip()

    return cleaned


def _get_extension(url: str) -> str:
    """Extract file extension from URL path."""
    path = url.split("?")[0]  # Remove query params
    _, ext = os.path.splitext(path)
    return ext
