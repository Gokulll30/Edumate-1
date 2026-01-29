import { useState } from "react";
import api from "../../services/api";

export default function CodeEditor({
  problemId,
  onRunComplete,
}: {
  problemId: string;
  onRunComplete: (r: any) => void;
}) {
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);

  const runCode = async () => {
    setRunning(true);
    const res = await api.post("/coding-assistant/run", {
      problemId,
      language: "python",
      code,
    });
    onRunComplete(res.data.result);
    setRunning(false);
  };

  return (
    <div className="mt-6">
      <textarea
        className="w-full h-48 bg-slate-900 text-white p-4 rounded-lg border border-slate-700"
        placeholder="Write your Python code here..."
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <button
        onClick={runCode}
        disabled={running}
        className="mt-4 px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
      >
        {running ? "Running..." : "Run Code"}
      </button>
    </div>
  );
}
