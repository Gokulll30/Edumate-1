import { useState } from "react";

export default function CodeEditor({ problem, onRun }: any) {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{problem?.title}</h2>

      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="bg-gray-800 p-2 rounded"
      >
        <option value="python">Python</option>
        <option value="cpp">C++</option>
        <option value="javascript">JavaScript</option>
      </select>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full h-64 bg-black text-green-400 p-4 font-mono rounded"
        placeholder="Write your solution here..."
      />

      <button
        onClick={() =>
          onRun({
            passed: 2,
            total: 3,
            details: ["Test 1 Passed", "Test 2 Passed", "Test 3 Failed"],
          })
        }
        className="bg-indigo-600 px-6 py-2 rounded hover:bg-indigo-700"
      >
        Run Code
      </button>
    </div>
  );
}
