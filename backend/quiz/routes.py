from flask import Blueprint, request, jsonify
import db
import os
import json

quiz_bp = Blueprint("quiz", __name__, url_prefix="/quiz")

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    import requests
except ImportError:
    requests = None


def extract_text_from_pdf(file):
    if not PyPDF2:
        return ""
    try:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception:
        return ""


def clamp(s: str, limit: int = 12000) -> str:
    if not s:
        return s
    s = s.strip()
    return s[:limit] if len(s) > limit else s


def build_prompt(notes: str, num_q: int, difficulty: str) -> str:
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
Notes:
\"\"\"{notes}\"\"\"
""".strip()
    return prompt


def normalize(items):
    map_letter = {"A": 0, "B": 1, "C": 2, "D": 3}
    result = []
    for item in items:
        opts = [str(x) for x in item.get("options", [])][:4]
        while len(opts) < 4:
            opts.append("N/A")
        answer_letter = str(item.get("answer", "A")).strip().upper()
        idx = map_letter.get(answer_letter, 0)
        result.append({
            "question": str(item.get("question", "")).strip(),
            "options": opts,
            "answerIndex": idx,
            "answerLetter": answer_letter if answer_letter in "ABCD" else "A",
            "explanation": str(item.get("explanation", "")).strip(),
            "difficulty": str(item.get("difficulty", "mixed")).strip(),
            "topic": str(item.get("topic", "General")).strip(),
        })
    return result


@quiz_bp.route("/upload", methods=["POST"])
def upload_quiz():
    if requests is None:
        return jsonify({"success": False, "error": "requests library not installed"}), 500

    key = os.getenv("GROQ_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not key:
        return jsonify({"success": False, "error": "API key not configured"}), 500

    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "File part missing"}), 400

        file = request.files['file']
        filename = (file.filename or '').lower()

        if filename.endswith(".pdf"):
            content = extract_text_from_pdf(file)
        else:
            content = file.read().decode('utf-8')

        content = clamp(content, 12000)
        if len(content) < 50:
            return jsonify({"success": False, "error": "Insufficient text"}), 400

        num_q = int(request.form.get("num_q", "5"))
        difficulty = request.form.get("difficulty", "mixed")
        prompt = build_prompt(content, num_q, difficulty)

        api_url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        }
        body = {
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 2048
        }

        resp = requests.post(api_url, headers=headers, json=body)
        if resp.status_code != 200:
            return jsonify({"success": False, "error": f"API error: {resp.text}"}), 500

        resp_json = resp.json()
        choices = resp_json.get("choices", [])
        if not choices or "message" not in choices[0]:
            return jsonify({"success": False, "error": "Malformed API response"}), 500

        text_content = choices[0]["message"]["content"]
        first_bracket = text_content.find("[")
        last_bracket = text_content.rfind("]")
        if first_bracket == -1 or last_bracket == -1 or last_bracket <= first_bracket:
            return jsonify({"success": False, "error": "Malformed API JSON"}), 500

        json_str = text_content[first_bracket:last_bracket+1]

        try:
            items = json.loads(json_str)
        except Exception:
            return jsonify({"success": False, "error": "Failed to parse JSON"}), 500

        quiz = normalize(items)
        return jsonify({"success": True, "quiz": quiz})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@quiz_bp.route("", methods=["POST"])
def save_quiz():
    try:
        data = request.get_json()
        user_id = data.get("userId")
        user_name = data.get("userName")  # Add this line
        subject = data.get("subject", "")
        difficulty = data.get("difficulty", "")
        num_questions = data.get("num_questions", 0)
        score = data.get("score", 0.0)
        answers = data.get("answers", [])

        if not user_id or num_questions <= 0 or not isinstance(answers, list) or not user_name:
            return jsonify({"success": False, "error": "Invalid input"}), 400

        db.save_quiz_attempt(
            user_id=user_id,
            user_name=user_name,  # Pass username here
            subject=subject,
            difficulty=difficulty,
            num_questions=num_questions,
            score=score,
            qnas=answers
        )
        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@quiz_bp.route("/check", methods=["POST"])
def check_quiz_answer():
    try:
        data = request.get_json()
        quiz = data.get("quiz", [])
        questionIndex = int(data.get("questionIndex", 0))
        selectedIndex = int(data.get("selectedIndex", -1))

        if not quiz or questionIndex >= len(quiz):
            return jsonify({"error": "Invalid questionIndex"}), 400

        item = quiz[questionIndex]
        correctIndex = item.get("answerIndex", 0)
        correctLetter = item.get("answerLetter", "A")
        explanation = item.get("explanation", "")
        is_correct = (selectedIndex == correctIndex)

        return jsonify({
            "correct": is_correct,
            "correctIndex": correctIndex,
            "correctLetter": correctLetter,
            "explanation": explanation
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
