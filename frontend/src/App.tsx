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

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/" />;
  }
  
  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <main className="pt-16"> {/* Add padding-top to account for fixed navigation */}
        {children}
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
      <AppContent />
    </AuthProvider>
  );
}
