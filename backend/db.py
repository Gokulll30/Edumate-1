"""
SQLite helper for EduMate — robust with study session support, progress, and authentication.
"""

import sqlite3
import os
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from typing import Optional, Dict, List, Any
from flask import g, current_app

DB_CONN = None
DB_PATH = None

# IST time helper (India Standard Time, UTC+05:30)
def _now_ist_iso():
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist).isoformat()

def get_db_connection():
    """Get database connection with proper Flask context handling"""
    if 'db' not in g:
        db_path = current_app.config.get('DATABASE', 'data/edumate.sqlite3')
        g.db = sqlite3.connect(db_path)
        g.db.row_factory = sqlite3.Row
    return g.db

def _ensure_tables(conn: sqlite3.Connection):
    """Create all required tables"""
    cur = conn.cursor()
    
    # users table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            name TEXT,
            email TEXT,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    
    # login sessions (tracks logins)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS login_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            login_at TEXT NOT NULL,
            logout_at TEXT,
            active_seconds INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # progress table (cached summary)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            tasks_completed INTEGER DEFAULT 0,
            sessions_completed INTEGER DEFAULT 0,
            tests_taken INTEGER DEFAULT 0,
            total_hours REAL DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    
    # study sessions (planner items)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS study_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            subject TEXT,
            duration INTEGER DEFAULT 60,
            date TEXT,
            time TEXT,
            type TEXT,
            priority TEXT,
            completed INTEGER DEFAULT 0,
            notes TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    
    # tests table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subject TEXT,
            score REAL,
            taken_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # chat sessions table (NEW)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL DEFAULT 'New Chat',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # chats table (UPDATED with session support)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            role TEXT NOT NULL,
            message TEXT NOT NULL,
            session_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    """)
    
    # quiz attempts table (UPDATED for QuizPerformance)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            username TEXT,
            topic TEXT,
            difficulty TEXT,
            score INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            percentage INTEGER NOT NULL,
            time_taken INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # quiz answers table - keep existing structure
    cur.execute("""
        CREATE TABLE IF NOT EXISTS quiz_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            attempt_id INTEGER NOT NULL,
            user_name TEXT,
            question TEXT NOT NULL,
            correct_answer TEXT NOT NULL,
            user_answer TEXT NOT NULL,
            is_correct INTEGER NOT NULL,
            explanation TEXT,
            FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id)
        )
    """)
    
    conn.commit()

def _migrate_db_schema(conn: sqlite3.Connection):
    """Ensure schema changes for older DBs"""
    try:
        cur = conn.cursor()
        
        # Check users table has required columns
        cur.execute("PRAGMA table_info(users)")
        user_cols = [row[1] for row in cur.fetchall()]
        
        if "name" not in user_cols:
            cur.execute("ALTER TABLE users ADD COLUMN name TEXT")
        if "email" not in user_cols:
            cur.execute("ALTER TABLE users ADD COLUMN email TEXT")
        
        # Check chats table has session_id
        cur.execute("PRAGMA table_info(chats)")
        chat_cols = [row[1] for row in cur.fetchall()]
        
        if "session_id" not in chat_cols:
            cur.execute("ALTER TABLE chats ADD COLUMN session_id INTEGER REFERENCES sessions(id)")
        if "message" not in chat_cols and "content" in chat_cols:
            # Rename content to message for consistency
            cur.execute("ALTER TABLE chats RENAME COLUMN content TO message")
        
        # Update quiz_attempts structure for performance tracking
        cur.execute("PRAGMA table_info(quiz_attempts)")
        quiz_cols = [row[1] for row in cur.fetchall()]
        
        if "topic" not in quiz_cols:
            cur.execute("ALTER TABLE quiz_attempts ADD COLUMN topic TEXT")
        if "percentage" not in quiz_cols:
            cur.execute("ALTER TABLE quiz_attempts ADD COLUMN percentage INTEGER")
        if "time_taken" not in quiz_cols:
            cur.execute("ALTER TABLE quiz_attempts ADD COLUMN time_taken INTEGER DEFAULT 0")
        if "username" not in quiz_cols:
            cur.execute("ALTER TABLE quiz_attempts ADD COLUMN username TEXT")
        
        conn.commit()
    except Exception as e:
        print(f"Migration error: {e}")
        pass

def init_db(path: Optional[str] = None):
    """Initialize database with all tables"""
    global DB_PATH, DB_CONN
    
    if path is None:
        HERE = os.path.dirname(__file__)
        DATA_DIR = os.path.join(HERE, "data")
        os.makedirs(DATA_DIR, exist_ok=True)
        path = os.path.join(DATA_DIR, "edumate.sqlite3")
    
    DB_PATH = path
    print(f"Using database at: {DB_PATH}")
    
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    DB_CONN = conn
    
    _ensure_tables(conn)
    _migrate_db_schema(conn)
    
    return conn

def get_conn():
    """Get connection (fallback to global connection)"""
    global DB_CONN, DB_PATH
    if DB_CONN:
        return DB_CONN
    return init_db(DB_PATH)

# ===== USER/AUTH FUNCTIONS =====

def create_user(username: str, email: str, password_hash: str) -> int:
    """Create a new user - Updated for auth integration"""
    try:
        conn = get_db_connection()
    except:
        conn = get_conn()
    
    cur = conn.cursor()
    created_at = _now_ist_iso()
    
    cur.execute("""
        INSERT INTO users (username, email, password_hash, created_at) 
        VALUES (?, ?, ?, ?)
    """, (username, email, password_hash, created_at))
    
    user_id = cur.lastrowid
    
    # Initialize progress row
    cur.execute("""
        INSERT OR IGNORE INTO progress 
        (user_id, tasks_completed, sessions_completed, tests_taken, total_hours) 
        VALUES (?, 0, 0, 0, 0)
    """, (user_id,))
    
    conn.commit()
    return user_id

def get_user_by_username(username: str) -> Optional[Dict]:
    """Get user by username - Updated for auth integration"""
    try:
        conn = get_db_connection()
    except:
        conn = get_conn()
    
    row = conn.execute("""
        SELECT id, username, email, name, password_hash, created_at 
        FROM users WHERE username = ?
    """, (username,)).fetchone()
    
    return dict(row) if row else None

def verify_user(username: str, password_plain: str) -> Dict:
    """Verify user credentials"""
    conn = get_conn()
    cur = conn.cursor()
    
    row = cur.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not row:
        return {"status": "no_user"}
    
    if not check_password_hash(row["password_hash"], password_plain):
        return {"status": "invalid_password"}
    
    return {
        "status": "ok", 
        "user": {
            "id": row["id"], 
            "username": row["username"], 
            "name": row["name"]
        }
    }

# ===== CHAT SESSION FUNCTIONS =====

def get_chat_sessions(user_id: int) -> List[Dict]:
    """Get all chat sessions for a user"""
    try:
        conn = get_db_connection()
    except:
        conn = get_conn()
    
    sessions = conn.execute("""
        SELECT id, title, created_at, 
               (SELECT COUNT(*) FROM chats WHERE session_id = sessions.id) as message_count
        FROM sessions 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    """, (user_id,)).fetchall()
    
    return [dict(session) for session in sessions]

def create_chat_session(user_id: int, title: str = "New Chat") -> int:
    """Create a new chat session"""
    try:
        conn = get_db_connection()
    except:
        conn = get_conn()
    
    cursor = conn.execute("""
        INSERT INTO sessions (user_id, title) VALUES (?, ?)
    """, (user_id, title))
    
    session_id = cursor.lastrowid
    conn.commit()
    return session_id

def delete_chat_session(session_id: int, user_id: int) -> bool:
    """Delete a chat session and all its messages"""
    try:
        conn = get_db_connection()
    except:
        conn = get_conn()
    
    # Delete messages first
    conn.execute("DELETE FROM chats WHERE session_id = ? AND user_id = ?", (session_id, user_id))
    
    # Delete session
    cursor = conn.execute("DELETE FROM sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
    affected_rows = cursor.rowcount
    
    conn.commit()
    return affected_rows > 0

def rename_chat_session(session_id: int, new_title: str, user_id: int) -> bool:
    """Rename a chat session"""
    try:
        conn = get_db_connection()
    except:
        conn = get_conn()
    
    cursor = conn.execute("""
        UPDATE sessions SET title = ? WHERE id = ? AND user_id = ?
    """, (new_title, session_id, user_id))
    
    affected_rows = cursor.rowcount
    conn.commit()
    return affected_rows > 0

def save_chat_message(user_id: int, role: str, message: str, session_id: int = None):
    import datetime
    now = datetime.datetime.now().isoformat()
    try:
        conn = get_db_connection()
    except:
        conn = get_conn()
    conn.execute(
        "INSERT INTO chats (user_id, role, message, session_id, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, role, message, session_id, now)
    )
    conn.commit()

def get_chat_history(user_id: int, limit: int = 50, session_id: int = None) -> List[Dict]:
    """Get chat history for a user"""
    try:
        conn = get_db_connection()
    except:
        conn = get_conn()
    
    if session_id:
        messages = conn.execute("""
            SELECT * FROM chats 
            WHERE user_id = ? AND session_id = ? 
            ORDER BY created_at ASC 
            LIMIT ?
        """, (user_id, session_id, limit)).fetchall()
    else:
        messages = conn.execute("""
            SELECT * FROM chats 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        """, (user_id, limit)).fetchall()
    
    return [dict(msg) for msg in messages]

# ===== QUIZ PERFORMANCE FUNCTIONS =====

def save_quiz_attempt(user_id: int, topic: str, difficulty: str, score: int, total_questions: int, time_taken: int, username: str = None) -> int:
    """Save a quiz attempt for performance tracking"""
    try:
        conn = get_db_connection()
    except:
        conn = get_conn()
    
    percentage = int((score / total_questions) * 100) if total_questions > 0 else 0
    
    cursor = conn.execute("""
        INSERT INTO quiz_attempts 
        (user_id, username, topic, difficulty, score, total_questions, percentage, time_taken) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, username, topic, difficulty, score, total_questions, percentage, time_taken))
    
    attempt_id = cursor.lastrowid
    conn.commit()
    return attempt_id

