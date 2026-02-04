import { useEffect, useState } from "react";
import { getProblems } from "../../services/api";

type Props = {
  onSelectProblem: (id: string) => void;
};

export default function ProblemList({ onSelectProblem }: Props) {
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProblems().then((res) => {
      if (res.success) {
        setProblems(res.problems);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse"></div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {problems.map((p) => (
        <div
          key={p.id}
          onClick={() => onSelectProblem(p.id)}
          className="group relative bg-[#0B0F19]/50 hover:bg-[#1E293B] p-5 rounded-2xl cursor-pointer border border-white/5 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="bg-white/5 p-2 rounded-lg group-hover:bg-purple-500/20 transition-colors">
              <span className={`text-xs font-bold px-2 py-1 rounded-md border ${p.difficulty === "Easy"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : p.difficulty === "Medium"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}>
                {p.difficulty}
              </span>
            </div>
            <span className="text-slate-500 text-xs">Recommended</span>
          </div>

          <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-purple-300 transition-colors">
            {p.title}
          </h3>
          <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
            {p.description || "Solve this algorithmic challenge to test your skills."}
          </p>

          <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none group-hover:border-purple-500/30 transition-colors"></div>
        </div>
      ))}
    </div>
  );
}
