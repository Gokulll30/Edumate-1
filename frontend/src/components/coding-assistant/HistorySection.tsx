import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

type HistoryItem = {
    id: number;
    problem_title: string;
    score: number;
    status: string;
    is_optimized: boolean;
    language: string;
    created_at: string;
};

export default function HistorySection({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
    const { user } = useAuth();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

        // Fetch history
        setLoading(true);
        fetch(`${API_URL}/coding-assistant/history/${user.id}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setHistory(data.history);
                }
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, [user, refreshTrigger]);

    if (!user) return null;

    if (loading) return <div className="text-slate-500 text-sm animate-pulse">Syncing history...</div>;

    if (history.length === 0) return (
        <div className="text-center py-8">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📝</span>
            </div>
            <p className="text-slate-400 text-sm">No attempts yet</p>
            <p className="text-slate-500 text-xs mt-1">Start solving to see progress!</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {history.slice(0, 5).map((item) => (
                <div key={item.id} className="relative group bg-[#0B0F19]/40 hover:bg-[#1E293B] p-4 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
                            {item.problem_title}
                        </h4>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.score >= 9 ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                            }`}>
                            {item.score}/10
                        </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                            <span className="capitalize">{item.language}</span>
                            <span>•</span>
                            <span>{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {item.is_optimized ? (
                                <span className="text-emerald-400 flex items-center gap-1" title="Optimized Solution">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> Opt
                                </span>
                            ) : (
                                <span className="text-slate-600">Base</span>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            <button className="w-full py-2 text-xs font-medium text-slate-500 hover:text-white border border-white/5 hover:bg-white/5 rounded-xl transition-colors">
                View All Activity
            </button>
        </div>
    );
}
