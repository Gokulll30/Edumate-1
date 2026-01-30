export default function TestCases({
  testCases,
}: {
  testCases: any[];
}) {
  if (!testCases || testCases.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-white mb-3">
        Test Cases
      </h3>

      <div className="space-y-4">
        {testCases.map((tc, index) => (
          <div
            key={index}
            className="bg-slate-900 border border-slate-700 rounded-lg p-4"
          >
            <p className="text-sm text-slate-400 mb-2">
              Case {index + 1}
            </p>

            <pre className="text-sm text-slate-200 overflow-x-auto">
{JSON.stringify(tc.input, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
