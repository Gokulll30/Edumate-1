from flask import Blueprint, request, jsonify
from .service import process_code_query

coding_assistant_bp = Blueprint("coding_assistant", __name__)

@coding_assistant_bp.route("/code-assist", methods=["POST"])
def code_assist():
    data = request.get_json()

    language = data.get("language")
    question = data.get("question")
    code = data.get("code", "")
    task = data.get("task", "explain")

    if not language or not question:
        return jsonify({
            "success": False,
            "error": "Language and question are required"
        }), 400

    result = process_code_query(language, question, code, task)
    return jsonify(result)
