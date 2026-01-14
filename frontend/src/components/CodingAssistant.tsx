import { useState } from "react";
import { askCodingAssistant } from "../services/api";

export default function CodingAssistant() {
  const [language, setLanguage] = useState("python");
  const [question, setQuestion] = useState("");
  const [code, setCode] = useState("");
  const [response, setResponse] = useState("");

  const submitQuery = async () => {
    const res = await askCodingAssistant({
      language,
      task: "explain",
      question,
      code,
    });

    if (res.error) {
      setResponse(res.error);
    } else {
      setResponse(res.answer || "");
    }
  };

  return (
    <div className="p-4">
      <select onChange={(e) => setLanguage(e.target.value)}>
        <option value="python">Python</option>
        <option value="cpp">C++</option>
        <option value="javascript">JavaScript</option>
      </select>

      <textarea
        placeholder="Ask your coding question"
        onChange={(e) => setQuestion(e.target.value)}
      />

      <textarea
        placeholder="Paste code (optional)"
        onChange={(e) => setCode(e.target.value)}
      />

      <button onClick={submitQuery}>Ask Assistant</button>

      <pre>{response}</pre>
    </div>
  );
}
