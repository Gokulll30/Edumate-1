from flask import Blueprint, request, jsonify
import db

study_bp = Blueprint("study", __name__, url_prefix="/study")

@study_bp.route("/sessions", methods=["GET"])
def list_sessions():
    user_id = request.args.get("userId")
    if not user_id:
        return jsonify({"success": False, "error": "missing_userId"}), 400
    sessions = db.get_study_sessions(int(user_id))
    return jsonify({"success": True, "sessions": sessions})

@study_bp.route("/sessions", methods=["POST", "OPTIONS"])
def add_session():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
    data = request.get_json() or {}
    user_id = data.get("userId")
    if not user_id:
        return jsonify({"success": False, "error": "missing_userId"}), 400
    title = data.get("title") or ""
    subject = data.get("subject") or ""
    duration = int(data.get("duration") or 60)
    date = data.get("date") or ""
    time = data.get("time") or ""
    type_ = data.get("type") or "study"
    priority = data.get("priority") or "medium"
    notes = data.get("notes") or ""
    session = db.add_study_session(int(user_id), title, subject, duration, date, time, type_, priority, notes)
    return jsonify({"success": True, "session": session})

@study_bp.route("/sessions/<int:session_id>", methods=["DELETE"])
def delete_session(session_id):
    user_id = request.args.get("userId")
    if not user_id:
        return jsonify({"success": False, "error": "missing_userId"}), 400
    ok = db.delete_study_session(session_id, int(user_id))
    return jsonify({"success": ok})

@study_bp.route("/sessions/<int:session_id>/toggle", methods=["POST", "OPTIONS"])
def toggle_session(session_id):
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
    data = request.get_json() or {}
    user_id = data.get("userId")
    if not user_id:
        return jsonify({"success": False, "error": "missing_userId"}), 400
    updated = db.toggle_study_completion(session_id, int(user_id))
    if not updated:
        return jsonify({"success": False, "error": "not_found"}), 404
    return jsonify({"success": True, "session": updated})

@study_bp.route("/progress/<int:user_id>", methods=["GET"])
def get_progress(user_id):
    prog = db.compute_progress(user_id)
    return jsonify({"success": True, "progress": prog})
