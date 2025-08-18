import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: async (userData) => {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },
  
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data;
  },
  
  updateProfile: async (userData) => {
    const response = await api.put('/user/profile', userData);
    return response.data;
  }
};

// Study Sessions API
export const studySessionsAPI = {
  getAll: async () => {
    const response = await api.get('/study-sessions');
    return response.data;
  },
  
  create: async (sessionData) => {
    const response = await api.post('/study-sessions', sessionData);
    return response.data;
  },
  
  update: async (id, sessionData) => {
    const response = await api.put(`/study-sessions/${id}`, sessionData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/study-sessions/${id}`);
    return response.data;
  }
};

// File Upload API
export const fileAPI = {
  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

// Quiz API
export const quizAPI = {
  getAll: async () => {
    const response = await api.get('/quizzes');
    return response.data;
  },
  
  create: async (quizData) => {
    const response = await api.post('/quizzes', quizData);
    return response.data;
  }
};

// Progress API
export const progressAPI = {
  getAll: async () => {
    const response = await api.get('/progress');
    return response.data;
  },
  
  create: async (progressData) => {
    const response = await api.post('/progress', progressData);
    return response.data;
  }
};

export default api;