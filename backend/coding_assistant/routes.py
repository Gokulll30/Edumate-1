from flask import Blueprint, request, jsonify
from .service import process_code_query

coding_assistant_bp = Blueprint("coding_assistant", __name__)

@coding_assistant_bp.route("/code-assist", methods=["POST"])
def code_assist():
    data = request.json

    response = process_code_query(
        language=data.get("language"),
        question=data.get("question"),
        code=data.get("code", ""),
        task=data.get("task")  # explain | debug | generate
    )

    return jsonify(response)
