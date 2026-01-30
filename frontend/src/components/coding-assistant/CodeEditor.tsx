import { useState } from "react";
import { runProblemCode } from "../../services/api";

export default function CodeEditor({
  problem,
  onRunResult
}: {
  problem: any;
  onRunResult: (res: any) => void;
}) {
  const [language, setLanguage] = useState<"python" | "cpp" | "javascript">("python");
  const [code, setCode] = useState(problem.starterCode?.python || "");

  const run = async () => {
    const res = await runProblemCode({
      problemId: problem.id,
      language,
      code
    });
    onRunResult(res);
  };

  return (
    <div className="space-y-2">
      <select
        value={language}
        onChange={e => {
          const lang = e.target.value as any;
          setLanguage(lang);
          setCode(problem.starterCode?.[lang] || "");
        }}
        className="bg-slate-800 text-white p-2 rounded"
      >
        <option value="python">Python</option>
        <option value="cpp">C++</option>
        <option value="javascript">JavaScript</option>
      </select>

      <textarea
        className="w-full h-48 bg-slate-900 text-white p-3 rounded font-mono"
        value={code}
        onChange={e => setCode(e.target.value)}
      />

      <button
        onClick={run}
        className="px-4 py-2 bg-purple-600 rounded text-white"
      >
        Run Code
      </button>
    </div>
  );
}
