from flask import Blueprint, request, jsonify
from db import get_chat_history, get_user_by_username
from auth.routes import decode_auth_token
from chat.service import get_chat_response  # absolute import

chat_bp = Blueprint("chat", __name__, url_prefix="/chat")

@chat_bp.route("", methods=["POST"])
@chat_bp.route("/", methods=["POST"])
def chat():
    print("chat route called")  # Debug print for route hit
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    data = request.get_json()
    user = None
    if token:
        user_data = decode_auth_token(token)
        if user_data and "username" in user_data:
            user = get_user_by_username(user_data["username"])
    user_id = user["id"] if user else None

    if "message" not in data:
        return jsonify({"error": "No message provided"}), 400

    user_message = data.get("message", "")
    file_text = data.get("fileText", "")  # Context from uploaded file if any
    combined_message = user_message
    if file_text:
        combined_message = f"{user_message}\n\nContext from uploaded file:\n{file_text}"

    # Delegate message saving to get_chat_response, avoid duplicates here
    bot_reply = get_chat_response(combined_message, user_id)

    return jsonify({"reply": bot_reply, "success": True})

@chat_bp.route("/history", methods=["GET"])
def chat_history():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = None
    if token:
        user_data = decode_auth_token(token)
        if user_data and "username" in user_data:
            user = get_user_by_username(user_data["username"])
    user_id = user["id"] if user else None
    if not user_id:
        return jsonify([])

    limit = int(request.args.get("limit", 50))
    history = get_chat_history(user_id, limit)
    return jsonify({"history": history})