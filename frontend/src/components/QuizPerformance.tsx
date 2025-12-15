import React, { useEffect, useState } from 'react';
import { getQuizStats, runAIAgentCycle } from '../services/api';
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
  }, [user]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await getQuizStats();
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

      const response = await runAIAgentCycle();

      if (response.success) {
        setAgentMessage('✅ AI recommendations updated! New tests scheduled.');
        setTimeout(() => {
          fetchPerformanceData();
          setAgentMessage('');
        }, 2000);
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
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ color: '#9c7cff', marginBottom: '30px', fontSize: '2rem' }}>
        🎯 Quiz Performance
      </h1>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}
      >
        <div
          style={{
            background: 'rgba(100, 50, 200, 0.15)',
            border: '1px solid rgba(156, 124, 255, 0.3)',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'center',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📊</div>
          <h3 style={{ color: '#c8b6ff', margin: '10px 0', fontSize: '0.9rem' }}>
            Total Attempts
          </h3>
          <p style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>
            {stats ? stats.total_attempts : '--'}
          </p>
        </div>

        <div
          style={{
            background: 'rgba(100, 50, 200, 0.15)',
            border: '1px solid rgba(156, 124, 255, 0.3)',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'center',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📈</div>
          <h3 style={{ color: '#c8b6ff', margin: '10px 0', fontSize: '0.9rem' }}>
            Average Score
          </h3>
          <p style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>
            {stats ? stats.avg_percentage : '--'}%
          </p>
        </div>

        <div
          style={{
            background: 'rgba(100, 50, 200, 0.15)',
            border: '1px solid rgba(156, 124, 255, 0.3)',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'center',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🏆</div>
          <h3 style={{ color: '#c8b6ff', margin: '10px 0', fontSize: '0.9rem' }}>
            Best Score
          </h3>
          <p style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>
            {stats ? stats.best_score : '--'}%
          </p>
        </div>

        <div
          style={{
            background: 'rgba(100, 50, 200, 0.15)',
            border: '1px solid rgba(156, 124, 255, 0.3)',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'center',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📅</div>
          <h3 style={{ color: '#c8b6ff', margin: '10px 0', fontSize: '0.9rem' }}>
            Last Attempt
          </h3>
          <p style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0 0 0' }}>
            {stats && stats.last_attempt ? new Date(stats.last_attempt).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      {/* AI Agent Trigger Section */}
      <div
        style={{
          background: 'rgba(50, 100, 200, 0.1)',
          border: '2px solid rgba(100, 180, 255, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '40px',
          textAlign: 'center',
        }}
      >
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
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            if (!loadingAgent) {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.target as HTMLButtonElement).style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.4)';
          }}
        >
          {loadingAgent ? '⏳ Analyzing...' : '🤖 Update AI Recommendations'}
        </button>

        {agentMessage && (
          <div
            style={{
              marginTop: '15px',
              padding: '12px 15px',
              borderRadius: '6px',
              fontWeight: '600',
              animation: 'slideIn 0.3s ease',
              color: agentMessage.includes('✅') ? '#86efac' : '#fca5a5',
              background: agentMessage.includes('✅')
                ? 'rgba(34, 197, 94, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              border: agentMessage.includes('✅')
                ? '1px solid rgba(34, 197, 94, 0.4)'
                : '1px solid rgba(239, 68, 68, 0.4)',
            }}
          >
            {agentMessage}
          </div>
        )}
      </div>

      {/* Quiz History Section */}
      <h2 style={{ color: '#c8b6ff', marginTop: '40px', marginBottom: '20px', fontSize: '1.5rem' }}>
        Quiz History
      </h2>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={fetchPerformanceData}
          style={{
            background: 'rgba(100, 150, 255, 0.2)',
            color: '#64b5f6',
            border: '1px solid rgba(100, 150, 255, 0.4)',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            marginRight: '10px',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = 'rgba(100, 150, 255, 0.3)';
            (e.target as HTMLButtonElement).style.borderColor = 'rgba(100, 150, 255, 0.6)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = 'rgba(100, 150, 255, 0.2)';
            (e.target as HTMLButtonElement).style.borderColor = 'rgba(100, 150, 255, 0.4)';
          }}
        >
          🔄 Refresh
        </button>
        <span style={{ color: '#adb5c4', fontWeight: '600' }}>Track your progress!</span>
      </div>

      {history && history.length > 0 ? (
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid rgba(156, 124, 255, 0.2)' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'rgba(100, 100, 100, 0.05)',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(156, 124, 255, 0.3)' }}>
                <th
                  style={{
                    padding: '15px',
                    textAlign: 'left',
                    color: '#c8b6ff',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                  }}
                >
                  Topic
                </th>
                <th
                  style={{
                    padding: '15px',
                    textAlign: 'left',
                    color: '#c8b6ff',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                  }}
                >
                  Diff.
                </th>
                <th
                  style={{
                    padding: '15px',
                    textAlign: 'left',
                    color: '#c8b6ff',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                  }}
                >
                  Score
                </th>
                <th
                  style={{
                    padding: '15px',
                    textAlign: 'left',
                    color: '#c8b6ff',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                  }}
                >
                  %
                </th>
                <th
                  style={{
                    padding: '15px',
                    textAlign: 'left',
                    color: '#c8b6ff',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                  }}
                >
                  Time
                </th>
                <th
                  style={{
                    padding: '15px',
                    textAlign: 'left',
                    color: '#c8b6ff',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                  }}
                >
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((attempt) => (
                <tr key={attempt.id} style={{ borderBottom: '1px solid rgba(156, 124, 255, 0.1)' }}>
                  <td style={{ padding: '12px 15px', color: '#d0d4db' }}>{attempt.topic}</td>
                  <td style={{ padding: '12px 15px', color: '#d0d4db' }}>
                    {difficultyLabels[attempt.difficulty] || attempt.difficulty}
                  </td>
                  <td style={{ padding: '12px 15px', color: '#d0d4db' }}>
                    {attempt.score}/{attempt.total_questions}
                  </td>
                  <td
                    style={{
                      padding: '12px 15px',
                      color: attempt.percentage >= 70 ? '#86efac' : '#fca5a5',
                      fontWeight: '600',
                    }}
                  >
                    {attempt.percentage}%
                  </td>
                  <td style={{ padding: '12px 15px', color: '#d0d4db' }}>
                    {formatTime(attempt.time_taken || 0)}
                  </td>
                  <td style={{ padding: '12px 15px', color: '#d0d4db' }}>
                    {new Date(attempt.created_at ?? attempt.taken_at ?? '').toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#adb5c4',
            fontSize: '1.1rem',
          }}
        >
          <p>💡 No quizzes attempted yet.</p>
        </div>
      )}

      <div
        style={{
          marginTop: '30px',
          padding: '20px',
          background: 'rgba(100, 200, 100, 0.1)',
          borderLeft: '4px solid #22c55e',
          borderRadius: '8px',
          color: '#86efac',
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        💡 Keep practicing to improve your scores!
      </div>
    </div>
  );
}
