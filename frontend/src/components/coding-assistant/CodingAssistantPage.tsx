import { useState } from "react";
import Tabs from "./Tabs";
import ProblemsTab from "./ProblemsTab";
import CodeEditor from "./CodeEditor";
import TestResults from "./TestResults";
import ExplainCodeTab from "./ExplainCodeTab";
import DebugCodeTab from "./DebugCodeTab";

export default function CodingAssistantPage() {
  const [activeTab, setActiveTab] = useState("problems");
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<any>(null);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Coding Assistant</h1>

      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="mt-6">
        {activeTab === "problems" && (
          <>
            {!selectedProblemId && (
              <ProblemsTab onSelect={(id) => setSelectedProblemId(id)} />
            )}

            {selectedProblemId && (
              <>
                <CodeEditor
                  problemId={selectedProblemId}
                  onRunComplete={setRunResult}
                />
                {runResult && <TestResults result={runResult} />}
              </>
            )}
          </>
        )}

        {activeTab === "explain" && <ExplainCodeTab />}
        {activeTab === "debug" && <DebugCodeTab />}
      </div>
    </div>
  );
}
