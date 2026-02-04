import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getProblemById, runProblemCode, submitProblemScore } from "../../services/api";
import CodeEditor from "./CodeEditor";
import ResultSummary from "./ResultSummary";
import TestCases from "./TestCases";
import ExamplesSection from "./ExamplesSection";
import OptimizationModal from "./OptimizationModal";

export default function ProblemSolveView({
  problemId,
  onBack,
  onComplete,
}: {
  problemId: string;
  onBack: () => void;
  onComplete?: () => void;
}) {
  const { user } = useAuth();
  const [problem, setProblem] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  // Editor State
  const [language, setLanguage] = useState<"python" | "cpp" | "java" | "javascript">("python");
  const [code, setCode] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  // Optimization Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  useEffect(() => {
    async function loadProblem() {
      try {
        const res = await getProblemById(problemId);
        if (res.success) {
          setProblem(res.problem);
          // Set initial starter code
          setCode(res.problem.starterCode?.["python"] || "");
        }
      } catch (err) {
        console.error("Failed to load problem", err);
      }
    }
    loadProblem();
  }, [problemId]);

  // Handle language change (update starter code if empty or switched)
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang as any);
    // Optional: Reset code to starter code for that language? 
    // For now, let's only reset if valid starter code exists
    if (problem?.starterCode?.[newLang]) {
      setCode(problem.starterCode[newLang]);
    }
  };

  const handleRun = async () => {
    if (!code) return;
    setIsRunning(true);
    setResult(null);

    try {
      const res = await runProblemCode({
        problemId: problem.id,
        code,
        language,
        userId: user?.id ? parseInt(user.id) : undefined
      });

      setResult(res);

      if (res.success && res.result?.passed && res.analysis) {
        const isOptimized = res.analysis.is_optimized || res.analysis.summary?.toLowerCase().includes("optimal");
        const analysisMsg = res.analysis.message || res.analysis.summary;

        if (isOptimized) {
          // Score 10 (or 9 if retrying, but let's stick to 10/9 logic later if needed)
          await handleSubmit(10, true);
        } else {
          // Not optimized -> Show Modal
          setModalMessage(analysisMsg || "You can optimize your code by thinking a bit more.");
          setShowModal(true);
        }
      }
    } catch (err) {
      console.error("Run failed", err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async (score: number, isOptimized: boolean) => {
    if (!user) return;
    await submitProblemScore({
      userId: parseInt(user.id),
      problemId: problem.id,
      score,
      isOptimized,
      language,
      code
    });
    alert(`Submitted! You got ${score} points.`);
    setShowModal(false);
    if (onComplete) {
      onComplete();
    }
  };

  if (!problem) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-purple-400 hover:text-purple-300"
      >
        ← Back to Problems
      </button>

      {/* Problem Info */}
      <div>
        <h2 className="text-xl font-bold text-white">
          {problem.title}
        </h2>
        <p className="text-slate-400 mt-2">
          {problem.description}
        </p>
      </div>

      <ExamplesSection examples={problem.examples} />
      <TestCases testCases={problem.testCases} />

      {/* Code Editor */}
      <div className="relative">
        <CodeEditor
          code={code}
          language={language}
          onChange={setCode}
          onLanguageChange={handleLanguageChange}
        />

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-bold rounded shadow-lg transition-all"
          >
            {isRunning ? "Running..." : "Run Code"}
          </button>
        </div>
      </div>

      {result && <ResultSummary result={result} />}

      <OptimizationModal
        isOpen={showModal}
        message={modalMessage}
        onApply={() => setShowModal(false)}
        onNotNow={() => handleSubmit(5, false)}
      />
    </div>
  );
}
