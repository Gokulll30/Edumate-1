import io
import os
import json

from flask import Blueprint, request, jsonify
from google import genai
from utils.pdf import read_pdf
from utils.text import read_txt, clamp
from dotenv import load_dotenv

load_dotenv()

# Get API key from environment (local .env or Render env vars)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in environment variables")

# Initialize Gemini client
client = genai.Client(api_key=GEMINI_API_KEY)

quiz_bp = Blueprint("quiz", __name__)

def build_mcq_prompt(text, num_q, difficulty="mixed"):
    """Build the exact prompt format you specified"""
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

@quiz_bp.route("/upload", methods=["POST"])
def upload_and_generate():
    """
    Endpoint to upload PDF or TXT notes and generate multiple choice quizzes
    """
    try:
        file = request.files.get("file")
        if not file:
            return jsonify({"success": False, "error": "File is required"}), 400

        filename = file.filename.lower()
        ext = os.path.splitext(filename)[1]

        stream = io.BytesIO(file.read())

        if ext == ".pdf":
            text = read_pdf(stream)
        elif ext == ".txt":
            text = read_txt(stream)
        else:
            return jsonify({"success": False, "error": "Unsupported file type. Use PDF or TXT."}), 400

        if not text.strip():
            return jsonify({"success": False, "error": "Uploaded file contained no extractable text."}), 400

        num_questions = int(request.form.get("numq", 5))
        difficulty = request.form.get("difficulty", "mixed")

        # Clamp text size for prompt token limits
        text = clamp(text, max_tokens=2000)

        # Build MCQ prompt with your exact format
        prompt = build_mcq_prompt(text, num_questions, difficulty)

        # Generate quiz with Gemini API
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt
        )

        # Parse the JSON response
        quiz_data = json.loads(response.text)

        # Normalize the data to ensure consistency
        normalized_quiz = []
        for i, item in enumerate(quiz_data):
            normalized_item = {
                "question": item["question"],
                "options": item["options"],
                "answerIndex": ord(item["answer"]) - ord("A"),  # Convert A,B,C,D to 0,1,2,3
                "answerLetter": item["answer"],
                "explanation": item["explanation"],
                "difficulty": item["difficulty"],
                "topic": item["topic"]
            }
            normalized_quiz.append(normalized_item)

        return jsonify({"success": True, "quiz": normalized_quiz})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@quiz_bp.route("/check", methods=["POST"])
def check_answer():
    """
    Endpoint to check a user's selected answer for a quiz question.
    Expects JSON with quiz, questionIndex, selectedIndex fields.
    """
    try:
        data = request.get_json(force=True)

        quiz = data.get("quiz")
        question_index = data.get("questionIndex")
        selected_index = data.get("selectedIndex")

        if quiz is None or question_index is None or selected_index is None:
            return jsonify({"success": False, "error": "Missing quiz, questionIndex, or selectedIndex"}), 400

        question = quiz[question_index]
        correct_index = question["answerIndex"]
        correct_letter = question.get("answerLetter", "")
        explanation = question.get("explanation", "")

        is_correct = (selected_index == correct_index)

        return jsonify({
            "success": True,
            "correct": is_correct,
            "correctIndex": correct_index,
            "correctLetter": correct_letter,
            "explanation": explanation,
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
