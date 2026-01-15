import os
from google import genai
from .prompts import build_prompt
from .language_handlers.python import python_rules
from .language_handlers.cpp import cpp_rules
from .language_handlers.javascript import js_rules

# Gemini setup
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not set")

gemini_client = genai.Client(api_key=GEMINI_API_KEY)

LANGUAGE_RULES = {
    "python": python_rules,
    "cpp": cpp_rules,
    "javascript": js_rules
}


def process_code_query(language: str, question: str, code: str, task: str):
    rules = LANGUAGE_RULES.get(language.lower())
    if not rules:
        return {"error": "Unsupported language"}

    prompt = build_prompt(
        language=language,
        task=task,
        question=question,
        code=code,
        rules=rules
    )

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return {
            "success": True,
            "language": language,
            "answer": response.text
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
