type Props = {
  mode: "explain" | "debug";
};

export default function CodeEditor({ mode }: Props) {
  return (
    <div className="bg-slate-800 p-4 rounded-lg">
      <textarea
        rows={10}
        className="w-full bg-black text-green-400 p-4 rounded-lg font-mono"
        placeholder={
          mode === "explain"
            ? "Paste your code to explain..."
            : "Paste code to debug..."
        }
      />
      <button className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg text-white">
        {mode === "explain" ? "Explain Code" : "Run Tests"}
      </button>
    </div>
  );
}
