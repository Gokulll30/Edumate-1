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
// Add to your existing api.ts file

export interface QuizResult {
  username: string;
  score: number;
  total_questions: number;
  topic?: string;
  difficulty?: string;
  time_taken?: number;
}

export interface QuizAttempt {
  score: number;
  total_questions: number;
  percentage: number;
  topic: string;
  difficulty: string;
  time_taken: number;
  created_at: string;
}

export interface UserQuizStats {
  total_attempts: number;
  avg_percentage: number;
  best_score: number;
  worst_score: number;
  last_attempt: string;
}

// Save quiz result
export async function saveQuizResult(result: QuizResult): Promise<{ success: boolean; percentage?: number; error?: string }> {
  const response = await fetch(`${API_BASE}/quiz/save-result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  });
  return await response.json();
}

// Get user quiz statistics
export async function getUserQuizStats(username: string): Promise<{ 
  success: boolean; 
  stats?: UserQuizStats; 
  recent_attempts?: QuizAttempt[];
  error?: string;
}> {
  const response = await fetch(`${API_BASE}/quiz/user-stats/${username}`);
  return await response.json();
}
