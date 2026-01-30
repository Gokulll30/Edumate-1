import { useEffect, useState } from "react";
import { getProblems, ProblemSummary } from "../../services/api";

export default function ProblemsTab({
  onSelect
}: {
  onSelect: (id: string) => void;
}) {
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProblems()
      .then(res => {
        if (res.success) setProblems(res.problems);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="space-y-2">
      {problems.map(p => (
        <div
          key={p.id}
          onClick={() => onSelect(p.id)}
          className="p-3 bg-slate-800 border border-slate-700 rounded cursor-pointer hover:border-purple-500"
        >
          <div className="flex justify-between">
            <span className="text-white">{p.title}</span>
            <span className="text-xs text-slate-400">{p.difficulty}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
