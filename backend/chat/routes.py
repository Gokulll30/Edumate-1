from flask import Blueprint, request, jsonify
from .service import get_chat_response

chat_bp = Blueprint("chat", __name__)

@chat_bp.route("/", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")
    file_text = data.get("fileText", "")  # NEW: text extracted from uploaded file

    # Combine user message and file text if provided
    combined_message = user_message
    if file_text:
        combined_message = f"{user_message}\n\nContext from uploaded file:\n{file_text}"

    reply = get_chat_response(combined_message)

    return jsonify({"reply": reply, "success": True})
