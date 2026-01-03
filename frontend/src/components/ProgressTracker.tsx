import React, { useState, useEffect } from 'react';

interface Achievement {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  completedDate?: string;
}

interface SubjectProgress {
  name: string;
  progress: number;
  totalHours: number;
  completedSessions: number;
  averageScore: number;
}

interface ScheduledTest {
  id: number;
  topic: string;
  scheduled_date: string;
  difficulty_level: string;
  reason: string;
  status: string;
}

interface OverallStats {
  totalHours: number;
  averageScore: number;
  completedAchievements: number;
  studyStreak: number;
}

const ProgressTracker: React.FC = () => {
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalHours: 0,
    averageScore: 0,
    completedAchievements: 0,
    studyStreak: 0,
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [scheduledTests, setScheduledTests] = useState<ScheduledTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgressData();
  }, []);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      if (!token) {
        console.error('No auth token found');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Fetch overall stats
      try {
        const statsRes = await fetch('/api/progress/stats', { headers });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setOverallStats(statsData.data || overallStats);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }

      // Fetch achievements
      try {
        const achievementsRes = await fetch('/api/achievements', { headers });
        if (achievementsRes.ok) {
          const achievementsData = await achievementsRes.json();
          setAchievements(achievementsData.data || []);
        }
      } catch (err) {
        console.error('Error fetching achievements:', err);
      }

      // Fetch subject progress
      try {
        const subjectsRes = await fetch('/api/subjects/progress', { headers });
        if (subjectsRes.ok) {
          const subjectsData = await subjectsRes.json();
          setSubjects(subjectsData.data || []);
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }

      // Fetch scheduled tests (AI-scheduled) - NEW
      try {
        const testsRes = await fetch('/api/ai-agent/scheduled-tests', { headers });
        if (testsRes.ok) {
          const testsData = await testsRes.json();
          setScheduledTests(testsData.data || []);
        }
      } catch (err) {
        console.error('Error fetching scheduled tests:', err);
      }
    } catch (err) {
      console.error('Error fetching progress data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'hard':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingText}>Loading your progress...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Your Learning Journey</h1>
        <p style={styles.subtitle}>Monitor your progress and achievements</p>
      </div>

      {/* Overall Stats Section */}
      <section style={styles.statsSection}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{overallStats.totalHours.toFixed(1)}h</div>
          <div style={styles.statLabel}>Total Hours</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{overallStats.averageScore}%</div>
          <div style={styles.statLabel}>Average Score</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {overallStats.completedAchievements}/{achievements.length}
          </div>
          <div style={styles.statLabel}>Achievements</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{overallStats.studyStreak}</div>
          <div style={styles.statLabel}>Day Streak</div>
        </div>
      </section>

      {/* AI-Scheduled Tests Section - NEW */}
      {scheduledTests.length > 0 && (
        <section style={styles.aiTestsSection}>
          <h2 style={styles.sectionTitle}>🤖 AI-Scheduled Tests</h2>
          <p style={styles.sectionSubtitle}>
            {scheduledTests.length} test{scheduledTests.length !== 1 ? 's' : ''} scheduled by AI Agent
          </p>

          <div style={styles.testsContainer}>
            {scheduledTests.map((test) => (
              <div key={test.id} style={styles.testCard}>
                <div style={styles.testCardHeader}>
                  <h3 style={styles.testCardTitle}>{test.topic}</h3>
                  <span
                    style={{
                      ...styles.difficultyBadge,
                      backgroundColor: getDifficultyColor(test.difficulty_level),
                    }}
                  >
                    {test.difficulty_level.charAt(0).toUpperCase() +
                      test.difficulty_level.slice(1)}
                  </span>
                </div>

                <div style={styles.testCardDetails}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>📅 Scheduled:</span>
                    <span style={styles.detailValue}>{formatDate(test.scheduled_date)}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>💡 Reason:</span>
                    <span style={styles.detailValue}>{test.reason || 'AI-recommended'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>✓ Status:</span>
                    <span style={styles.statusBadge}>{test.status}</span>
                  </div>
                </div>

                <div style={styles.testCardActions}>
                  <button style={styles.btnPrimary}>Take Test</button>
                  <button style={styles.btnSecondary}>Reschedule</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {scheduledTests.length === 0 && (
        <section style={styles.emptySection}>
          <p style={styles.emptyText}>📌 No AI-scheduled tests yet</p>
          <p style={styles.emptySubtext}>
            Generate AI recommendations to create a personalized study schedule
          </p>
        </section>
      )}

      {/* Weekly Activity Section */}
      <section style={styles.activitySection}>
        <h2 style={styles.sectionTitle}>📈 Weekly Activity</h2>
        <p style={styles.activityPlaceholder}>Weekly activity chart coming soon</p>
      </section>

      {/* Achievements Section */}
      <section style={styles.achievementsSection}>
        <h2 style={styles.sectionTitle}>🏆 Achievements</h2>

        {achievements.length > 0 ? (
          <div style={styles.achievementsGrid}>
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                style={{
                  ...styles.achievementCard,
                  ...(achievement.completed
                    ? styles.achievementCardCompleted
                    : styles.achievementCardLocked),
                }}
              >
                <h3 style={styles.achievementTitle}>{achievement.title}</h3>
                <p style={styles.achievementDescription}>{achievement.description}</p>
                {achievement.completed && achievement.completedDate && (
                  <p style={styles.achievementDate}>
                    Completed on {new Date(achievement.completedDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.noDataText}>No achievements yet. Keep studying!</p>
        )}
      </section>

      {/* Subject Progress Section */}
      <section style={styles.subjectsSection}>
        <h2 style={styles.sectionTitle}>📚 Subject Progress</h2>

        {subjects.length > 0 ? (
          <div style={styles.subjectsGrid}>
            {subjects.map((subject) => (
              <div key={subject.name} style={styles.subjectCard}>
                <h3 style={styles.subjectTitle}>{subject.name}</h3>

                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${subject.progress}%`,
                    }}
                  ></div>
                </div>
                <p style={styles.progressPercentage}>{subject.progress}% Complete</p>

                <div style={styles.subjectStatsGrid}>
                  <div style={styles.subjectStat}>
                    <span style={styles.subjectStatValue}>{subject.totalHours}h</span>
                    <span style={styles.subjectStatLabel}>Total Hours</span>
                  </div>
                  <div style={styles.subjectStat}>
                    <span style={styles.subjectStatValue}>{subject.completedSessions}</span>
                    <span style={styles.subjectStatLabel}>Sessions</span>
                  </div>
                  <div style={styles.subjectStat}>
                    <span style={styles.subjectStatValue}>{subject.averageScore}%</span>
                    <span style={styles.subjectStatLabel}>Avg Score</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={styles.noDataText}>No subject progress yet. Start taking quizzes!</p>
        )}
      </section>

      {/* Refresh Button */}
      <div style={styles.refreshSection}>
        <button
          style={{ ...styles.btnRefresh, opacity: loading ? 0.5 : 1 }}
          onClick={fetchProgressData}
          disabled={loading}
        >
          {loading ? '🔄 Refreshing...' : '🔄 Refresh Progress'}
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f9fafb',
    minHeight: '100vh',
  },
  header: {
    marginBottom: '3rem',
    textAlign: 'center',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#6b7280',
    margin: 0,
  },
  statsSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1.5rem',
    marginBottom: '3rem',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '2rem',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  statValue: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#059669',
    marginBottom: '0.5rem',
  },
  statLabel: {
    fontSize: '0.9rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  aiTestsSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '3rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 0.5rem 0',
  },
  sectionSubtitle: {
    fontSize: '0.95rem',
    color: '#6b7280',
    margin: '0 0 1.5rem 0',
  },
  testsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem',
  },
  testCard: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '1.5rem',
    transition: 'all 0.3s ease',
  },
  testCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
    gap: '1rem',
  },
  testCardTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
    flex: 1,
  },
  difficultyBadge: {
    display: 'inline-block',
    padding: '0.4rem 0.9rem',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    textTransform: 'capitalize',
  },
  testCardDetails: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
    borderLeft: '3px solid #059669',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    fontSize: '0.95rem',
    borderBottom: '1px solid #f0f0f0',
  },
  detailLabel: {
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    color: '#1f2937',
    fontWeight: '600',
    textAlign: 'right',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.3rem 0.8rem',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '16px',
    fontSize: '0.85rem',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  testCardActions: {
    display: 'flex',
    gap: '0.8rem',
  },
  btnPrimary: {
    flex: 1,
    padding: '0.6rem 1rem',
    backgroundColor: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'background-color 0.3s ease',
  },
  btnSecondary: {
    flex: 1,
    padding: '0.6rem 1rem',
    backgroundColor: '#f0f0f0',
    color: '#1f2937',
    border: '1px solid #d0d0d0',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'background-color 0.3s ease',
  },
  emptySection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '3rem 2rem',
    textAlign: 'center',
    marginBottom: '3rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  emptyText: {
    fontSize: '1.2rem',
    color: '#1f2937',
    margin: '0.5rem 0',
  },
  emptySubtext: {
    color: '#9ca3af',
    fontSize: '0.95rem',
  },
  activitySection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '3rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  activityPlaceholder: {
    color: '#9ca3af',
    textAlign: 'center',
    padding: '2rem 0',
  },
  achievementsSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '3rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  achievementsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1.5rem',
  },
  achievementCard: {
    padding: '1.5rem',
    borderRadius: '10px',
    textAlign: 'center',
    border: '2px solid #e5e7eb',
    transition: 'all 0.3s ease',
  },
  achievementCardCompleted: {
    backgroundColor: '#d1fae5',
    borderColor: '#059669',
  },
  achievementCardLocked: {
    backgroundColor: '#f9fafb',
    opacity: 0.6,
  },
  achievementTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 0.5rem 0',
  },
  achievementDescription: {
    fontSize: '0.9rem',
    color: '#6b7280',
    margin: 0,
  },
  achievementDate: {
    fontSize: '0.85rem',
    color: '#047857',
    fontWeight: '600',
    marginTop: '0.8rem',
  },
  subjectsSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '3rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '1.5rem',
  },
  subjectCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: '10px',
    padding: '1.5rem',
    transition: 'all 0.3s ease',
    border: '1px solid #e5e7eb',
  },
  subjectTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 1rem 0',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '0.5rem',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: '10px',
    transition: 'width 0.3s ease',
  },
  progressPercentage: {
    fontSize: '0.85rem',
    color: '#6b7280',
    margin: '0 0 1rem 0',
    textAlign: 'right',
  },
  subjectStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    textAlign: 'center',
  },
  subjectStat: {
    backgroundColor: '#fff',
    padding: '0.8rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  subjectStatValue: {
    display: 'block',
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#059669',
  },
  subjectStatLabel: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#6b7280',
    marginTop: '0.3rem',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  refreshSection: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  btnRefresh: {
    padding: '0.8rem 2rem',
    backgroundColor: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background-color 0.3s ease',
  },
  loadingText: {
    textAlign: 'center',
    padding: '4rem 2rem',
    fontSize: '1.1rem',
    color: '#6b7280',
  },
  noDataText: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '2rem 0',
  },
};

export default ProgressTracker;