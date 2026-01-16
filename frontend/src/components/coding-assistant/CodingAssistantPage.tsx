import { useState } from "react";
import Tabs from "./Tabs";
import ProblemList from "./ProblemList";
import CodeEditor from "./CodeEditor";
import TestResults from "./TestResults";

export default function CodingAssistantPage() {
  const [activeTab, setActiveTab] = useState<"problems" | "editor" | "results">("problems");
  const [selectedProblem, setSelectedProblem] = useState<any>(null);
  const [results, setResults] = useState<any>(null);

  return (
    <div className="ml-64 p-8 min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-2">Coding Assistant</h1>
      <p className="text-gray-400 mb-6">
        Practice coding problems like LeetCode & HackerRank
      </p>

      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="mt-6">
        {activeTab === "problems" && (
          <ProblemList
            onSelect={(problem) => {
              setSelectedProblem(problem);
              setActiveTab("editor");
            }}
          />
        )}

        {activeTab === "editor" && (
          <CodeEditor
            problem={selectedProblem}
            onRun={(output) => {
              setResults(output);
              setActiveTab("results");
            }}
          />
        )}

        {activeTab === "results" && <TestResults results={results} />}
      </div>
    </div>
  );
}
