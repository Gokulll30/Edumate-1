import React, { useState, useEffect } from 'react';
import { getQuizHistory, getQuizStats } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface QuizAttempt {
  id: number;
  topic: string;
  difficulty: string;
  score: number;
  total_questions: number;
  percentage: number;
  time_taken: number;
  created_at: string; // Should map from backend's taken_at
}

interface QuizStats {
  total_attempts: number;
  avg_percentage: number;
  best_score: number;
  last_attempt: string;
}

const QuizPerformance: React.FC = () => {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (user?.id) {
        fetchPerformanceData();
      } else {
        setLoading(false);
        setError('Authentication required. Please log in again.');
      }
    }
    // eslint-disable-next-line
  }, [user, authLoading]);
  
  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError('');

      if (!user?.id) {
        setError('User not logged in');
        setLoading(false);
        return;
      }

      const userId = user.id;
      const [historyResponse, statsResponse] = await Promise.all([
        getQuizHistory(userId), 
        getQuizStats(userId)
      ]);

      // Ensure mapping taken_at -> created_at
      let attemptsList: QuizAttempt[] = [];
      if (historyResponse.success && Array.isArray(historyResponse.data)) {
        attemptsList = historyResponse.data.map((att: any) => ({
          ...att,
          created_at: att.taken_at, // Fix: map backend to expected frontend field
        }));
        setAttempts(attemptsList);
      } else {
        setAttempts([]);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        setStats({
          total_attempts: 0,
          avg_percentage: 0,
          best_score: 0,
          last_attempt: '',
        });
      }

      // Display error only if both failed
      if (!historyResponse.success && !statsResponse.success) {
        setError('Failed to load performance data. Please try again.');
      }

    } catch (err) {
      setError('Failed to load performance data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Quiz Performance</h1>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-400">Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Quiz Performance</h1>
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold mb-2">Please Log In</h2>
          <p className="text-gray-400 mb-6">You need to be logged in to view your quiz performance.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Quiz Performance</h1>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading performance data for {user.name || user.email}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Quiz Performance</h1>
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
          <div className="text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={fetchPerformanceData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || (stats.total_attempts === 0 && attempts.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Quiz Performance</h1>
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-semibold mb-2">No Quiz Data Yet</h2>
          <p className="text-gray-400 mb-6">Take your first quiz to see your performance statistics!</p>
          <a
            href="/quiz"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Take a Quiz
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Quiz Performance - {user.name || user.email}
      </h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-purple-900/20 border border-purple-500 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-600 rounded-lg mr-4">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Attempts</p>
                <p className="text-2xl font-bold">{stats.total_attempts}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-600 rounded-lg mr-4">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Average Score</p>
                <p className="text-2xl font-bold">{Math.round(stats.avg_percentage)}%</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-600 rounded-lg mr-4">
                <span className="text-2xl">🏆</span>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Best Score</p>
                <p className="text-2xl font-bold">{stats.best_score}%</p>
              </div>
            </div>
          </div>
          <div className="bg-orange-900/20 border border-orange-500 rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-600 rounded-lg mr-4">
                <span className="text-2xl">📅</span>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Last Attempt</p>
                <p className="text-lg font-bold">
                  {stats.last_attempt ? new Date(stats.last_attempt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz History Table */}
      {attempts.length > 0 && (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold">Quiz History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Topic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Difficulty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Percentage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(attempt.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {attempt.topic || 'General'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        attempt.difficulty === 'easy' ? 'bg-green-900 text-green-300' :
                        attempt.difficulty === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-red-900 text-red-300'
                      }`}>
                        {attempt.difficulty || 'mixed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {attempt.score}/{attempt.total_questions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        attempt.percentage >= 80 ? 'text-green-400' :
                        attempt.percentage >= 60 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {attempt.percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatTime(attempt.time_taken || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default QuizPerformance;
