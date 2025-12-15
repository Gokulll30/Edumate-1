import React, { useEffect, useState } from 'react';
import { getQuizPerformance, runAIAgentCycle, getPerformanceAnalysis, getScheduledTests } from '../services/api';
import type { PerformanceAnalysis, ScheduledTest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../styles/QuizPerformance.css';

interface QuizAttempt {
  id: number;
  topic: string;
  difficulty: string;
  score: number;
  total_questions: number;
  percentage: number;
  time_taken: number;
  created_at?: string;
  taken_at?: string;
}

interface Stats {
  total_attempts: number;
  avg_percentage: number;
  best_score: number;
  last_attempt: string;
}

const difficultyLabels: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  mixed: 'Mixed',
};

const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export default function QuizPerformance() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [scheduledTests, setScheduledTests] = useState<ScheduledTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [agentMessage, setAgentMessage] = useState('');

  useEffect(() => {
    if (user) {
      fetchPerformanceData();
    }
  }, [user]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      
      // Fetch quiz performance
      const perfResponse = await getQuizPerformance();
      if (perfResponse.success) {
        setStats(perfResponse.stats || null);
        setHistory(perfResponse.history || []);
      }

      // Fetch AI analysis
      const analysisResponse = await getPerformanceAnalysis();
      if (analysisResponse.success) {
        setAnalysis(analysisResponse.data || null);
      }

      // Fetch scheduled tests
      const testsResponse = await getScheduledTests();
      if (testsResponse.success) {
        setScheduledTests(testsResponse.data || []);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerAIAgent = async () => {
    try {
      setLoadingAgent(true);
      setAgentMessage('🤖 Analyzing your performance...');

      const response = await runAIAgentCycle();

      if (response.success) {
        setAgentMessage('✅ AI recommendations updated! New tests scheduled.');
        // Refresh data after 1.5 seconds
        setTimeout(() => {
          fetchPerformanceData();
          setAgentMessage('');
        }, 1500);
      } else {
        setAgentMessage('❌ Failed to update AI recommendations');
        setTimeout(() => setAgentMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error triggering AI agent:', error);
      setAgentMessage('❌ Error triggering AI agent');
      setTimeout(() => setAgentMessage(''), 5000);
    } finally {
      setLoadingAgent(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: '#adb5c4' }}>
        Loading performance data...
      </div>
    );
  }

  return (
    <div className="quiz-performance-container">
      <h1>🎯 Quiz Performance</h1>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card total-attempts">
          <div className="stat-icon">📊</div>
          <h3>Total Attempts</h3>
          <p className="stat-value">{stats ? stats.total_attempts : '--'}</p>
        </div>

        <div className="stat-card average-score">
          <div className="stat-icon">📈</div>
          <h3>Average Score</h3>
          <p className="stat-value">{stats ? stats.avg_percentage : '--'}%</p>
        </div>

        <div className="stat-card best-score">
          <div className="stat-icon">🏆</div>
          <h3>Best Score</h3>
          <p className="stat-value">{stats ? stats.best_score : '--'}%</p>
        </div>

        <div className="stat-card last-attempt">
          <div className="stat-icon">📅</div>
          <h3>Last Attempt</h3>
          <p className="stat-value">
            {stats && stats.last_attempt ? new Date(stats.last_attempt).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      {/* AI Agent Control Section */}
      <div className="ai-agent-section">
        <button
          onClick={triggerAIAgent}
          disabled={loadingAgent}
          className="btn-ai-agent"
        >
          {loadingAgent ? '⏳ Analyzing...' : '🤖 Update AI Recommendations'}
        </button>

        {agentMessage && (
          <div className={`agent-message ${agentMessage.includes('✅') ? 'success' : 'error'}`}>
            {agentMessage}
          </div>
        )}
      </div>

      {/* Scheduled Tests Section */}
      {scheduledTests && scheduledTests.length > 0 && (
        <div className="scheduled-tests-section">
          <h2>📅 AI-Scheduled Tests</h2>
          <div className="scheduled-tests-grid">
            {scheduledTests.map((test) => (
              <div key={test.id} className="scheduled-test-card">
                <h4>{test.topic}</h4>
                <p><strong>Difficulty:</strong> {test.difficulty_level}</p>
                <p><strong>Scheduled:</strong> {new Date(test.scheduled_date).toLocaleDateString()}</p>
                <p className="reason">
                  <strong>Reason:</strong> {test.reason.replace(/_/g, ' ')}
                </p>
                <button onClick={() => alert(`Start quiz for ${test.topic}`)} className="btn-start-quiz">
                  Start Quiz
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Analysis by Topic */}
      {analysis && Object.keys(analysis).length > 0 && (
        <div className="topic-analysis-section">
          <h2>📊 Performance by Topic</h2>
          <div className="topic-cards-grid">
            {Object.entries(analysis).map(([topic, stats]) => (
              <div key={topic} className={`topic-card ${stats.trend}`}>
                <h4>{topic}</h4>
                <p className="score">Score: <strong>{stats.averageScore}%</strong></p>
                <p>Attempts: {stats.attempts}</p>
                <p className={`trend ${stats.trend}`}>
                  Trend: {stats.trend === 'improving' ? '📈' : stats.trend === 'declining' ? '📉' : '➡️'} {stats.trend}
                </p>
                <span className={`mastery-badge ${stats.masteryLevel}`}>
                  {stats.masteryLevel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz History */}
      <div className="quiz-history-section">
        <h2>Quiz History</h2>
        <div className="quiz-history-controls">
          <button onClick={fetchPerformanceData} className="btn-refresh">
            🔄 Refresh
          </button>
          <span className="track-progress">Track your progress!</span>
        </div>

        {history && history.length > 0 ? (
          <div className="quiz-history-table">
            <table>
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Diff.</th>
                  <th>Score</th>
                  <th>%</th>
                  <th>Time</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>{attempt.topic}</td>
                    <td>{difficultyLabels[attempt.difficulty] || attempt.difficulty}</td>
                    <td>{attempt.score}/{attempt.total_questions}</td>
                    <td className={attempt.percentage >= 70 ? 'pass' : 'fail'}>
                      {attempt.percentage}%
                    </td>
                    <td>{formatTime(attempt.time_taken || 0)}</td>
                    <td>{new Date(attempt.created_at ?? attempt.taken_at ?? '').toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-history">
            <p>💡 No quizzes attempted yet.</p>
          </div>
        )}
      </div>

      <div className="tip-section">
        💡 Keep practicing to improve your scores!
      </div>
    </div>
  );
}
