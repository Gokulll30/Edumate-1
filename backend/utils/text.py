import io

def read_txt(stream: io.BytesIO) -> str:
    """Read text from stream"""
    try:
        stream.seek(0)
        content = stream.read()
        return content.decode('utf-8').strip()
    except Exception as e:
        raise Exception(f"Error reading text file: {str(e)}")

def clamp(text: str, limit: int = 12000) -> str:
    """Limit text length"""
    if not text:
        return text
    text = text.strip()
    return text[:limit] if len(text) > limit else text
