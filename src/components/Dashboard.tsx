import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navigation from './Navigation';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Target, 
  BookOpen, 
  Brain,
  Upload,
  MessageSquare,
  BarChart3,
  Award,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');

  const stats = [
    { label: 'Study Hours', value: '0', change: '+0%', icon: Clock, color: 'purple' },
    { label: 'Completed Sessions', value: '0', change: '+0%', icon: CheckCircle2, color: 'green' },
    { label: 'Average Score', value: '0%', change: '+0%', icon: Target, color: 'blue' },
    { label: 'Streak Days', value: '0', change: '+0%', icon: Award, color: 'orange' }
  ];

  const recentActivity = [];

  const upcomingTasks = [];

  const getStatColor = (color: string) => {
    const colors = {
      purple: 'from-purple-500 to-purple-600',
      green: 'from-green-500 to-green-600',
      blue: 'from-blue-500 to-blue-600',
      orange: 'from-orange-500 to-orange-600'
    };
    return colors[color as keyof typeof colors];
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'text-red-400 bg-red-500/20',
      medium: 'text-yellow-400 bg-yellow-500/20',
      low: 'text-green-400 bg-green-500/20'
    };
    return colors[priority as keyof typeof colors];
  };

  const getActivityIcon = (type: string) => {
    const icons = {
      quiz: Target,
      study: BookOpen,
      upload: Upload,
      chat: MessageSquare
    };
    return icons[type as keyof typeof icons] || BookOpen;
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-slate-400">
            You have 3 study sessions scheduled for today. Let's make it productive!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-purple-500/30 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${getStatColor(stat.color)} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-green-400 text-sm font-medium">{stat.change}</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Study Progress Chart */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Study Progress</h3>
              <select 
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:border-purple-500"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
            
            {/* Simplified chart representation */}
            <div className="space-y-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                return (
                  <div key={day} className="flex items-center space-x-4">
                    <span className="text-slate-400 text-sm w-8">{day}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: '0%' }}
                      />
                    </div>
                    <span className="text-white text-sm w-12">0h</span>
                  </div>
                );
              })}
              <div className="text-center py-4">
                <p className="text-slate-400">Ready to start your learning journey? Create your first study session!</p>
              </div>
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-xl font-semibold text-white mb-6">Upcoming Tasks</h3>
            <div className="space-y-4">
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No upcoming tasks</p>
                  <p className="text-slate-500 text-sm mt-2">Create your first study session to get started!</p>
                </div>
              ) : (
                upcomingTasks.map((task, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/50 hover:border-purple-500/30 transition-all duration-300">
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1">{task.title}</h4>
                      <p className="text-slate-400 text-sm">{task.due}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-xl font-semibold text-white mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">No recent activity</p>
                <p className="text-slate-500 text-sm mt-2">Start studying to see your activity here!</p>
              </div>
            ) : (
              recentActivity.map((activity, index) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50 hover:border-purple-500/30 transition-all duration-300">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{activity.title}</h4>
                      <p className="text-slate-400 text-sm">
                        {'score' in activity && `Score: ${activity.score}%`}
                        {'duration' in activity && `Duration: ${activity.duration}`}
                        {'size' in activity && `Size: ${activity.size}`}
                        {'messages' in activity && `${activity.messages} messages`}
                      </p>
                    </div>
                    <span className="text-slate-400 text-sm">{activity.time}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}