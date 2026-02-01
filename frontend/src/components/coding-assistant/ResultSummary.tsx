export default function ResultSummary({ result }: { result: any }) {
  if (!result) return null;

  // Handle execution-level failure
  if (!result.success) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
        <h3 className="text-red-400 font-semibold mb-2">
          ❌ Execution Error
        </h3>
        <pre className="text-sm text-red-300 whitespace-pre-wrap">
          {result.error || "Unknown error occurred"}
        </pre>
      </div>
    );
  }

  const passedAll = result.result?.passed;
  const testResults = result.result?.testResults || [];

  return (
    <div className="space-y-4">
      {/* Overall Verdict */}
      <div
        className={`p-4 rounded-lg border ${
          passedAll
            ? "bg-green-900/30 border-green-700"
            : "bg-red-900/30 border-red-700"
        }`}
      >
        <h3
          className={`text-lg font-bold ${
            passedAll ? "text-green-400" : "text-red-400"
          }`}
        >
          {passedAll ? "✅ Accepted" : "❌ Wrong Answer"}
        </h3>
      </div>

      {/* Individual Test Cases */}
      <div className="space-y-3">
        {testResults.map((tc: any, idx: number) => (
          <div
            key={idx}
            className="bg-slate-800 border border-slate-700 rounded-lg p-4"
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-white">
                Test Case {idx + 1}
              </h4>
              <span
                className={`text-sm font-semibold ${
                  tc.passed ? "text-green-400" : "text-red-400"
                }`}
              >
                {tc.passed ? "PASS" : "FAIL"}
              </span>
            </div>

            <div className="text-sm space-y-1">
              <p>
                <span className="text-slate-400">Input:</span>{" "}
                <span className="text-white">{JSON.stringify(tc.input)}</span>
              </p>
              <p>
                <span className="text-slate-400">Expected:</span>{" "}
                <span className="text-green-300">
                  {JSON.stringify(tc.expected)}
                </span>
              </p>
              {!tc.passed && (
                <p>
                  <span className="text-slate-400">Your Output:</span>{" "}
                  <span className="text-red-300">
                    {JSON.stringify(tc.actual)}
                  </span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
