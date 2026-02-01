const problems = [
  { id: 1, title: "Two Sum", difficulty: "Easy" },
  { id: 2, title: "Reverse String", difficulty: "Easy" },
  { id: 3, title: "Longest Substring Without Repeating Characters", difficulty: "Medium" },
];

export default function ProblemList() {
  return (
    <div className="space-y-3">
      {problems.map(p => (
        <div
          key={p.id}
          className="flex justify-between items-center p-4 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer"
        >
          <span className="text-white">{p.title}</span>
          <span
            className={`text-sm ${
              p.difficulty === "Easy"
                ? "text-green-400"
                : "text-yellow-400"
            }`}
          >
            {p.difficulty}
          </span>
        </div>
      ))}
    </div>
  );
}
