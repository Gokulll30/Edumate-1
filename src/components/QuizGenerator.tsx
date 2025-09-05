import React, { useState } from "react";
import Navigation from "./Navigation";
import { uploadNotesForQuiz, checkAnswer, QuizItem } from "../services/api";

export default function QuizGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [numQ, setNumQ] = useState(5);
  const [difficulty, setDifficulty] = useState("mixed");
  const [loading, setLoading] = useState(false);

  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{correct:boolean; text:string; correctLetter?:string} | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const resetState = () => {
    setQuiz([]);
    setCurrent(0);
    setSelected(null);
    setFeedback(null);
    setScore(0);
    setFinished(false);
  };

  const handleGenerate = async () => {
    if (!file) {
      alert("Please choose a PDF or TXT file.");
      return;
    }
    resetState();
    setLoading(true);
    try {
      const data = await uploadNotesForQuiz(file, numQ, difficulty);
      if (!data.success) throw new Error(data.error || "Quiz generation failed");
      setQuiz(data.quiz);
    } catch (err:any) {
      alert(err.message || "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selected == null) return;
    const res = await checkAnswer(quiz, current, selected);
    setFeedback({
      correct: res.correct,
      text: `${res.correct ? "Correct" : "Incorrect"} — ${res.explanation}`,
      correctLetter: res.correct ? undefined : res.correctLetter
    });
    if (res.correct) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (current >= quiz.length - 1) {
      setFinished(true);
      return;
    }
    setCurrent(i => i + 1);
    setSelected(null);
    setFeedback(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 text-white flex">
      <Navigation />
      <main className="flex-1 p-6 md:p-10">
        <h1 className="text-3xl font-bold mb-2">Quiz Generator</h1>
        <p className="text-slate-300 mb-6">Upload study materials and generate personalized quizzes using AI</p>

        {/* Controls */}
        <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="grid gap-4 md:grid-cols-4 items-center">
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={(e)=> setFile(e.target.files?. || null)}
              className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2"
            />
            <select className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2"
                    value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
              <option value="mixed">Mixed</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <select className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2"
                    value={numQ} onChange={e=>setNumQ(parseInt(e.target.value))}>
              {[3,5,8,10].map(n => <option key={n} value={n}>{n} Questions</option>)}
            </select>
            <button onClick={handleGenerate} disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded-lg">
              {loading ? "Generating..." : "Generate Quiz"}
            </button>
          </div>
        </div>

        {/* Score bar */}
        {quiz.length > 0 && (
          <div className="flex justify-between items-center mb-4">
            <div className="text-slate-300">
              Question {current + 1} / {quiz.length} • Topic: {quiz[current].topic} • Difficulty: {quiz[current].difficulty}
            </div>
            <div className="text-slate-200 font-semibold">Score: {score}</div>
          </div>
        )}

        {/* Quiz card */}
        {quiz.length > 0 && !finished && (
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">{quiz[current].question}</h2>
            <div className="space-y-3 mb-4">
              {quiz[current].options.map((opt, idx) => (
                <label key={idx} className={`block p-3 rounded border cursor-pointer ${
                  selected===idx ? "border-indigo-400 bg-indigo-500/10" : "border-slate-700 hover:bg-slate-800"
                }`}>
                  <input type="radio" name="opt" className="mr-3"
                         checked={selected===idx}
                         onChange={()=> setSelected(idx)} />
                  <span>{String.fromCharCode(65+idx)}. {opt}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={handleSubmit}
                      className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg">
                Submit Answer
              </button>
              <button onClick={handleNext}
                      className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg">
                {current >= quiz.length - 1 ? "Finish" : "Next"}
              </button>
            </div>

            {feedback && (
              <div className={`mt-4 p-3 rounded border ${
                feedback.correct ? "border-emerald-600 bg-emerald-900/30" : "border-rose-600 bg-rose-900/30"
              }`}>
                <div>{feedback.text}</div>
                {!feedback.correct && (
                  <div className="mt-1 text-slate-200">
                    Correct option: <strong>{feedback.correctLetter}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {quiz.length > 0 && finished && (
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-6">
            <h3 className="text-2xl font-bold mb-2">Quiz Completed!</h3>
            <p className="text-slate-300 mb-4">You scored {Math.round((score/quiz.length)*100)}%</p>
            <button onClick={()=>resetState()}
                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg">
              Generate New Quiz
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
