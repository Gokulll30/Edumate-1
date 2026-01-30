import { useState } from "react";
import Tabs from "./Tabs";
import ProblemsTab from "./ProblemsTab";
import ExplainCodeTab from "./ExplainCodeTab";
import DebugCodeTab from "./DebugCodeTab";
import ProblemSolveView from "./ProblemSolveView";

export default function CodingAssistantPage() {
  const [activeTab, setActiveTab] = useState("problems");
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-6">
      <h1 className="text-3xl font-bold text-white mb-2">
        Coding Assistant
      </h1>
      <p className="text-slate-400 mb-6">
        Practice problems, explain code, and debug with test cases.
      </p>

      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="mt-6">
        {activeTab === "problems" && !selectedProblemId && (
          <ProblemsTab onSelect={setSelectedProblemId} />
        )}

        {activeTab === "problems" && selectedProblemId && (
          <ProblemSolveView
            problemId={selectedProblemId}
            onBack={() => setSelectedProblemId(null)}
          />
        )}

        {activeTab === "explain" && <ExplainCodeTab />}
        {activeTab === "debug" && <DebugCodeTab />}
      </div>
    </div>
  );
}
