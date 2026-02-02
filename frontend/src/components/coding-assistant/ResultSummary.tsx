type TestResult = {
  input: any;
  expected: any;
  actual: any;
  passed: boolean;
  error?: string;
};

type ExecutionResult = {
  passed: boolean;
  testResults: TestResult[];
};

type GeminiAnalysis = {
  summary: string;
  errors?: string[];
  hint?: string;
};

type RunCodeResponse = {
  success: boolean;
  result?: ExecutionResult;
  analysis?: GeminiAnalysis;
  error?: string;
};

export default function ResultSummary({ result }: { result: RunCodeResponse }) {
  if (!result) return null;

  // ----------------------------
  // HARD FAILURE (syntax/runtime before tests)
  // ----------------------------
  if (!result.success) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
        <h3 className="text-red-400 font-semibold mb-2">
          ❌ Execution Error
        </h3>
        <pre className="text-sm text-red-300 whitespace-pre-wrap">
          {result.error || "An unknown execution error occurred."}
        </pre>
      </div>
    );
  }

  const passedAll = result.result?.passed;
  const testResults = result.result?.testResults || [];
  const analysis = result.analysis;

  return (
    <div className="space-y-6">
      {/* =========================
          OVERALL VERDICT
         ========================= */}
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
          {passedAll ? "✅ Accepted" : "❌ Some Test Cases Failed"}
        </h3>
      </div>

      {/* =========================
          GEMINI ANALYSIS
         ========================= */}
      {analysis && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
          <h4 className="text-purple-400 font-semibold">
            🤖 AI Feedback
          </h4>

          {/* Summary */}
          <p className="text-slate-300 text-sm">
            {analysis.summary}
          </p>

          {/* Errors */}
          {analysis.errors && analysis.errors.length > 0 && (
            <div>
              <p className="text-red-400 font-semibold text-sm mb-1">
                Issues Detected:
              </p>
              <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                {analysis.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Hint */}
          {analysis.hint && (
            <div className="bg-slate-800 border border-slate-600 rounded p-3 text-sm">
              <span className="text-yellow-400 font-semibold">
                💡 Hint:
              </span>{" "}
              <span className="text-slate-200">
                {analysis.hint}
              </span>
            </div>
          )}
        </div>
      )}

      {/* =========================
          TEST CASE RESULTS
         ========================= */}
      <div className="space-y-3">
        {testResults.map((tc, idx) => (
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
                <span className="text-white">
                  {JSON.stringify(tc.input)}
                </span>
              </p>

              <p>
                <span className="text-slate-400">Expected:</span>{" "}
                <span className="text-green-300">
                  {JSON.stringify(tc.expected)}
                </span>
              </p>

              {!tc.passed && (
                <>
                  <p>
                    <span className="text-slate-400">Your Output:</span>{" "}
                    <span className="text-red-300">
                      {JSON.stringify(tc.actual)}
                    </span>
                  </p>

                  {tc.error && (
                    <p className="mt-2 text-red-400 text-xs whitespace-pre-wrap">
                      ⚠️ Error: {tc.error}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
