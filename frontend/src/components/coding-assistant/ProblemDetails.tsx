import { useEffect, useState } from "react";
import { getProblemById } from "../../services/api";

type Props = {
  problemId: string;
};

export default function ProblemDetails({ problemId }: Props) {
  const [problem, setProblem] = useState<any>(null);

  useEffect(() => {
    async function fetchProblem() {
      const data = await getProblemById(problemId);
      setProblem(data);
    }
    fetchProblem();
  }, [problemId]);

  if (!problem) {
    return <div className="text-slate-400">Loading problem...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">
        {problem.title}
      </h2>

      <span className={`inline-block px-3 py-1 rounded-full text-sm ${
        problem.difficulty === "Easy"
          ? "bg-green-500/20 text-green-400"
          : problem.difficulty === "Medium"
          ? "bg-yellow-500/20 text-yellow-400"
          : "bg-red-500/20 text-red-400"
      }`}>
        {problem.difficulty}
      </span>

      <p className="text-slate-300 whitespace-pre-line">
        {problem.description}
      </p>

      <div>
        <h3 className="font-semibold text-white">Examples</h3>
        {problem.examples.map((ex: any, idx: number) => (
          <pre
            key={idx}
            className="bg-slate-800 p-3 rounded mt-2 text-slate-200"
          >
Input: {ex.input}
Output: {ex.output}
          </pre>
        ))}
      </div>

      <div>
        <h3 className="font-semibold text-white">Constraints</h3>
        <ul className="list-disc ml-5 text-slate-300">
          {problem.constraints.map((c: string, idx: number) => (
            <li key={idx}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
