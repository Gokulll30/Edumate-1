import { useState, useEffect } from 'react';
import Navigation from './Navigation';
import {
  Calendar,
  Clock,
  Target,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Book,
  Brain,
  Link,
  Unlink,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface StudySession {
  id: string;
  title: string;
  subject: string;
  duration: number;
  date: string;
  time: string;
  type: 'study' | 'quiz' | 'review' | 'project';
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  notes?: string;
  calendar_event_id?: string; // Google Calendar event ID
}

interface CalendarConnection {
  connected: boolean;
  email?: string;
  connectedAt?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Utility function to format date for display
function toLocalDateStr(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// Utility function to normalize date string format
function normalizeDateString(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

export default function StudyPlanner() {
  const { user } = useAuth();
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState(normalizeDateString(new Date().toISOString()));
  const [showAddModal, setShowAddModal] = useState(false);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  // Google Calendar state
  const [calendarStatus, setCalendarStatus] = useState<CalendarConnection>({ connected: false });
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [showCalendarSection, setShowCalendarSection] = useState(true);

  const [newSession, setNewSession] = useState({
    title: '',
    subject: '',
    duration: 60,
    date: selectedDate,
    time: '10:00',
    type: 'study' as StudySession['type'],
    priority: 'medium' as StudySession['priority'],
    notes: ''
  });

  // Fetch study sessions on component mount or when user changes
  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/study/sessions?userId=${encodeURIComponent(user.id)}`);
        const data = await res.json();
        if (data?.success) {
          const mapped = data.sessions.map((s: any) => ({
            id: String(s.id),
            title: s.title,
            subject: s.subject,
            duration: Number(s.duration || 60),
            date: normalizeDateString(s.date || ''),
            time: s.time || '',
            type: (s.type || 'study') as StudySession['type'],
            priority: (s.priority || 'medium') as StudySession['priority'],
            completed: !!s.completed,
            notes: s.notes || '',
            calendar_event_id: s.calendar_event_id || undefined
          }));
          setSessions(mapped);
        }
      } catch (err) {
        console.error('Failed to load sessions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [user]);

  // Check Google Calendar connection status on mount
  useEffect(() => {
    const checkCalendarConnection = async () => {
      if (!user) return;

      try {
        const res = await fetch(`${API_BASE}/calendar/check-connection?userId=${encodeURIComponent(user.id)}`);
        const data = await res.json();

        if (data.success) {
          setCalendarStatus({
            connected: data.connected,
            email: data.email,
            connectedAt: data.connectedAt
          });
        }
      } catch (err) {
        console.error('Failed to check calendar connection:', err);
      }
    };

    checkCalendarConnection();
  }, [user]);

  // Connect to Google Calendar
  const connectCalendar = async () => {
    if (!user) {
      setCalendarError('Please sign in to connect your calendar');
      return;
    }

    setCalendarLoading(true);
    setCalendarError(null);

    try {
      const res = await fetch(
        `${API_BASE}/calendar/connect?userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.username)}`
      );
      const data = await res.json();

      if (data.success && data.authUrl) {
        // Open OAuth popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          data.authUrl,
          'Google Calendar Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Poll for connection status
        const checkInterval = setInterval(async () => {
          try {
            if (popup?.closed) {
              clearInterval(checkInterval);

              // Recheck connection status
              const statusRes = await fetch(
                `${API_BASE}/calendar/check-connection?userId=${encodeURIComponent(user.id)}`
              );
              const statusData = await statusRes.json();

              if (statusData.success) {
                setCalendarStatus({
                  connected: statusData.connected,
                  email: statusData.email,
                  connectedAt: statusData.connectedAt
                });
              }

              setCalendarLoading(false);
            }
          } catch (err) {
            clearInterval(checkInterval);
            setCalendarLoading(false);
          }
        }, 1000);
      } else {
        setCalendarError(data.error || 'Failed to initiate calendar connection');
        setCalendarLoading(false);
      }
    } catch (err) {
      setCalendarError('Failed to connect calendar. Please try again.');
      setCalendarLoading(false);
    }
  };

  // Disconnect from Google Calendar
  const disconnectCalendar = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to disconnect Google Calendar? Future sessions will not be synced.')) {
      return;
    }

    setCalendarLoading(true);
    setCalendarError(null);

    try {
      const res = await fetch(`${API_BASE}/calendar/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await res.json();

      if (data.success) {
        setCalendarStatus({ connected: false });
      } else {
        setCalendarError(data.error || 'Failed to disconnect calendar');
      }
    } catch (err) {
      setCalendarError('Failed to disconnect calendar. Please try again.');
    } finally {
      setCalendarLoading(false);
    }
  };

  const getTypeIcon = (type: StudySession['type']) => {
    const icons: Record<StudySession['type'], any> = {
      study: Book,
      quiz: Target,
      review: Brain,
      project: Edit
    };
    return icons[type];
  };

  const getTypeColor = (type: StudySession['type']) => {
    const colors: Record<StudySession['type'], string> = {
      study: 'bg-blue-500/20 text-blue-400',
      quiz: 'bg-green-500/20 text-green-400',
      review: 'bg-purple-500/20 text-purple-400',
      project: 'bg-orange-500/20 text-orange-400'
    };
    return colors[type];
  };

  const getPriorityColor = (priority: StudySession['priority']) => {
    const colors: Record<StudySession['priority'], string> = {
      low: 'border-l-green-500',
      medium: 'border-l-yellow-500',
      high: 'border-l-red-500'
    };
    return colors[priority];
  };

  function validateDateTime() {
    const now = new Date();
    const sessionDateTime = new Date(`${newSession.date}T${newSession.time}`);
    if (sessionDateTime < now) {
      setWarning('You cannot schedule a session in the past.');
      return false;
    }
    setWarning(null);
    return true;
  }

  // Add session with Google Calendar integration
  const handleAddSession = async () => {
    if (!user) return alert('Please sign in to add sessions');
    if (!validateDateTime()) return;

    const payload = {
      userId: user.id,
      title: newSession.title,
      subject: newSession.subject,
      duration: newSession.duration,
      date: newSession.date,
      time: newSession.time,
      type: newSession.type,
      priority: newSession.priority,
      notes: newSession.notes
    };

    try {
      const res = await fetch(`${API_BASE}/study/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data?.success) {
        const s = data.session;
        const mapped: StudySession = {
          id: String(s.id),
          title: s.title,
          subject: s.subject,
          duration: Number(s.duration || 60),
          date: normalizeDateString(s.date || ''),
          time: s.time || '',
          type: (s.type || 'study') as StudySession['type'],
          priority: (s.priority || 'medium') as StudySession['priority'],
          completed: !!s.completed,
          notes: s.notes || ''
        };

        // If calendar is connected, create calendar event
        let calendarSuccess = false;
        if (calendarStatus.connected) {
          try {
            const calendarRes = await fetch(`${API_BASE}/calendar/create-event`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                sessionId: s.id,
                title: `📚 ${newSession.title}`,
                description: `Subject: ${newSession.subject}\nType: ${newSession.type}\nPriority: ${newSession.priority}${newSession.notes ? '\n\nNotes: ' + newSession.notes : ''}`,
                date: newSession.date,
                time: newSession.time,
                duration: newSession.duration
              })
            });

            const calendarData = await calendarRes.json();

            if (calendarData.success) {
              mapped.calendar_event_id = calendarData.eventId;
              calendarSuccess = true;
            }
          } catch (calErr) {
            console.error('Failed to create calendar event:', calErr);
          }
        }

        setSessions(prev => [...prev, mapped]);
        setNewSession({
          title: '',
          subject: '',
          duration: 60,
          date: selectedDate,
          time: '10:00',
          type: 'study',
          priority: 'medium',
          notes: ''
        });
        setShowAddModal(false);
        setWarning(null);

        if (calendarStatus.connected && calendarSuccess) {
          alert('✓ Session added and synced to Google Calendar!');
        } else if (calendarStatus.connected && !calendarSuccess) {
          alert('✓ Session added, but failed to sync to Google Calendar');
        } else {
          alert('✓ Session added successfully!');
        }
      } else {
        setWarning('Failed to add session. Please try again.');
        console.error('Add session failed', data);
      }
    } catch (err) {
      setWarning('Add session error. Please try again.');
      console.error('Add session error', err);
    }
  };

  const toggleCompletion = async (id: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/study/sessions/${encodeURIComponent(id)}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data?.success) {
        const s = data.session;
        setSessions(prev =>
          prev.map(sess =>
            sess.id === String(s.id)
              ? {
                  ...sess,
                  completed: !!s.completed
                }
              : sess
          )
        );
      }
    } catch (err) {
      console.error('Toggle completion error', err);
    }
  };

  // Delete session with Google Calendar integration
  const deleteSession = async (id: string) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this session?')) return;

    const session = sessions.find(s => s.id === id);

    try {
      const res = await fetch(`${API_BASE}/study/sessions/${encodeURIComponent(id)}?userId=${encodeURIComponent(user.id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data?.success) {
        // If calendar is connected and event exists, delete from calendar
        if (calendarStatus.connected && session?.calendar_event_id) {
          try {
            await fetch(
              `${API_BASE}/calendar/delete-event?userId=${encodeURIComponent(user.id)}&eventId=${session.calendar_event_id}`,
              { method: 'DELETE' }
            );
          } catch (calErr) {
            console.error('Failed to delete calendar event:', calErr);
          }
        }

        setSessions(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Delete session error', err);
    }
  };

  const getSessionsForDate = (date: string) => {
    return sessions.filter(session => session.date === date);
  };

  const todaySessions = getSessionsForDate(selectedDate);
  const weeklyStats = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.completed).length,
    totalHours: sessions.reduce((acc, s) => acc + s.duration, 0) / 60,
    completedHours: sessions
      .filter(s => s.completed)
      .reduce((acc, s) => acc + s.duration, 0) / 60
  };

  const upcomingSessions = sessions
    .filter(s => !s.completed && new Date(`${s.date}T${s.time}`) >= new Date())
    .sort(
      (a, b) =>
        new Date(`${a.date}T${a.time}`).getTime() -
        new Date(`${b.date}T${b.time}`).getTime()
    );

  const minDate = normalizeDateString(new Date().toISOString());

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <main className="ml-64 p-8 h-[calc(100vh-0px)] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Study Planner</h1>
            <p className="text-slate-400">Organize your study sessions and track your progress</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex bg-slate-800 rounded-lg p-1 shadow">
              <button
                onClick={() => setView('calendar')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  view === 'calendar'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
                style={{ minWidth: '100px' }}
              >
                Calendar
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  view === 'list'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
                style={{ minWidth: '100px' }}
              >
                List
              </button>
            </div>
            <button
              onClick={() => {
                if (!user) return alert('Please sign in to add sessions');
                setShowAddModal(true);
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-all duration-300 transform hover:scale-105 text-lg shadow"
              style={{ minWidth: '160px' }}
            >
              <Plus className="w-6 h-6" />
              <span>Add Session</span>
            </button>
          </div>
        </div>

        {/* Google Calendar Integration Section */}
        {showCalendarSection && (
          <div className="mb-8 bg-slate-800 rounded-xl p-6 border border-slate-700 shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="text-purple-400" size={24} />
                <h3 className="text-xl font-semibold text-white">Google Calendar Integration</h3>
              </div>
              <button
                onClick={() => setShowCalendarSection(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            {calendarError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg flex items-start gap-2">
                <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-red-200 text-sm">{calendarError}</p>
              </div>
            )}

            {calendarStatus.connected ? (
              <div>
                <div className="mb-4 p-4 bg-green-500/20 border border-green-500 rounded-lg">
                  <p className="text-green-200 text-sm mb-2">✓ Connected to Google Calendar</p>
                  <p className="text-green-300 text-xs">Account: {calendarStatus.email || user?.username}</p>
                  {calendarStatus.connectedAt && (
                    <p className="text-green-300 text-xs mt-1">
                      Connected on: {new Date(calendarStatus.connectedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <p className="text-slate-300 text-sm mb-4">
                  Your scheduled sessions will automatically be added to your Google Calendar with reminders.
                </p>

                <button
                  onClick={disconnectCalendar}
                  disabled={calendarLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Unlink size={18} />
                  {calendarLoading ? 'Disconnecting...' : 'Disconnect Calendar'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-slate-300 text-sm mb-4">
                  Connect your Google Calendar to automatically sync your scheduled sessions and receive reminders.
                </p>

                <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500 rounded-lg">
                  <p className="text-blue-200 text-xs mb-2">
                    <strong>Features:</strong>
                  </p>
                  <ul className="text-blue-300 text-xs space-y-1">
                    <li>• Automatic event creation when you schedule sessions</li>
                    <li>• Reminders 1 day, 30 minutes, and 10 minutes before</li>
                    <li>• Updates when you modify or delete sessions</li>
                    <li>• Uses your login email: {user?.username}</li>
                  </ul>
                </div>

                <button
                  onClick={connectCalendar}
                  disabled={calendarLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Link size={18} />
                  {calendarLoading ? 'Connecting...' : 'Connect Google Calendar'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Weekly Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center shadow">
            <Calendar className="w-8 h-8 text-purple-400 mr-3" />
            <div>
              <p className="text-2xl font-bold text-white">{weeklyStats.totalSessions}</p>
              <p className="text-slate-400 text-sm font-semibold">Total Sessions</p>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center shadow">
            <CheckCircle2 className="w-8 h-8 text-green-400 mr-3" />
            <div>
              <p className="text-2xl font-bold text-white">{weeklyStats.completedSessions}</p>
              <p className="text-slate-400 text-sm font-semibold">Completed</p>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center shadow">
            <Clock className="w-8 h-8 text-blue-400 mr-3" />
            <div>
              <p className="text-2xl font-bold text-white">{weeklyStats.totalHours.toFixed(1)}h</p>
              <p className="text-slate-400 text-sm font-semibold">Total Hours</p>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center shadow">
            <Target className="w-8 h-8 text-orange-400 mr-3" />
            <div>
              <p className="text-2xl font-bold text-white">
                {weeklyStats.totalSessions > 0
                  ? Math.round((weeklyStats.completedSessions / weeklyStats.totalSessions) * 100)
                  : 0}
                %
              </p>
              <p className="text-slate-400 text-sm font-semibold">Completion Rate</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sessions List */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700 shadow">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                Sessions for {toLocalDateStr(selectedDate)}
              </h3>
              <input
                type="date"
                value={selectedDate}
                min={minDate}
                onChange={e => setSelectedDate(normalizeDateString(e.target.value))}
                className="bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-purple-500"
                style={{ minWidth: '120px', maxWidth: '180px' }}
              />
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="text-slate-400 py-6">Loading sessions...</div>
              ) : todaySessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No study sessions scheduled for this date</p>
                  <button
                    onClick={() => {
                      if (!user) return alert('Please sign in to add sessions');
                      setShowAddModal(true);
                    }}
                    className="text-purple-400 hover:text-purple-300 font-semibold mt-2 text-lg"
                  >
                    Add your first session
                  </button>
                </div>
              ) : (
                todaySessions.map(session => {
                  const Icon = getTypeIcon(session.type);
                  return (
                    <div
                      key={session.id}
                      className={`p-4 bg-slate-700/50 rounded-lg border-l-4 ${getPriorityColor(
                        session.priority
                      )} hover:bg-slate-700/80 transition-all duration-300 flex items-center justify-between shadow`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <button
                          onClick={() => toggleCompletion(session.id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            session.completed
                              ? 'bg-green-500 border-green-500'
                              : 'border-slate-400 hover:border-green-400'
                          } transition-all duration-300`}
                        >
                          {session.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </button>
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(
                            session.type
                          )}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`font-semibold ${
                                session.completed
                                  ? 'line-through text-slate-500'
                                  : 'text-white'
                              }`}
                            >
                              {session.title}
                            </h4>
                            {session.calendar_event_id && (
                              <span
                                className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded"
                                title="Synced to Google Calendar"
                              >
                                📅
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-sm">
                            {session.subject} • {session.time} • {session.duration} mins
                          </p>
                          {session.notes && (
                            <p className="text-slate-500 text-sm mt-1">{session.notes}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteSession(session.id)}
                        className="text-slate-400 hover:text-red-400 transition-colors ml-3"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow">
            <h3 className="text-xl font-semibold text-white mb-6">Upcoming Sessions</h3>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {upcomingSessions.length === 0 ? (
                <div className="text-gray-500 text-center py-10">No upcoming sessions</div>
              ) : (
                upcomingSessions.map(session => {
                  const Icon = getTypeIcon(session.type);
                  return (
                    <div key={session.id} className="flex items-center space-x-3 p-3 bg-slate-700/60 rounded-lg">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColor(
                        session.type
                      )}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-white font-medium truncate">{session.title}</p>
                          {session.calendar_event_id && <span className="text-xs">📅</span>}
                        </div>
                        <p className="text-slate-400 text-sm">
                          {toLocalDateStr(session.date)} at {session.time}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Add Session Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
            <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                <h3 className="text-2xl font-bold text-white mb-6">Add Study Session</h3>
                {warning && (
                  <div className="mb-3 text-center text-red-400 font-semibold text-lg">{warning}</div>
                )}
                <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
                  <div>
                    <label className="block text-slate-300 text-sm font-semibold mb-2">Title</label>
                    <input
                      type="text"
                      value={newSession.title}
                      onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g., Algorithm Analysis Review"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-semibold mb-2">Subject</label>
                    <input
                      type="text"
                      value={newSession.subject}
                      onChange={e => setNewSession({ ...newSession, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 text-sm font-semibold mb-2">Date</label>
                      <input
                        type="date"
                        value={newSession.date}
                        min={minDate}
                        onChange={e =>
                          setNewSession({ ...newSession, date: normalizeDateString(e.target.value) })
                        }
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm font-semibold mb-2">Time</label>
                      <input
                        type="time"
                        value={newSession.time}
                        onChange={e => setNewSession({ ...newSession, time: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 text-sm font-semibold mb-2">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={newSession.duration}
                        onChange={e =>
                          setNewSession({
                            ...newSession,
                            duration: parseInt(e.target.value) || 60
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                        min="15"
                        step="15"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm font-semibold mb-2">Type</label>
                      <select
                        value={newSession.type}
                        onChange={e =>
                          setNewSession({
                            ...newSession,
                            type: e.target.value as StudySession['type']
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="study">Study</option>
                        <option value="quiz">Quiz</option>
                        <option value="review">Review</option>
                        <option value="project">Project</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-semibold mb-2">Priority</label>
                    <select
                      value={newSession.priority}
                      onChange={e =>
                        setNewSession({
                          ...newSession,
                          priority: e.target.value as StudySession['priority']
                        })
                      }
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-semibold mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={newSession.notes}
                      onChange={e => setNewSession({ ...newSession, notes: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 resize-none"
                      rows={3}
                      placeholder="Add any notes or reminders..."
                    />
                  </div>
                </div>
                <div className="flex space-x-3 mt-8 pb-1 pt-2">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setWarning(null);
                    }}
                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSession}
                    disabled={!newSession.title || !newSession.subject}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white rounded-xl font-semibold text-lg transition-all"
                  >
                    Add Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
