import io
import os
import json
from flask import Blueprint, request, jsonify
from google import genai
from utils.pdf import read_pdf
from utils.text import read_txt, clamp
from mcq.prompt import MCQ_SCHEMA, build_mcq_prompt
from mcq.parser import normalize_mcqs
from dotenv import load_dotenv
from db import get_db_connection
from auth.routes import decode_auth_token

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in environment variables")

client = genai.Client(api_key=GEMINI_API_KEY)
quiz_bp = Blueprint("quiz", __name__)

def get_user_from_token():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    user_data = decode_auth_token(token)
    if user_data and "username" in user_data:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute('SELECT * FROM users WHERE username = %s', (user_data["username"],))
        user = cur.fetchone()
        cur.close()
        return dict(user) if user else None
    return None

def schedule_quiz_retake_if_needed(user_id, topic, taken_at, score, total_questions):
    # Placeholder for a more advanced scheduling logic
    try:
        percentage = (score / total_questions) * 100 if total_questions else 0
        if percentage < 60:
            print(f"📚 User {user_id} needs retake for {topic} (scored {percentage:.1f}%)")
    except Exception as e:
        print(f"Error in retake scheduling: {e}")

@quiz_bp.route("/upload", methods=["POST", "OPTIONS"])
def upload_and_generate():
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
        total_questions = data.get("total_questions")
        topic = data.get("topic", "General")
        difficulty = data.get("difficulty", "mixed")
        time_taken = data.get("time_taken", 0)
        qnas = data.get("qnas", [])

        if not username or score is None or total_questions is None:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        percentage = round((score / total_questions) * 100, 2)
        conn = get_db_connection()

        # Save attempt
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO quiz_attempts
            (user_id, username, topic, difficulty, score, total_questions, percentage, time_taken)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (user_id, username, topic, difficulty, score, total_questions, percentage, time_taken))
        attempt_id = cur.lastrowid

        # Save answers
        for qa in qnas:
            question = qa.get('question', '')
            correct_answer = qa.get('correct_answer', '')
            user_answer = qa.get('user_answer', '')
            is_correct = 1 if qa.get('is_correct') else 0
            explanation = qa.get('explanation', '')
            cur.execute("""
                INSERT INTO quiz_answers
                (attempt_id, user_name, question, correct_answer, user_answer, is_correct, explanation)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (attempt_id, username, question, correct_answer, user_answer, is_correct, explanation))
        conn.commit()

        # Get taken_at for scheduling retakes
        time_cur = conn.cursor(dictionary=True)
        time_cur.execute("SELECT taken_at FROM quiz_attempts WHERE id = %s", (attempt_id,))
        row = time_cur.fetchone()
        time_cur.close()
        taken_at = row['taken_at'] if row else None

        cur.close()

        if taken_at is not None and user_id:
            schedule_quiz_retake_if_needed(user_id, topic, taken_at, score, total_questions)

        return jsonify({"success": True, "message": "Quiz result and answers saved successfully", "percentage": percentage})

    except Exception as e:
        print(f"Error in save_quiz_result: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500



@quiz_bp.route("/performance", methods=["GET"])
def quiz_performance():
    # Accept userId as query param for programmatic fetch; or use JWT for current user
    user_id = request.args.get("userId")
    user = None
    if not user_id:
        user = get_user_from_token()
        if not user:
            return jsonify({"success": False, "error": "Authentication required"}), 401
        user_id = user["id"]
        username = user["username"]
    else:
        try:
            user_id = int(user_id)
        except Exception:
            return jsonify({"success": False, "error": "Invalid userId"}), 400
        username = None

    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        # Stats
        cur.execute(
            """
            SELECT
                COUNT(*) AS total_attempts,
                ROUND(AVG(percentage),2) AS avg_percentage,
                MAX(percentage) as best_score,
                MAX(taken_at) as last_attempt
            FROM quiz_attempts
            WHERE user_id = %s
            """,
            (user_id,)
        )
        stats = cur.fetchone()
        # History
        cur.execute(
            """
            SELECT id, topic, difficulty, score, total_questions, percentage, time_taken, taken_at as created_at
            FROM quiz_attempts
            WHERE user_id = %s
            ORDER BY taken_at DESC
            LIMIT 20
            """,
            (user_id,)
        )
        history = cur.fetchall()
        cur.close()
        result_stats = {
            'total_attempts': int(stats['total_attempts']) if stats else 0,
            'avg_percentage': float(stats['avg_percentage'] or 0) if stats else 0,
            'best_score': int(stats['best_score'] or 0) if stats else 0,
            'last_attempt': stats['last_attempt'] if stats else None
        }
        return jsonify({
            "success": True,
            "stats": result_stats,
            "history": history
        })
    except Exception as e:
        print(f"Quiz performance error: {e}")
        return jsonify({"success": False, "error": "Failed to get performance"}), 500

####################################

# Existing endpoints left for completeness (you may keep/remove if desired):

@quiz_bp.route("/history", methods=["GET"])
def quiz_history():
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    try:
        limit = int(request.args.get("limit", 50))
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT id, score, total_questions, percentage, topic, difficulty, time_taken, taken_at
            FROM quiz_attempts
            WHERE user_id = %s OR username = %s
            ORDER BY taken_at DESC
            LIMIT %s
        """, (user["id"], user["username"], limit))
        attempts = cur.fetchall()
        cur.close()
        mapped = [{
            **dict(attempt),
            "created_at": attempt["taken_at"]
        } for attempt in attempts]
        return jsonify({
            "success": True,
            "data": mapped
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
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT
                COUNT(*) as total_attempts,
                ROUND(AVG(percentage), 2) as avg_percentage,
                MAX(percentage) as best_score,
                MAX(taken_at) as last_attempt
            FROM quiz_attempts
            WHERE user_id = %s OR username = %s
        """, (user["id"], user["username"]))
        stats = cur.fetchone()
        cur.close()
        if stats and stats['total_attempts'] > 0:
            result = {
                'total_attempts': int(stats['total_attempts']),
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

@quiz_bp.route("/leaderboard", methods=["GET"])
def get_leaderboard():
    try:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT
                username,
                COUNT(*) as total_attempts,
                ROUND(AVG(percentage), 2) as avg_percentage,
                MAX(percentage) as best_score
            FROM quiz_attempts
            GROUP BY username
            ORDER BY avg_percentage DESC, best_score DESC
            LIMIT 10
        """)
        leaderboard = cur.fetchall()
        cur.close()
        return jsonify({"success": True, "leaderboard": [dict(user) for user in leaderboard]})
    except Exception as e:
        print(f"Error in get_leaderboard: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@quiz_bp.route("/test", methods=["GET"])
def test_route():
    return jsonify({
        "message": "Quiz blueprint is working!",
        "timestamp": "2025-10-14",
        "available_routes": [
            "/quiz/upload",
            "/quiz/check", 
            "/quiz/save-result",
            "/quiz/history",
            "/quiz/stats",
            "/quiz/performance"
        ]
    })