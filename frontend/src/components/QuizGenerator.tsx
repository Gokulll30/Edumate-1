import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Brain, Clock, CheckCircle, XCircle, BarChart, Trophy } from 'lucide-react';
import {
  uploadFile,
  checkAnswer,
  saveQuizResultWithAnswers,
  SaveQuizResultWithAnswersRequest,
  QuizItem,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

interface Feedback {
  correct: boolean;
  correctIndex: number;
  correctLetter: string;
  explanation: string;
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function QuizGenerator() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [quiz, setQuiz] = useState<QuizItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('mixed');
  const [showAnswer, setShowAnswer] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [quizSaved, setQuizSaved] = useState(false);
  const [preselectedSubject, setPreselectedSubject] = useState<string | null>(null);

  const query = useQuery();
  const subjectFromUrl = query.get('subject');

  // User answers array (index=question number)
  const [userAnswers, setUserAnswers] = useState<Array<number | null>>([]);

  useEffect(() => {
    if (subjectFromUrl) {
      setPreselectedSubject(subjectFromUrl);
      setDifficulty('mixed');
    }
  }, [subjectFromUrl]);

  useEffect(() => {
    setUserAnswers(Array(quiz.length).fill(null));
  }, [quiz.length]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const generateQuiz = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('numq', numQuestions.toString());
      formData.append('difficulty', difficulty);

      const result = await uploadFile(formData);
      if (result.success) {
        setQuiz(result.quiz);
        setCurrentQuestion(0);
        setSelectedAnswer(null);
        setFeedback(null);
        setScore(0);
        setCompleted(false);
        setShowAnswer(false);
        setQuizSaved(false);
        setStartTime(Date.now());
        setPreselectedSubject(null);
        setUserAnswers(Array(result.quiz.length).fill(null));
      } else {
        alert('Error generating quiz: ' + result.error);
      }
    } catch (error) {
      alert('Failed to generate quiz');
    } finally {
      setUploading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (!showAnswer) setSelectedAnswer(answerIndex);
  };

  const submitAnswer = async () => {
    if (selectedAnswer === null) return;
    try {
      const result = await checkAnswer({
        quiz,
        questionIndex: currentQuestion,
        selectedIndex: selectedAnswer,
      });
      if (result.success) {
        setFeedback(result);
        setShowAnswer(true);
        setUserAnswers((prev) => {
          const newAnswers = [...prev];
          newAnswers[currentQuestion] = selectedAnswer;
          return newAnswers;
        });
        if (result.correct) setScore((prev) => prev + 1);
      }
    } catch {
      alert('Failed to check answer');
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < quiz.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(userAnswers[currentQuestion + 1] ?? null);
      setFeedback(null);
      setShowAnswer(false);
    } else {
      setCompleted(true);
      saveQuizScore();
    }
  };

  const saveQuizScore = async () => {
    if (!user?.id || !user?.username || quizSaved) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    // Build QnA array for quiz answers
    const qnas = quiz.map((q, idx) => {
      const userAnswerIndex = userAnswers[idx];
      return {
        question: q.question,
        correct_answer: q.options[q.answerIndex],
        user_answer: userAnswerIndex !== null ? q.options[userAnswerIndex] : '',
        is_correct: userAnswerIndex === q.answerIndex,
        explanation: q.explanation || '',
      };
    });

    // Complete payload matching SaveQuizResultWithAnswersRequest interface
    const payload: SaveQuizResultWithAnswersRequest = {
      user_id: Number(user.id),
      username: user.username,
      score,
      total_questions: quiz.length,
      topic: quiz.length > 0 ? quiz[0].topic : (preselectedSubject || 'General'),
      difficulty,
      time_taken: timeSpent,
      qnas,
    };

    try {
      await saveQuizResultWithAnswers(payload);
      setQuizSaved(true);
    } catch (err) {
      console.error('Failed to save quiz result', err);
    }
  };

  const resetQuiz = () => {
    setFile(null);
    setQuiz([]);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setFeedback(null);
    setScore(0);
    setCompleted(false);
    setShowAnswer(false);
    setQuizSaved(false);
    setPreselectedSubject(null);
    setUserAnswers([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-500';
    if (percentage >= 75) return 'text-blue-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-20">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center mb-8">
          <Brain className="mr-3 h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">AI Quiz Generator</h1>
        </div>

        {preselectedSubject && (
          <p className="text-yellow-400 mb-4">
            Preselected Subject: <strong>{preselectedSubject}</strong>
          </p>
        )}

        <p className="text-gray-400 mb-8">
          Upload study materials and generate personalized quizzes using AI
        </p>

        {!quiz.length && !completed && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {file ? (
                <div className="flex items-center justify-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span className="text-blue-500">{file.name}</span>
                </div>
              ) : (
                <div>
                  <p className="text-lg mb-2">Upload File (PDF or Text)</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Choose File
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Number of Questions</label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Difficulty Level</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </div>
            <button
              onClick={generateQuiz}
              disabled={!file || uploading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating Quiz...</span>
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5" />
                  <span>Generate Quiz</span>
                </>
              )}
            </button>
          </div>
        )}

        {quiz.length > 0 && !completed && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">
                  Question {currentQuestion + 1} of {quiz.length}
                </span>
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Score: {score}/{currentQuestion + (showAnswer ? 1 : 0)}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Clock className="h-4 w-4" />
                <span>Topic: {quiz[currentQuestion].topic}</span>
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-6">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / quiz.length) * 100}%` }}
              ></div>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-medium mb-4">
                {quiz[currentQuestion].question}
              </h2>
              <div className="space-y-3">
                {quiz[currentQuestion].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showAnswer}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedAnswer === index
                        ? showAnswer
                          ? feedback?.correctIndex === index
                            ? 'border-green-500 bg-green-500/20 text-green-300'
                            : 'border-red-500 bg-red-500/20 text-red-300'
                          : 'border-blue-500 bg-blue-500/20'
                        : showAnswer && feedback?.correctIndex === index
                        ? 'border-green-500 bg-green-500/20 text-green-300'
                        : 'border-gray-600 hover:border-gray-500'
                    } ${showAnswer ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className="font-medium mr-3">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                    {showAnswer && feedback?.correctIndex === index && (
                      <CheckCircle className="inline ml-2 h-5 w-5 text-green-500" />
                    )}
                    {showAnswer && selectedAnswer === index && feedback?.correctIndex !== index && (
                      <XCircle className="inline ml-2 h-5 w-5 text-red-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              {!showAnswer ? (
                <button
                  onClick={submitAnswer}
                  disabled={selectedAnswer === null}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {currentQuestion < quiz.length - 1 ? 'Next Question' : 'Finish Quiz'}
                </button>
              )}
            </div>
            {feedback && showAnswer && (
              <div className={`p-4 rounded-lg ${
                feedback.correct ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  {feedback.correct ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {feedback.correct ? '✅ Correct!' : '❌ Incorrect'}
                  </span>
                </div>
                <p className="mb-2">
                  <strong>Answer:</strong> {feedback.correctLetter}
                </p>
                <p className="text-sm opacity-90">{feedback.explanation}</p>
              </div>
            )}
          </div>
        )}

        {completed && (
          <div className="text-center space-y-6">
            <div className="bg-gray-800 p-8 rounded-lg">
              <Trophy className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
              <h2 className="text-2xl font-bold mb-4">Quiz Completed!</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">{score}</div>
                  <div className="text-sm text-gray-400">Correct Answers</div>
                </div>
                <div className={`bg-gray-700 p-4 rounded-lg`}>
                  <div className={`text-2xl font-bold ${getScoreColor((score / quiz.length) * 100)}`}>
                    {Math.round((score / quiz.length) * 100)}%
                  </div>
                  <div className="text-sm text-gray-400">Score</div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-500">
                    {formatTime(Math.floor((Date.now() - startTime) / 1000))}
                  </div>
                  <div className="text-sm text-gray-400">Time Taken</div>
                </div>
              </div>
              <p className="text-gray-400 mb-6">
                You scored {score} out of {quiz.length} questions correctly!
                {quizSaved && <span className="block mt-2 text-green-400">✅ Results saved to your profile</span>}
              </p>
            </div>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={resetQuiz}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Take Another Quiz
              </button>
              <button
                onClick={() => (window.location.href = '/quiz-performance')}
                className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <BarChart className="h-5 w-5" />
                <span>View Performance</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
