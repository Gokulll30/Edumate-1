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
  success: boolean;
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

export interface QuizQnA {
  question: string;
  correct_answer: string;
  user_answer: string;
  is_correct: boolean;
  explanation: string;
}

export interface SaveQuizResultWithAnswersRequest extends QuizResult {
  user_id?: number;
  qnas: QuizQnA[];
}

export interface QuizAttempt {
  id: number;
  score: number;
  total_questions: number;
  percentage: number;
  topic: string;
  difficulty: string;
  time_taken: number;
  created_at: string;
}

export interface QuizStats {
  total_attempts: number;
  avg_percentage: number;
  best_score: number;
  last_attempt: string;
}

export interface UserQuizStats {
  total_attempts: number;
  avg_percentage: number;
  best_score: number;
  worst_score: number;
  last_attempt: string;
}

// Auth Types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignupCredentials {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    username: string;
    email?: string;
  };
  error?: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
}

// Chat Types
export interface ChatMessage {
  id: number;
  role: 'user' | 'bot';
  message: string;
  session_id?: number;
  created_at: string;
}

export interface ChatSession {
  id: number;
  title: string;
  message_count: number;
  created_at: string;
}

// Session Types
export interface Session {
  id: number;
  user_id: number;
  topic: string;
  date: string;
  start_time: string;
  duration: number;
  status: 'planned' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
}

// Calendar Types
export interface CalendarStatus {
  success: boolean;
  connected: boolean;
  email?: string;
  error?: string;
}

// Scheduled Tests Types
export interface PerformanceAnalysis {
  [topic: string]: {
    averageScore: number;
    attempts: number;
    trend: 'improving' | 'declining' | 'stable';
    masteryLevel: 'novice' | 'intermediate' | 'proficient' | 'expert';
    lastAttempted: string;
    recentScores: number[];
  };
}

export interface ScheduledTest {
  id: number;
  topic: string;
  scheduled_date: string;
  difficulty_level: string;
  reason: string;
  status: string;
}

// API Base URL
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

// Helper function to get auth token
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Helper function to get auth headers
export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// ===== AUTHENTICATION API =====
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Login failed');
    }

    // Store token in localStorage
    if (result.success && result.token) {
      localStorage.setItem('authToken', result.token);
    }

    return result;
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed'
    };
  }
};

export const signup = async (credentials: SignupCredentials): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Signup failed');
    }

    // Store token in localStorage
    if (result.success && result.token) {
      localStorage.setItem('authToken', result.token);
    }

    return result;
  } catch (error) {
    console.error('Signup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Signup failed'
    };
  }
};

export const logout = async (): Promise<{ success: boolean }> => {
  try {
    const token = getAuthToken();
    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('authToken');
  }

  return { success: true };
};

export const verifyToken = async (): Promise<{ valid: boolean; user?: User; error?: string }> => {
  try {
    const token = getAuthToken();
    if (!token) {
      return { valid: false, error: 'No token found' };
    }

    const response = await fetch(`${API_BASE}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) {
      localStorage.removeItem('authToken');
      return { valid: false, error: result.error || 'Token verification failed' };
    }

    return result;
  } catch (error) {
    console.error('Token verification error:', error);
    localStorage.removeItem('authToken');
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token verification failed'
    };
  }
};

export const getProfile = async (): Promise<User | null> => {
  try {
    const response = await fetch(`${API_BASE}/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to get profile');
    }

    return await response.json();
  } catch (error) {
    console.error('Get profile error:', error);
    return null;
  }
};

// ===== STUDY SESSIONS API =====
export const getSessions = async (date?: string): Promise<{ success: boolean; sessions: Session[]; error?: string }> => {
  try {
    const params = date ? `?date=${date}` : '';
    const response = await fetch(`${API_BASE}/sessions${params}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }
    return await response.json();
  } catch (error) {
    console.error('Get sessions error:', error);
    return { success: false, sessions: [], error: error instanceof Error ? error.message : 'Failed to fetch' };
  }
};

export const addSession = async (sessionData: {
  topic: string;
  date: string;
  start_time: string;
  duration: number;
  notes?: string;
}): Promise<{ success: boolean; session?: Session; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(sessionData),
    });
    if (!response.ok) {
      throw new Error('Failed to add session');
    }
    return await response.json();
  } catch (error) {
    console.error('Add session error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add session' };
  }
};

export const updateSession = async (sessionId: number, sessionData: Partial<Session>): Promise<{ success: boolean; session?: Session; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(sessionData),
    });
    if (!response.ok) {
      throw new Error('Failed to update session');
    }
    return await response.json();
  } catch (error) {
    console.error('Update session error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update session' };
  }
};

export const deleteSession = async (sessionId: number): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete session');
    }
    return await response.json();
  } catch (error) {
    console.error('Delete session error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete session' };
  }
};

// ===== GOOGLE CALENDAR API =====
export const getCalendarStatus = async (): Promise<CalendarStatus> => {
  try {
    const response = await fetch(`${API_BASE}/calendar_app/status`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get calendar status');
    }
    return await response.json();
  } catch (error) {
    console.error('Calendar status error:', error);
    return { success: false, connected: false, error: error instanceof Error ? error.message : 'Failed to get status' };
  }
};

export const connectCalendar = async (): Promise<{ success: boolean; authUrl?: string; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/calendar_app/connect`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to connect calendar');
    }
    return await response.json();
  } catch (error) {
    console.error('Connect calendar error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to connect calendar' };
  }
};

