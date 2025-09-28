MCQ_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "required": ["question", "options", "answer", "explanation", "difficulty", "topic"],
        "properties": {
            "question": {"type": "string"},
            "options": {"type": "array", "items": {"type": "string"}},
            "answer": {"type": "string", "enum": ["A", "B", "C", "D"]},
            "explanation": {"type": "string"},
            "difficulty": {"type": "string", "enum": ["easy", "medium", "hard", "mixed"]},
            "topic": {"type": "string"}
        }
    }
}

def build_mcq_prompt(text, num_q, difficulty="mixed"):
    prompt = f"""Given the notes below, create exactly {num_q} contextually correct multiple-choice questions (MCQs) for a technical quiz.
Strict rules:
- Only use content, facts, terminology, and structure from the supplied notes.
- Each question must have exactly four options labeled "A", "B", "C", "D", all options must make sense for the question and be informed by the notes; never use generic placeholders.
- Mark the correct answer using one of "A", "B", "C", or "D".
- Give a concise answer explanation also only from the notes.
- Include a 'difficulty' and 'topic' for each MCQ.
- Always return only a compact JSON array, where each item has:
  {{ "question": "...", "options": ["...","...","...","..."], "answer": "A", "explanation": "...", "difficulty": "...", "topic": "..." }}
Example JSON output:
[
  {{
    "question": "...",
    "options": ["...","...","...","..."],
    "answer": "A",
    "explanation": "...",
    "difficulty": "medium",
    "topic": "Relational Model"
  }}
]

Difficulty preference: {difficulty}

NOTES:
{text}

Return only the JSON array, nothing else."""
    return prompt
