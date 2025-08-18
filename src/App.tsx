import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import ChatInterface from './components/ChatInterface';
import StudyPlanner from './components/StudyPlanner';
import ProgressTracker from './components/ProgressTracker';
import QuizGenerator from './components/QuizGenerator';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
        <Route path="/chat" element={user ? <ChatInterface /> : <Navigate to="/" />} />
        <Route path="/planner" element={user ? <StudyPlanner /> : <Navigate to="/" />} />
        <Route path="/progress" element={user ? <ProgressTracker /> : <Navigate to="/" />} />
        <Route path="/quiz" element={user ? <QuizGenerator /> : <Navigate to="/" />} />
      </Routes>
      <AuthModal />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;