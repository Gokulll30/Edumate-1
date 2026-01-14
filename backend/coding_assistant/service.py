import os
import google as genai
from .prompts import build_prompt
from .language_handlers.python import python_rules
from .language_handlers.cpp import cpp_rules
from .language_handlers.javascript import js_rules

# ------------------ GEMINI CONFIG ------------------
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-pro")

# ------------------ LANGUAGE RULES ------------------
LANGUAGE_RULES = {
    "python": python_rules,
    "cpp": cpp_rules,
    "javascript": js_rules
}

# ------------------ SIMPLE RATE LIMIT (5 CALLS) ------------------
# (Same idea as quiz generator – in-memory, per server run)
REQUEST_COUNT = 0
MAX_REQUESTS = 5

def process_code_query(language, question, code, task):
    global REQUEST_COUNT

    if REQUEST_COUNT >= MAX_REQUESTS:
        return {
            "error": "API limit reached. Please try again later."
        }

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
        REQUEST_COUNT += 1

        response = model.generate_content(prompt)

        return {
            "language": language,
            "answer": response.text
        }

    except Exception as e:
        return {
            "error": f"Gemini API error: {str(e)}"
        }
