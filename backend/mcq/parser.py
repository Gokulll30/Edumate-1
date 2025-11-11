from typing import List, Dict

def normalize_mcqs(items: List[Dict]) -> List[Dict]:
    """
    Input item shape (from Gemini JSON mode):
      { question, options: [..], answer: "A"|"B"|"C"|"D", explanation, difficulty, topic }

    Output normalized shape for UI:
      {
        question, options: [4 strings],
        answerIndex: 0..3, answerLetter: "A".."D",
        explanation, difficulty, topic
      }
    """
    out = []
    for item in items:
        q = (item.get("question") or "").strip()
        options = item.get("options") or []
        # Normalize to exactly 4
        options = [str(o).strip() for o in options][:4]
        if len(options) < 4:
            options += ["N/A"] * (4 - len(options))

        letter = (item.get("answer") or "A").strip().upper()
        idx_map = {"A": 0, "B": 1, "C": 2, "D": 3}
        idx = idx_map.get(letter, 0)

        out.append({
            "question": q,
            "options": options,
            "answerIndex": idx,
            "answerLetter": "ABCD"[idx],
            "explanation": (item.get("explanation") or "").strip(),
            "difficulty": (item.get("difficulty") or "mixed").strip(),
            "topic": (item.get("topic") or "General").strip()
        })
    return out