def get_quiz_history(user_id: int, limit: int = 50) -> List[Dict]:
    """Get quiz history for performance tracking"""
    try:
        conn = get_db_connection()
    except:
        conn = get_conn()
    
    attempts = conn.execute("""
        SELECT id, topic, difficulty, score, total_questions, percentage, time_taken, created_at
        FROM quiz_attempts 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
    """, (user_id, limit)).fetchall()
    
    return [dict(attempt) for attempt in attempts]

def get_quiz_stats(user_id: int) -> Dict:
    """Get quiz statistics for performance tracking"""
    try:
        conn = get_db_connection()
    except:
        conn = get_conn()
    
    stats = conn.execute("""
        SELECT 
            COUNT(*) as total_attempts,
            AVG(percentage) as avg_percentage,
            MAX(percentage) as best_score,
            MAX(created_at) as last_attempt
        FROM quiz_attempts 
        WHERE user_id = ?
    """, (user_id,)).fetchone()
    
    if stats and stats['total_attempts'] > 0:
        return {
            'total_attempts': stats['total_attempts'],
            'avg_percentage': round(stats['avg_percentage'], 1),
            'best_score': stats['best_score'],
            'last_attempt': stats['last_attempt']
        }
    else:
        return {
            'total_attempts': 0,
            'avg_percentage': 0,
            'best_score': 0,
            'last_attempt': None
        }

