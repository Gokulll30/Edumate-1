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
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Quiz Completed!</h2>
        <p className="text-xl mb-6">
          You scored {Math.round((score / quiz.length) * 100)}%
        </p>
        <p className="text-lg mb-8">
          {score} out of {quiz.length} questions correct
        </p>
        <button
          onClick={handleRestart}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
        >
          Generate New Quiz
        </button>
      </div>
    );
  }

  if (quiz.length > 0) {
    const question = quiz[current];
    
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-4">
          <span className="text-sm text-gray-500">
            Question {current + 1} of {quiz.length}
          </span>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${((current + 1) / quiz.length) * 100}%` }}
            />
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-6">{question.question}</h2>

        <div className="space-y-3 mb-6">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => setSelectedAnswer(index)}
              disabled={feedback !== null}
              className={`w-full p-3 text-left border rounded-lg transition-colors ${
                selectedAnswer === index
                  ? feedback
                    ? feedback.correct && index === feedback.correctIndex
                      ? 'bg-green-100 border-green-500'
                      : index === selectedAnswer && !feedback.correct
                      ? 'bg-red-100 border-red-500'
                      : feedback.correctIndex === index
                      ? 'bg-green-100 border-green-500'
                      : 'bg-gray-100 border-gray-300'
                    : 'bg-blue-100 border-blue-500'
                  : feedback && feedback.correctIndex === index
                  ? 'bg-green-100 border-green-500'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="font-medium mr-2">
                {String.fromCharCode(65 + index)}.
              </span>
              {option}
            </button>
          ))}
        </div>

        {feedback && (
          <div className={`p-4 rounded-lg mb-6 ${
            feedback.correct ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <p className="font-semibold">
              {feedback.correct ? '✅ Correct!' : '❌ Incorrect'}
            </p>
            <p className="mt-2">
              <strong>Answer:</strong> {feedback.correctLetter}
            </p>
            <p className="mt-1">{feedback.explanation}</p>
          </div>
        )}

        <div className="flex justify-between">
          {!feedback ? (
            <button
              onClick={handleAnswerSubmit}
              disabled={selectedAnswer === null}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              {current < quiz.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Quiz Generator</h1>
      <p className="text-gray-600 mb-6">
        Upload study materials and generate personalized quizzes using AI
      </p>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Upload File (PDF or Text)
          </label>
          <input
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Number of Questions
          </label>
          <select
            value={numQ}
            onChange={(e) => setNumQ(Number(e.target.value))}
            className="w-full p-2 border rounded"
          >
            <option value={3}>3 questions</option>
            <option value={5}>5 questions</option>
            <option value={10}>10 questions</option>
            <option value={15}>15 questions</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          {loading ? 'Generating Quiz...' : 'Generate Quiz'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default QuizGenerator;
