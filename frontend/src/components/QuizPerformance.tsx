import React, { useEffect, useState } from 'react';
import { getQuizPerformance } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export default function QuizPerformance() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [agentMessage, setAgentMessage] = useState('');

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await getQuizPerformance();
      if (response.success) {
        setStats(response.stats || null);
        setHistory(response.history || []);
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

      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/ai-agent/run-cycle`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setAgentMessage('✅ AI recommendations updated!');
        setTimeout(() => {
          fetchPerformanceData();
        }, 1500);
      } else {
        setAgentMessage('❌ Failed to update recommendations');
      }
    } catch (error) {
      console.error('Error:', error);
      setAgentMessage('❌ Error triggering AI agent');
    } finally {
      setLoadingAgent(false);
      setTimeout(() => setAgentMessage(''), 5000);
    }
  };

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;
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

      {/* AI Agent Button */}
      <div style={{ 
        background: 'rgba(50, 100, 200, 0.1)', 
        borderRadius: '12px', 
        padding: '20px', 
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <button
          onClick={triggerAIAgent}
          disabled={loadingAgent}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            border: 'none',
            padding: '12px 30px',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: loadingAgent ? 'not-allowed' : 'pointer',
            opacity: loadingAgent ? 0.6 : 1,
          }}
        >
          {loadingAgent ? '⏳ Analyzing...' : '🤖 Update AI Recommendations'}
        </button>

        {agentMessage && (
          <div style={{
            marginTop: '15px',
            padding: '10px 15px',
            borderRadius: '6px',
            color: agentMessage.includes('✅') ? '#86efac' : '#fca5a5',
            background: agentMessage.includes('✅') 
              ? 'rgba(34, 197, 94, 0.2)' 
              : 'rgba(239, 68, 68, 0.2)',
          }}>
            {agentMessage}
          </div>
        )}
      </div>

      {/* Quiz History */}
      <h2>Quiz History</h2>
      <button onClick={fetchPerformanceData}>🔄 Refresh</button>

      {history && history.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '20px',
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(156, 124, 255, 0.3)' }}>
                <th style={{ padding: '15px', textAlign: 'left' }}>Topic</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Diff.</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Score</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>%</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Time</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((attempt) => (
                <tr key={attempt.id} style={{ borderBottom: '1px solid rgba(156, 124, 255, 0.1)' }}>
                  <td style={{ padding: '12px 15px' }}>{attempt.topic}</td>
                  <td style={{ padding: '12px 15px' }}>{difficultyLabels[attempt.difficulty]}</td>
                  <td style={{ padding: '12px 15px' }}>{attempt.score}/{attempt.total_questions}</td>
                  <td style={{ padding: '12px 15px', color: attempt.percentage >= 70 ? '#86efac' : '#fca5a5' }}>
                    {attempt.percentage}%
                  </td>
                  <td style={{ padding: '12px 15px' }}>{formatTime(attempt.time_taken || 0)}</td>
                  <td style={{ padding: '12px 15px' }}>{new Date(attempt.created_at ?? attempt.taken_at ?? '').toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>💡 No quizzes attempted yet.</p>
      )}

      <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(100, 200, 100, 0.1)', borderRadius: '8px' }}>
        💡 Keep practicing to improve your scores!
      </div>
    </div>
  );
}