# ===== EXISTING QUIZ FUNCTIONS (Keep for compatibility) =====

def save_quiz_attempt_legacy(user_id: int, user_name: str, subject: str, difficulty: str, num_questions: int, score: float, qnas: list) -> int:
    """Legacy quiz attempt saving - keep for backward compatibility"""
    conn = get_conn()
    cur = conn.cursor()
    taken_at = _now_ist_iso()
    
    cur.execute("""
        INSERT INTO quiz_attempts (user_id, username, topic, difficulty, total_questions, score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, user_name, subject, difficulty, num_questions, score, taken_at))
    
    attempt_id = cur.lastrowid
    
    # Save individual answers
    for qa in qnas:
        cur.execute("""
            INSERT INTO quiz_answers (attempt_id, user_name, question, correct_answer, user_answer, is_correct, explanation)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            attempt_id,
            user_name,
            qa.get('question'),
            qa.get('correct_answer'),
            qa.get('user_answer'),
            1 if qa.get('is_correct') else 0,
            qa.get('explanation', '')
        ))
    
    conn.commit()
    return attempt_id

# ===== LOGIN SESSION TRACKING =====

def log_login(user_id: int) -> int:
    """Log a login session"""
    conn = get_conn()
    cur = conn.cursor()
    login_at = _now_ist_iso()
    
    cur.execute("INSERT INTO login_sessions (user_id, login_at) VALUES (?, ?)", (user_id, login_at))
    conn.commit()
    return cur.lastrowid

