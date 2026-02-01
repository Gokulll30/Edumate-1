import CodeEditor from "./CodeEditor";

export default function ExplainCodeTab() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">
        Explain Code
      </h2>
      <CodeEditor mode="explain" />
    </div>
  );
}