export const disconnectCalendar = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/calendar_app/disconnect`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to disconnect calendar');
    }
    return await response.json();
  } catch (error) {
    console.error('Disconnect calendar error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to disconnect calendar' };
  }
};

export const createCalendarEvent = async (eventData: {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
}): Promise<{ success: boolean; eventId?: string; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/calendar_app/add-event`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(eventData),
    });
    if (!response.ok) {
      throw new Error('Failed to create calendar event');
    }
    return await response.json();
  } catch (error) {
    console.error('Create calendar event error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create event' };
  }
};

// ===== QUIZ API =====

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
  formData.append("numq", String(numQ));
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

// Save quiz result (old version, still exported for compatibility)
export async function saveQuizResult(result: QuizResult): Promise<{
  success: boolean;
  percentage?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/quiz/save-result`, {
      method: "POST",
      headers: getAuthHeaders(),
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

// ===== NEW: Save Quiz Result WITH Answers (needed by QuizGenerator.tsx) =====
export async function saveQuizResultWithAnswers(payload: SaveQuizResultWithAnswersRequest): Promise<{
  success: boolean;
  percentage?: number;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/quiz/save-result`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Save quiz result (with answers) error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Save failed'
    };
  }
}

// Get quiz history (authenticated)
export const getQuizHistory = async (): Promise<{ success: boolean; data: QuizAttempt[]; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/quiz/history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to get quiz history');
    }

    return await response.json();
  } catch (error) {
    console.error('Quiz history error:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Failed to get quiz history'
    };
  }
};

// Get quiz stats (authenticated)
export const getQuizStats = async (): Promise<{ success: boolean; data: QuizStats; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/quiz/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to get quiz stats');
    }

    return await response.json();
  } catch (error) {
    console.error('Quiz stats error:', error);
    return {
      success: false,
      data: {
        total_attempts: 0,
        avg_percentage: 0,
        best_score: 0,
        last_attempt: ''
      },
      error: error instanceof Error ? error.message : 'Failed to get quiz stats'
    };
  }
};

// Get user quiz statistics (public endpoint)
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

// Get leaderboard
export const getLeaderboard = async (): Promise<{ success: boolean; leaderboard: any[]; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE}/quiz/leaderboard`);
    if (!response.ok) {
      throw new Error('Failed to get leaderboard');
    }

    return await response.json();
  } catch (error) {
    console.error('Leaderboard error:', error);
    return {
      success: false,
      leaderboard: [],
      error: error instanceof Error ? error.message : 'Failed to get leaderboard'
    };
  }
};

// ===== CHAT API =====

export const sendChatMessage = async (
  message: string,
  sessionId?: number,
  fileText?: string
): Promise<{
  success: boolean;
  reply?: string;
  session_id?: number;
  error?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE}/chat/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        message,
        session_id: sessionId,
        fileText
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return await response.json();
  } catch (error) {
    console.error('Chat message error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message'
    };
  }
};

export const getChatHistory = async (
  sessionId?: number,
  limit: number = 50
): Promise<{
  success: boolean;
  history: ChatMessage[];
  error?: string;
}> => {
  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (sessionId) params.append('session_id', sessionId.toString());
    const response = await fetch(`${API_BASE}/chat/history?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to get chat history');
    }

    return await response.json();
  } catch (error) {
    console.error('Chat history error:', error);
    return {
      success: false,
      history: [],
      error: error instanceof Error ? error.message : 'Failed to get chat history'
    };
  }
};

export const getChatSessions = async (): Promise<{
  success: boolean;
  sessions: ChatSession[];
  error?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE}/chat/sessions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to get chat sessions');
    }

    return await response.json();
  } catch (error) {
    console.error('Chat sessions error:', error);
    return {
      success: false,
      sessions: [],
      error: error instanceof Error ? error.message : 'Failed to get chat sessions'
    };
  }
};

