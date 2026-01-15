import { useState } from "react";
import { askCodingAssistant } from "../services/api";

export default function CodingAssistant() {
  const [language, setLanguage] = useState("python");
  const [question, setQuestion] = useState("");
  const [code, setCode] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const submitQuery = async () => {
    try {
      setLoading(true);
      setResponse("Thinking... 🤔");

      const res = await askCodingAssistant({
        language,
        question,
        code,
        task: "explain",
      });

      if (res.success) {
        setResponse(res.answer);
      } else {
        setResponse(res.error || "Something went wrong");
      }
    } catch (err) {
      setResponse("❌ Failed to reach Coding Assistant backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-64 min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <h1 className="text-3xl font-bold mb-2">Coding Assistant</h1>
        <p className="text-gray-400 mb-8">
          Ask questions, paste code, and get clear explanations.
        </p>

        {/* Card */}
        <div className="bg-gray-800/60 backdrop-blur rounded-xl border border-gray-700 p-6 space-y-6">

          {/* Language Selector */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Programming Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="javascript">JavaScript</option>
            </select>
          </div>

          {/* Question */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Your Question
            </label>
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Explain this code / Why is this wrong?"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Code (optional)
            </label>
            <textarea
              rows={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`Paste your ${language} code here...`}
              className="w-full font-mono bg-black border border-gray-700 rounded-lg p-4 text-green-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Button */}
          <div className="flex justify-end">
            <button
              onClick={submitQuery}
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition disabled:opacity-60"
            >
              {loading ? "Analyzing..." : "Ask Assistant"}
            </button>
          </div>
        </div>

        {/* Response */}
        {response && (
          <div className="mt-8 bg-gray-900 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-3 text-indigo-400">
              Assistant Response
            </h3>
            <pre className="whitespace-pre-wrap text-gray-200 leading-relaxed">
              {response}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
