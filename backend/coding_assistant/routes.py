from flask import Blueprint, jsonify, request
from .service import CodingAssistantService
from .execution import run_python_code

# ------------------------------------------------
# Blueprint (ONLY ONE)
# ------------------------------------------------
coding_assistant_bp = Blueprint(
    "coding_assistant",
    __name__,
    url_prefix="/coding-assistant"
)

# ------------------------------------------------
# GET ALL PROBLEMS (LeetCode-style list page)
# ------------------------------------------------
@coding_assistant_bp.route("/problems", methods=["GET"])
def get_all_problems():
    try:
        problems = CodingAssistantService.load_all_problems()

        summary = [
            {
                "id": p["id"],
                "title": p["title"],
                "difficulty": p["difficulty"].capitalize()
            }
            for p in problems
        ]

        return jsonify({
            "success": True,
            "problems": summary
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ------------------------------------------------
# GET SINGLE PROBLEM (full problem details)
# ------------------------------------------------
@coding_assistant_bp.route("/problems/<problem_id>", methods=["GET"])
def get_problem_by_id(problem_id):
    try:
        problem = CodingAssistantService.get_problem_by_id(problem_id)

        if not problem:
            return jsonify({
                "success": False,
                "message": "Problem not found"
            }), 404

        return jsonify({
            "success": True,
            "problem": problem
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ------------------------------------------------
# RUN USER CODE AGAINST TEST CASES (CORE ENGINE)
# ------------------------------------------------
@coding_assistant_bp.route("/run", methods=["POST"])
def run_code():
    """
    Execute user code and validate against test cases
    """
    try:
        data = request.json or {}

        code = data.get("code")
        language = data.get("language", "python")
        problem_id = data.get("problemId")

        if not code or not problem_id:
            return jsonify({
                "success": False,
                "message": "Missing code or problemId"
            }), 400

        # Load problem
        problem = CodingAssistantService.get_problem_by_id(problem_id)

        if not problem:
            return jsonify({
                "success": False,
                "message": "Problem not found"
            }), 404

        # ⚠️ For now we support Python only (safe + controlled)
        if language != "python":
            return jsonify({
                "success": False,
                "message": "Only Python execution supported currently"
            }), 400

        # Run code against test cases
        result = run_python_code(
            user_code=code,
            function_name=problem["functionName"],
            test_cases=problem["testCases"]
        )

        return jsonify({
            "success": True,
            "result": result
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
