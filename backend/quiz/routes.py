import io
import os
import json
import sqlite3
from flask import Blueprint, request, jsonify, g
from google import genai
from utils.pdf import read_pdf
from utils.text import read_txt, clamp
from mcq.prompt import MCQ_SCHEMA, build_mcq_prompt
from mcq.parser import normalize_mcqs
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

@quiz_bp.route("/upload", methods=["POST"])
def upload_and_generate():
    try:
        if "file" not in request.files:
            return jsonify({"success": False, "error": "file field is required"}), 400

        f = request.files["file"]
        filename = f.filename or ""
        ext = filename.lower().strip()

        stream = io.BytesIO(f.read())

        if ext.endswith(".pdf"):
            text = read_pdf(stream)
        elif ext.endswith(".txt"):
            text = read_txt(stream)
        else:
            return jsonify({"success": False, "error": "Only PDF and TXT files are supported"}), 400

        text = clamp(text, limit=12000)
        if not text or len(text) < 50:
            return jsonify({"success": False, "error": "File has insufficient text to create a quiz"}), 400

        num_q = int(request.form.get("numq", 5))
        difficulty = request.form.get("difficulty", "mixed")

        prompt = build_mcq_prompt(text, num_q=num_q, difficulty=difficulty)

        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": MCQ_SCHEMA,
            }
        )

        raw_json = response.text
        data = json.loads(raw_json)
        quiz = normalize_mcqs(data)

        return jsonify({"success": True, "quiz": quiz})

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@quiz_bp.route("/check", methods=["POST"])
def check_answer():
    try:
        payload = request.get_json(force=True)
        quiz = payload["quiz"]
        qi = int(payload["questionIndex"])
        sel = int(payload["selectedIndex"])

        item = quiz[qi]
        corr_idx = int(item.get("answerIndex", 0))
        corr_letter = item.get("answerLetter", "A")
        explanation = item.get("explanation", "")

        return jsonify({
            "success": True,
            "correct": sel == corr_idx,
            "correctIndex": corr_idx,
            "correctLetter": corr_letter,
            "explanation": explanation
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
        time_taken = data.get("time_taken", 0)

        if not username or score is None or not total_questions:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        db.execute("""
            INSERT INTO quiz_attempts 
            (username, score, total_questions, percentage, topic, difficulty, time_taken)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (username, score, total_questions, percentage, topic, difficulty, time_taken))
        db.commit()

        return jsonify({"success": True, "message": "Quiz result saved successfully", "percentage": percentage})

    except Exception as e:
        print(f"Error in save_quiz_result: {str(e)}")
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
        print(f"Error in get_user_quiz_stats: {str(e)}")
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

        return jsonify({"success": True, "leaderboard": [dict(user) for user in leaderboard]})

    except Exception as e:
        print(f"Error in get_leaderboard: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500
