import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface QuizAttempt {
  id: number;
  taken_at?: string;
  created_at?: string;
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

// Demo fallback data for display only
const demoAttempts: QuizAttempt[] = [
  {
    id: 1,
    taken_at: '2025-11-12T11:32:00Z',
    topic: 'Computer Science',
    difficulty: 'hard',
    score: 8,
    total_questions: 10,
    percentage: 80,
    time_taken: 320,
  },
  {
    id: 2,
    taken_at: '2025-11-10T09:15:00Z',
    topic: 'Mathematics',
    difficulty: 'medium',
    score: 9,
    total_questions: 10,
    percentage: 90,
    time_taken: 300,
  },
  {
    id: 3,
    taken_at: '2025-11-08T18:05:00Z',
    topic: 'Database Systems',
    difficulty: 'easy',
    score: 10,
    total_questions: 10,
    percentage: 100,
    time_taken: 260,
  },
  {
    id: 4,
    taken_at: '2025-11-06T15:22:00Z',
    topic: 'Machine Learning',
    difficulty: 'hard',
    score: 7,
    total_questions: 10,
    percentage: 70,
    time_taken: 340,
  },
  {
    id: 5,
    taken_at: '2025-11-04T20:53:00Z',
    topic: 'Algorithms',
    difficulty: 'medium',
    score: 8,
    total_questions: 10,
    percentage: 80,
    time_taken: 310,
  },
];

const demoStats: Stats = {
  total_attempts: demoAttempts.length,
  avg_percentage: Math.round(
    demoAttempts.reduce((acc, a) => acc + a.percentage, 0) / demoAttempts.length
  ),
  best_score: Math.max(...demoAttempts.map((a) => a.percentage)),
  last_attempt: demoAttempts[0].taken_at,
};


const QuizPerformance: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPerformance = async () => {
      setLoading(true);

      if (!user || !user.id) {
        // Only show demo data if truly not logged in
        setStats(demoStats);
        setAttempts(demoAttempts);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/quiz/performance?userId=${encodeURIComponent(user.id)}`);
        const data = await res.json();
        if (data?.success) {
          setStats(data.stats);
          setAttempts(
            (data.history || []).map((a: any) => ({
              ...a,
              created_at: a.taken_at || a.created_at,
            }))
          );
        } else {
          // If fetch fails but we are logged in, it might be better to show empty state or error
          // rather than demo data, to avoid confusion. But for now let's show empty.
          setStats(null);
          setAttempts([]);
        }
      } catch (err) {
        console.error("Failed to fetch performance", err);
        setStats(null);
        setAttempts([]);
      }
      setLoading(false);
    };

    fetchPerformance();
  }, [user]);

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
          <span role="img" aria-label="hat" className="text-2xl">
            🎓
          </span>
          <span>Quiz Performance</span>
        </h1>

        {/* Stat cards */}
        <div className="flex flex-nowrap gap-6 mb-10 overflow-x-auto">
          <div className="bg-purple-950 border border-purple-600 rounded-xl p-5 flex flex-col items-center shadow-md min-w-[200px]">
            <div className="bg-purple-600 text-white rounded-full p-3 mb-2">
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-gray-300 text-base mb-1 font-medium">Total Attempts</p>
            <p className="text-3xl font-bold text-purple-200">{stats ? stats.total_attempts : '--'}</p>
          </div>
          <div className="bg-green-950 border border-green-600 rounded-xl p-5 flex flex-col items-center shadow-md min-w-[200px]">
            <div className="bg-green-600 text-white rounded-full p-3 mb-2">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-gray-300 text-base mb-1 font-medium">Average Score</p>
            <p className="text-3xl font-bold text-green-200">{stats ? stats.avg_percentage : '--'}%</p>
          </div>
          <div className="bg-blue-950 border border-blue-600 rounded-xl p-5 flex flex-col items-center shadow-md min-w-[200px]">
            <div className="bg-blue-600 text-white rounded-full p-3 mb-2">
              <span className="text-2xl">🏆</span>
            </div>
            <p className="text-gray-300 text-base mb-1 font-medium">Best Score</p>
            <p className="text-3xl font-bold text-blue-200">{stats ? stats.best_score : '--'}%</p>
          </div>
          <div className="bg-orange-950 border border-orange-600 rounded-xl p-5 flex flex-col items-center shadow-md min-w-[200px]">
            <div className="bg-orange-600 text-white rounded-full p-3 mb-2">
              <span className="text-2xl">⏰</span>
            </div>
            <p className="text-gray-300 text-base mb-1 font-medium">Last Attempt</p>
            <p className="text-xl font-bold text-orange-200">
              {stats && stats.last_attempt ? new Date(stats.last_attempt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* Table section */}
        <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h2 className="text-lg font-bold text-purple-200">Quiz History</h2>
            <span className="bg-blue-800 px-4 py-2 rounded text-sm text-white font-semibold">Track your progress!</span>
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
                    <td colSpan={6} className="text-center text-slate-400 py-8">
                      Loading...
                    </td>
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
                        <span
                          className={`inline-flex items-center justify-center font-bold rounded-full text-xs w-6 h-6 ${difficultyColors[attempt.difficulty]}`}
                        >
                          {difficultyLabels[attempt.difficulty]}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-white font-semibold">
                        {attempt.score}/{attempt.total_questions}
                      </td>
                      <td className={`px-2 py-3 font-bold ${percentageColor(attempt.percentage)}`}>{attempt.percentage}%</td>
                      <td className="px-2 py-3 text-yellow-300 font-semibold">{formatTime(attempt.time_taken || 0)}</td>
                      <td className="px-2 py-3 text-blue-200">
                        {new Date(attempt.created_at ?? attempt.taken_at ?? '').toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-gray-950 rounded-b-xl">
            <p className="text-gray-400 text-sm">
              <span role="img" aria-label="tips">
                💡
              </span>{' '}
              Keep practicing to improve your scores!
            </p>
            <button
              type="button"
              className="inline-block bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm hover:bg-blue-800 transition-colors"
              onClick={() => navigate('/quiz')}
            >
              Take a Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPerformance;