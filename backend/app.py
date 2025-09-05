import os
import io
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from google import genai
from google.genai import types

from utils.pdf import read_pdf
from utils.text import read_txt, clamp
from mcq.prompt import MCQ_SCHEMA, build_mcq_prompt
from mcq.parser import normalize_mcqs

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set. Put it in backend/.env")

client = genai.Client(api_key=GEMINI_API_KEY)

app = Flask(__name__)
CORS(app)  # allow Vercel frontend

@app.route("/api/quiz/upload", methods=["POST"])
def upload_and_generate():
    """
    FormData fields:
      file: PDF or TXT
      num_q (optional): default 5
      difficulty (optional): easy|medium|hard|mixed
    """
    if "file" not in request.files:
        return jsonify({"success": False, "error": "file field is required"}), 400

    f = request.files["file"]
    filename = f.filename or ""
    ext = filename.lower().strip()

    stream = io.BytesIO(f.read())

    if ext.endswith(".pdf"):
        text = read_pdf(stream)
    elif ext.endswith(".txt"):
        text = read_txt(stream)
    else:
        return jsonify({"success": False, "error": "Only PDF and TXT supported"}), 400

    text = clamp(text, 12000)
    if not text or len(text) < 50:
        return jsonify({"success": False, "error": "File has insufficient text to create a quiz"}), 400

    num_q = int(request.form.get("num_q", 5))
    difficulty = request.form.get("difficulty", "mixed")

    try:
        prompt = build_mcq_prompt(text, num_q=num_q, difficulty=difficulty)
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=MCQ_SCHEMA,
            )
        )
        raw_json = resp.text  # strict JSON string
        data = json.loads(raw_json)
        quiz = normalize_mcqs(data)
        return jsonify({"success": True, "quiz": quiz})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/quiz/check", methods=["POST"])
def check_answer():
    """
    JSON body:
      {
        "quiz": [ { "question", "options":[], "answerIndex", "answerLetter", "explanation", ... }, ... ],
        "questionIndex": 0,
        "selectedIndex": 2
      }
    """
    try:
        payload = request.get_json(force=True)
        quiz = payload["quiz"]
        qi = int(payload["questionIndex"])
        sel = int(payload["selectedIndex"])

        item = quiz[qi]
        corr_idx = int(item.get("answerIndex", 0))
        corr_letter = item.get("answerLetter", "A")
        explanation = item.get("explanation", "")

        return jsonify({
            "correct": sel == corr_idx,
            "correctIndex": corr_idx,
            "correctLetter": corr_letter,
            "explanation": explanation
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


if __name__ == "__main__":
    # For local dev
    app.run(host="0.0.0.0", port=5001, debug=True)
