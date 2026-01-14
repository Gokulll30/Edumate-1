import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import Navigation from "./Navigation";
import CodingAssistant from "./CodingAssistant";
import {
  Clock,
  Target,
  BookOpen,
  Upload,
  MessageSquare,
  Award,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type Stat = {
  label: string;
  value: string | number;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "purple" | "green" | "blue" | "orange";
};

type Activity =
  | { type: "quiz"; title: string; score: number; time: string }
  | { type: "study"; title: string; duration: string; time: string }
  | { type: "upload"; title: string; size: string; time: string }
  | { type: "chat"; title: string; messages: number; time: string };

type Task = {
  id?: number;
  title: string;
  due: string;
  priority: "high" | "medium" | "low";
  subject?: string;
  isRetake?: boolean;
  rawDate?: string;
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showCodingAssistant, setShowCodingAssistant] = useState(false);


  const [selectedTimeframe, setSelectedTimeframe] = useState("week");
  const [progress, setProgress] = useState({
    totalSessions: 0,
    completedSessions: 0,
    totalHours: 0,
    completedHours: 0,
    testsTaken: 0,
    completionRate: 0,
  });

  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);

  useEffect(() => {
    async function fetchProgress() {
      if (!user) return;
      try {
        const res = await fetch(
          `${API_BASE}/study/progress/${encodeURIComponent(user.id)}`
        );
        const data = await res.json();
        if (data?.success && data.progress) {
          setProgress(data.progress);
        } else {
          setProgress({
            totalSessions: 0,
            completedSessions: 0,
            totalHours: 0,
            completedHours: 0,
            testsTaken: 0,
            completionRate: 0,
          });
        }
      } catch (err) {
        setProgress({
          totalSessions: 0,
          completedSessions: 0,
          totalHours: 0,
          completedHours: 0,
          testsTaken: 0,
          completionRate: 0,
        });
      }
    }
    fetchProgress();
  }, [user]);

  useEffect(() => {
    async function fetchUpcomingTasks() {
      if (!user) return;
      try {
        const res = await fetch(`${API_BASE}/study/sessions/${encodeURIComponent(user.id)}`);
        const tasksData = await res.json();
        if (tasksData?.success && Array.isArray(tasksData.sessions)) {
          const now = new Date();
          const filtered = tasksData.sessions
            .filter((session: any) => {
              const sessionDate = session.date ? new Date(session.date) : null;
              return (
                session.completed === 0 &&
                sessionDate !== null &&
                sessionDate >= now
              );
            })
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((session: any) => ({
              id: session.id,
              title: session.title,
              due: session.date
                ? new Date(session.date).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "No Date",
              priority: session.priority || "medium",
              subject: session.subject,
              isRetake: session.type === "quiz_retake",
              rawDate: session.date,
            }));
          setUpcomingTasks(filtered);
        } else {
          setUpcomingTasks([]);
        }
      } catch {
        setUpcomingTasks([]);
      }
    }
    fetchUpcomingTasks();
  }, [user, progress]);

  const isNewUser =
    progress.totalSessions === 0 &&
    progress.completedSessions === 0 &&
    progress.totalHours === 0 &&
    progress.completedHours === 0 &&
    progress.testsTaken === 0 &&
    progress.completionRate === 0;

  const recentActivity: Activity[] = isNewUser
    ? []
    : [
        {
          type: "quiz",
          title: "Data Structures Quiz",
          score: 92,
          time: "2 hours ago",
        },
        {
          type: "study",
          title: "Algorithm Analysis",
          duration: "1.5 hours",
          time: "4 hours ago",
        },
        {
          type: "upload",
          title: "Computer Networks PDF",
          size: "2.3 MB",
          time: "1 day ago",
        },
        { type: "chat", title: "AI Study Session", messages: 12, time: "1 day ago" },
      ];

  // Stat widgets for top row
  const stats = useMemo(
    () => [
      {
        label: "Study Hours",
        value: isNewUser ? 0 : progress.totalHours?.toFixed(1) || 0,
        change: isNewUser ? "+0%" : "+12%",
        icon: Clock,
        color: "purple",
      },
      {
        label: "Completed Sessions",
        value: 2, // ALWAYS show 2!
        change: isNewUser ? "+0%" : "+8%",
        icon: CheckCircle2,
        color: "green",
      },
      {
        label: "Average Score",
        value: isNewUser ? "—" : "87%",
        change: isNewUser ? "+0%" : "+5%",
        icon: Target,
        color: "blue",
      },
      {
        label: "Streak Days",
        value: isNewUser ? "—" : 12,
        change: isNewUser ? "+0%" : "+3%",
        icon: Award,
        color: "orange",
      },
    ],
    [progress, isNewUser]
  );

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const studyProgressData = isNewUser
    ? weekDays.map((day) => ({ day, value: 0, label: "—" }))
    : [
        { day: "Mon", value: 3, label: "3h" },
        { day: "Tue", value: 3, label: "3h" },
        { day: "Wed", value: 3, label: "3h" },
        { day: "Thu", value: 5, label: "5h" },
        { day: "Fri", value: 3, label: "3h" },
        { day: "Sat", value: 6, label: "6h" },
        { day: "Sun", value: 5, label: "5h" },
      ];

  const getStatColor = (color: string) => {
    const colors = {
      purple: "from-purple-500 to-purple-600",
      green: "from-green-500 to-green-600",
      blue: "from-blue-500 to-blue-600",
      orange: "from-orange-500 to-orange-600",
    };
    return colors[color as keyof typeof colors];
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: "text-red-400 bg-red-500/20",
      medium: "text-yellow-400 bg-yellow-500/20",
      low: "text-green-400 bg-green-500/20",
    };
    return colors[priority as keyof typeof colors];
  };

  const getActivityIcon = (type: string) => {
    const icons = {
      quiz: Target,
      study: BookOpen,
      upload: Upload,
      chat: MessageSquare,
    };
    return icons[type as keyof typeof icons] || BookOpen;
  };

  const onTaskClick = (task: Task) => {
    if (task.isRetake && task.subject) {
      navigate(`/quiz-generator?subject=${encodeURIComponent(task.subject)}`);
    }
  };

  const showRetakeMessage = (task: Task): boolean => {
    if (!task.isRetake || !task.rawDate) return false;
    const now = new Date();
    const dueDate = new Date(task.rawDate);
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 2;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.name || "Learner"}! 👋
          </h1>
          <p className="text-slate-400">
            You have {progress.totalSessions || 0} study sessions scheduled. Let's make it productive!
          </p>
        </div>
      {/* ✅ Coding Assistant Toggle Button */}
      <div className="mb-8">
        <button
          onClick={() => setShowCodingAssistant(prev => !prev)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          {showCodingAssistant ? "Close Coding Assistant" : "Open Coding Assistant"}
        </button>
      </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-purple-500/60 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 bg-gradient-to-r ${getStatColor(
                      stat.color
                    )} rounded-xl flex items-center justify-center`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={`text-green-400 text-sm font-medium`}>
                    {stat.change}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-slate-400 text-sm">{stat.label}</div>
              </div>
            );
          })}
        </div>
        {/* Study Progress and Upcoming Tasks grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Study Progress Chart */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
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
            {/* Custom Styled Progress Lines */}
            <div className="space-y-4">
              {studyProgressData.map(({ day, value, label }) => (
                <div key={day} className="flex items-center gap-4">
                  <span className="text-slate-400 text-sm w-8">{day}</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full relative">
                    <div
                      className="absolute left-0 top-0 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                      style={{
                        width: `${isNewUser ? 0 : Math.min(value * 14, 100)}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-white text-sm w-10 text-right">{label}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Upcoming Tasks */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-6">Upcoming Tasks</h3>
            {upcomingTasks.length === 0 && (
              <div className="text-slate-500 text-center">No tasks scheduled yet.</div>
            )}
            <div className="space-y-4">
              {upcomingTasks.map((task, index) => (
                <div
                  key={task.id || index}
                  onClick={() => onTaskClick(task)}
                  className="cursor-pointer flex flex-col p-4 bg-slate-700/50 rounded-lg border border-slate-600 transition-all hover:bg-slate-600 duration-300"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium">{task.title}</h4>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{task.due}</p>
                  {showRetakeMessage(task) && (
                    <p className="mt-2 text-yellow-300 text-sm italic">
                      You have the rescheduled test on {task.due}. In the meantime, prepare well to improve your score.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Recent Activity */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-6">Recent Activity</h3>
          {recentActivity.length === 0 && (
            <div className="text-slate-500 text-center">No activity yet.</div>
          )}
          <div className="space-y-4">
            {recentActivity.map((activity, index) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div
                  key={index}
                  className="flex items-center space-x-4 p-4 bg-slate-700/60 rounded-lg border border-slate-600 transition-all duration-300"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{activity.title}</h4>
                    <p className="text-slate-400 text-sm">
                      {"score" in activity && `Score: ${activity.score}%`}
                      {"duration" in activity && `Duration: ${activity.duration}`}
                      {"size" in activity && `Size: ${activity.size}`}
                      {"messages" in activity && `${activity.messages} messages`}
                    </p>
                  </div>
                  <span className="text-slate-400 text-sm">{activity.time}</span>
                </div>
              );
            })}
          </div>
        </div>

      {/* Coding Assistant render */}
      {showCodingAssistant && (
        <div className="mt-8">
          <CodingAssistant />
        </div>
      )}

    </main>
  </div>
);
}
