MCQ_SCHEMA = {
  "type": "ARRAY",
  "items": {
    "type": "OBJECT",
    "required": ["question", "options", "answer", "explanation", "difficulty", "topic"],
    "properties": {
      "question": {"type": "STRING"},
      "options":  {"type": "ARRAY", "items": {"type": "STRING"}},
      "answer":   {"type": "STRING", "description": "One of A/B/C/D"},
      "explanation": {"type": "STRING"},
      "difficulty": {"type": "STRING", "description": "easy|medium|hard|mixed"},
      "topic": {"type": "STRING"}
    }
  }
}

def build_mcq_prompt(notes: str, num_q: int = 5, difficulty: str = "mixed") -> str:
    return f"""
You are an expert educational content creator.

Create exactly {num_q} multiple-choice questions from the notes below.

Constraints:
- Each MCQ must have exactly 4 options labeled A, B, C, D (in 'options' array).
- 'answer' must be a single letter from "A","B","C","D".
- Provide a one-sentence 'explanation' for why the answer is correct.
- Include 'topic' (e.g., Cryptography, Security Attacks).
- 'difficulty' may be easy/medium/hard or 'mixed'.
- Avoid trivial or ambiguous questions. Use only facts from the notes.

Return only JSON (no prose) matching this schema (already provided in the API request).

Notes:
\"\"\"{notes}\"\"\"
"""
