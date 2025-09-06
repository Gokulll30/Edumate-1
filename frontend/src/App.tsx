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
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 to-slate-950 text-white">
    <aside className="w-64 shrink-0"><Navigation /></aside>
    <main className="flex-1 overflow-auto p-6 md:p-10">
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
        <Route path="/chat" element={user ? <ChatInterface /> : <Navigate to="/" />} />
        <Route path="/planner" element={user ? <StudyPlanner /> : <Navigate to="/" />} />
        <Route path="/progress" element={user ? <ProgressTracker /> : <Navigate to="/" />} />
        <Route path="/quiz" element={user ? <QuizGenerator /> : <Navigate to="/" />} />
        <Route path="*" element={<QuizGenerator />} />
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