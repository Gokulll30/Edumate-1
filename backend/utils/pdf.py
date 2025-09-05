from typing import IO
from PyPDF2 import PdfReader

def read_pdf(file_stream: IO[bytes]) -> str:
    reader = PdfReader(file_stream)
    parts = []
    for page in reader.pages:
        txt = page.extract_text() or ""
        parts.append(txt)
    return "\n".join(parts).strip()
