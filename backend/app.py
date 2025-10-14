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

# ✅ FIXED CORS configuration - THIS IS THE MAIN FIX
CORS(
    app,
    origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://*.vercel.app",
        "https://edumate-2026.vercel.app"
    ],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # ✅ Added missing methods
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],  # ✅ Added missing headers
    supports_credentials=False
)  # ✅ Fixed missing closing parenthesis

# Initialize database on startup
def init_database():
    """Initialize database with required tables"""
    os.makedirs(os.path.dirname(DATABASE), exist_ok=True)
    print(f"📁 Database path: {DATABASE}")

with app.app_context():
    init_database()

# ✅ Enhanced blueprint registration with better error handling
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

# ✅ Enhanced health check with debugging info
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok", 
        "service": "edumate-backend",
        "timestamp": "2025-10-14",
        "cors_origins": [
            "http://localhost:3000",
            "http://localhost:5173", 
            "https://*.vercel.app",
            "https://edumate-2026.vercel.app"
        ]
    })

# ✅ Test route for quiz debugging
@app.route("/test-quiz", methods=["GET"])
def test_quiz():
    return jsonify({
        "message": "Quiz routes are working",
        "available_endpoints": [
            "/quiz/upload",
            "/quiz/check", 
            "/quiz/save-result"
        ]
    })

# ✅ Handle preflight OPTIONS requests explicitly
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        print(f"🔀 Preflight request for {request.path}")
        response = jsonify()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        return response

# ✅ Fixed frontend serving (removed duplicate route)
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    frontend_dir = os.path.join(APP_DIR, "..", "frontend", "dist")
    if path and os.path.exists(os.path.join(frontend_dir, path)):
        return send_from_directory(frontend_dir, path)
    else:
        # Fallback to index.html for SPA routing
        index_path = os.path.join(frontend_dir, "index.html")
        if os.path.exists(index_path):
            return send_from_directory(frontend_dir, "index.html")
        else:
            return jsonify({"message": "Frontend not built yet"}), 404

# ✅ Enhanced JSON error handlers with debugging
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
        "path": request.path,
        "allowed_methods": list(e.valid_methods) if hasattr(e, 'valid_methods') else [],
        "fix": "Check CORS configuration and route methods"
    }), 405

@app.errorhandler(500)
def internal_error(e):
    print(f"❌ 500 Error: {str(e)}")
    return jsonify({"success": False, "error": "Internal server error"}), 500

# ✅ Enhanced startup logging
if __name__ == "__main__":
    print("\n" + "="*60)
    print("🚀 EDUMATE BACKEND STARTING")
    print("="*60)
    
    print("\n📋 Registered Routes:")
    for rule in app.url_map.iter_rules():
        methods = ",".join(sorted(rule.methods - {"HEAD", "OPTIONS"}))
        print(f"   {rule.rule:<40} [{methods}]")
    
    print(f"\n🌐 CORS Configuration:")
    print("   Origins:")
    print("     • http://localhost:3000")
    print("     • http://localhost:5173") 
    print("     • https://*.vercel.app")
    print("     • https://edumate-2026.vercel.app")
    print("   Methods: GET, POST, PUT, DELETE, OPTIONS")
    print("   Headers: Content-Type, Authorization, Accept")
    
    print(f"\n🎯 Server Info:")
    print(f"   Database: {DATABASE}")
    print(f"   Environment: {'Production' if not os.getenv('DEBUG') else 'Development'}")
    
    port = int(os.getenv("PORT", 5001))
    print(f"\n🌟 Server starting on http://localhost:{port}")
    print("="*60 + "\n")
    
    app.run(host="0.0.0.0", port=port, debug=True)