export const createChatSession = async (title: string = 'New Chat'): Promise<{
  success: boolean;
  session_id?: number;
  error?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE}/chat/sessions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      throw new Error('Failed to create chat session');
    }

    return await response.json();
  } catch (error) {
    console.error('Create chat session error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create chat session'
    };
  }
};

export const deleteChatSession = async (sessionId: number): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to delete chat session');
    }

    return await response.json();
  } catch (error) {
    console.error('Delete chat session error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete chat session'
    };
  }
};

export const renameChatSession = async (
  sessionId: number,
  title: string
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      throw new Error('Failed to rename chat session');
    }

    return await response.json();
  } catch (error) {
    console.error('Rename chat session error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename chat session'
    };
  }
};

export const uploadChatFile = async (
  file: File
): Promise<{
  success: boolean;
  fileText?: string;
  filename?: string;
  error?: string;
}> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/chat/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: formData,
    });
    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    return await response.json();
  } catch (error) {
    console.error('Upload chat file error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file'
    };
  }
};

// YouTube search via backend (keeps API key secret)
export const youtubeSearch = async (
  query: string,
      maxResults: number = 2
): Promise<{
  success: boolean;
  videos: Array<{ videoId: string; title: string; description?: string; channelTitle?: string; thumbnail?: string; publishTime?: string }>;
  error?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE}/chat/youtube/search`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ query, maxResults }),
    });
    if (!response.ok) {
      throw new Error('Failed to search YouTube');
    }
    return await response.json();
  } catch (error) {
    console.error('YouTube search error:', error);
    return { success: false, videos: [], error: error instanceof Error ? error.message : 'YouTube search failed' };
  }
};

// ===== AI AGENT API =====

// Run AI Agent cycle (analyzes performance & schedules tests)
export const runAIAgentCycle = async (): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE}/ai-agent/run-cycle`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to run AI agent cycle');
    }

    return await response.json();
  } catch (error) {
    console.error('AI agent cycle error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run AI agent',
    };
  }
};

// Get performance analysis
export const getPerformanceAnalysis = async (): Promise<{
  success: boolean;
  data?: PerformanceAnalysis;
  error?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE}/ai-agent/analysis`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get performance analysis');
    }

    return await response.json();
  } catch (error) {
    console.error('Performance analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get analysis',
    };
  }
};

// Get AI-scheduled tests
export const getScheduledTests = async (): Promise<{
  success: boolean;
  data?: ScheduledTest[];
  error?: string;
}> => {
  try {
    const response = await fetch(`${API_BASE}/ai-agent/scheduled-tests`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get scheduled tests');
    }

    return await response.json();
  } catch (error) {
    console.error('Scheduled tests error:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Failed to get scheduled tests',
    };
  }
};

// ===== HEALTH CHECK =====

export async function checkHealth(): Promise<{ status: string; service: string }> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return await response.json();
  } catch (error) {
    return { status: "error", service: "unavailable" };
  }
}

// ===== UTILITY FUNCTIONS =====

export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

export const getCurrentUserFromToken = (): { id: number; username: string } | null => {
  const token = getAuthToken();
  if (!token) return null;
  try {
    // Decode JWT payload (basic decoding - do NOT use for security validation)
    const payloadJson = decodeURIComponent(
      atob(token.split('.')[1])
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(payloadJson);
    return { id: payload.id, username: payload.username };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// =====================================================
// CODING ASSISTANT API (LeetCode-style)
// =====================================================

export type ProblemSummary = {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
};

export type ProblemDetail = {
  id: string;
  title: string;
  difficulty: string;
  description: string;
  examples?: any[];
  constraints?: string[];
  starterCode?: Record<string, string>;
  testCases?: any[];
};

export type RunCodeResponse = {
  success: boolean;
  result?: {
    passed: boolean;
    testResults: {
      input: any;
      expected: any;
      actual: any;
      passed: boolean;
    }[];
  };
  error?: string;
};

// ✅ Get all problems
export async function getProblems(): Promise<{
  success: boolean;
  problems: ProblemSummary[];
}> {
  const res = await fetch(`${API_BASE}/coding-assistant/problems`);
  return res.json();
}

// ✅ Get problem by ID
export async function getProblemById(id: string): Promise<{
  success: boolean;
  problem: ProblemDetail;
}> {
  const res = await fetch(`${API_BASE}/coding-assistant/problems/${id}`);
  return res.json();
}

// ✅ Run code against test cases
export async function runProblemCode({
  problemId,
  code,
  language,
}: {
  problemId: string;
  code: string;
  language: "python" | "cpp" | "javascript";
}): Promise<RunCodeResponse> {
  const res = await fetch(`${API_BASE}/coding-assistant/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ problemId, code, language }),
  });

  return res.json();
}
