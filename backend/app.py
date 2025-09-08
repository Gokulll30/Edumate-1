import os
import io
import json
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai  # New import
from utils.pdf import read_pdf
from utils.text import read_txt, clamp
from mcq.prompt import MCQ_SCHEMA, build_mcq_prompt
from mcq.parser import normalize_mcqs

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set")

# New SDK initialization
client = genai.Client(api_key=GEMINI_API_KEY)

app = Flask(__name__)

CORS(app, 
     origins=[
         "http://localhost:3000",
         "http://localhost:5173", 
         "https://*.vercel.app",
         "https://edumate-2026.vercel.app"
     ],
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type"],
     supports_credentials=False
)

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "Content-Type")
        response.headers.add('Access-Control-Allow-Methods', "GET,POST,OPTIONS")
        return response

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "quiz-backend"})

@app.route("/quiz", methods=["POST"])
def generate_quiz():
    try:
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
            return jsonify({"success": False, "error": "Only PDF and TXT files are supported"}), 400

        text = clamp(text, 12000)
        if not text or len(text) < 50:
            return jsonify({"success": False, "error": "File has insufficient texts to create a quiz"}), 400

        num_q = int(request.form.get("num_q", 5))
        difficulty = request.form.get("difficulty", "mixed")

        prompt = build_mcq_prompt(text, num_q=num_q, difficulty=difficulty)
        
        # New SDK syntax - this is the fix!
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": MCQ_SCHEMA,
            }
        )

        raw_json = response.text
        data = json.loads(raw_json)
        quiz = normalize_mcqs(data)

        return jsonify({"success": True, "quiz": quiz})

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/check", methods=["POST"])
def check_answer():
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
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=False)
