import PyPDF2
import io

def read_pdf(stream: io.BytesIO, page_limit: int = 50) -> str:
    """Extract text from PDF stream"""
    try:
        pdf_reader = PyPDF2.PdfReader(stream)
        text = ""
        max_pages = min(len(pdf_reader.pages), page_limit)
        
        for page_num in range(max_pages):
            page = pdf_reader.pages[page_num]
            text += page.extract_text() + "\n"
        
        return text.strip()
    except Exception as e:
        raise Exception(f"Error reading PDF: {str(e)}")
