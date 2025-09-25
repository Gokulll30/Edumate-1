export type QuizItem = {
  question: string;
  options: string[];
  answerIndex: number;
  answerLetter: string;
  explanation: string;
  difficulty: string;
  topic: string;
};

export type QuizResponse = {
  success: boolean;
  quiz: QuizItem[];
  error?: string;
};

export type AnswerCheckResponse = {
  correct: boolean;
  correctIndex: number;
  correctLetter: string;
  explanation: string;
  error?: string;
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

export async function uploadNotesForQuiz(
  file: File,
  numQ: number = 5,
  difficulty: string = "mixed"
): Promise<QuizResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("num_q", String(numQ));
  formData.append("difficulty", difficulty);

  try {
    const response = await fetch(`${API_BASE}/quiz/upload`, { // Corrected endpoint
      method: "POST",
      // No Content-Type header here, let the browser set it for FormData
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Quiz generation error:", error);
    throw error;
  }
}

export async function checkAnswer(
  quiz: QuizItem[],
  questionIndex: number,
  selectedIndex: number
): Promise<AnswerCheckResponse> {
  try {
    const response = await fetch(`${API_BASE}/quiz/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quiz, questionIndex, selectedIndex }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Answer check error:", error);
    throw error;
  }
}

export async function checkHealth(): Promise<{ status: string; service: string }> {
  const response = await fetch(`${API_BASE}/health`);
  return await response.json();
}
