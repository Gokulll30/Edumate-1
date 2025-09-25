import React, { useState, useEffect } from "react";
import Navigation from "./Navigation";
import { uploadNotesForQuiz, checkAnswer, QuizItem } from "../services/api";
import { useAuth } from "../context/AuthContext";

const QuizGenerator: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [file, setFile] = useState<File | null>(null);
  const [numQ, setNumQ] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>("mixed");
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [current, setCurrent] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<any>(null);
  const [score, setScore] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!file) {
      setQuiz([]);
      setCurrent(0);
      setSelectedAnswer(null);
      setFeedback(null);
      setScore(0);
      setCompleted(false);
      setError("");
    }
  }, [file]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await uploadNotesForQuiz(file, numQ, difficulty);
      if (result?.success && result.quiz) {
        const quizData = result.quiz.map((item: any) => ({
          ...item,
          topic: item.topic || "",
          difficulty: item.difficulty || difficulty,
          userSelected: null,
        }));
        setQuiz(quizData);
        setCurrent(0);
        setSelectedAnswer(null);
        setFeedback(null);
        setScore(0);
        setCompleted(false);
      } else {
        setError(result?.error || "Failed to generate quiz");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (idx: number) => {
    if (feedback) return;
    setSelectedAnswer(idx);
  };

  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null) return;
    const currentQuestion = quiz[current];
    try {
      const result = await checkAnswer(quiz, current, selectedAnswer);
      const updatedQuiz = [...quiz];
      updatedQuiz[current] = {
        ...currentQuestion,
        userSelected: selectedAnswer,
      };
      setQuiz(updatedQuiz);
      setFeedback(result);
      if (result.correct) setScore((prev) => prev + 1);
    } catch (err) {
      console.error("Error checking answer:", err);
    }
  };

  const saveQuizResults = async () => {
    if (!userId) return;
    const answersPayload = quiz.map((q) => ({
      question: q.question,
      correct_answer: q.options[q.answerIndex],
      user_answer: q.userSelected !== null ? q.options[q.userSelected] : "",
      is_correct: q.userSelected === q.answerIndex,
      explanation: q.explanation || "",
    }));

    try {
      const res = await fetch(`/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          subject: quiz[0]?.topic || "",
          difficulty,
          num_questions: quiz.length,
          score,
          answers: answersPayload,
        }),
      });

      if (!res.ok) {
        const errMsg = await res.text();
        console.error("Failed to save quiz results:", errMsg);
        return;
      }
      const data = await res.json();
      if (!data.success) {
        console.error("Error from server on saving quiz results:", data.error);
      } else {
        console.log("Quiz results saved successfully.");
      }
    } catch (err) {
      console.error("Error saving quiz results:", err);
    }
  };

  const handleNext = () => {
    if (current < quiz.length - 1) {
      setCurrent((prev) => prev + 1);
      setSelectedAnswer(null);
      setFeedback(null);
    } else {
      saveQuizResults();
      setCompleted(true);
    }
  };

  const handleRestart = () => {
    setQuiz([]);
    setCurrent(0);
    setSelectedAnswer(null);
    setFeedback(null);
    setScore(0);
    setCompleted(false);
    setFile(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      <div className="flex flex-col items-center justify-start mt-8">
        <div className="w-full max-w-2xl bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-8 mx-auto">
          <h1 className="text-4xl font-bold mb-2 text-white">Quiz Generator</h1>
          <p className="mb-8 text-slate-300 text-lg">
            Upload study materials and generate personalized quizzes using AI
          </p>
          {!quiz.length && !completed && (
            <form onSubmit={handleGenerate}>
              <div className="mb-7">
                <label className="block text-lg font-medium mb-2">Upload File (PDF or Text)</label>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  className="block w-full rounded-lg border border-slate-600 px-4 py-3 bg-slate-700 text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-7">
                <div>
                  <label className="block mb-2 text-lg font-medium">Number of Questions</label>
                  <select
                    value={numQ}
                    onChange={(e) => setNumQ(Number(e.target.value))}
                    className="w-full rounded-lg px-4 py-3 bg-slate-700 border border-slate-600 text-white"
                  >
                    {[3, 5, 10, 15].map((v) => (
                      <option key={v} value={v}>{v} questions</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-2 text-lg font-medium">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full rounded-lg px-4 py-3 bg-slate-700 border border-slate-600 text-white"
                  >
                    {["easy", "medium", "hard", "mixed"].map((v) => (
                      <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !file}
                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold text-xl shadow-md"
              >
                {loading ? "Generating Quiz..." : "Generate Quiz"}
              </button>
              {error && (
                <div className="mt-6 p-4 bg-red-900 border-2 border-red-500 rounded-xl text-base text-red-100">{error}</div>
              )}
            </form>
          )}
          {quiz.length > 0 && !completed && (
            <div>
              <div className="mb-8">
                <div className="flex justify-between mb-3">
                  <span className="text-lg font-medium text-slate-300">
                    Question {current + 1} of {quiz.length}
                  </span>
                  <span className="text-lg font-medium text-slate-300">
                    Score: <span className="text-blue-400">{score}</span>/{quiz.length}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 shadow-lg"
                    style={{ width: `${((current + 1) / quiz.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700 shadow-2xl mb-6">
                <h2 className="text-2xl font-bold mb-8 text-white leading-relaxed">{quiz[current].question}</h2>
                <div className="space-y-4 mb-8">
                  {quiz[current].options.map((option, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAnswerSelect(idx)}
                      disabled={!!feedback}
                      className={`w-full p-5 text-left border-2 rounded-xl transition-all duration-300 text-lg ${
                        selectedAnswer === idx
                          ? feedback
                            ? feedback.correct && idx === feedback.correctIndex
                              ? "bg-green-900/50 border-green-400 text-green-100 shadow-lg"
                              : idx === selectedAnswer && !feedback.correct
                              ? "bg-red-900/50 border-red-400 text-red-100 shadow-lg"
                              : feedback.correctIndex === idx
                              ? "bg-green-900/50 border-green-400 text-green-100 shadow-lg"
                              : "bg-gray-700 border-gray-600 text-gray-300"
                            : "bg-blue-900/50 border-blue-400 text-blue-100 shadow-lg"
                          : feedback && feedback.correctIndex === idx
                          ? "bg-green-900/50 border-green-400 text-green-100 shadow-lg"
                          : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500 hover:shadow-md"
                      } ${feedback ? "cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span className="font-bold mr-4 text-blue-400">{String.fromCharCode(65 + idx)}.</span>
                      {option}
                    </button>
                  ))}
                </div>
                {feedback && (
                  <div className={`p-6 rounded-xl mb-6 border-2 ${
                    feedback.correct
                      ? "bg-green-900/30 border-green-500"
                      : "bg-red-900/30 border-red-500"
                  }`}>
                    <p className="font-bold mb-3 text-xl">
                      {feedback.correct ? "✅ Correct!" : "❌ Incorrect"}
                    </p>
                    <p className="mb-2 text-lg">
                      <strong>Answer:</strong> <span className="text-blue-400">{feedback.correctLetter}</span>
                    </p>
                    <p className="text-gray-200">{feedback.explanation}</p>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  {!feedback ? (
                    <button
                      type="button"
                      onClick={handleSubmitAnswer}
                      disabled={selectedAnswer === null}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg"
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg"
                    >
                      {current < quiz.length - 1 ? "Next Question" : "Finish Quiz"}
                    </button>
                  )}
                  <div className="text-lg text-gray-400">
                    Topic: <span className="text-blue-400">{quiz[current].topic}</span> • <span className="text-blue-400">{quiz[current].difficulty}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {completed && (
            <div className="pt-5 text-center">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg"
                onClick={handleRestart}
              >
                Generate New Quiz
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizGenerator;
