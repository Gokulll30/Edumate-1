const problems = [
  { id: 1, title: "Two Sum", difficulty: "Easy" },
  { id: 2, title: "Reverse String", difficulty: "Easy" },
  { id: 3, title: "Longest Substring", difficulty: "Medium" },
];

export default function ProblemList({ onSelect }: any) {
  return (
    <div className="grid gap-4">
      {problems.map((p) => (
        <div
          key={p.id}
          onClick={() => onSelect(p)}
          className="cursor-pointer bg-gray-800 p-4 rounded-lg hover:bg-gray-700"
        >
          <div className="flex justify-between">
            <h3 className="font-semibold">{p.title}</h3>
            <span
              className={`text-sm ${
                p.difficulty === "Easy"
                  ? "text-green-400"
                  : p.difficulty === "Medium"
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {p.difficulty}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
