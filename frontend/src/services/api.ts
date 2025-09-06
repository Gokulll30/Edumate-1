// src/services/api.ts
export type QuizItem = {
  question: string;
  options: string[];
  answerIndex: number;
  answerLetter: string;
  explanation: string;
  difficulty: string;
  topic: string;
};

// Same-origin base. Empty string means “use current origin”
const API_BASE = "";

export async function uploadNotesForQuiz(file: File, numQ = 5, difficulty = "mixed") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("num_q", String(numQ));
  fd.append("difficulty", difficulty);

  const res = await fetch(`${API_BASE}/api/quiz/upload`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ success: boolean; quiz: QuizItem[]; error?: string }>;
}

export async function checkAnswer(quiz: QuizItem[], questionIndex: number, selectedIndex: number) {
  const res = await fetch(`${API_BASE}/api/quiz/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quiz, questionIndex, selectedIndex }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    correct: boolean;
    correctIndex: number;
    correctLetter: string;
    explanation: string;
  }>;
}
