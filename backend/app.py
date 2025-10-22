import os
import sys
from flask import Flask, jsonify, g, request
from flask_cors import CORS
from dotenv import load_dotenv
from db import get_db_connection
import mysql.connector.errors

# Load env variables from .env in parent folder
APP_DIR = os.path.dirname(__file__)
load_dotenv(os.path.join(APP_DIR, "..", ".env"))

if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

# Flask app initialization
app = Flask(__name__)

# CORS configuration
CORS(
    app,
    origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://*.vercel.app",
        "https://edumate-2026.vercel.app"
    ],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    supports_credentials=False
)

# Before each request: attach MySQL connection to flask.g
@app.before_request
def before_request():
    if "db" not in g:
        g.db = get_db_connection()

# Teardown db with unread result handling
@app.teardown_appcontext
def teardown_db(exception):
    db = g.pop("db", None)
    if db is not None:
        try:
            db.close()
        except mysql.connector.errors.InternalError as e:
            if "Unread result found" in str(e):
                try:
                    # Attempt to consume unread results
                    while db.cmd_fetchone():  # May fail silently if no results available
                        pass
                except Exception:
                    pass
                try:
                    db.close()
                except Exception:
                    pass
            else:
                raise e


# Blueprint registration with error handling
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


# Health Check Route
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "edumate-backend",
        "timestamp": "2025-10-14"
    })


# Test route for quiz
@app.route("/test-quiz", methods=["GET"])
def test_quiz():
    return jsonify({
        "message": "Quiz routes are working",
        "available_endpoints": ["/quiz/upload", "/quiz/test"]
    })


# Handle preflight OPTIONS requests
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        print(f"🔀 Preflight request for {request.path}")
        response = jsonify()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization,Accept")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        return response


# Enhanced error handlers
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


# Enhanced startup logging
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🚀 EDUMATE BACKEND STARTING")
    print("=" * 60)

    print("\n📋 Registered Routes:")
    for rule in app.url_map.iter_rules():
        methods = ",".join(sorted(rule.methods - {"HEAD", "OPTIONS"}))
        print(f"   {rule.rule:<40} [{methods}]")

    port = int(os.getenv("PORT", 5001))
    print(f"\n🌟 Server starting on http://localhost:{port}")
    print("=" * 60 + "\n")

    app.run(host="0.0.0.0", port=port, debug=True)
