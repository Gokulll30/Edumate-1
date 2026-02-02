import os
import json
from google import genai

from .prompts import build_prompt
from .language_handlers.python import python_rules
from .language_handlers.cpp import cpp_rules
from .language_handlers.javascript import js_rules

# ======================================================
# GEMINI SETUP (for Explain Code / Debug Code)
# ======================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not set")

gemini_client = genai.Client(api_key=GEMINI_API_KEY)

LANGUAGE_RULES = {
    "python": python_rules,
    "cpp": cpp_rules,
    "javascript": js_rules
}

# ======================================================
# PATH CONFIG (for Problems JSON)
# ======================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROBLEMS_PATH = os.path.join(BASE_DIR, "data", "problems.json")

# ======================================================
# EXISTING: Explain / Debug Code (Gemini-powered)
# ======================================================

def process_code_query(language: str, question: str, code: str, task: str):
    rules = LANGUAGE_RULES.get(language.lower())
    if not rules:
        return {"success": False, "error": "Unsupported language"}

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

# ======================================================
# NEW: Problems Service (LeetCode-style)
# ======================================================

class CodingAssistantService:
    """
    Handles Problems (JSON-based now, DB later)
    """

    @staticmethod
    def load_all_problems():
        if not os.path.exists(PROBLEMS_PATH):
            return []

        with open(PROBLEMS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def get_problem_summaries():
        """
        Used for problems list page
        """
        problems = CodingAssistantService.load_all_problems()
        return [
            {
                "id": p.get("id"),
                "title": p.get("title"),
                "difficulty": p.get("difficulty")
            }
            for p in problems
        ]

    @staticmethod
    def get_problem_by_id(problem_id: str):
        """
        Used when clicking a problem
        """
        problems = CodingAssistantService.load_all_problems()
        for problem in problems:
            if problem.get("id") == problem_id:
                return problem
        return None

# ======================================================
# NEW: Execution Result Analysis (Gemini-powered)
# ======================================================

def analyze_execution_result(problem, user_code, execution_result):
    """
    Uses Gemini to explain execution errors / failures / success
    """

    prompt = f"""
You are a professional coding interview evaluator.

Problem Title:
{problem.get("title")}

Problem Description:
{problem.get("description")}

Expected Function Name:
{problem.get("function_name")}

User Code:
{user_code}

Execution Result (raw):
{execution_result}

Your task:
1. If the code failed, clearly explain WHY in technical terms.
2. If there are errors, list them clearly (bullet points).
3. Give ONE short hint to fix the issue (not full solution).
4. If multiple test cases failed, explain each briefly.
5. If all test cases passed, confirm correctness concisely.

Keep response short, clear, and professional.
"""

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text

    except Exception as e:
        return f"Analysis failed: {str(e)}"
