import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Brain, Clock, CheckCircle, XCircle, BarChart, Trophy } from 'lucide-react';
import { uploadFile, checkAnswer, saveQuizResult } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Question {
  question: string;
  options: string[];
  answerIndex: number;
  answerLetter: string;
  explanation: string;
  difficulty: string;
  topic: string;
}

interface Feedback {
  correct: boolean;
  correctIndex: number;
  correctLetter: string;
  explanation: string;
}

export default function QuizGenerator() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [quiz, setQuiz] = useState<Question[]>([]);
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt']
    },
    multiple: false
  });

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
        setStartTime(Date.now()); // Start timer
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
    setSelectedAnswer(answerIndex);
  };

  const submitAnswer = async () => {
    if (selectedAnswer === null) return;

    try {
      const result = await checkAnswer({
        quiz,
        questionIndex: currentQuestion,
        selectedIndex: selectedAnswer
      });

      if (result.success) {
        setFeedback(result);
        setShowAnswer(true);
        if (result.correct) {
          setScore(score + 1);
        }
      }
    } catch (error) {
      alert('Failed to check answer');
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < quiz.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setFeedback(null);
      setShowAnswer(false);
    } else {
      setCompleted(true);
      saveQuizScore();
    }
  };

  const saveQuizScore = async () => {
    if (!user?.username || quizSaved) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const currentTopic = quiz.length > 0 ? quiz[0].topic : 'General';

    try {
      await saveQuizResult({
        username: user.username,
        score: score + (feedback?.correct ? 1 : 0), // Include current question if correct
        total_questions: quiz.length,
        topic: currentTopic,
        difficulty: difficulty,
        time_taken: timeSpent
      });
      setQuizSaved(true);
    } catch (error) {
      console.error('Failed to save quiz result:', error);
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
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
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
        
        <p className="text-gray-400 mb-8">
          Upload study materials and generate personalized quizzes using AI
        </p>

        {!quiz.length && !completed && (
          <div className="space-y-6">
            {/* File Upload */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-600 hover:border-blue-500'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {file ? (
                <div className="flex items-center justify-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span className="text-blue-500">{file.name}</span>
                </div>
              ) : (
                <div>
                  <p className="text-lg mb-2">
                    {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
                  </p>
                  <p className="text-gray-500">or click to select a PDF or TXT file</p>
                </div>
              )}
            </div>

            {/* Quiz Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Number of Questions
                </label>
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
                <label className="block text-sm font-medium mb-2">
                  Difficulty Level
                </label>
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
            {/* Progress Bar */}
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

            {/* Question */}
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

            {/* Action Buttons */}
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

            {/* Feedback */}
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
                    {feedback.correct ? "✅ Correct!" : "❌ Incorrect"}
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

        {/* Quiz Completion */}
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
                <div className="bg-gray-700 p-4 rounded-lg">
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
                onClick={() => window.location.href = '/quiz-performance'}
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
