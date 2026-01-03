import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { addSession, getSessions, updateSession, deleteSession, getCalendarStatus, connectCalendar } from '../services/api';

interface Session {
  id: number;
  user_id: number;
  title: string;
  subject: string;
  date: string;
  time: string;
  duration: number;
  notes?: string;
  calendar_event_id?: string;
}

interface ScheduledTest {
  id: number;
  topic: string;
  scheduled_date: string;
  difficulty_level: string;
  reason: string;
  status: string;
}

interface WeeklyStats {
  totalSessions: number;
  completedSessions: number;
  totalHours: number;
}

interface CalendarStatus {
  connected: boolean;
  email?: string;
  connectedAt?: string;
}

const StudyPlanner: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [aiScheduledTests, setAiScheduledTests] = useState<ScheduledTest[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newSession, setNewSession] = useState({ title: '', subject: '', time: '', duration: 30 });
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    totalSessions: 0,
    completedSessions: 0,
    totalHours: 0,
  });
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ connected: false });
  const [calendarError, setCalendarError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchSessions();
      fetchCalendarStatus();
      fetchAIScheduledTests();
    }
  }, [user?.id]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await getSessions(user?.id || 0);
      setSessions(data || []);
      calculateWeeklyStats(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarStatus = async () => {
    try {
      const response = await fetch(`/calendar_app/status?userId=${user?.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setCalendarStatus({
          connected: data.connected,
          email: data.email,
          connectedAt: data.connectedAt,
        });
      }
    } catch (err) {
      console.error('Error fetching calendar status:', err);
    }
  };

  const fetchAIScheduledTests = async () => {
    try {
      const response = await fetch(`/calendar_app/scheduled-tests?userId=${user?.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setAiScheduledTests(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching AI scheduled tests:', err);
    }
  };

  const calculateWeeklyStats = (sessionList: Session[]) => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weekSessions = sessionList.filter((session) => {
      const sessionDate = new Date(session.date);
      return sessionDate >= weekStart && sessionDate <= today;
    });

    const totalHours = weekSessions.reduce((sum, session) => sum + session.duration, 0) / 60;

    setWeeklyStats({
      totalSessions: weekSessions.length,
      completedSessions: Math.floor(weekSessions.length * 0.7), // Estimate
      totalHours,
    });
  };

  const handleConnectCalendar = async () => {
    try {
      setCalendarError('');
      const response = await fetch(`/calendar_app/connect?userId=${user?.id}`);
      const data = await response.json();

      if (data.success && data.authUrl) {
        // Store state in localStorage for verification
        localStorage.setItem('oauth_state', data.state);
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        setCalendarError('Failed to initiate connection. Please try again.');
      }
    } catch (err) {
      console.error('Error connecting calendar:', err);
      setCalendarError('Error connecting to Google Calendar. Please try again.');
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      const response = await fetch('/calendar_app/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ user_id: user?.id }),
      });

      if (response.ok) {
        setCalendarStatus({ connected: false });
        setCalendarError('');
      }
    } catch (err) {
      console.error('Error disconnecting calendar:', err);
      setCalendarError('Error disconnecting from Google Calendar.');
    }
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSession.title || !newSession.subject || !newSession.time) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const sessionData = {
        ...newSession,
        date: selectedDate,
        user_id: user?.id,
      };

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        const createdSession = await response.json();

        // Add to Google Calendar if connected
        if (calendarStatus.connected) {
          const eventDate = new Date(`${selectedDate}T${newSession.time}:00`);
          await fetch('/calendar_app/add-event', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            },
            body: JSON.stringify({
              user_id: user?.id,
              topic: newSession.title,
              event_date: eventDate.toISOString(),
              difficulty: 'medium',
            }),
          });
        }

        setNewSession({ title: '', subject: '', time: '', duration: 30 });
        fetchSessions();
      }
    } catch (err) {
      console.error('Error adding session:', err);
      alert('Error adding session. Please try again.');
    }
  };

  const getSessionsForDate = (dateStr: string): Session[] => {
    return sessions.filter((session) => session.date === dateStr);
  };

  const getUpcomingSessions = (): Session[] => {
    const today = new Date();
    return sessions
      .filter((session) => new Date(session.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  };

  const getUpcomingAITests = (): ScheduledTest[] => {
    const today = new Date();
    return aiScheduledTests
      .filter((test) => new Date(test.scheduled_date) >= today)
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
      .slice(0, 5);
  };

  const toLocalDateStr = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const normalizeDateString = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-500/20 text-green-300';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'hard':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 flex items-center justify-center">
        <div className="text-white text-xl">Loading Study Planner...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📚 Study Planner</h1>
          <p className="text-slate-300">Organize your study sessions and track your progress</p>
        </div>

        {/* Google Calendar Integration Section */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            📅 Google Calendar Integration
          </h2>

          {calendarError && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded mb-4">
              {calendarError}
            </div>
          )}

          {calendarStatus.connected ? (
            <div className="bg-green-500/10 border border-green-500 p-4 rounded-lg">
              <p className="text-green-400 font-semibold mb-2">✓ Connected to Google Calendar</p>
              <p className="text-slate-300 mb-1">
                <strong>Account:</strong> {calendarStatus.email || user?.username}
              </p>
              {calendarStatus.connectedAt && (
                <p className="text-slate-400 text-sm mb-3">
                  Connected on: {new Date(calendarStatus.connectedAt).toLocaleDateString()}
                </p>
              )}
              <p className="text-slate-400 text-sm mb-4">
                Your scheduled sessions will automatically be added to your Google Calendar with reminders.
              </p>
              <button
                onClick={handleDisconnectCalendar}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition"
              >
                Disconnect Calendar
              </button>
            </div>
          ) : (
            <div className="bg-slate-700 p-4 rounded-lg">
              <p className="text-slate-300 mb-4">
                Connect your Google Calendar to automatically sync your scheduled sessions and receive reminders.
              </p>
              <div className="bg-slate-600/50 border border-slate-600 p-3 rounded mb-4 text-sm text-slate-300">
                <strong>Features:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Automatic event creation when you schedule sessions</li>
                  <li>Reminders 1 day, 30 minutes, and 10 minutes before</li>
                  <li>Updates when you modify or delete sessions</li>
                  <li>Uses your login email: {user?.email}</li>
                </ul>
              </div>
              <button
                onClick={handleConnectCalendar}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2 rounded-lg font-semibold transition"
              >
                🔗 Connect Google Calendar
              </button>
            </div>
          )}
        </div>

        {/* Weekly Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Total Sessions</p>
            <p className="text-3xl font-bold text-white">{weeklyStats.totalSessions}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Completed</p>
            <p className="text-3xl font-bold text-green-400">{weeklyStats.completedSessions}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Total Hours</p>
            <p className="text-3xl font-bold text-blue-400">{weeklyStats.totalHours.toFixed(1)}h</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Completion Rate</p>
            <p className="text-3xl font-bold text-purple-400">
              {weeklyStats.totalSessions > 0
                ? Math.round((weeklyStats.completedSessions / weeklyStats.totalSessions) * 100)
                : 0}
              %
            </p>
          </div>
        </div>

        {/* Add Session Form */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">➕ Add New Session</h2>
          <form onSubmit={handleAddSession} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Session Title"
                value={newSession.title}
                onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                className="bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                placeholder="Subject"
                value={newSession.subject}
                onChange={(e) => setNewSession({ ...newSession, subject: e.target.value })}
                className="bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:border-purple-500"
              />
              <input
                type="time"
                value={newSession.time}
                onChange={(e) => setNewSession({ ...newSession, time: e.target.value })}
                className="bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(normalizeDateString(e.target.value))}
                className="bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:border-purple-500"
              />
              <input
                type="number"
                placeholder="Duration (minutes)"
                value={newSession.duration}
                onChange={(e) => setNewSession({ ...newSession, duration: parseInt(e.target.value) })}
                className="bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              ➕ Add Session
            </button>
          </form>
        </div>

        {/* Sessions for Selected Date */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            📋 Sessions for {toLocalDateStr(selectedDate)}
          </h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(normalizeDateString(e.target.value))}
            className="bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-purple-500 mb-4"
            style={{ minWidth: '120px', maxWidth: '180px' }}
          />

          {getSessionsForDate(selectedDate).length > 0 ? (
            <div className="space-y-3">
              {getSessionsForDate(selectedDate).map((session) => (
                <div key={session.id} className="bg-slate-700 p-4 rounded-lg border border-slate-600 hover:border-purple-500 transition">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {session.title}
                    {session.calendar_event_id && <span className="ml-2">📅</span>}
                  </h3>
                  <p className="text-slate-300 text-sm">
                    {session.subject} • {session.time} • {session.duration} mins
                  </p>
                  {session.notes && <p className="text-slate-400 text-sm mt-2">{session.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">No study sessions scheduled for this date</p>
          )}
        </div>

        {/* Upcoming Sessions & AI-Scheduled Tests */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">📋 Upcoming Sessions & Tests</h2>

          <div className="space-y-6">
            {/* Regular Sessions */}
            {getUpcomingSessions().length > 0 && (
              <div>
                <p className="text-sm text-slate-400 mb-3 font-semibold">📚 Study Sessions</p>
                <div className="space-y-3">
                  {getUpcomingSessions().map((session) => (
                    <div
                      key={`session-${session.id}`}
                      className="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg cursor-pointer transition transform hover:scale-102 border-l-4 border-blue-500"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white font-semibold">{session.title}</p>
                          <p className="text-sm text-slate-300">
                            📅 {toLocalDateStr(session.date)} at {session.time}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {session.subject} • {session.duration} mins
                          </p>
                        </div>
                        {session.calendar_event_id && <span className="text-lg">📌</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI-Scheduled Tests */}
            {getUpcomingAITests().length > 0 && (
              <div>
                <p className="text-sm text-slate-400 mb-3 font-semibold">🤖 AI-Scheduled Tests</p>
                <div className="space-y-3">
                  {getUpcomingAITests().map((test) => (
                    <div
                      key={`ai-test-${test.id}`}
                      className="bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 p-4 rounded-lg cursor-pointer transition transform hover:scale-102 border-l-4 border-purple-400"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white font-semibold">📝 {test.topic}</p>
                          <p className="text-sm text-purple-100">
                            📅{' '}
                            {new Date(test.scheduled_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            at{' '}
                            {new Date(test.scheduled_date).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded font-semibold ${getDifficultyColor(test.difficulty_level)}`}>
                              {test.difficulty_level.toUpperCase()}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-purple-900/50 text-purple-200">
                              {test.reason || 'AI-Recommended'}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-blue-900/50 text-blue-200 capitalize">
                              {test.status}
                            </span>
                          </div>
                        </div>
                        <span className="text-lg">🤖</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {getUpcomingSessions().length === 0 && getUpcomingAITests().length === 0 && (
              <div className="text-center py-8 bg-slate-700/50 rounded-lg">
                <p className="text-slate-300">No upcoming sessions or tests scheduled</p>
                <p className="text-slate-400 text-sm mt-2">Add a session or generate AI recommendations to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyPlanner;