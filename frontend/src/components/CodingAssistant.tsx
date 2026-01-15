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
        setResponse(res.error || "❌ Something went wrong");
      }
    } catch (err) {
      console.error(err);
      setResponse("❌ Failed to reach Coding Assistant backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-3xl">
      <select
        className="mb-2 p-2 bg-gray-800 text-white rounded"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        <option value="python">Python</option>
        <option value="cpp">C++</option>
        <option value="javascript">JavaScript</option>
      </select>

      <textarea
        className="w-full p-2 mb-2 bg-gray-800 text-white rounded"
        placeholder="Ask your coding question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <textarea
        className="w-full p-2 mb-2 bg-gray-800 text-white rounded"
        placeholder="Paste code (optional)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <button
        onClick={submitQuery}
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
      >
        {loading ? "Processing..." : "Ask Assistant"}
      </button>

      {response && (
        <pre className="mt-4 p-3 bg-gray-900 text-green-400 rounded whitespace-pre-wrap">
          {response}
        </pre>
      )}
    </div>
  );
}
