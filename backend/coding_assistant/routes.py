from flask import Blueprint, jsonify, request
from .service import CodingAssistantService, analyze_execution_result
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
                "difficulty": str(p.get("difficulty", "Easy")).capitalize()
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
        user_id = data.get("userId") # Optional for now, but good for logs

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

        function_name = problem.get("function_name")
        
        # EXECUTION STRATEGY
        if language == "python":
            # Local Safe Execution
            execution_result = run_python_code(
                user_code=code,
                function_name=function_name,
                test_cases=problem.get("test_cases", [])
            )
        else:
            # Gemini Simulated Execution (C++, Java, JS)
            from .service import evaluate_code_with_gemini
            execution_result = evaluate_code_with_gemini(language, code, problem)

        # ANALYSIS & OPTIMIZATION CHECK
        analysis = analyze_execution_result(
            problem=problem,
            user_code=code,
            execution_result=execution_result,
            language=language
        )

        return jsonify({
            "success": True,
            "result": execution_result,
            "analysis": analysis
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ------------------------------------------------
# SUBMIT SCORE (Finalize Attempt)
# ------------------------------------------------
@coding_assistant_bp.route("/submit-score", methods=["POST"])
def submit_score():
    try:
        data = request.json or {}
        user_id = data.get("userId")
        problem_id = data.get("problemId")
        score = data.get("score")
        is_optimized = data.get("isOptimized")
        language = data.get("language")
        code = data.get("code")

        if user_id is None or problem_id is None or score is None:
            return jsonify({"success": False, "message": "Missing userId, problemId or score"}), 400

        from db import save_coding_attempt
        save_coding_attempt(
            user_id=user_id,
            problem_id=problem_id,
            score=score,
            status="solved",
            is_optimized=is_optimized,
            language=language,
            code=code
        )

        return jsonify({"success": True, "message": "Score saved"})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ------------------------------------------------
# GET ATTEMPT HISTORY
# ------------------------------------------------
@coding_assistant_bp.route("/history/<int:user_id>", methods=["GET"])
def get_user_history(user_id):
    try:
        from db import get_coding_history
        history = get_coding_history(user_id, limit=5)
        
        # Enrich with problem titles
        problems = CodingAssistantService.load_all_problems()
        prob_map = {p["id"]: p["title"] for p in problems}

        for item in history:
            item["problem_title"] = prob_map.get(item["problem_id"], item["problem_id"])
            if "created_at" in item and item["created_at"]:
                # Convert datetime to string for JSON serialization
                if hasattr(item["created_at"], "isoformat"):
                    item["created_at"] = item["created_at"].isoformat()
                else:
                    item["created_at"] = str(item["created_at"])

        return jsonify({"success": True, "history": history})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ------------------------------------------------
# GET USER STATS (Solved count & Points)
# ------------------------------------------------
@coding_assistant_bp.route("/stats/<int:user_id>", methods=["GET"])
def get_user_stats(user_id):
    try:
        from db import get_coding_stats
        stats = get_coding_stats(user_id)
        return jsonify({"success": True, "stats": stats})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