def log_logout(session_id: int):
    """Log logout for a session"""
    conn = get_conn()
    cur = conn.cursor()
    
    row = cur.execute("SELECT login_at FROM login_sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        return
    
    login_at = datetime.fromisoformat(row["login_at"])
    ist = timezone(timedelta(hours=5, minutes=30))
    logout_at = datetime.now(ist)
    active_seconds = int((logout_at - login_at).total_seconds())
    
    cur.execute("""
        UPDATE login_sessions 
        SET logout_at = ?, active_seconds = ? 
        WHERE id = ?
    """, (logout_at.isoformat(), active_seconds, session_id))
    
    conn.commit()

# ===== STUDY SESSION FUNCTIONS (Keep existing) =====

def add_study_session(user_id: int, title: str, subject: str, duration: int, date: str, time: str, type_: str, priority: str, notes: Optional[str] = None) -> Dict:
    """Add a study session"""
    conn = get_conn()
    cur = conn.cursor()
    created_at = _now_ist_iso()
    
    cur.execute("""
        INSERT INTO study_sessions (user_id, title, subject, duration, date, time, type, priority, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, title, subject, duration, date, time, type_, priority, notes, created_at))
    
    conn.commit()
    row = cur.execute("SELECT * FROM study_sessions WHERE id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)

def get_study_sessions(user_id: int) -> List[Dict]:
    """Get all study sessions for a user"""
    conn = get_conn()
    rows = conn.execute("SELECT * FROM study_sessions WHERE user_id = ? ORDER BY date, time", (user_id,)).fetchall()
    return [dict(r) for r in rows]

def delete_study_session(session_id: int, user_id: int) -> bool:
    """Delete a study session"""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM study_sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
    conn.commit()
    return cur.rowcount > 0

def toggle_study_completion(session_id: int, user_id: int) -> Optional[Dict]:
    """Toggle completion status of a study session"""
    conn = get_conn()
    cur = conn.cursor()
    
    row = cur.execute("SELECT completed FROM study_sessions WHERE id = ? AND user_id = ?", (session_id, user_id)).fetchone()
    if not row:
        return None
    
    newval = 0 if row["completed"] else 1
    cur.execute("UPDATE study_sessions SET completed = ? WHERE id = ? AND user_id = ?", (newval, session_id, user_id))
    conn.commit()
    
    return dict(cur.execute("SELECT * FROM study_sessions WHERE id = ?", (session_id,)).fetchone())

def compute_progress(user_id: int) -> Dict[str, Any]:
    """Compute progress statistics for a user"""
    conn = get_conn()
    cur = conn.cursor()
    
    total_sessions = cur.execute("SELECT COUNT(*) as c FROM study_sessions WHERE user_id = ?", (user_id,)).fetchone()["c"]
    completed_sessions = cur.execute("SELECT COUNT(*) as c FROM study_sessions WHERE user_id = ? AND completed = 1", (user_id,)).fetchone()["c"]
    
    total_minutes = cur.execute("SELECT COALESCE(SUM(duration),0) as s FROM study_sessions WHERE user_id = ?", (user_id,)).fetchone()["s"]
    completed_minutes = cur.execute("SELECT COALESCE(SUM(duration),0) as s FROM study_sessions WHERE user_id = ? AND completed = 1", (user_id,)).fetchone()["s"]
    
    tests_taken = cur.execute("SELECT COUNT(*) as c FROM quiz_attempts WHERE user_id = ?", (user_id,)).fetchone()["c"]
    
    total_hours = (total_minutes or 0) / 60.0
    completed_hours = (completed_minutes or 0) / 60.0
    completion_rate = (int(completed_sessions) / int(total_sessions) * 100) if total_sessions > 0 else 0
    
    return {
        "totalSessions": int(total_sessions),
        "completedSessions": int(completed_sessions),
        "totalHours": float(total_hours),
        "completedHours": float(completed_hours),
        "testsTaken": int(tests_taken),
        "completionRate": int(round(completion_rate))
    }

# Initialize database on import
try:
    init_db()
except Exception as e:
    print(f"Database initialization error: {e}")
    pass
