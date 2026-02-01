import CodeEditor from "./CodeEditor";
import TestResults from "./TestResults";

export default function DebugCodeTab() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">
        Debug Code
      </h2>
      <CodeEditor mode="debug" />
      <TestResults />
    </div>
  );
}
