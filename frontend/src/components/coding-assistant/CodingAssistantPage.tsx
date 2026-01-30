import { useState } from "react";
import Tabs from "./Tabs";
import ProblemsTab from "./ProblemsTab";
import ProblemDetails from "./ProblemDetails";

export default function CodingAssistantPage() {
  const [activeTab, setActiveTab] = useState("problems");
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);

  return (
    <div className="ml-64 p-6 max-w-6xl">
      <h1 className="text-3xl font-bold text-white mb-4">
        Coding Assistant
      </h1>

      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="mt-6">
        {activeTab === "problems" && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1">
              <ProblemsTab onSelect={setSelectedProblemId} />
            </div>

            <div className="col-span-2">
              {selectedProblemId ? (
                <ProblemDetails problemId={selectedProblemId} />
              ) : (
                <p className="text-slate-400">
                  Select a problem to start coding
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
