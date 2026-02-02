def build_prompt(language, task, question, code, rules):
    return f"""
You are an expert {language} coding assistant.

Rules:
{rules}

Task Type: {task}

User Question:
{question}

User Code (if any):
{code}

Instructions:
- Explain step by step
- Use simple language
- Optimize when possible
- Mention time & space complexity
- Follow best practices
"""
