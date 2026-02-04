import { useState, useEffect } from "react";
import ProblemList from "./ProblemList";
import ProblemSolveView from "./ProblemSolveView";
import HistorySection from "./HistorySection"; // Added
import { Code, Trophy, Activity, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getUserCodingStats } from "../../services/api";

export default function CodingAssistantPage() {
  const { user } = useAuth();
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [stats, setStats] = useState({ solved: 0, points: 0 });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (user?.id) {
      getUserCodingStats(Number(user.id)).then((res) => {
        if (res.success && res.stats) {
          setStats({
            solved: res.stats.solved_count,
            points: res.stats.total_points
          });
        }
      });
    }
  }, [user, refreshTrigger]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white selection:bg-purple-500/30">
      {/* Abstract Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] mix-blend-screen"></div>
        <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[80px] mix-blend-screen"></div>
      </div>

      <div className="relative z-10 max-w-[95%] xl:max-w-7xl mx-auto px-4 py-8">
        {!selectedProblemId ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-white/5 pb-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-indigo-200 tracking-tight mb-3">
                  AI Coding Assistant
                </h1>
                <p className="text-slate-400 text-lg max-w-2xl font-light leading-relaxed">
                  Master algorithms with <span className="text-purple-400 font-medium">intelligent feedback</span>, real-time optimization checks, and multi-language support.
                </p>
              </div>
              <div className="hidden md:flex gap-4">
                <div className="flex flex-col items-center bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:border-purple-500/30 transition-colors">
                  <Trophy className="w-6 h-6 text-yellow-400 mb-2" />
                  <span className="text-2xl font-bold">{stats.solved}</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Solved</span>
                </div>
                <div className="flex flex-col items-center bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:border-purple-500/30 transition-colors">
                  <Sparkles className="w-6 h-6 text-purple-400 mb-2" />
                  <span className="text-2xl font-bold">{stats.points}</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wider">Points</span>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: History & Stats (4 cols) */}
              <div className="lg:col-span-4 space-y-8">
                <div className="bg-[#131B2C]/80 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl shadow-purple-900/5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-500/10 rounded-xl">
                      <Activity className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
                  </div>
                  <HistorySection refreshTrigger={refreshTrigger} />
                </div>
              </div>

              {/* Right Column: Problem List (8 cols) */}
              <div className="lg:col-span-8">
                <div className="bg-[#131B2C]/80 backdrop-blur-xl rounded-3xl border border-white/5 p-8 shadow-2xl shadow-purple-900/5 h-full">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-xl">
                        <Code className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h2 className="text-2xl font-semibold text-white">Challenge Library</h2>
                    </div>
                    <div className="flex gap-2">
                      {/* Filter placeholders could go here */}
                      <span className="text-xs font-medium px-3 py-1 bg-white/5 rounded-full text-slate-400 border border-white/5">
                        All Difficulties
                      </span>
                    </div>
                  </div>
                  <ProblemList onSelectProblem={setSelectedProblemId} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in zoom-in-95 duration-300">
            <ProblemSolveView
              problemId={selectedProblemId}
              onBack={() => setSelectedProblemId(null)}
              onComplete={() => {
                setRefreshTrigger(prev => prev + 1);
                setSelectedProblemId(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
