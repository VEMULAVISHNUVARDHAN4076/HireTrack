import io
import re
import zipfile

from werkzeug.utils import secure_filename

from app.errors import ApiError

MAX_TEXT_CHARS = 100_000
MAX_PDF_PAGES = 50
MIME_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def _is_docx(data):
    if not data.startswith(b"PK\x03\x04"):
        return False
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            return "word/document.xml" in archive.namelist()
    except zipfile.BadZipFile:
        return False


def validate_upload(filename, data, max_bytes):
    """Check extension, size and magic bytes. Returns (safe_filename, extension)."""
    safe_name = secure_filename(filename or "") or "resume"
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
    if ext not in MIME_TYPES:
        raise ApiError("Only PDF and DOCX files are allowed.", 415)
    if not data:
        raise ApiError("The uploaded file is empty.", 400)
    if len(data) > max_bytes:
        raise ApiError("The file exceeds the 5 MB size limit.", 413)
    if ext == "pdf" and not data.startswith(b"%PDF-"):
        raise ApiError("The file content does not match a PDF.", 415)
    if ext == "docx" and not _is_docx(data):
        raise ApiError("The file content does not match a DOCX document.", 415)
    return safe_name, ext


def clean_text(text):
    text = "".join(ch for ch in text if ch.isprintable() or ch in "\n\t")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text[:MAX_TEXT_CHARS]


def _extract_pdf(data):
    import fitz  # PyMuPDF

    try:
        document = fitz.open(stream=data, filetype="pdf")
    except Exception:
        raise ApiError("The PDF could not be read.", 422)
    try:
        if document.is_encrypted:
            raise ApiError("Password-protected PDFs are not supported.", 422)
        if document.page_count > MAX_PDF_PAGES:
            raise ApiError(f"PDF has too many pages (maximum {MAX_PDF_PAGES}).", 422)
        return "\n".join(page.get_text() for page in document)
    finally:
        document.close()


def _extract_docx(data):
    from docx import Document

    try:
        document = Document(io.BytesIO(data))
    except Exception:
        raise ApiError("The DOCX file could not be read.", 422)
    parts = [paragraph.text for paragraph in document.paragraphs]
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                parts.append(cell.text)
    return "\n".join(parts)


def extract_text(ext, data):
    raw = _extract_pdf(data) if ext == "pdf" else _extract_docx(data)
    cleaned = clean_text(raw)
    if not cleaned:
        raise ApiError("No readable text was found. Scanned images are not supported without OCR.", 422)
    return cleaned
