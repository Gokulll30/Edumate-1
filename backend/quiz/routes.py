import io
import os
import json
import sqlite3
from datetime import datetime

from flask import Blueprint, request, jsonify, g
from google import genai
from utils.pdf import read_pdf
from utils.text import read_txt, clamp
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in environment variables")

client = genai.Client(api_key=GEMINI_API_KEY)

quiz_bp = Blueprint("quiz", __name__)

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect('data/edumate.sqlite3')
        g.db.row_factory = sqlite3.Row
    return g.db

def build_mcq_prompt(text, num_q, difficulty="mixed"):
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

        # Clamp text length (limit parameter, not max_tokens)
        text = clamp(text, limit=12000)

        prompt = build_mcq_prompt(text, num_questions, difficulty)
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt
        )
        quiz_data = json.loads(response.text)

        normalized_quiz = []
        for i, item in enumerate(quiz_data):
            normalized_item = {
                "question": item["question"],
                "options": item["options"],
                "answerIndex": ord(item["answer"]) - ord("A"),
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

        is_correct = selected_index == correct_index

        return jsonify({
            "success": True,
            "correct": is_correct,
            "correctIndex": correct_index,
            "correctLetter": correct_letter,
            "explanation": explanation,
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@quiz_bp.route("/save-result", methods=["POST"])
def save_quiz_result():
    try:
        data = request.get_json(force=True)
        username = data.get("username")
        score = data.get("score")
        total_questions = data.get("total_questions")
        topic = data.get("topic", "General")
        difficulty = data.get("difficulty", "mixed")
        time_taken = data.get("time_taken", 0)  # in seconds

        if not username or score is None or not total_questions:
            return jsonify({"success": False, "error": "Missing required fields: username, score, total_questions"}), 400

        percentage = round((score / total_questions) * 100, 2)
        db = get_db()
        db.execute("""
            CREATE TABLE IF NOT EXISTS quiz_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL,
                percentage REAL NOT NULL,
                topic TEXT,
                difficulty TEXT,
                time_taken INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (username) REFERENCES users (username)
            )
        """)
        db.execute("""
            INSERT INTO quiz_attempts 
            (username, score, total_questions, percentage, topic, difficulty, time_taken)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (username, score, total_questions, percentage, topic, difficulty, time_taken))
        db.commit()

        return jsonify({
            "success": True,
            "message": "Quiz result saved successfully",
            "percentage": percentage
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@quiz_bp.route("/user-stats/<username>", methods=["GET"])
def get_user_quiz_stats(username):
    try:
        db = get_db()
        stats = db.execute("""
            SELECT 
                COUNT(*) as total_attempts,
                ROUND(AVG(percentage), 2) as avg_percentage,
                MAX(percentage) as best_score,
                MIN(percentage) as worst_score,
                MAX(created_at) as last_attempt
            FROM quiz_attempts 
            WHERE username = ?
        """, (username,)).fetchone()

        recent_attempts = db.execute("""
            SELECT score, total_questions, percentage, topic, difficulty, 
                   time_taken, created_at
            FROM quiz_attempts 
            WHERE username = ?
            ORDER BY created_at DESC 
            LIMIT 10
        """, (username,)).fetchall()

        return jsonify({
            "success": True,
            "stats": dict(stats) if stats else None,
            "recent_attempts": [dict(attempt) for attempt in recent_attempts]
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@quiz_bp.route("/leaderboard", methods=["GET"])
def get_leaderboard():
    try:
        db = get_db()
        leaderboard = db.execute("""
            SELECT 
                username,
                COUNT(*) as total_attempts,
                ROUND(AVG(percentage), 2) as avg_percentage,
                MAX(percentage) as best_score
            FROM quiz_attempts 
            GROUP BY username
            ORDER BY avg_percentage DESC, best_score DESC
            LIMIT 10
        """).fetchall()

        return jsonify({
            "success": True,
            "leaderboard": [dict(user) for user in leaderboard]
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
