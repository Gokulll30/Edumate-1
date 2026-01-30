import { useEffect, useState } from "react";
import { getProblemById } from "../../services/api";
import MonacoCodeEditor from "./MonacoCodeEditor";

export default function ProblemSolveView({
  problemId,
  onBack,
}: {
  problemId: string;
  onBack: () => void;
}) {
  const [problem, setProblem] = useState<any>(null);
  const [language, setLanguage] = useState<"python" | "cpp" | "javascript">("python");

  useEffect(() => {
    async function loadProblem() {
      const res = await getProblemById(problemId);
      if (res.success) setProblem(res.problem);
    }
    loadProblem();
  }, [problemId]);

  if (!problem) {
    return <p className="text-slate-400">Loading problem...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-300 hover:text-white"
      >
        ← Back to Problems
      </button>

      {/* Problem Title */}
      <h2 className="text-2xl font-bold text-white">
        {problem.title}
      </h2>

      {/* Description */}
      <p className="text-slate-300">{problem.description}</p>

      {/* Language Selector */}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as any)}
        className="bg-slate-800 border border-slate-700 px-3 py-2 rounded text-white"
      >
        <option value="python">Python</option>
        <option value="cpp">C++</option>
        <option value="javascript">JavaScript</option>
      </select>

      {/* Code Editor */}
      <MonacoCodeEditor
        language={language}
        initialCode={problem.starterCode?.[language] || ""}
        problemId={problem.id}
      />
    </div>
  );
}
