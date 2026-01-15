from flask import Blueprint, request, jsonify
from .service import CodingAssistantService

coding_assistant_bp = Blueprint("coding_assistant", __name__)

@coding_assistant_bp.route("/code-assist", methods=["POST"])
def code_assist():
    data = request.get_json()

    language = data.get("language", "python")
    question = data.get("question", "")
    code = data.get("code")
    task = data.get("task", "explain")

    result = CodingAssistantService.process_request(
        language=language,
        question=question,
        code=code,
        task=task
    )

    return jsonify(result)
