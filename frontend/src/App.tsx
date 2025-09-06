import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navigation from "./components/Navigation";
import LandingPage from "./components/LandingPage";
import Dashboard from "./components/Dashboard";
import AuthModal from "./components/AuthModal";
import ChatInterface from "./components/ChatInterface";
import StudyPlanner from "./components/StudyPlanner";
import ProgressTracker from "./components/ProgressTracker";
import QuizGenerator from "./components/QuizGenerator";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AppContent() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900">
      <Router>
        {user && <Navigation />}
        <Routes>
          <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/dashboard" />} />
          {user ? (
            <>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<ChatInterface />} />
              <Route path="/planner" element={<StudyPlanner />} />
              <Route path="/progress" element={<ProgressTracker />} />
              <Route path="/quiz" element={<QuizGenerator />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/" />} />
          )}
        </Routes>
        <AuthModal />
      </Router>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
