from typing import IO

def read_txt(file_stream: IO[bytes]) -> str:
    data = file_stream.read()
    try:
        return data.decode("utf-8", errors="ignore")
    except Exception:
        return data.decode("latin-1", errors="ignore")

def clamp(s: str, limit: int = 12000) -> str:
    if not s:
        return s
    s = s.strip()
    if len(s) <= limit:
        return s
    return s[:limit]
