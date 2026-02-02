import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import AuthModal from "./components/AuthModal";
import ChatInterface from "./components/ChatInterface";
import StudyPlanner from "./components/StudyPlanner";
import ProgressTracker from "./components/ProgressTracker";
import QuizGenerator from "./components/QuizGenerator";
import QuizPerformance from "./components/QuizPerformance";
import Navigation from "./components/Navigation";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { QuizProvider } from "./context/QuizContext";
import { ChatProvider } from "./context/ChatContext";
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      {/* Fixed padding to account for navigation height */}
      <main className="pt-20 md:pt-16 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function AppContent() {
  const { showAuthModal } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatInterface />
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner"
            element={
              <ProtectedRoute>
                <StudyPlanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <ProgressTracker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz"
            element={
              <ProtectedRoute>
                <QuizGenerator />
              </ProtectedRoute>
            }
          />
          {/* FIXED: Added the missing quiz-performance route */}
          <Route
            path="/quiz-performance"
            element={
              <ProtectedRoute>
                <QuizPerformance />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        {showAuthModal && <AuthModal />}
      </Router>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QuizProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </QuizProvider>
    </AuthProvider>
  );
} 