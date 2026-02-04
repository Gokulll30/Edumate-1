import os
import sys
from dotenv import load_dotenv

# Load env variables from .env in parent folder
APP_DIR = os.path.dirname(__file__)
load_dotenv(os.path.join(APP_DIR, ".env"))

if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

from flask import Flask, jsonify, g, request
from flask_cors import CORS
from db import get_db_connection
import mysql.connector.errors
from jobs.cron_jobs import start_agent_cron_job

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "407e6953e465af96b5924046abf3a16adfbae2cd20864d9eeb913e6b252221b3")
app.config.update(
    SESSION_COOKIE_SAMESITE="None",
    SESSION_COOKIE_SECURE=True,
)

# --- CORS CONFIGURATION ---

# For Render + Vercel, allow localhost and your production domains.
CORS(
    app,
    origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        r"https://.*\.vercel\.app",
        "https://edumate-2026.vercel.app",
        "https://edumate-1-mgnm.onrender.com"  # <-- Add your backend domain for production
    ],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    supports_credentials=True   # <-- For OAuth and cookie sessions, use True
)

@app.before_request
def before_request():
    if "db" not in g:
        g.db = get_db_connection()

@app.teardown_appcontext
def teardown_db(exception):
    db = g.pop("db", None)
    if db is not None:
        try:
            db.close()
        except mysql.connector.errors.InternalError as e:
            if "Unread result found" in str(e):
                try:
                    while db.cmd_fetchone():
                        pass
                except Exception:
                    pass
                try:
                    db.close()
                except Exception:
                    pass
            else:
                raise e

print("\n🔧 Registering blueprints...")

try:
    from auth.routes import auth_bp
    app.register_blueprint(auth_bp)
    print("✅ Auth blueprint registered successfully")
except Exception as e:
    print(f"❌ Auth blueprint registration failed: {e}")

try:
    from quiz.routes import quiz_bp
    app.register_blueprint(quiz_bp, url_prefix="/quiz")
    print("✅ Quiz blueprint registered successfully")
except Exception as e:
    print(f"❌ Quiz blueprint registration failed: {e}")

try:
    from chat.routes import chat_bp
    app.register_blueprint(chat_bp, url_prefix="/chat")
    print("✅ Chat blueprint registered successfully")
except Exception as e:
    print(f"❌ Chat blueprint registration failed: {e}")

try:
    from study.routes import study_bp
    app.register_blueprint(study_bp, url_prefix="/study")
    print("✅ Study blueprint registered successfully")
except Exception as e:
    print(f"❌ Study blueprint registration failed: {e}")

# ========== GOOGLE CALENDAR INTEGRATION BELOW ==========

try:
    from calendar_app.routes import calendar_bp
    app.register_blueprint(calendar_bp, url_prefix="/calendar_app")
    print("✅ Calendar blueprint registered successfully")
except Exception as e:
    print(f"❌ Calendar blueprint registration failed: {e}")

# ========== END CALENDAR INTEGRATION ADDITIONS ==========
# Add after calendar_bp registration in app.py

try:
    from ai_agent.routes import ai_agent_bp
    app.register_blueprint(ai_agent_bp, url_prefix="/ai-agent")
    print("✅ AI Agent blueprint registered successfully")
except Exception as e:
    print(f"❌ AI Agent blueprint registration failed: {e}")

# ========== CODING ASSISTANT INTEGRATION BELOW ==========

try:
    from coding_assistant.routes import coding_assistant_bp
    app.register_blueprint(coding_assistant_bp, url_prefix="/coding-assistant")
    print("✅ Coding Assistant blueprint registered successfully")
except Exception as e:
    print(f"❌ Coding Assistant blueprint registration failed: {e}")

# ========== END CODING ASSISTANT INTEGRATION ==========


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "edumate-backend",
        "timestamp": "2025-10-14"
    })

@app.route("/test-quiz", methods=["GET"])
def test_quiz():
    return jsonify({
        "message": "Quiz routes are working",
        "available_endpoints": ["/quiz/upload", "/quiz/test"]
    })

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "success": False,
        "error": "Not found",
        "path": request.path,
        "method": request.method
    }), 404

@app.errorhandler(405)
def method_not_allowed(e):
    print(f"❌ 405 Error: {request.method} {request.path}")
    return jsonify({
        "success": False,
        "error": "Method not allowed",
        "method": request.method,
        "path": request.path
    }), 405

@app.errorhandler(500)
def internal_error(e):
    print(f"❌ 500 Error: {str(e)}")
    return jsonify({"success": False, "error": "Internal server error"}), 500

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🚀 EDUMATE BACKEND STARTING")
    print("=" * 60)
    # ✅ START CRON JOBS ON SERVER BOOT
    '''try:
        start_agent_cron_job()
        print("✅ AI Agent cron job started")
    except Exception as e:
        print(f"❌ Failed to start cron jobs: {e}")
    print("\n📋 Registered Routes:")'''
    for rule in app.url_map.iter_rules():
        methods = ",".join(sorted(rule.methods - {"HEAD", "OPTIONS"}))
        print(f" {rule.rule:<40} [{methods}]")
    port = int(os.getenv("PORT", 5001))
    print(f"\n🌟 Server starting on http://localhost:{port}")
    print("=" * 60 + "\n")
    app.run(host="0.0.0.0", port=port, debug=True)
