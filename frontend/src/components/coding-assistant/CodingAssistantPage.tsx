import { useState } from "react";
import Tabs from "./Tabs";
import ProblemsTab from "./ProblemsTab";
import ExplainCodeTab from "./ExplainCodeTab";
import DebugCodeTab from "./DebugCodeTab";

export default function CodingAssistantPage() {
  const [activeTab, setActiveTab] = useState("problems");

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">
        Coding Assistant
      </h1>
      <p className="text-slate-400 mb-6">
        Practice problems, explain code, and debug with test cases.
      </p>

      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="mt-6">
        {activeTab === "problems" && <ProblemsTab />}
        {activeTab === "explain" && <ExplainCodeTab />}
        {activeTab === "debug" && <DebugCodeTab />}
      </div>
    </div>
  );
}
