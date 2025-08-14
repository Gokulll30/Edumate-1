import React, { useState } from 'react';
import Navigation from './Navigation';
import { Calendar, Clock, Target, Plus, Edit, Trash2, CheckCircle2, AlertCircle, Book, Brain } from 'lucide-react';

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

export default function StudyPlanner() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sessions, setSessions] = useState<StudySession[]>([
    {
      id: '1',
      title: 'Algorithm Analysis Review',
      subject: 'Computer Science',
      duration: 120,
      date: '2025-01-14',
      time: '14:00',
      type: 'study',
      priority: 'high',
      completed: false,
      notes: 'Focus on time complexity and Big O notation'
    },
    {
      id: '2',
      title: 'Database Design Quiz',
      subject: 'Database Systems',
      duration: 45,
      date: '2025-01-14',
      time: '16:30',
      type: 'quiz',
      priority: 'medium',
      completed: true
    },
    {
      id: '3',
      title: 'Machine Learning Project',
      subject: 'AI/ML',
      duration: 180,
      date: '2025-01-15',
      time: '10:00',
      type: 'project',
      priority: 'high',
      completed: false,
      notes: 'Work on neural network implementation'
    }
  ]);

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

  const getTypeIcon = (type: StudySession['type']) => {
    const icons = {
      study: Book,
      quiz: Target,
      review: Brain,
      project: Edit
    };
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

  const handleAddSession = () => {
    const session: StudySession = {
      ...newSession,
      id: Date.now().toString(),
      completed: false
    };
    setSessions([...sessions, session]);
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
  };

  const toggleCompletion = (id: string) => {
    setSessions(sessions.map(session => 
      session.id === id ? { ...session, completed: !session.completed } : session
    ));
  };

  const deleteSession = (id: string) => {
    setSessions(sessions.filter(session => session.id !== id));
  };

  const getSessionsForDate = (date: string) => {
    return sessions.filter(session => session.date === date);
  };

  const todaySessions = getSessionsForDate(selectedDate);
  const weeklyStats = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.completed).length,
    totalHours: sessions.reduce((acc, s) => acc + s.duration, 0) / 60,
    completedHours: sessions.filter(s => s.completed).reduce((acc, s) => acc + s.duration, 0) / 60
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Study Planner</h1>
            <p className="text-slate-400">Organize your study sessions and track your progress</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setView('calendar')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  view === 'calendar' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  view === 'list' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                List
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-medium flex items-center space-x-2 transition-all duration-300 transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              <span>Add Session</span>
            </button>
          </div>
        </div>

        {/* Weekly Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center space-x-3">
              <Calendar className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">{weeklyStats.totalSessions}</p>
                <p className="text-slate-400 text-sm">Total Sessions</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{weeklyStats.completedSessions}</p>
                <p className="text-slate-400 text-sm">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center space-x-3">
              <Clock className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{weeklyStats.totalHours.toFixed(1)}h</p>
                <p className="text-slate-400 text-sm">Total Hours</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center space-x-3">
              <Target className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {weeklyStats.totalSessions > 0 ? Math.round((weeklyStats.completedSessions / weeklyStats.totalSessions) * 100) : 0}%
                </p>
                <p className="text-slate-400 text-sm">Completion Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sessions List */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                Sessions for {new Date(selectedDate).toLocaleDateString()}
              </h3>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-700 text-white rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-4">
              {todaySessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No study sessions scheduled for this date</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="text-purple-400 hover:text-purple-300 font-medium mt-2"
                  >
                    Add your first session
                  </button>
                </div>
              ) : (
                todaySessions.map((session) => {
                  const Icon = getTypeIcon(session.type);
                  return (
                    <div
                      key={session.id}
                      className={`p-4 bg-slate-700/30 rounded-lg border-l-4 ${getPriorityColor(session.priority)} hover:bg-slate-700/50 transition-all duration-300`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
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
                          className="text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-xl font-semibold text-white mb-6">Upcoming Sessions</h3>
            <div className="space-y-4">
              {sessions
                .filter(s => !s.completed && new Date(s.date) >= new Date())
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map((session) => {
                  const Icon = getTypeIcon(session.type);
                  return (
                    <div key={session.id} className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTypeColor(session.type)}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{session.title}</p>
                        <p className="text-slate-400 text-sm">
                          {new Date(session.date).toLocaleDateString()} at {session.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Add Session Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
              <div className="p-6">
                <h3 className="text-2xl font-bold text-white mb-6">Add Study Session</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Title</label>
                    <input
                      type="text"
                      value={newSession.title}
                      onChange={(e) => setNewSession({...newSession, title: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="e.g., Algorithm Analysis Review"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Subject</label>
                    <input
                      type="text"
                      value={newSession.subject}
                      onChange={(e) => setNewSession({...newSession, subject: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Date</label>
                      <input
                        type="date"
                        value={newSession.date}
                        onChange={(e) => setNewSession({...newSession, date: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Time</label>
                      <input
                        type="time"
                        value={newSession.time}
                        onChange={(e) => setNewSession({...newSession, time: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Duration (minutes)</label>
                      <input
                        type="number"
                        value={newSession.duration}
                        onChange={(e) => setNewSession({...newSession, duration: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                        min="15"
                        step="15"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">Type</label>
                      <select
                        value={newSession.type}
                        onChange={(e) => setNewSession({...newSession, type: e.target.value as StudySession['type']})}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="study">Study</option>
                        <option value="quiz">Quiz</option>
                        <option value="review">Review</option>
                        <option value="project">Project</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Priority</label>
                    <select
                      value={newSession.priority}
                      onChange={(e) => setNewSession({...newSession, priority: e.target.value as StudySession['priority']})}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">Notes (optional)</label>
                    <textarea
                      value={newSession.notes}
                      onChange={(e) => setNewSession({...newSession, notes: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                      rows={3}
                      placeholder="Add any notes or reminders..."
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSession}
                    disabled={!newSession.title || !newSession.subject}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all"
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