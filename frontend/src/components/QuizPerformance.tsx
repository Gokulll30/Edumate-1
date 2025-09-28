import React, { useState, useEffect } from 'react';
import { BarChart, TrendingUp, Target, Clock, Trophy } from 'lucide-react';
import { getUserQuizStats, UserQuizStats, QuizAttempt } from '../services/api';
import { useAuth } from '../context/AuthContext';

const QuizPerformance: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserQuizStats | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.username) {
      loadUserStats();
    }
  }, [user]);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      const result = await getUserQuizStats(user!.username);
      if (result.success) {
        setStats(result.stats || null);
        setRecentAttempts(result.recent_attempts || []);
      } else {
        setError(result.error || 'Failed to load stats');
      }
    } catch (err) {
      setError('Failed to load quiz performance data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-500';
    if (percentage >= 75) return 'text-blue-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white pt-20 flex items-center justify-center">
        <div className="text-center text-red-400">
          <p>Error: {error}</p>
          <button 
            onClick={loadUserStats}
            className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-20">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center mb-8">
          <BarChart className="mr-3 h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Quiz Performance</h1>
        </div>

        {!stats || stats.total_attempts === 0 ? (
          <div className="text-center py-12">
            <Trophy className="mx-auto h-16 w-16 text-gray-600 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-400 mb-2">No Quiz Attempts Yet</h2>
            <p className="text-gray-500">Take your first quiz to see your performance statistics!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-400">Total Attempts</p>
                    <p className="text-2xl font-bold">{stats.total_attempts}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-400">Average Score</p>
                    <p className="text-2xl font-bold">{stats.avg_percentage}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center">
                  <Trophy className="h-8 w-8 text-yellow-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-400">Best Score</p>
                    <p className="text-2xl font-bold">{stats.best_score}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-purple-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-400">Last Attempt</p>
                    <p className="text-sm font-semibold">
                      {new Date(stats.last_attempt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Attempts */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Recent Quiz Attempts</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Topic</th>
                      <th className="pb-2">Difficulty</th>
                      <th className="pb-2">Score</th>
                      <th className="pb-2">Percentage</th>
                      <th className="pb-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAttempts.map((attempt, index) => (
                      <tr key={index} className="border-b border-gray-700">
                        <td className="py-2">
                          {new Date(attempt.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2">{attempt.topic}</td>
                        <td className="py-2 capitalize">{attempt.difficulty}</td>
                        <td className="py-2">
                          {attempt.score}/{attempt.total_questions}
                        </td>
                        <td className={`py-2 font-semibold ${getScoreColor(attempt.percentage)}`}>
                          {attempt.percentage}%
                        </td>
                        <td className="py-2">{formatTime(attempt.time_taken)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPerformance;
