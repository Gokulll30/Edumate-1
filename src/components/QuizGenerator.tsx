import React, { useState } from 'react';
import Navigation from './Navigation';
import { Upload, FileText, Target, Brain, Clock, Check, X, RotateCcw, Download } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  userAnswer?: number;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  createdAt: string;
  score?: number;
  completed: boolean;
}

export default function QuizGenerator() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizHistory, setQuizHistory] = useState<Quiz[]>([
  ]);

  const sampleQuestions: Question[] = [
    {
      id: '1',
      question: 'What is the time complexity of binary search in a sorted array?',
      options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
      correctAnswer: 1,
      explanation: 'Binary search has O(log n) time complexity because it eliminates half of the remaining elements in each step.'
    },
    {
      id: '2',
      question: 'Which data structure follows the Last In First Out (LIFO) principle?',
      options: ['Queue', 'Stack', 'Array', 'Linked List'],
      correctAnswer: 1,
      explanation: 'A stack follows LIFO principle where the last element added is the first one to be removed.'
    },
    {
      id: '3',
      question: 'What is the worst-case time complexity of quicksort?',
      options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
      correctAnswer: 2,
      explanation: 'Quicksort has O(n²) worst-case complexity when the pivot is always the smallest or largest element.'
    },
    {
      id: '4',
      question: 'Which of the following is NOT a type of tree traversal?',
      options: ['Inorder', 'Preorder', 'Postorder', 'Sideorder'],
      correctAnswer: 3,
      explanation: 'Sideorder is not a valid tree traversal method. The three main types are inorder, preorder, and postorder.'
    },
    {
      id: '5',
      question: 'What is the space complexity of merge sort?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      correctAnswer: 2,
      explanation: 'Merge sort requires O(n) additional space for the temporary arrays used during the merging process.'
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const generateQuiz = async () => {
    if (!selectedFile) return;

    setIsGenerating(true);
    
    // Simulate quiz generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const newQuiz: Quiz = {
      id: Date.now().toString(),
      title: selectedFile.name.replace(/\.[^/.]+$/, ''),
      questions: sampleQuestions,
      createdAt: new Date().toISOString().split('T')[0],
      completed: false
    };

    setActiveQuiz(newQuiz);
    setCurrentQuestionIndex(0);
    setIsGenerating(false);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (!activeQuiz) return;

    const updatedQuestions = activeQuiz.questions.map((q, index) => 
      index === currentQuestionIndex 
        ? { ...q, userAnswer: answerIndex }
        : q
    );

    setActiveQuiz({
      ...activeQuiz,
      questions: updatedQuestions
    });
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < activeQuiz!.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const finishQuiz = () => {
    if (!activeQuiz) return;

    const score = Math.round(
      (activeQuiz.questions.filter(q => q.userAnswer === q.correctAnswer).length / 
       activeQuiz.questions.length) * 100
    );

    const completedQuiz = {
      ...activeQuiz,
      score,
      completed: true
    };

    setQuizHistory([completedQuiz, ...quizHistory]);
    setActiveQuiz(completedQuiz);
  };

  const resetQuiz = () => {
    setActiveQuiz(null);
    setSelectedFile(null);
    setCurrentQuestionIndex(0);
  };

  const currentQuestion = activeQuiz?.questions[currentQuestionIndex];
  const allQuestionsAnswered = activeQuiz?.questions.every(q => q.userAnswer !== undefined);

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Quiz Generator</h1>
          <p className="text-slate-400">
            Upload study materials and generate personalized quizzes using AI
          </p>
        </div>

        {!activeQuiz ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
              <h3 className="text-2xl font-semibold text-white mb-6">Create New Quiz</h3>
              
              <div className="mb-6">
                <label className="block text-slate-300 text-sm font-medium mb-3">
                  Upload Study Material
                </label>
                <div className="border-2 border-dashed border-slate-600 hover:border-purple-500 transition-colors rounded-xl p-8 text-center cursor-pointer">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {selectedFile ? (
                      <div className="space-y-3">
                        <FileText className="w-12 h-12 text-purple-400 mx-auto" />
                        <div>
                          <p className="text-white font-medium">{selectedFile.name}</p>
                          <p className="text-slate-400 text-sm">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                        <div>
                          <p className="text-white font-medium">Drop your files here</p>
                          <p className="text-slate-400 text-sm">
                            Supports PDF, DOC, DOCX, TXT files
                          </p>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Quiz Difficulty
                  </label>
                  <select className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-purple-500">
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Number of Questions
                  </label>
                  <select className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-purple-500">
                    <option>5 Questions</option>
                    <option>10 Questions</option>
                    <option>15 Questions</option>
                    <option>20 Questions</option>
                  </select>
                </div>
              </div>

              <button
                onClick={generateQuiz}
                disabled={!selectedFile || isGenerating}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Generating Quiz...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    <span>Generate Quiz</span>
                  </>
                )}
              </button>
            </div>

            {/* Quiz History */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-semibold text-white mb-6">Recent Quizzes</h3>
              <div className="space-y-4">
                {quizHistory.map((quiz) => (
                  <div key={quiz.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/50 hover:border-purple-500/30 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">{quiz.title}</h4>
                        <p className="text-slate-400 text-sm">
                          {new Date(quiz.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {quiz.completed && quiz.score && (
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          quiz.score >= 90 
                            ? 'bg-green-500/20 text-green-400' 
                            : quiz.score >= 70 
                            ? 'bg-yellow-500/20 text-yellow-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {quiz.score}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Active Quiz Interface
          <div className="max-w-4xl mx-auto">
            {activeQuiz.completed ? (
              // Quiz Results
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50 text-center">
                <div className="mb-6">
                  <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                    activeQuiz.score! >= 90 
                      ? 'bg-green-500' 
                      : activeQuiz.score! >= 70 
                      ? 'bg-yellow-500' 
                      : 'bg-red-500'
                  }`}>
                    <span className="text-3xl font-bold text-white">{activeQuiz.score}%</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">Quiz Completed!</h2>
                  <p className="text-slate-400">
                    You scored {activeQuiz.score}% on "{activeQuiz.title}"
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{activeQuiz.questions.length}</p>
                    <p className="text-slate-400 text-sm">Total Questions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">
                      {activeQuiz.questions.filter(q => q.userAnswer === q.correctAnswer).length}
                    </p>
                    <p className="text-slate-400 text-sm">Correct Answers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">
                      {activeQuiz.questions.filter(q => q.userAnswer !== q.correctAnswer).length}
                    </p>
                    <p className="text-slate-400 text-sm">Wrong Answers</p>
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={resetQuiz}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                  >
                    Create New Quiz
                  </button>
                  <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-medium transition-all">
                    <Download className="w-5 h-5 inline mr-2" />
                    Download Results
                  </button>
                </div>
              </div>
            ) : (
              // Quiz Taking Interface
              <div className="space-y-6">
                {/* Progress Bar */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">{activeQuiz.title}</h2>
                    <span className="text-slate-400">
                      Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
                    </span>
                  </div>
                  <div className="bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question */}
                {currentQuestion && (
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700/50">
                    <h3 className="text-2xl text-white mb-6 leading-relaxed">
                      {currentQuestion.question}
                    </h3>
                    
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => handleAnswerSelect(index)}
                          className={`w-full p-4 text-left rounded-xl border transition-all duration-300 ${
                            currentQuestion.userAnswer === index
                              ? 'bg-purple-500/20 border-purple-500 text-white'
                              : 'bg-slate-700/30 border-slate-600/50 hover:border-purple-500/50 text-slate-300 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              currentQuestion.userAnswer === index
                                ? 'border-purple-500 bg-purple-500'
                                : 'border-slate-500'
                            }`}>
                              {currentQuestion.userAnswer === index && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <span className="text-lg">{option}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={goToPreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2"
                  >
                    <span>Previous</span>
                  </button>

                  <div className="text-slate-400 text-sm">
                    {activeQuiz.questions.filter(q => q.userAnswer !== undefined).length} of {activeQuiz.questions.length} answered
                  </div>

                  {currentQuestionIndex === activeQuiz.questions.length - 1 ? (
                    <button
                      onClick={finishQuiz}
                      disabled={!allQuestionsAnswered}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium transition-all"
                    >
                      Finish Quiz
                    </button>
                  ) : (
                    <button
                      onClick={goToNextQuestion}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center space-x-2"
                    >
                      <span>Next</span>
                    </button>
                  )}
                </div>

                {/* Quit Quiz */}
                <div className="text-center">
                  <button
                    onClick={resetQuiz}
                    className="text-slate-400 hover:text-red-400 text-sm transition-colors"
                  >
                    Quit Quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}