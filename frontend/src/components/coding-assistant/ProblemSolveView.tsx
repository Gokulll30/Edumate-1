import { useEffect, useState } from "react";
import { getProblemById } from "../../services/api";
import CodeEditor from "./CodeEditor";
import TestResults from "./TestResults";

export default function ProblemSolveView({
  problemId,
  onBack,
}: {
  problemId: string;
  onBack: () => void;
}) {
  const [problem, setProblem] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    async function loadProblem() {
      const res = await getProblemById(problemId);
      if (res.success) {
        setProblem(res.problem);
      }
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
        className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
      >
        ← Back to Problems
      </button>

      {/* Problem Info */}
      <div>
        <h2 className="text-2xl font-bold text-white">{problem.title}</h2>
        <p className="text-slate-400 mt-2">{problem.description}</p>
      </div>

      {/* Code Editor */}
      <CodeEditor problem={problem} onRunResult={setResult} />

      {/* Test Results */}
      {result && <TestResults result={result} />}
    </div>
  );
}
