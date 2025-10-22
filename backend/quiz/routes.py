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

import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from auth.routes import decode_auth_token

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

def get_user_from_token():
    """Helper function to get user from auth token"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None

    user_data = decode_auth_token(token)
    if user_data and "username" in user_data:
        db = get_db()
        user = db.execute('SELECT * FROM users WHERE username = ?', (user_data["username"],)).fetchone()
        return dict(user) if user else None

    return None

# Placeholder function for quiz retake scheduling
def schedule_quiz_retake_if_needed(user_id, topic, taken_at, score, total_questions):
    try:
        percentage = (score / total_questions) * 100 if total_questions else 0
        if percentage < 60:
            print(f"📚 User {user_id} needs retake for {topic} (scored {percentage:.1f}%)")
        # Retake logic can be added here if needed
    except Exception as e:
        print(f"Error in retake scheduling: {e}")
        pass

@quiz_bp.route("/upload", methods=["POST", "OPTIONS"])
def upload_and_generate():
    # Handle preflight
    if request.method == "OPTIONS":
        response = jsonify()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

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
        import traceback
        traceback.print_exc()
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
        user = get_user_from_token()
        data = request.get_json(force=True)
        username = user["username"] if user else data.get("username")
        user_id = user["id"] if user else None
        score = data.get("score")
        num_questions = data.get("num_questions")  # <-- fixed
        topic = data.get("topic", "General")
        difficulty = data.get("difficulty", "mixed")
        time_taken = data.get("time_taken", 0)
        qnas = data.get("qnas", [])  # List of quiz answers

        if not username or score is None or num_questions is None:
            return jsonify({"success": False, "error": "Missing required fields"}), 400
        percentage = round((score / num_questions) * 100, 2)
        db = get_db()
        # Create table if not exists
        db.execute("""
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT NOT NULL,
            score INTEGER NOT NULL,
            num_questions INTEGER NOT NULL,
            percentage REAL NOT NULL,
            topic TEXT,
            difficulty TEXT,
            time_taken INTEGER,
            taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """)
        db.execute("""
        CREATE TABLE IF NOT EXISTS quiz_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            attempt_id INTEGER NOT NULL,
            user_name TEXT,
            question TEXT NOT NULL,
            correct_answer TEXT NOT NULL,
            user_answer TEXT NOT NULL,
            is_correct INTEGER NOT NULL,
            explanation TEXT,
            FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id)
        )
        """)
        # Insert quiz attempt and get its id
        cursor = db.execute("""
            INSERT INTO quiz_attempts
            (user_id, username, score, num_questions, percentage, topic, difficulty, time_taken)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, username, score, num_questions, percentage, topic, difficulty, time_taken))
        attempt_id = cursor.lastrowid

        # Insert each quiz answer record
        for qa in qnas:
            question = qa.get('question', '')
            correct_answer = qa.get('correct_answer', '')
            user_answer = qa.get('user_answer', '')
            is_correct = 1 if qa.get('is_correct') else 0
            explanation = qa.get('explanation', '')
            db.execute("""
                INSERT INTO quiz_answers
                (attempt_id, user_name, question, correct_answer, user_answer, is_correct, explanation)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (attempt_id, username, question, correct_answer, user_answer, is_correct, explanation))
        db.commit()

        # Fetch taken_at from this newly inserted attempt
        row = db.execute("SELECT taken_at FROM quiz_attempts WHERE id = ?", (attempt_id,)).fetchone()
        taken_at = row['taken_at'] if row else None
        # Schedule retake if desired (implement or comment this out)
        # if taken_at is not None:
        #    schedule_quiz_retake_if_needed(user_id, topic, taken_at, score, num_questions)

        return jsonify({"success": True, "message": "Quiz result and answers saved successfully", "percentage": percentage})

    except Exception as e:
        print(f"Error in save_quiz_result: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@quiz_bp.route("/history", methods=["GET"])
def quiz_history():
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Authentication required"}), 401
    try:
        limit = int(request.args.get("limit", 50))
        db = get_db()
        attempts = db.execute("""
            SELECT id, score, num_questions, percentage, topic, difficulty, time_taken, taken_at as created_at
            FROM quiz_attempts 
            WHERE user_id = ? OR username = ?
            ORDER BY taken_at DESC 
            LIMIT ?
        """, (user["id"], user["username"], limit)).fetchall()
        return jsonify({
            "success": True,
            "data": [dict(attempt) for attempt in attempts]
        })
    except Exception as e:
        print(f"Quiz history error: {e}")
        return jsonify({"error": "Failed to get quiz history"}), 500

@quiz_bp.route("/stats", methods=["GET"])
def quiz_stats():
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Authentication required"}), 401
    try:
        db = get_db()
        stats = db.execute("""
            SELECT
                COUNT(*) as total_attempts,
                ROUND(AVG(percentage), 2) as avg_percentage,
                MAX(percentage) as best_score,
                MAX(taken_at) as last_attempt
            FROM quiz_attempts
            WHERE user_id = ? OR username = ?
        """, (user["id"], user["username"])).fetchone()
        if stats and stats['total_attempts'] > 0:
            result = {
                'total_attempts': stats['total_attempts'],
                'avg_percentage': float(stats['avg_percentage'] or 0),
                'best_score': int(stats['best_score'] or 0),
                'last_attempt': stats['last_attempt']
            }
        else:
            result = {
                'total_attempts': 0,
                'avg_percentage': 0,
                'best_score': 0,
                'last_attempt': None
            }
        return jsonify({
            "success": True,
            "data": result
        })
    except Exception as e:
        print(f"Quiz stats error: {e}")
        return jsonify({"error": "Failed to get quiz stats"}), 500

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
                MAX(taken_at) as last_attempt
            FROM quiz_attempts
            WHERE username = ?
        """, (username,)).fetchone()
        recent_attempts = db.execute("""
            SELECT score, num_questions, percentage, topic, difficulty,
                   time_taken, taken_at as created_at
            FROM quiz_attempts
            WHERE username = ?
            ORDER BY taken_at DESC
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