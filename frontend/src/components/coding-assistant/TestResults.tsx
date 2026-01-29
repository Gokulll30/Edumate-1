export default function TestResults({ result }: { result: any }) {
  return (
    <div className="mt-6 bg-slate-800 border border-slate-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">Test Results</h3>

      {result.testResults.map((t: any, i: number) => (
        <div
          key={i}
          className={`p-3 rounded mb-2 ${
            t.passed ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          Test Case {i + 1}: {t.passed ? "Passed" : "Failed"}
        </div>
      ))}
    </div>
  );
}
