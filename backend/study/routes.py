from flask import Blueprint, request, jsonify
from db import (
    get_study_sessions,
    add_study_session,
    delete_study_session,
    toggle_study_completion,
    compute_progress,
)
from decimal import Decimal
from datetime import datetime, timedelta

study_bp = Blueprint("study", __name__, url_prefix="/study")

# Robustly cleans dicts for JSON serialization
def clean_json(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            obj[k] = clean_json(v)
        return obj
    elif isinstance(obj, list):
        return [clean_json(x) for x in obj]
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, (datetime,)):
        return obj.isoformat()
    elif isinstance(obj, (timedelta,)):
        return obj.total_seconds()
    else:
        return obj

@study_bp.route("/sessions", methods=["GET"])
def list_sessions():
    user_id = request.args.get("userId")
    if not user_id:
        return jsonify({"success": False, "error": "missing_userId"}), 400
    sessions = get_study_sessions(int(user_id))
    sessions = clean_json([dict(s) for s in sessions])
    return jsonify({"success": True, "sessions": sessions})

@study_bp.route("/sessions/<int:user_id>", methods=["GET"])
def get_sessions_by_user(user_id):
    sessions = get_study_sessions(user_id)
    sessions = clean_json([dict(s) for s in sessions])
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
    session = add_study_session(
        int(user_id), title, subject, duration, date, time, type_, priority, notes
    )
    session = clean_json(dict(session) if session else {})
    return jsonify({"success": True, "session": session})

@study_bp.route("/sessions/<int:session_id>", methods=["DELETE"])
def delete_session(session_id):
    user_id = request.args.get("userId")
    if not user_id:
        return jsonify({"success": False, "error": "missing_userId"}), 400
    ok = delete_study_session(session_id, int(user_id))
    return jsonify({"success": ok})

@study_bp.route("/sessions/<int:session_id>/toggle", methods=["POST", "OPTIONS"])
def toggle_session(session_id):
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
    data = request.get_json() or {}
    user_id = data.get("userId")
    if not user_id:
        return jsonify({"success": False, "error": "missing_userId"}), 400
    updated = toggle_study_completion(session_id, int(user_id))
    if not updated:
        return jsonify({"success": False, "error": "not_found"}), 404
    updated = clean_json(dict(updated))
    return jsonify({"success": True, "session": updated})

# NEW: Mark session as completed (used by bin in UI)
@study_bp.route("/sessions/<int:session_id>/complete", methods=["POST", "OPTIONS"])
def complete_session(session_id):
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
    data = request.get_json() or {}
    user_id = data.get("userId")
    if not user_id:
        return jsonify({"success": False, "error": "missing_userId"}), 400
    # Ensure toggle sets completed to 1 (True)
    updated = toggle_study_completion(session_id, int(user_id), force_completed=True)
    if not updated:
        return jsonify({"success": False, "error": "not_found"}), 404
    updated = clean_json(dict(updated))
    return jsonify({"success": True, "session": updated})

@study_bp.route("/progress/<int:user_id>", methods=["GET"])
def get_progress(user_id):
    prog = compute_progress(user_id)
    prog = clean_json(prog)
    return jsonify({"success": True, "progress": prog})
