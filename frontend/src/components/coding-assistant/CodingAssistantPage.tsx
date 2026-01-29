import { useState } from "react";
import Tabs from "./Tabs";
import ProblemsTab from "./ProblemsTab";
import ExplainCodeTab from "./ExplainCodeTab";
import DebugCodeTab from "./DebugCodeTab";

export default function CodingAssistantPage() {
  const [activeTab, setActiveTab] = useState("problems");
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);

  return (
    // ✅ THIS IS THE FIX — PUSH CONTENT RIGHT OF SIDEBAR
    <div className="ml-64 p-8 min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">
          Coding Assistant
        </h1>

        <p className="text-slate-400 mb-6">
          Practice problems, explain code, and debug with test cases.
        </p>

        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="mt-6">
          {activeTab === "problems" && (
            <ProblemsTab
              onSelect={(id) => {
                console.log("Selected problem:", id);
                setSelectedProblemId(id);
              }}
            />
          )}

          {activeTab === "explain" && <ExplainCodeTab />}
          {activeTab === "debug" && <DebugCodeTab />}
        </div>

        {/* TEMP DEBUG (remove later) */}
        {selectedProblemId && (
          <div className="mt-6 p-4 bg-slate-800 border border-slate-700 rounded-lg">
            <p className="text-green-400">
              ✅ Selected Problem ID: {selectedProblemId}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
