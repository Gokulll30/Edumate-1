// API Types
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
  success: boolean; // Added missing success field
  correct: boolean;
  correctIndex: number;
  correctLetter: string;
  explanation: string;
  error?: string;
};

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

// API Base URL - Fixed environment variable access
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

// Upload file for quiz generation
export async function uploadFile(formData: FormData): Promise<QuizResponse> {
  try {
    const response = await fetch(`${API_BASE}/quiz/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Quiz generation error:", error);
    return {
      success: false,
      quiz: [],
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

// Alternative upload function (keeping both for compatibility)
export async function uploadNotesForQuiz(
  file: File,
  numQ: number = 5,
  difficulty: string = "mixed"
): Promise<QuizResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("numq", String(numQ)); // Fixed parameter name to match backend
  formData.append("difficulty", difficulty);

  return uploadFile(formData);
}

// Check answer
export async function checkAnswer(data: {
  quiz: QuizItem[];
  questionIndex: number;
  selectedIndex: number;
}): Promise<AnswerCheckResponse> {
  try {
    const response = await fetch(`${API_BASE}/quiz/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Answer check error:", error);
    return {
      success: false,
      correct: false,
      correctIndex: 0,
      correctLetter: "A",
      explanation: "",
      error: error instanceof Error ? error.message : 'Check failed'
    };
  }
}

// Save quiz result
export async function saveQuizResult(result: QuizResult): Promise<{ 
  success: boolean; 
  percentage?: number; 
  error?: string; 
}> {
  try {
    const response = await fetch(`${API_BASE}/quiz/save-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Save quiz result error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Save failed'
    };
  }
}

// Get user quiz statistics
export async function getUserQuizStats(username: string): Promise<{
  success: boolean;
  stats?: UserQuizStats;
  recent_attempts?: QuizAttempt[];
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/quiz/user-stats/${username}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Get user stats error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Stats fetch failed'
    };
  }
}

// Health check
export async function checkHealth(): Promise<{ status: string; service: string }> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return await response.json();
  } catch (error) {
    return { status: "error", service: "unavailable" };
  }
}
