import { useState } from "react";
import Editor from "@monaco-editor/react";
import { runProblemCode } from "../../services/api";

export default function MonacoCodeEditor({
  language,
  initialCode,
  problemId,
}: {
  language: "python" | "cpp" | "javascript";
  initialCode: string;
  problemId: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<any>(null);

  const runCode = async () => {
    const res = await runProblemCode({ problemId, code, language });
    setOutput(res);
  };

  return (
    <div className="space-y-4">
      <div className="h-[400px] border border-slate-700 rounded overflow-hidden">
        <Editor
          height="100%"
          theme="vs-dark"
          language={language}
          value={code}
          onChange={(v) => setCode(v || "")}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            lineNumbers: "on",
            automaticLayout: true,
          }}
        />
      </div>

      <button
        onClick={runCode}
        className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded text-white"
      >
        Run Code
      </button>

      {output && (
        <pre className="bg-slate-900 p-4 rounded text-slate-200">
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </div>
  );
}
