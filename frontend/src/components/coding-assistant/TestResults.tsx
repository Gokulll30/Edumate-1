export default function TestResults({ result }: { result: any }) {
  if (!result.success) {
    return <p className="text-red-400">{result.error}</p>;
  }

  return (
    <div className="mt-4 space-y-2">
      {result.result.testResults.map((t: any, i: number) => (
        <div
          key={i}
          className={`p-2 rounded ${
            t.passed ? "bg-green-500/20" : "bg-red-500/20"
          }`}
        >
          <p className="text-sm text-white">
            Input: {JSON.stringify(t.input)}
          </p>
          <p className="text-sm text-slate-300">
            Expected: {JSON.stringify(t.expected)}
          </p>
          <p className="text-sm text-slate-300">
            Got: {JSON.stringify(t.actual)}
          </p>
        </div>
      ))}
    </div>
  );
}
