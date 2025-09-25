import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  studyGoals?: string[];
  learningStyle?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<any>;
  signup: (name: string, email: string, password: string) => Promise<any>;
  logout: () => void;
  showAuthModal: boolean;
  setShowAuthModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('edumate_user');
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore parse error
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Server returned non-JSON response');
    }
    const data = await res.json();
    if (!res.ok) {
      const err = data?.error || 'login_failed';
      throw new Error(err);
    }
    if (data?.success) {
      const userObj: User = {
        id: String(data.user.id),
        name: data.user.name || '',
        email: data.user.email || email,
      };
      setUser(userObj);
      localStorage.setItem('edumate_user', JSON.stringify(userObj));
      setShowAuthModal(false);
    }
    return data;
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Server returned non-JSON response');
    }
    const data = await res.json();
    if (!res.ok) {
      const err = data?.error || 'signup_failed';
      throw new Error(err);
    }
    if (data?.success) {
      const userObj: User = {
        id: String(data.user.id),
        name: data.user.name || name,
        email: data.user.email || email,
      };
      setUser(userObj);
      localStorage.setItem('edumate_user', JSON.stringify(userObj));
      setShowAuthModal(false);
    }
    return data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('edumate_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, showAuthModal, setShowAuthModal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}