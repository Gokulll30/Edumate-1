import React, { useState } from 'react';
import { uploadNotesForQuiz, checkAnswer, QuizItem } from '../services/api';

const QuizGenerator: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [numQ, setNumQ] = useState(5);
  const [difficulty, setDifficulty] = useState('mixed');
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<any>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await uploadNotesForQuiz(file, numQ, difficulty);
      
      if (result.success && result.quiz) {
        setQuiz(result.quiz);
        setCurrent(0);
        setScore(0);
        setCompleted(false);
        setSelectedAnswer(null);
        setFeedback(null);
      } else {
        setError(result.error || 'Failed to generate quiz');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (selectedAnswer === null) return;

    try {
      const result = await checkAnswer(quiz, current, selectedAnswer);
      setFeedback(result);
      
      if (result.correct) {
        setScore(score + 1);
      }
    } catch (err) {
      console.error('Error checking answer:', err);
    }
  };

  const handleNext = () => {
    if (current < quiz.length - 1) {
      setCurrent(current + 1);
      setSelectedAnswer(null);
      setFeedback(null);
    } else {
      setCompleted(true);
    }
  };

  const handleRestart = () => {
    setQuiz([]);
    setCurrent(0);
    setScore(0);
    setCompleted(false);
    setSelectedAnswer(null);
    setFeedback(null);
    setFile(null);
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-900 text-white pt-20">
        <div className="max-w-2xl mx-auto p-6 text-center">
          <div className="bg-gray-800 rounded-2xl p-12 border border-gray-700 shadow-2xl">
            <div className="text-7xl mb-6">🎉</div>
            <h2 className="text-4xl font-bold mb-6 text-white">Quiz Completed!</h2>
            <div className="text-6xl font-bold mb-6 text-blue-400">
              {Math.round((score / quiz.length) * 100)}%
            </div>
            <p className="text-xl mb-8 text-gray-300">
              You scored <span className="text-blue-400 font-bold">{score}</span> out of <span className="text-blue-400 font-bold">{quiz.length}</span> questions correct
            </p>
            <button
              onClick={handleRestart}
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg"
            >
              Generate New Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (quiz.length > 0) {
    const question = quiz[current];
    
    return (
      <div className="min-h-screen bg-gray-900 text-white pt-20">
        <div className="max-w-4xl mx-auto p-6">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-medium text-gray-300">
                Question {current + 1} of {quiz.length}
              </span>
              <span className="text-lg font-medium text-gray-300">
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

          {/* Question Card */}
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl mb-6">
            <h2 className="text-2xl font-semibold mb-8 text-white leading-relaxed">
              {question.question}
            </h2>

            <div className="space-y-4 mb-8">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAnswer(index)}
                  disabled={feedback !== null}
                  className={`w-full p-5 text-left border-2 rounded-xl transition-all duration-300 text-lg ${
                    selectedAnswer === index
                      ? feedback
                        ? feedback.correct && index === feedback.correctIndex
                          ? 'bg-green-900/50 border-green-400 text-green-100 shadow-lg'
                          : index === selectedAnswer && !feedback.correct
                          ? 'bg-red-900/50 border-red-400 text-red-100 shadow-lg'
                          : feedback.correctIndex === index
                          ? 'bg-green-900/50 border-green-400 text-green-100 shadow-lg'
                          : 'bg-gray-700 border-gray-600 text-gray-300'
                        : 'bg-blue-900/50 border-blue-400 text-blue-100 shadow-lg'
                      : feedback && feedback.correctIndex === index
                      ? 'bg-green-900/50 border-green-400 text-green-100 shadow-lg'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500 hover:shadow-md'
                  } ${feedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="font-bold mr-4 text-blue-400">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option}
                </button>
              ))}
            </div>

            {feedback && (
              <div className={`p-6 rounded-xl mb-6 border-2 ${
                feedback.correct 
                  ? 'bg-green-900/30 border-green-500' 
                  : 'bg-red-900/30 border-red-500'
              }`}>
                <p className="font-bold mb-3 text-xl">
                  {feedback.correct ? '✅ Correct!' : '❌ Incorrect'}
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
                  onClick={handleAnswerSubmit}
                  disabled={selectedAnswer === null}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg"
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg"
                >
                  {current < quiz.length - 1 ? 'Next Question' : 'Finish Quiz'}
                </button>
              )}
              
              <div className="text-lg text-gray-400">
                Topic: <span className="text-blue-400">{question.topic}</span> • <span className="text-blue-400">{question.difficulty}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-20">
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-gray-800 rounded-2xl p-10 border border-gray-700 shadow-2xl">
          <h1 className="text-4xl font-bold mb-4 text-white">Quiz Generator</h1>
          <p className="text-xl text-gray-400 mb-10">
            Upload study materials and generate personalized quizzes using AI
          </p>

          <form onSubmit={handleGenerate} className="space-y-8">
            <div>
              <label className="block text-lg font-semibold mb-4 text-gray-300">
                Upload File (PDF or Text)
              </label>
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full p-4 bg-gray-700 border-2 border-gray-600 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-colors text-lg"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-semibold mb-4 text-gray-300">
                  Number of Questions
                </label>
                <select
                  value={numQ}
                  onChange={(e) => setNumQ(Number(e.target.value))}
                  className="w-full p-4 bg-gray-700 border-2 border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                >
                  <option value={3}>3 questions</option>
                  <option value={5}>5 questions</option>
                  <option value={10}>10 questions</option>
                  <option value={15}>15 questions</option>
                </select>
              </div>

              <div>
                <label className="block text-lg font-semibold mb-4 text-gray-300">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full p-4 bg-gray-700 border-2 border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !file}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 px-6 rounded-xl font-bold text-xl transition-all hover:scale-105 shadow-lg"
            >
              {loading ? 'Generating Quiz...' : 'Generate Quiz'}
            </button>
          </form>

          {error && (
            <div className="mt-8 p-6 bg-red-900/30 border-2 border-red-500 text-red-100 rounded-xl text-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizGenerator;
