import React from 'react';
import { Brain, BookOpen, Target, BarChart3, MessageSquare, Calendar, Upload, Zap, ArrowRight, Stars, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { setShowAuthModal } = useAuth();

  const features = [
    { icon: Brain, title: 'AI Study Assistant', description: 'Get personalized study plans and reminders powered by Edumate' },
    { icon: Upload, title: 'PDF Processing', description: 'Upload study materials and let AI extract key concepts automatically' },
    { icon: MessageSquare, title: 'Smart Quizzes', description: 'Generate quizzes from your materials using NLP for better retention' },
    { icon: Target, title: 'Custom Plans', description: 'Tailored study schedules based on your goals and learning style' },
    { icon: BarChart3, title: 'Progress Analytics', description: 'Track your learning journey with detailed insights and feedback' },
    { icon: Calendar, title: 'Smart Scheduling', description: 'Optimize your study time with intelligent scheduling algorithms' }
  ];

  const stats = [
    { label: 'Active Students', value: '25,000+', icon: Users },
    { label: 'Study Hours Saved', value: '150,000+', icon: TrendingUp },
    { label: 'Success Rate', value: '94%', icon: Stars }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">StudyAI</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              AI-Powered
              <span className="text-blue-400 block">Learning Assistant</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Transform your learning experience with personalized study plans, intelligent quizzes, and real-time progress tracking. Let AI be your study companion.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 shadow-lg"
              >
                Start Learning Now
                <ArrowRight className="inline ml-2 h-5 w-5" />
              </button>
              <button
                onClick={() => setShowAuthModal(true)}
                className="border-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all"
              >
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <Icon className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                  <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-gray-400 font-medium">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Powerful Features for
              <span className="text-blue-400"> Smart Learning</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Our comprehensive platform combines cutting-edge AI with proven learning methodologies to accelerate your academic success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-gray-800 p-8 rounded-xl border border-gray-700 hover:border-blue-500 transition-all hover:shadow-xl"
                >
                  <Icon className="h-12 w-12 text-blue-400 mb-6" />
                  <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of students who have already accelerated their academic success with StudyAI.
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-bold text-lg transition-all hover:scale-105 shadow-lg"
          >
            Get Started Free
            <ArrowRight className="inline ml-2 h-5 w-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Brain className="h-8 w-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">StudyAI</span>
            </div>
            <div className="text-gray-400">
              © 2025 StudyAI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
