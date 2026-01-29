import { useState } from "react";
import { runProblemCode } from "../../services/api";
import TestResults from "./TestResults";

type Props = {
  problemId: string;
  starterCode: string;
};

export default function CodeEditor({ problemId, starterCode }: Props) {
  const [code, setCode] = useState(starterCode);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleRun = async () => {
    try {
      setLoading(true);
      setResults(null);

      const response = await runProblemCode({
        problemId,
        language: "python",
        code
      });

      setResults(response.result);
    } catch (err) {
      setResults({
        error: "Execution failed. Check backend."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        className="w-full h-64 p-4 bg-slate-900 text-white rounded-lg font-mono border border-slate-700 focus:outline-none focus:border-purple-500"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <button
        onClick={handleRun}
        disabled={loading}
        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium disabled:opacity-50"
      >
        {loading ? "Running..." : "Run Code"}
      </button>

      {results && <TestResults results={results} />}
    </div>
  );
}
