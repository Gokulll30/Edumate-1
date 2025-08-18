const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// In-memory storage (replace with database in production)
let users = [];
let studySessions = [];
let quizzes = [];
let progressData = [];

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password: hashedPassword,
      avatar: `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face`,
      studyGoals: [],
      learningStyle: 'Visual Learner',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      message: 'User created successfully',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected Routes
app.get('/api/user/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

app.put('/api/user/profile', authenticateToken, (req, res) => {
  const { name, studyGoals, learningStyle } = req.body;
  const userIndex = users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users[userIndex] = {
    ...users[userIndex],
    name: name || users[userIndex].name,
    studyGoals: studyGoals || users[userIndex].studyGoals,
    learningStyle: learningStyle || users[userIndex].learningStyle,
    updatedAt: new Date().toISOString()
  };

  const { password: _, ...userWithoutPassword } = users[userIndex];
  res.json(userWithoutPassword);
});

// Study Sessions Routes
app.get('/api/study-sessions', authenticateToken, (req, res) => {
  const userSessions = studySessions.filter(session => session.userId === req.user.id);
  res.json(userSessions);
});

app.post('/api/study-sessions', authenticateToken, (req, res) => {
  const newSession = {
    id: Date.now().toString(),
    userId: req.user.id,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  studySessions.push(newSession);
  res.status(201).json(newSession);
});

app.put('/api/study-sessions/:id', authenticateToken, (req, res) => {
  const sessionIndex = studySessions.findIndex(
    session => session.id === req.params.id && session.userId === req.user.id
  );
  
  if (sessionIndex === -1) {
    return res.status(404).json({ error: 'Study session not found' });
  }

  studySessions[sessionIndex] = {
    ...studySessions[sessionIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.json(studySessions[sessionIndex]);
});

app.delete('/api/study-sessions/:id', authenticateToken, (req, res) => {
  const sessionIndex = studySessions.findIndex(
    session => session.id === req.params.id && session.userId === req.user.id
  );
  
  if (sessionIndex === -1) {
    return res.status(404).json({ error: 'Study session not found' });
  }

  studySessions.splice(sessionIndex, 1);
  res.json({ message: 'Study session deleted successfully' });
});

// File Upload Route
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    message: 'File uploaded successfully',
    file: {
      id: Date.now().toString(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: req.file.path,
      uploadedAt: new Date().toISOString()
    }
  });
});

// Quiz Routes
app.get('/api/quizzes', authenticateToken, (req, res) => {
  const userQuizzes = quizzes.filter(quiz => quiz.userId === req.user.id);
  res.json(userQuizzes);
});

app.post('/api/quizzes', authenticateToken, (req, res) => {
  const newQuiz = {
    id: Date.now().toString(),
    userId: req.user.id,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  quizzes.push(newQuiz);
  res.status(201).json(newQuiz);
});

// Progress Routes
app.get('/api/progress', authenticateToken, (req, res) => {
  const userProgress = progressData.filter(progress => progress.userId === req.user.id);
  res.json(userProgress);
});

app.post('/api/progress', authenticateToken, (req, res) => {
  const newProgress = {
    id: Date.now().toString(),
    userId: req.user.id,
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  progressData.push(newProgress);
  res.status(201).json(newProgress);
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;