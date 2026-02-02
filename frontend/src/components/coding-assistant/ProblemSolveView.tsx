import { useEffect, useState } from "react";
import { getProblemById } from "../../services/api";
import CodeEditor from "./CodeEditor";
import ResultSummary from "./ResultSummary";
import TestCases from "./TestCases";
import ExamplesSection from "./ExamplesSection";

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
      try {
        const res = await getProblemById(problemId);
        if (res.success) {
          setProblem(res.problem);
        }
      } catch (err) {
        console.error("Failed to load problem", err);
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
        <h2 className="text-2xl font-bold text-white">
          {problem.title}
        </h2>
        <p className="text-slate-400 mt-2">
          {problem.description}
        </p>
      </div>

      {/* Examples (NEW – LeetCode style) */}
      <ExamplesSection examples={problem.examples} />

      {/* Test Cases (INPUTS ONLY) */}
      <TestCases testCases={problem.testCases} />

      {/* Code Editor */}
      <CodeEditor
        problem={problem}
        onRunResult={setResult}
      />

      {/* Execution / Test Results */}
      {result && <ResultSummary result={result} />}
    </div>
  );
}
