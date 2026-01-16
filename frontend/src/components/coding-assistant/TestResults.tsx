export default function TestResults({ results }: any) {
  if (!results) return null;

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-xl font-semibold mb-4">Test Results</h3>

      <p className="mb-2">
        Passed {results.passed} / {results.total}
      </p>

      <ul className="space-y-1">
        {results.details.map((d: string, i: number) => (
          <li key={i} className="text-sm">
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}
