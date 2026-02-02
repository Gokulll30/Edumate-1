import os
from google import genai

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def analyze_execution(problem, code, execution_result):
    prompt = f"""
You are a coding interview evaluator.

Problem:
{problem['title']}

Description:
{problem['description']}

User Code:
{code}

Execution Result:
{execution_result}

Explain clearly:
1. Why the code failed or passed
2. List errors in simple technical terms
3. Give ONE short hint to fix the issue
4. If multiple test cases failed, explain each briefly

Keep response professional and concise.
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text
