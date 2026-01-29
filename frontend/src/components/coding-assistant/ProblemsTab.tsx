import { useEffect, useState } from "react";
import { getProblems } from "../../services/api";

type Problem = {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
};

export default function ProblemsTab({ onSelect }: { onSelect: (id: string) => void }) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProblems() {
      try {
        const res = await getProblems();

        // 👇 IMPORTANT FIX
        if (res.success && Array.isArray(res.problems)) {
          setProblems(res.problems);
        } else {
          console.error("Invalid problems response", res);
          setProblems([]);
        }
      } catch (err) {
        console.error("Failed to load problems", err);
        setProblems([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProblems();
  }, []);

  if (loading) return <p className="text-slate-400">Loading problems...</p>;

  return (
    <div className="space-y-3">
      {problems.map((p) => (
        <div
          key={p.id}
          onClick={() => onSelect(p.id)}
          className="cursor-pointer p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-purple-500"
        >
          <div className="flex justify-between">
            <span className="text-white">{p.title}</span>
            <span className="text-sm text-slate-400">{p.difficulty}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
