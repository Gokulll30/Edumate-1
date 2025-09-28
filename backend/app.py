import os
import sys
import sqlite3

from flask import Flask, jsonify, g, send_from_directory, request
from flask_cors import CORS
from dotenv import load_dotenv

# Path setup
APP_DIR = os.path.dirname(__file__)
load_dotenv(os.path.join(APP_DIR, "..", ".env"))

if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

# SQLite DB path
DATABASE = os.path.join(APP_DIR, "data", "edumate.sqlite3")

# DB connection management
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

# Flask app initialization
app = Flask(__name__)
app.teardown_appcontext(close_db)
app.config["DATABASE"] = DATABASE

# CORS configuration
CORS(
    app,
    origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://*.vercel.app",
        "https://edumate-2026.vercel.app"
    ],
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    supports_credentials=False,
)

# Register blueprints with error handling
try:
    from auth.routes import auth_bp
    app.register_blueprint(auth_bp)
except Exception as e:
    print(f"Auth blueprint registration failed: {e}")

try:
    from quiz.routes import quiz_bp
    app.register_blueprint(quiz_bp, url_prefix="/quiz")
except Exception as e:
    print(f"Quiz blueprint registration failed: {e}")

try:
    from chat.routes import chat_bp
    app.register_blueprint(chat_bp, url_prefix="/chat")
except Exception as e:
    print(f"Chat blueprint registration failed: {e}")

try:
    from study.routes import study_bp
    app.register_blueprint(study_bp, url_prefix="/study")
except Exception as e:
    print(f"Study blueprint registration failed: {e}")

# Health Check Route
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "edumate-backend"})

# Serve Frontend Static Files (for SPA)
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    frontend_dir = os.path.join(APP_DIR, "..", "frontend", "dist")
    if path and os.path.exists(os.path.join(frontend_dir, path)):
        return send_from_directory(frontend_dir, path)
    else:
        return send_from_directory(frontend_dir, "index.html")

# JSON error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Not found"}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"success": False, "error": "Method not allowed"}), 405

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"success": False, "error": "Internal server error"}), 500

# Run the application
if __name__ == "__main__":
    print("Registered routes:")
    for rule in app.url_map.iter_rules():
        methods = ",".join(rule.methods)
        print(f"{rule.rule} [{methods}]")
    port = int(os.getenv("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
