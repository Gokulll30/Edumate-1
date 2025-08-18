import React, { useState } from 'react';
import Navigation from './Navigation';
import { TrendingUp, Target, Award, Clock, BookOpen, Brain, Calendar, BarChart3 } from 'lucide-react';

interface Subject {
  name: string;
  progress: number;
  totalHours: number;
  completedSessions: number;
  averageScore: number;
  color: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  completedDate?: string;
}

export default function ProgressTracker() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  
  const subjects: Subject[] = [
    { name: 'Computer Science', progress: 0, totalHours: 0, completedSessions: 0, averageScore: 0, color: 'purple' },
    { name: 'Mathematics', progress: 0, totalHours: 0, completedSessions: 0, averageScore: 0, color: 'blue' },
    { name: 'Database Systems', progress: 0, totalHours: 0, completedSessions: 0, averageScore: 0, color: 'green' },
    { name: 'Machine Learning', progress: 0, totalHours: 0, completedSessions: 0, averageScore: 0, color: 'orange' }
  ];

  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'Study Streak Master',
      description: 'Study for 7 consecutive days',
      icon: Award,
      completed: false
    },
    {
      id: '2',
      title: 'Quiz Champion',
      description: 'Score above 90% in 5 quizzes',
      icon: Target,
      completed: false
    },
    {
      id: '3',
      title: 'Time Master',
      description: 'Study for 50+ hours this month',
      icon: Clock,
      completed: false
    },
    {
      id: '4',
      title: 'Knowledge Seeker',
      description: 'Complete 100 study sessions',
      icon: BookOpen,
      completed: false
    },
    {
      id: '5',
      title: 'AI Assistant Pro',
      description: 'Use AI chat for 30+ conversations',
      icon: Brain,
      completed: false
    }
  ];

  const weeklyData = [
    { day: 'Mon', hours: 0, score: 0 },
    { day: 'Tue', hours: 0, score: 0 },
    { day: 'Wed', hours: 0, score: 0 },
    { day: 'Thu', hours: 0, score: 0 },
    { day: 'Fri', hours: 0, score: 0 },
    { day: 'Sat', hours: 0, score: 0 },
    { day: 'Sun', hours: 0, score: 0 }
  ];

  const getSubjectColor = (color: string) => {
    const colors = {
      purple: 'bg-purple-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      orange: 'bg-orange-500'
    };
    return colors[color as keyof typeof colors];
  };

  const getSubjectBgColor = (color: string) => {
    const colors = {
      purple: 'bg-purple-500/20 border-purple-500/30',
      blue: 'bg-blue-500/20 border-blue-500/30',
      green: 'bg-green-500/20 border-green-500/30',
      orange: 'bg-orange-500/20 border-orange-500/30'
    };
    return colors[color as keyof typeof colors];
  };

  const overallStats = {
    totalHours: subjects.reduce((acc, s) => acc + s.totalHours, 0),
    averageScore: subjects.length > 0 ? Math.round(subjects.reduce((acc, s) => acc + s.averageScore, 0) / subjects.length) : 0,
    completedAchievements: achievements.filter(a => a.completed).length,
    studyStreak: 0
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Progress Tracker</h1>
            <p className="text-slate-400">Monitor your learning journey and achievements</p>
          </div>
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-slate-800 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:border-purple-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{overallStats.totalHours.toFixed(1)}h</p>
                <p className="text-slate-400 text-sm">Total Hours</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{overallStats.averageScore}%</p>
                <p className="text-slate-400 text-sm">Average Score</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{overallStats.completedAchievements}/{achievements.length}</p>
                <p className="text-slate-400 text-sm">Achievements</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{overallStats.studyStreak}</p>
                <p className="text-slate-400 text-sm">Day Streak</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Weekly Activity Chart */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-xl font-semibold text-white mb-6">Weekly Activity</h3>
            <div className="space-y-4">
              {weeklyData.map((day, index) => (
                <div key={day.day} className="flex items-center space-x-4">
                  <span className="text-slate-400 text-sm w-8">{day.day}</span>
                  <div className="flex-1 flex items-center space-x-3">
                    <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(day.hours / 6) * 100}%` }}
                      />
                    </div>
                    <span className="text-white text-sm w-12">{day.hours}h</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${day.score}%` }}
                      />
                    </div>
                    <span className="text-white text-sm w-12">{day.score}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center space-x-6 mt-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                <span className="text-slate-400">Study Hours</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                <span className="text-slate-400">Average Score</span>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-xl font-semibold text-white mb-6">Achievements</h3>
            <div className="space-y-4">
              {achievements.map((achievement) => {
                const Icon = achievement.icon;
                return (
                  <div 
                    key={achievement.id}
                    className={`p-4 rounded-lg border transition-all duration-300 ${
                      achievement.completed 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : 'bg-slate-700/30 border-slate-600/50'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        achievement.completed 
                          ? 'bg-green-500' 
                          : 'bg-slate-600'
                      }`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${
                          achievement.completed ? 'text-white' : 'text-slate-300'
                        }`}>
                          {achievement.title}
                        </h4>
                        <p className="text-slate-400 text-sm">{achievement.description}</p>
                        {achievement.completedDate && (
                          <p className="text-green-400 text-xs mt-1">
                            Completed on {new Date(achievement.completedDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {achievement.completed && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Subject Progress */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-xl font-semibold text-white mb-6">Subject Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjects.map((subject, index) => (
              <div 
                key={index}
                className={`p-6 rounded-xl border ${getSubjectBgColor(subject.color)}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-semibold">{subject.name}</h4>
                  <span className="text-white font-bold">{subject.progress}%</span>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>Progress</span>
                    <span>{subject.progress}%</span>
                  </div>
                  <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`${getSubjectColor(subject.color)} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${subject.progress}%` }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-white font-semibold">{subject.totalHours}h</p>
                    <p className="text-slate-400 text-xs">Total Hours</p>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{subject.completedSessions}</p>
                    <p className="text-slate-400 text-xs">Sessions</p>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{subject.averageScore}%</p>
                    <p className="text-slate-400 text-xs">Avg Score</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}