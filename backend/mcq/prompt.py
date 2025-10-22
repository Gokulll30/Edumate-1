MCQ_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "required": ["question", "options", "answer", "explanation", "difficulty", "topic", "question_type"],
        "properties": {
            "question": {"type": "string"},
            "options": {"type": "array", "items": {"type": "string"}},
            "answer": {"type": "string", "enum": ["A", "B", "C", "D"]},
            "explanation": {"type": "string"},
            "difficulty": {"type": "string", "enum": ["easy", "medium", "hard", "mixed"]},
            "topic": {"type": "string"},
            "question_type": {"type": "string", "enum": ["conceptual", "calculation", "application"]}
        }
    }
}

def build_mcq_prompt(text, num_q, difficulty="mixed"):
    # Determine problem-solving question distribution based on difficulty
    if difficulty == "easy":
        problem_percentage = "15-20%"
        complexity_note = "simple calculations, direct formula applications"
    elif difficulty == "medium":
        problem_percentage = "25-30%" 
        complexity_note = "moderate calculations, multi-step problems, formula derivations"
    elif difficulty == "hard":
        problem_percentage = "30-40%"
        complexity_note = "complex calculations, multi-concept problems, advanced formula manipulations"
    else:  # mixed
        problem_percentage = "20-30%"
        complexity_note = "varied calculation complexity across difficulty levels"

    prompt = f"""Given the notes below, create exactly {num_q} contextually correct multiple-choice questions (MCQs) for a comprehensive technical quiz.

QUESTION TYPE DISTRIBUTION:
- If the notes contain mathematical formulas, equations, numerical examples, or problem-solving content, ensure {problem_percentage} of questions are calculation/problem-solving based
- Remaining questions should be conceptual/theoretical based on the content
- For calculation questions, include {complexity_note}

STRICT RULES:
- Only use content, facts, terminology, formulas, and numerical data from the supplied notes
- Each question must have exactly four options labeled "A", "B", "C", "D", all options must make sense for the question and be informed by the notes; never use generic placeholders
- For calculation questions:
  * Show any necessary formulas or given values in the question
  * Include realistic numerical options with common mistake answers as distractors
  * Ensure calculations can be solved using information provided in the notes
- Mark the correct answer using one of "A", "B", "C", or "D"
- Give a concise answer explanation, including calculation steps for mathematical questions
- Include 'difficulty', 'topic', and 'question_type' for each MCQ
- Question types: "conceptual" (theory/definitions), "calculation" (numerical problems), "application" (applying concepts to scenarios)

MATHEMATICAL QUESTION GUIDELINES:
- Extract formulas, equations, constants, and numerical examples from the notes
- Create problems that test understanding of mathematical relationships
- Include unit conversions, substitutions, and multi-step calculations where applicable
- Use realistic values and scenarios based on the note content

Always return only a compact JSON array, where each item has:
{{ "question": "...", "options": ["...","...","...","..."], "answer": "A", "explanation": "...", "difficulty": "...", "topic": "...", "question_type": "..." }}

Example JSON outputs:

Conceptual Question:
{{
"question": "What is the primary function of...",
"options": ["Option A","Option B","Option C","Option D"],
"answer": "A",
"explanation": "According to the notes...",
"difficulty": "medium",
"topic": "Database Systems",
"question_type": "conceptual"
}}

Calculation Question:
{{
"question": "Given that Force = Mass × Acceleration, if an object has mass 5 kg and acceleration 2 m/s², what is the force?",
"options": ["8 N","10 N","12 N","15 N"],
"answer": "B",
"explanation": "Using F = ma, F = 5 kg × 2 m/s² = 10 N",
"difficulty": "easy",
"topic": "Physics - Newton's Laws",
"question_type": "calculation"
}}

Difficulty preference: {difficulty}

NOTES:
{text}

Return only the JSON array, nothing else."""
    
    return prompt
