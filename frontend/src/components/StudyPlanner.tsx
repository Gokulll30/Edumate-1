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
  Brain
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
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function normalizeDateString(dt: string | Date | null | undefined): string {
  if (!dt) return '';
  if (dt instanceof Date) return dt.toISOString().slice(0, 10);
  if (typeof dt === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(dt)) return dt.slice(0, 10);
    if (/^\d{2}-\d{2}-\d{4}$/.test(dt)) {
      const [dd, mm, yyyy] = dt.split('-');
      return `${yyyy}-${mm}-${dd}`;
    }
    try {
      return new Date(dt).toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }
  return '';
}

function normalizeTimeString(time: any): string {
  if (!time) return '00:00';
  if (typeof time === 'string' && time.includes(':')) return time.slice(0, 5);
  if (typeof time === 'string') return time;
  if (time instanceof Date) return time.toTimeString().slice(0, 5);
  return '00:00';
}

export default function StudyPlanner() {
  const { user } = useAuth();
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const minDate = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(minDate);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [newSession, setNewSession] = useState({
    title: '',
    subject: '',
    duration: 60,
    date: minDate,
    time: '10:00',
    type: 'study' as StudySession['type'],
    priority: 'medium' as StudySession['priority'],
    notes: ''
  });

  // GET all sessions
  const fetchSessions = async () => {
    if (!user) return setSessions([]);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/study/sessions?userId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data?.success) {
        const mapped: StudySession[] = data.sessions.map((s: any) => {
          let dateStr = '';
          if (typeof s.date === 'string') {
            try {
              dateStr = new Date(s.date).toISOString().slice(0, 10);
            } catch {
              dateStr = s.date.slice(0, 10);
            }
          } else if (s.date instanceof Date) {
            dateStr = s.date.toISOString().slice(0, 10);
          } else {
            dateStr = '';
          }
          return {
            id: String(s.id),
            title: s.title,
            subject: s.subject,
            duration: Number(s.duration || 60),
            date: dateStr,
            time: normalizeTimeString(s.time),
            type: (s.type || 'study') as StudySession['type'],
            priority: (s.priority || 'medium') as StudySession['priority'],
            completed: !!s.completed,
            notes: s.notes || ''
          };
        });
        setSessions(mapped);
      } else {
        setSessions([]);
      }
    } catch (err) {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, [user]);

  function dateTimeString(date: string, time: string) {
    return `${normalizeDateString(date)}T${normalizeTimeString(time)}`;
  }
  function toLocalDateStr(date: string) {
    try {
      return new Date(normalizeDateString(date)).toLocaleDateString();
    } catch {
      return date;
    }
  }

  // Today's sessions
  const todaySessions = sessions.filter(session => {
    const normSessionDate = normalizeDateString(session.date);
    const normSelectedDate = normalizeDateString(selectedDate);
    return normSessionDate === normSelectedDate && !session.completed;
  });

  // Upcoming Sessions: show all that are not completed and are today or in the future
  const now = new Date();
  const upcomingSessions = sessions
    .filter(s => {
      if (s.completed) return false;
      const sessionDate = new Date(dateTimeString(s.date, s.time));
      // Today (any time left) or any session after today
      return sessionDate >= new Date(minDate);
    })
    .sort((a, b) =>
      new Date(dateTimeString(a.date, a.time)).getTime() - new Date(dateTimeString(b.date, b.time)).getTime()
    );

  const weeklyStats = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.completed).length,
    totalHours: sessions.reduce((acc, s) => acc + s.duration, 0) / 60,
    completedHours: sessions.filter(s => s.completed).reduce((acc, s) => acc + s.duration, 0) / 60
  };

  const getTypeIcon = (type: StudySession['type']) => {
    const icons = { study: Book, quiz: Target, review: Brain, project: Edit };
    return icons[type];
  };
  const getTypeColor = (type: StudySession['type']) => {
    const colors = {
      study: 'bg-blue-500/20 text-blue-400',
      quiz: 'bg-green-500/20 text-green-400',
      review: 'bg-purple-500/20 text-purple-400',
      project: 'bg-orange-500/20 text-orange-400'
    };
    return colors[type];
  };
  const getPriorityColor = (priority: StudySession['priority']) => {
    const colors = {
      low: 'border-l-green-500',
      medium: 'border-l-yellow-500',
      high: 'border-l-red-500'
    };
    return colors[priority];
  };

  function validateDateTime() {
    const now = new Date();
    const sessionDateTime = new Date(dateTimeString(newSession.date, newSession.time));
    if (sessionDateTime < now) {
      setWarning("You cannot schedule a session in the past.");
      return false;
    }
    setWarning(null);
    return true;
  }

  // Add Session
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
        fetchSessions();
        setNewSession({
          title: '',
          subject: '',
          duration: 60,
          date: minDate,
          time: '10:00',
          type: 'study',
          priority: 'medium',
          notes: ''
        });
        setShowAddModal(false);
        setWarning(null);
      } else {
        setWarning('Failed to add session. Please try again.');
      }
    } catch (err) {
      setWarning('Add session error. Please try again.');
    }
  };

  // Toggle Completion
  const toggleCompletion = async (id: string) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/study/sessions/${encodeURIComponent(id)}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data?.success) fetchSessions();
    } catch (err) {}
  };

  // Complete session on delete (increase completed count but do NOT remove; mark completed in backend)
  const deleteSession = async (id: string) => {
    if (!user) return;
    // Instead of deleting, mark as completed
    try {
      const res = await fetch(`${API_BASE}/study/sessions/${encodeURIComponent(id)}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data?.success) fetchSessions();
    } catch (err) {}
  };

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
                value={normalizeDateString(selectedDate)}
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
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(session.type)}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-semibold ${session.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                            {session.title}
                          </h4>
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
                        title="Mark as completed"
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
                <div className="text-gray-500 text-center py-10">
                  No upcoming sessions
                </div>
              ) : (
                upcomingSessions.map(session => {
                  const Icon = getTypeIcon(session.type);
                  return (
                    <div key={session.id} className="flex items-center space-x-3 p-3 bg-slate-700/60 rounded-lg">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColor(session.type)}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{session.title}</p>
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
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
            <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                <h3 className="text-2xl font-bold text-white mb-6">
                  Add Study Session
                </h3>
                {warning && (
                  <div className="mb-3 text-center text-red-400 font-semibold text-lg">
                    {warning}
                  </div>
                )}
                <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
                  <div>
                    <label className="block text-slate-300 text-sm font-semibold mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newSession.title}
                      onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      placeholder="e.g., Algorithm Analysis Review"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-semibold mb-2">
                      Subject
                    </label>
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
                      <label className="block text-slate-300 text-sm font-semibold mb-2">
                        Date
                      </label>
                      <input
                        type="date"
                        value={normalizeDateString(newSession.date)}
                        min={minDate}
                        onChange={e => setNewSession({ ...newSession, date: normalizeDateString(e.target.value) })}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm font-semibold mb-2">
                        Time
                      </label>
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
                            duration: parseInt(e.target.value) || 60,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                        min="15"
                        step="15"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm font-semibold mb-2">
                        Type
                      </label>
                      <select
                        value={newSession.type}
                        onChange={e =>
                          setNewSession({ ...newSession, type: e.target.value as StudySession['type'] })
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
                    <label className="block text-slate-300 text-sm font-semibold mb-2">
                      Priority
                    </label>
                    <select
                      value={newSession.priority}
                      onChange={e =>
                        setNewSession({ ...newSession, priority: e.target.value as StudySession['priority'] })
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
                    onClick={() => { setShowAddModal(false); setWarning(null); }}
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
