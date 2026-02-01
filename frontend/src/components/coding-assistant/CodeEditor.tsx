import { useEffect, useState } from "react";
import { runProblemCode } from "../../services/api";

type Props = {
  problem: any;
  onRunResult: (res: any) => void;
};

export default function CodeEditor({ problem, onRunResult }: Props) {
  const [language, setLanguage] =
    useState<"python" | "cpp" | "javascript">("python");

  const [code, setCode] = useState("");

  // ✅ update editor when problem or language changes
  useEffect(() => {
    setCode(problem?.starterCode?.[language] || "");
  }, [problem, language]);

  const run = async () => {
    const res = await runProblemCode({
      problemId: problem.id,
      language,
      code,
    });
    onRunResult(res);
  };

  return (
    <div className="space-y-3">
      {/* Language selector */}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as any)}
        className="bg-slate-800 text-white px-3 py-2 rounded border border-slate-700"
      >
        <option value="python">Python</option>
        <option value="cpp">C++</option>
        <option value="javascript">JavaScript</option>
      </select>

      {/* Code editor */}
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        className="
          w-full
          min-h-[320px]
          bg-slate-900
          text-slate-100
          font-mono
          text-sm
          p-4
          rounded-lg
          border
          border-slate-700
          focus:outline-none
          focus:ring-2
          focus:ring-purple-500
        "
        placeholder="Write your solution here..."
      />

      {/* Run button */}
      <button
        onClick={run}
        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white font-medium"
      >
        Run Code
      </button>
    </div>
  );
}
