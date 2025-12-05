// AuthContext.tsx - Updated version
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  id: string;
  name?: string;
  email: string;
  username?: string;
  avatar?: string;
  studyGoals?: string[];
  learningStyle?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  showAuthModal: boolean;
  setShowAuthModal: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing user session on app load
    try {
      const storedUser = localStorage.getItem('edumate_user');
      console.log('Stored user from localStorage:', storedUser); // Debug log

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log('Parsed user:', parsedUser); // Debug log
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error);
      localStorage.removeItem('edumate_user'); // Clear corrupted data
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail, password }),
      });

      const data = await response.json();
      console.log('Login response:', data); // Debug log

      if (data.success && data.user) {
        const userData = {
          id: data.user.id?.toString() || '1', // Ensure id is string
          name: data.user.name || data.user.username,
          email: data.user.email || usernameOrEmail,
          username: data.user.username
        };

        console.log('Setting user:', userData); // Debug log
        setUser(userData);
        localStorage.setItem('edumate_user', JSON.stringify(userData));
        if (data.token) {
          localStorage.setItem('authToken', data.token);
        }
        setShowAuthModal(false);
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, email, password }),
      });

      const data = await response.json();
      console.log('Signup response:', data); // Debug log

      if (data.success && data.user) {
        const userData = {
          id: data.user.id?.toString() || '1', // Ensure id is string
          name: data.user.name || data.user.username,
          email: data.user.email || email,
          username: data.user.username
        };

        console.log('Setting user after signup:', userData); // Debug log
        setUser(userData);
        localStorage.setItem('edumate_user', JSON.stringify(userData));
        if (data.token) {
          localStorage.setItem('authToken', data.token);
        }
        setShowAuthModal(false);
      } else {
        throw new Error(data.error || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('Logging out user'); // Debug log
    setUser(null);
    localStorage.removeItem('edumate_user');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('edumate_quiz_state');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      signup,
      logout,
      showAuthModal,
      setShowAuthModal,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
