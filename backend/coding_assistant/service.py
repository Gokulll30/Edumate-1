import os
from google import genai

# ===============================
# Gemini Initialization
# ===============================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in environment variables")

gemini_client = genai.Client(api_key=GEMINI_API_KEY)


class CodingAssistantService:
    """
    Coding Assistant Service
    Uses Gemini to explain, debug, or improve code
    """

    @staticmethod
    def process_request(language: str, question: str, code: str | None, task: str) -> dict:
        """
        Main entry point for Coding Assistant
        """

        try:
            prompt = CodingAssistantService._build_prompt(
                language=language,
                question=question,
                code=code,
                task=task
            )

            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            return {
                "success": True,
                "answer": response.text.strip()
            }

        except Exception as e:
            print(f"[Coding Assistant] ❌ Error: {str(e)}")
            return {
                "success": False,
                "error": "Failed to generate response"
            }

    # ===============================
    # Prompt Builder
    # ===============================
    @staticmethod
    def _build_prompt(language: str, question: str, code: str | None, task: str) -> str:
        base_instruction = f"""
You are an expert programming tutor.

Language: {language}
Task: {task}

Rules:
- Be clear and beginner-friendly
- Explain step-by-step
- Use examples if helpful
- Do NOT use markdown formatting
"""

        if code:
            return f"""{base_instruction}

User Question:
{question}

User Code:
{code}

Explain what the code does, identify issues if any, and suggest improvements.
"""
        else:
            return f"""{base_instruction}

User Question:
{question}

Provide a clear and structured explanation.
"""
