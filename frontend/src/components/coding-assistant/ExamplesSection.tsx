export default function ExamplesSection({
  examples,
}: {
  examples?: {
    input: string;
    output: string;
    explanation?: string;
  }[];
}) {
  if (!examples || examples.length === 0) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
      <h3 className="text-xl font-semibold text-white">
        Examples
      </h3>

      {examples.map((ex, idx) => (
        <div
          key={idx}
          className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-2"
        >
          <p className="text-white font-medium">
            Example {idx + 1}
          </p>

          <p className="text-sm">
            <span className="text-slate-400">Input:</span>{" "}
            <span className="text-white">{ex.input}</span>
          </p>

          <p className="text-sm">
            <span className="text-slate-400">Output:</span>{" "}
            <span className="text-green-400">{ex.output}</span>
          </p>

          {ex.explanation && (
            <p className="text-sm text-slate-300">
              <span className="text-slate-400">Explanation:</span>{" "}
              {ex.explanation}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
