import { useEffect, useState } from "react";
import { getProblemById, ProblemDetail } from "../../services/api";
import CodeEditor from "./CodeEditor";
import TestResults from "./TestResults";

export default function ProblemDetails({ problemId }: { problemId: string }) {
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    getProblemById(problemId).then(res => {
      if (res.success) setProblem(res.problem);
    });
  }, [problemId]);

  if (!problem) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">{problem.title}</h2>
      <p className="text-slate-300">{problem.description}</p>

      <CodeEditor
        problem={problem}
        onRunResult={setResult}
      />

      {result && <TestResults result={result} />}
    </div>
  );
}
