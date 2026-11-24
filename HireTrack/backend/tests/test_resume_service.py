import pytest

from app.errors import ApiError
from app.services.resume_service import clean_text, validate_upload
from tests.conftest import sample_docx_bytes, sample_pdf_bytes


def test_rejects_disallowed_extension(app):
    with pytest.raises(ApiError) as exc:
        validate_upload("evil.exe", b"MZ....", 1000)
    assert exc.value.status == 415


def test_rejects_pdf_extension_with_wrong_content(app):
    with pytest.raises(ApiError) as exc:
        validate_upload("resume.pdf", b"<html>not a pdf</html>", 1000)
    assert exc.value.status == 415


def test_rejects_oversized_file(app):
    with pytest.raises(ApiError) as exc:
        validate_upload("resume.pdf", b"%PDF-1.4 " + b"x" * 100, 50)
    assert exc.value.status == 413


def test_sanitises_path_in_filename(app):
    name, ext = validate_upload("../../etc/cv.pdf", b"%PDF-1.4 data", 1000)
    assert "/" not in name and ext == "pdf"


def test_clean_text_removes_control_characters_and_extra_blank_lines(app):
    assert clean_text("a\x00b\n\n\n\nc   d") == "ab\n\nc d"


def test_docx_accepted_by_magic_bytes(app):
    data = sample_docx_bytes("Python developer")
    name, ext = validate_upload("cv.docx", data, 10_000_000)
    assert ext == "docx"


def test_pdf_text_extraction(app):
    from app.services.resume_service import extract_text

    text = extract_text("pdf", sample_pdf_bytes("Experienced Python developer"))
    assert "Python" in text
