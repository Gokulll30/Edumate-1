import React, { useEffect, useState } from 'react';

interface QuizAttempt {
  id: number;
  taken_at?: string; // Backend key
  created_at?: string; // Fallback for older
  topic: string;
  difficulty: string;
  score: number;
  total_questions: number;
  percentage: number;
  time_taken: number;
}

interface Stats {
  total_attempts: number;
  avg_percentage: number;
  best_score: number;
  last_attempt?: string;
}

// Simple get user ID utility (replace with your auth context as needed)
function getUserId(): string | null {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

// Difficulty badge helpers
const difficultyColors: Record<string, string> = {
  easy: 'bg-green-700 text-green-100',
  medium: 'bg-yellow-700 text-yellow-100',
  hard: 'bg-red-700 text-red-100',
};

const difficultyLabels: Record<string, string> = {
  easy: 'E',
  medium: 'M',
  hard: 'H',
};

const percentageColor = (perc: number) => {
  if (perc >= 80) return 'text-green-400';
  if (perc >= 60) return 'text-yellow-400';
  return 'text-red-400';
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} min`;
};

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const QuizPerformance: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      setLoading(true);
      const userId = getUserId();
      if (!userId) { setLoading(false); return; }
      try {
        const res = await fetch(`${API_BASE}/quiz/performance?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (data?.success) {
          setStats(data.stats);
          // Support both "taken_at" and "created_at" for compatibility
          setAttempts(
            (data.history || []).map(
              (a: any) => ({
                ...a,
                created_at: a.taken_at || a.created_at
              })
            )
          );
        }
      } catch (err) {
        setStats(null);
        setAttempts([]);
      }
      setLoading(false);
    };
    fetchPerformance();
  }, []);

  return (
    <div
      className="w-full"
      style={{
        paddingLeft: '260px',
        boxSizing: 'border-box',
        minHeight: '100vh',
        background: '#101933',
      }}
    >
      <div className="max-w-7xl mx-auto py-5 px-2 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold mb-7 text-center text-purple-300 flex items-center justify-center gap-2">
          <span role="img" aria-label="hat" className="text-2xl">🎓</span>
          <span>Quiz Performance</span>
        </h1>

        {/* Stat cards */}
        <div className="flex flex-nowrap gap-6 mb-10 overflow-x-auto">
          <div className="bg-purple-950 border border-purple-600 rounded-xl p-5 flex flex-col items-center shadow-md min-w-[200px]">
            <div className="bg-purple-600 text-white rounded-full p-3 mb-2">
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-gray-300 text-base mb-1 font-medium">Total Attempts</p>
            <p className="text-3xl font-bold text-purple-200">
              {stats ? stats.total_attempts : '--'}
            </p>
          </div>
          <div className="bg-green-950 border border-green-600 rounded-xl p-5 flex flex-col items-center shadow-md min-w-[200px]">
            <div className="bg-green-600 text-white rounded-full p-3 mb-2">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-gray-300 text-base mb-1 font-medium">Average Score</p>
            <p className="text-3xl font-bold text-green-200">
              {stats ? stats.avg_percentage : '--'}%
            </p>
          </div>
          <div className="bg-blue-950 border border-blue-600 rounded-xl p-5 flex flex-col items-center shadow-md min-w-[200px]">
            <div className="bg-blue-600 text-white rounded-full p-3 mb-2">
              <span className="text-2xl">🏆</span>
            </div>
            <p className="text-gray-300 text-base mb-1 font-medium">Best Score</p>
            <p className="text-3xl font-bold text-blue-200">
              {stats ? stats.best_score : '--'}%
            </p>
          </div>
          <div className="bg-orange-950 border border-orange-600 rounded-xl p-5 flex flex-col items-center shadow-md min-w-[200px]">
            <div className="bg-orange-600 text-white rounded-full p-3 mb-2">
              <span className="text-2xl">⏰</span>
            </div>
            <p className="text-gray-300 text-base mb-1 font-medium">Last Attempt</p>
            <p className="text-xl font-bold text-orange-200">
              {stats && stats.last_attempt
                ? new Date(stats.last_attempt).toLocaleDateString()
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Table section */}
        <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h2 className="text-lg font-bold text-purple-200">Quiz History</h2>
            <span className="bg-blue-800 px-4 py-2 rounded text-sm text-white font-semibold">
              Track your progress!
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-base">
              <thead>
                <tr className="bg-gradient-to-r from-purple-900 via-blue-900 to-orange-900">
                  <th className="px-4 py-2 font-bold text-gray-100 uppercase">Topic</th>
                  <th className="px-2 py-2 font-bold text-gray-100 uppercase">Diff.</th>
                  <th className="px-2 py-2 font-bold text-gray-100 uppercase">Score</th>
                  <th className="px-2 py-2 font-bold text-gray-100 uppercase">%</th>
                  <th className="px-2 py-2 font-bold text-gray-100 uppercase">Time</th>
                  <th className="px-2 py-2 font-bold text-gray-100 uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center text-slate-400 py-8">Loading...</td>
                  </tr>
                ) : attempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-slate-400 py-8">
                      No quizzes attempted yet.
                    </td>
                  </tr>
                ) : (
                  attempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-purple-800/50 transition-all">
                      <td className="px-4 py-3 font-semibold text-green-200">{attempt.topic}</td>
                      <td className="px-2 py-3">
                        <span className={`inline-flex items-center justify-center font-bold rounded-full text-xs w-6 h-6 ${difficultyColors[attempt.difficulty]}`}>
                          {difficultyLabels[attempt.difficulty]}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-white font-semibold">{attempt.score}/{attempt.total_questions}</td>
                      <td className={`px-2 py-3 font-bold ${percentageColor(attempt.percentage)}`}>{attempt.percentage}%</td>
                      <td className="px-2 py-3 text-yellow-300 font-semibold">{formatTime(attempt.time_taken || 0)}</td>
                      <td className="px-2 py-3 text-blue-200">{new Date(attempt.created_at ?? attempt.taken_at ?? '').toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-gray-950 rounded-b-xl">
            <p className="text-gray-400 text-sm">
              <span role="img" aria-label="tips">💡</span> Keep practicing to improve your scores!
            </p>
            <a
              href="/quiz"
              className="inline-block bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm hover:bg-blue-800 transition-colors"
            >
              Take a Quiz
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPerformance;