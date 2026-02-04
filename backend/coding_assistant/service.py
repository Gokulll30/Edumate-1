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


# ======================================================
# NEW: Execution Result Analysis & Optimization Check
# ======================================================

def analyze_execution_result(problem, user_code, execution_result, language="python"):
    """
    Uses Gemini to:
    1. Explain failure (if failed)
    2. Check for complexity/optimization (if passed)
    """

    try:
        # If all tests passed, check optimization
        if execution_result.get("passed") is True:
            prompt = f"""
You are a strict coding interviewer.
The user solved the problem "{problem['title']}" in {language}.

User Code:
{user_code}

Task:
1. Determine the Time and Space Complexity of this code.
2. Is this the most optimal solution? (Yes/No)
3. If No, briefly suggest the optimal approach (don't write code).
4. Provide a very short positive reinforcement.

Output Format (JSON):
{{
  "is_optimized": true/false,
  "complexity": "Time: O(...), Space: O(...)",
  "message": "Start with 'You can optimize your code by thinking a bit more' if not optimized. Otherwise praise."
}}
"""
            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={'response_mime_type': 'application/json'}
            )
            
            return json.loads(response.text)

        # If failed, explain error
        else:
            failed_cases = [
                tc for tc in execution_result.get("testResults", [])
                if not tc.get("passed")
            ]
            first_fail = failed_cases[0] if failed_cases else {}

            prompt = f"""
You are a coding mentor which helps the user to debug code.
Problem: {problem['title']}
Language: {language}

User Code:
{user_code}

Failed Test Case:
Input: {first_fail.get('input')}
Expected: {first_fail.get('expected')}
Actual: {first_fail.get('actual')}
Error: {first_fail.get('error')}

Task:
Explain the logical error or syntax error clearly. Give a small hint.
"""
            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            return {
                "is_optimized": False,
                "complexity": "N/A",
                "message": response.text.strip()
            }

    except Exception as e:
        return {
            "is_optimized": False,
            "complexity": "Unknown",
            "message": f"Analysis unavailable: {str(e)}"
        }

def evaluate_code_with_gemini(language, code, problem):
    """
    Simulates execution for C++, Java, JS using Gemini.
    """
    try:
        test_cases_str = json.dumps(problem.get("test_cases", []))
        
        prompt = f"""
You are a code execution engine.
Language: {language}
Problem: {problem['title']}
Function Name: {problem['function_name']}

User Code:
{code}

Test Cases:
{test_cases_str}

Task:
1. "Run" the code mentally against each test case.
2. Verify if it compiles/interprets correctly.
3. Return results in strict JSON format.

Output JSON Structure:
{{
  "passed": true/false,  // verified all tests
  "testResults": [
    {{
      "input": "...",
      "expected": "...",
      "actual": "...",
      "passed": true/false,
      "error": "error message or null"
    }}
  ]
}}
"""
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        
        return json.loads(response.text)

    except Exception as e:
        return {
            "passed": False,
            "testResults": [
                {
                    "input": "System Error",
                    "passed": False,
                    "error": f"Gemini Execution Failed: {str(e)}"
                }
            ]
        }
