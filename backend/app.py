import os
import sys
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from dotenv import load_dotenv
from quiz.routes import quiz_bp
load_dotenv()
HERE = os.path.dirname(__file__)
if HERE not in sys.path:
    sys.path.insert(0, HERE)
try:
    from auth.routes import auth_bp
except Exception as e:
    print("Failed to import auth.routes:", e)
    auth_bp = None
from study.routes import study_bp
try:
    from quiz.routes import quiz_bp
except Exception as e:
    print("Failed to import quiz.routes:", e)
    quiz_bp = None

# Add these lines to import and register chat blueprint
try:
    from chat.routes import chat_bp
except Exception as e:
    print("Failed to import chat.routes:", e)
    chat_bp = None

API_PORT = int(os.getenv("PORT", "5000"))
FRONTEND_DIR = os.path.join(HERE, "..", "frontend")
STATIC_DIR = os.path.join(FRONTEND_DIR, "dist")
_app_static_folder = STATIC_DIR if os.path.exists(STATIC_DIR) else FRONTEND_DIR


app = Flask(__name__, static_folder=_app_static_folder)
CORS(app, resources={r"/*": {"origin": "*"}})


if auth_bp:
    app.register_blueprint(auth_bp)
    print("Auth blueprint registered")
else:
    print("Auth blueprint NOT registered")


if study_bp:
    app.register_blueprint(study_bp)
    print("Study blueprint registered")
else:
    print("Study blueprint NOT registered")


if quiz_bp:
    app.register_blueprint(quiz_bp)
    print("Quiz blueprint registered")
else:
    print("Quiz blueprint NOT registered")

if chat_bp:
    app.register_blueprint(chat_bp)
    print("Chat blueprint registered")
else:
    print("Chat blueprint NOT registered")


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "edumate"})


@app.errorhandler(404)
def handle_404(e):
    if request.path.startswith("/auth") or request.path.startswith("/study") or request.path.startswith("/quiz"):
        return jsonify({"success": False, "error": "not_found"}), 404
    static = app.static_folder or FRONTEND_DIR
    index_path = os.path.join(static, "index.html")
    if os.path.exists(index_path):
        return send_from_directory(static, "index.html")
    return jsonify({"error": "not found"}), 404


@app.errorhandler(Exception)
def handle_exception(e):
    import werkzeug
    if isinstance(e, werkzeug.exceptions.HTTPException):
        return e
    if request.path.startswith("/auth") or request.path.startswith("/study") or request.path.startswith("/quiz"):
        return jsonify({"success": False, "error": "server_error", "detail": str(e)}), 500
    return jsonify({"error": "internal server error"}), 500


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    static = app.static_folder or FRONTEND_DIR
    full_path = os.path.join(static, path)
    if path and os.path.exists(full_path):
        return send_from_directory(static, path)
    index_path = os.path.join(static, "index.html")
    if os.path.exists(index_path):
        return send_from_directory(static, "index.html")
    return jsonify({"status": "ok", "note": "frontend not built; run frontend separately"})


def print_routes():
    print("\nRegistered Flask routes:")
    for rule in app.url_map.iter_rules():
        methods = ",".join(sorted(rule.methods))
        print(f"{rule} -> {methods}")
print_routes()
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=API_PORT, debug=True)
