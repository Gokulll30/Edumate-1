"""
MySQL helper for EduMate — robust with study session support, progress, and authentication.
"""

import mysql.connector
from mysql.connector import pooling, errors
import os
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from typing import Optional, Dict, List, Any
from flask import g
from decimal import Decimal

# MySQL connection pool variable
DB_POOL = None

# IST time helper (India Standard Time, UTC+05:30)
def _now_ist_iso():
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist).isoformat()

# Helper to show current DB env vars (for debugging)
def _print_db_env_vars():
    print("Using DB config:")
    print(f"  MYSQL_HOST = {os.environ.get('MYSQL_HOST', 'localhost')}")
    print(f"  MYSQL_USER = {os.environ.get('MYSQL_USER', 'root')}")
    print(f"  MYSQL_PASSWORD = {'<not set>' if not os.environ.get('MYSQL_PASSWORD') else '<set>'}")
    print(f"  MYSQL_DB = {os.environ.get('MYSQL_DB', 'edumate')}")

# ===== CONNECTION HANDLING =====
def init_db_pool():
    """Initialize MySQL connection pool safely"""
    global DB_POOL
    if DB_POOL:
        return
    host = os.environ.get("MYSQL_HOST", "localhost")
    user = os.environ.get("MYSQL_USER", "root")
    password = os.environ.get("MYSQL_PASSWORD", "")
    database = os.environ.get("MYSQL_DB", "edumate")

    _print_db_env_vars()

    if user == "root" and password == "":
        # Very dangerous to run root user with empty password, raise error to remind setting env
        print("❌ Warning: Root user is configured with empty password. Please set MYSQL_PASSWORD environment variable for security.")

    try:
        DB_POOL = pooling.MySQLConnectionPool(
            pool_name="edumate_pool",
            pool_size=2,
            host=host,
            user=user,
            password=password,
            database=database,
            auth_plugin="mysql_native_password"
        )
        print(f"MySQL Pool Initialized → {user}@{host} ({database})")
    except errors.Error as e:
        print(f"❌ Database connection error: {e}")
        raise

def get_db_connection():
    """Get database connection with proper Flask context handling"""
    if 'db' not in g:
        if DB_POOL is None:
            init_db_pool()
        g.db = DB_POOL.get_connection()
    return g.db

# ===== TABLE CREATION =====
def _ensure_tables(conn):
    cur = conn.cursor(dictionary=True)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        email VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS login_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        login_at DATETIME NOT NULL,
        logout_at DATETIME,
        active_seconds INT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNIQUE NOT NULL,
        tasks_completed INT DEFAULT 0,
        sessions_completed INT DEFAULT 0,
        tests_taken INT DEFAULT 0,
        total_hours DOUBLE DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS study_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        duration INT DEFAULT 60,
        date DATE,
        time TIME,
        type VARCHAR(50),
        priority VARCHAR(50),
        completed TINYINT DEFAULT 0,
        notes TEXT,
        created_at DATETIME NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS tests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        subject VARCHAR(255),
        score DOUBLE,
        taken_at DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # Ensure user_id column allows NULL (in case older schema had NOT NULL)
    try:
        cur.execute("ALTER TABLE sessions MODIFY COLUMN user_id INT NULL")
    except Exception:
        # Ignore errors (column may already be nullable or DB permissions may prevent alteration)
        pass

    cur.execute("""
    CREATE TABLE IF NOT EXISTS chats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        role VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        session_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        username VARCHAR(255),
        topic VARCHAR(255),
        difficulty VARCHAR(50),
        score INT NOT NULL,
        total_questions INT NOT NULL,
        percentage INT NOT NULL,
        time_taken INT DEFAULT 0,
        taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS quiz_answers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        attempt_id INT NOT NULL,
        user_name VARCHAR(255),
        question TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        user_answer TEXT NOT NULL,
        is_correct TINYINT NOT NULL,
        explanation TEXT,
        FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id)
    )
    """)
    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS calendar_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        credentials TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Table for mapping study sessions to Google Calendar event IDs
    cur.execute("""
    CREATE TABLE IF NOT EXISTS calendar_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        session_id INT,
        event_id VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
        # Add calendar_event_id to study_sessions (only if not exists)
    try:
        cur.execute("ALTER TABLE study_sessions ADD COLUMN calendar_event_id VARCHAR(255) DEFAULT NULL")
    except mysql.connector.errors.ProgrammingError as e:
        if "Duplicate column name" not in str(e):
            raise
    
    cur.execute("""
        CREATE TABLE IF NOT EXISTS scheduled_tests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            topic VARCHAR(255) NOT NULL,
            scheduled_date DATETIME NOT NULL,
            difficulty_level VARCHAR(50),
            reason VARCHAR(255),
            status VARCHAR(50) DEFAULT 'pending',
            created_by VARCHAR(50) DEFAULT 'ai_agent',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            INDEX idx_user_status (user_id, status),
            INDEX idx_scheduled_date (scheduled_date)
        )
    """)

    conn.commit()
    cur.close()

def init_db():
    """Initialize database tables"""
    if DB_POOL is None:
        init_db_pool()
    conn = DB_POOL.get_connection()
    _ensure_tables(conn)
    conn.close()

# ===== USER FUNCTIONS =====
def create_user(username: str, email: str, password_hash: str) -> int:
    conn = get_db_connection()
    cur = conn.cursor()
    created_at = _now_ist_iso()
    cur.execute("""
    INSERT INTO users (username, email, password_hash, created_at)
    VALUES (%s, %s, %s, %s)
    """, (username, email, password_hash, created_at))
    user_id = cur.lastrowid
    cur.execute("""
    INSERT IGNORE INTO progress (user_id, tasks_completed, sessions_completed, tests_taken, total_hours)
    VALUES (%s, 0, 0, 0, 0)
    """, (user_id,))
    conn.commit()
    cur.close()
    return user_id

def get_user_by_username(username: str) -> Optional[Dict]:
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
    SELECT id, username, email, name, password_hash, created_at
    FROM users WHERE username = %s
    """, (username,))
    row = cur.fetchone()
    cur.close()
    return row

def get_user_email_by_id(user_id: int) -> str:
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    cur.close()
    return row['email'] if row else None


def verify_user(username: str, password_plain: str) -> Dict:
    row = get_user_by_username(username)
    if not row:
        return {"status": "no_user"}
    if not check_password_hash(row["password_hash"], password_plain):
        return {"status": "invalid_password"}
    return {"status": "ok", "user": {"id": row["id"], "username": row["username"], "name": row["name"]}}

# ===== CHAT FUNCTIONS =====
def get_chat_sessions(user_id: int) -> List[Dict]:
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
    SELECT s.id, s.title, s.created_at,
    (SELECT COUNT(*) FROM chats WHERE session_id = s.id) AS message_count
    FROM sessions s WHERE s.user_id = %s ORDER BY s.created_at DESC
    """, (user_id,))
    rows = cur.fetchall()
    cur.close()
    return rows


def get_chat_sessions_by_ids(ids: List[int]) -> List[Dict]:
    """
    Fetch session rows for the given list of session IDs regardless of user_id.
    Useful for anonymous users who keep a local list of session ids in localStorage.
    """
    if not ids:
        return []
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    # Build placeholders for parameterized IN clause
    placeholders = ",".join(["%s"] * len(ids))
    query = f"""
    SELECT s.id, s.title, s.created_at,
    (SELECT COUNT(*) FROM chats WHERE session_id = s.id) AS message_count
    FROM sessions s WHERE s.id IN ({placeholders}) ORDER BY s.created_at DESC
    """
    cur.execute(query, tuple(ids))
    rows = cur.fetchall()
    cur.close()
    return rows

def create_chat_session(user_id: Optional[int], title: str = "New Chat") -> int:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("INSERT INTO sessions (user_id, title) VALUES (%s, %s)", (user_id, title))
    session_id = cur.lastrowid
    conn.commit()
    cur.close()
    return session_id

def delete_chat_session(session_id: int, user_id: int) -> bool:
    """
    Delete a session and its chats for the given user_id.
    Returns True if a session row was deleted.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM chats WHERE session_id = %s AND user_id = %s", (session_id, user_id))
    cur.execute("DELETE FROM sessions WHERE id = %s AND user_id = %s", (session_id, user_id))
    affected_rows = cur.rowcount
    conn.commit()
    cur.close()
    return affected_rows > 0


def delete_chat_session_anonymous(session_id: int) -> bool:
    """
    Delete a session and its chats for anonymous sessions (user_id IS NULL).
    This allows the client to remove sessions it created locally without auth.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    # Delete chats tied to the anonymous session
    cur.execute("DELETE FROM chats WHERE session_id = %s AND user_id IS NULL", (session_id,))
    cur.execute("DELETE FROM sessions WHERE id = %s AND user_id IS NULL", (session_id,))
    affected_rows = cur.rowcount
    conn.commit()
    cur.close()
    return affected_rows > 0

def rename_chat_session(session_id: int, new_title: str, user_id: int) -> bool:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE sessions SET title = %s WHERE id = %s AND user_id = %s",
                (new_title, session_id, user_id))
    affected_rows = cur.rowcount
    conn.commit()
    cur.close()
    return affected_rows > 0

def save_chat_message(user_id: Optional[int], role: str, message: str, session_id: int = None):
    now = _now_ist_iso()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
    INSERT INTO chats (user_id, role, message, session_id, created_at)
    VALUES (%s, %s, %s, %s, %s)
    """, (user_id, role, message, session_id, now))
    conn.commit()
    cur.close()


def get_session_by_id(session_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT id, user_id, title, created_at FROM sessions WHERE id = %s", (session_id,))
    row = cur.fetchone()
    cur.close()
    return row


def set_session_title(session_id: int, title: str) -> bool:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE sessions SET title = %s WHERE id = %s", (title, session_id))
    affected = cur.rowcount
    conn.commit()
    cur.close()
    return affected > 0

def get_chat_history(user_id: Optional[int], limit: int = 50, session_id: int = None) -> List[Dict]:
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    if session_id:
        if user_id is not None:
            cur.execute("""
            SELECT * FROM chats WHERE user_id = %s AND session_id = %s
            ORDER BY created_at ASC LIMIT %s
            """, (user_id, session_id, limit))
        else:
            # Fetch by session_id only (for anonymous or shared sessions)
            cur.execute("""
            SELECT * FROM chats WHERE session_id = %s
            ORDER BY created_at ASC LIMIT %s
            """, (session_id, limit))
    else:
        if user_id is not None:
            cur.execute("""
            SELECT * FROM chats WHERE user_id = %s
            ORDER BY created_at DESC LIMIT %s
            """, (user_id, limit))
        else:
            # No user_id and no session_id: return empty
            cur.close()
            return []
    rows = cur.fetchall()
    cur.close()
    return rows

# ===== QUIZ FUNCTIONS =====
def save_quiz_attempt(user_id: int, topic: str, difficulty: str, score: int,
                      total_questions: int, time_taken: int, username: str = None) -> int:
    percentage = int((score / total_questions) * 100) if total_questions > 0 else 0
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
    INSERT INTO quiz_attempts (user_id, username, topic, difficulty, score, total_questions, percentage, time_taken)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (user_id, username, topic, difficulty, score, total_questions, percentage, time_taken))
    attempt_id = cur.lastrowid
    conn.commit()
    cur.close()
    return attempt_id

def get_quiz_history(user_id: int, limit: int = 50) -> List[Dict]:
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
    SELECT id, topic, difficulty, score, total_questions, percentage, time_taken, taken_at
    FROM quiz_attempts WHERE user_id = %s ORDER BY taken_at DESC LIMIT %s
    """, (user_id, limit))
    rows = cur.fetchall()
    cur.close()
    return rows

def get_quiz_stats(user_id: int) -> Dict:
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("""
    SELECT COUNT(*) AS total_attempts, AVG(percentage) AS avg_percentage,
    MAX(percentage) AS best_score, MAX(taken_at) AS last_attempt
    FROM quiz_attempts WHERE user_id = %s
    """, (user_id,))
    stats = cur.fetchone()
    cur.close()
    if stats and stats['total_attempts'] > 0:
        return {
            'total_attempts': int(stats['total_attempts']),
            'avg_percentage': round(float(stats['avg_percentage']), 1),
            'best_score': int(stats['best_score']),
            'last_attempt': stats['last_attempt']
        }
    else:
        return {'total_attempts': 0, 'avg_percentage': 0, 'best_score': 0, 'last_attempt': None}

# ===== STUDY SESSION FUNCTIONS =====
def add_study_session(user_id: int, title: str, subject: str, duration: int, date: str,
                      time: str, type_: str, priority: str, notes: Optional[str] = None) -> Dict:
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    created_at = _now_ist_iso()
    cur.execute("""
    INSERT INTO study_sessions (user_id, title, subject, duration, date, time, type, priority, notes, created_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (user_id, title, subject, duration, date, time, type_, priority, notes, created_at))
    conn.commit()
    cur.execute("SELECT * FROM study_sessions WHERE id = %s", (cur.lastrowid,))
    row = cur.fetchone()
    cur.close()
    return row

def get_study_sessions(user_id: int) -> List[Dict]:
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM study_sessions WHERE user_id = %s ORDER BY date, time", (user_id,))
    rows = cur.fetchall()
    cur.close()
    return rows

def delete_study_session(session_id: int, user_id: int) -> bool:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM study_sessions WHERE id = %s AND user_id = %s", (session_id, user_id))
    conn.commit()
    affected = cur.rowcount
    cur.close()
    return affected > 0

def toggle_study_completion(session_id: int, user_id: int, force_completed: bool = None) -> Optional[Dict]:
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT completed FROM study_sessions WHERE id = %s AND user_id = %s", (session_id, user_id))
    row = cur.fetchone()
    if not row:
        cur.close()
        return None
    if force_completed is not None:
        # If force_completed is True, always set to 1; if False, to 0
        newval = 1 if force_completed else 0
    else:
        newval = 0 if row["completed"] else 1
    cur.execute("UPDATE study_sessions SET completed = %s WHERE id = %s AND user_id = %s", (newval, session_id, user_id))
    conn.commit()
    cur.execute("SELECT * FROM study_sessions WHERE id = %s", (session_id,))
    outrow = cur.fetchone()
    cur.close()
    return outrow

def compute_progress(user_id: int) -> Dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT COUNT(*) AS c FROM study_sessions WHERE user_id = %s", (user_id,))
        total_sessions = cur.fetchone()["c"]

        cur.execute("SELECT COUNT(*) AS c FROM study_sessions WHERE user_id = %s AND completed = 1", (user_id,))
        completed_sessions = cur.fetchone()["c"]

        cur.execute("SELECT COALESCE(SUM(duration), 0) AS s FROM study_sessions WHERE user_id = %s", (user_id,))
        total_minutes = cur.fetchone()["s"]

        cur.execute("SELECT COALESCE(SUM(duration), 0) AS s FROM study_sessions WHERE user_id = %s AND completed = 1", (user_id,))
        completed_minutes = cur.fetchone()["s"]

        cur.execute("SELECT COUNT(*) AS c FROM quiz_attempts WHERE user_id = %s", (user_id,))
        tests_taken = cur.fetchone()["c"]
    finally:
        cur.close()

    # Convert Decimal to float if needed for JSON compatibility & calculation
    if isinstance(total_minutes, Decimal):
        total_minutes = float(total_minutes)
    if isinstance(completed_minutes, Decimal):
        completed_minutes = float(completed_minutes)

    total_hours = (total_minutes or 0) / 60.0
    completed_hours = (completed_minutes or 0) / 60.0
    completion_rate = (int(completed_sessions) / int(total_sessions) * 100) if total_sessions > 0 else 0

    return {
        "totalSessions": int(total_sessions),
        "completedSessions": int(completed_sessions),
        "totalHours": total_hours,
        "completedHours": completed_hours,
        "testsTaken": int(tests_taken),
        "completionRate": int(round(completion_rate))
    }

# ===== LOGIN SESSION =====
def log_login(user_id: int) -> int:
    conn = get_db_connection()
    cur = conn.cursor()
    login_at = _now_ist_iso()
    cur.execute("INSERT INTO login_sessions (user_id, login_at) VALUES (%s, %s)", (user_id, login_at))
    conn.commit()
    session_id = cur.lastrowid
    cur.close()
    return session_id

def log_logout(session_id: int):
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT login_at FROM login_sessions WHERE id = %s", (session_id,))
    row = cur.fetchone()
    if not row:
        cur.close()
        return
    login_at = datetime.fromisoformat(str(row["login_at"]))
    ist = timezone(timedelta(hours=5, minutes=30))
    logout_at = datetime.now(ist)
    active_seconds = int((logout_at - login_at).total_seconds())
    cur.execute("UPDATE login_sessions SET logout_at = %s, active_seconds = %s WHERE id = %s",
                (logout_at.isoformat(), active_seconds, session_id))
    conn.commit()
    cur.close()

# ===== QUIZ RETAKE SCHEDULING =====
def schedule_quiz_retake_if_needed(user_id: int, subject: str, taken_at: str, score: int, total_questions: int):
    if total_questions == 0 or score > total_questions // 2:
        return
    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    taken_date = datetime.fromisoformat(taken_at)
    retake_date_str = (taken_date + timedelta(days=2)).date().isoformat()
    cur.execute("SELECT id FROM study_sessions WHERE user_id = %s AND subject = %s AND date = %s AND completed = 0",
                (user_id, subject, retake_date_str))
    if cur.fetchone():
        cur.close()
        return
    title = f"Retake Quiz: {subject}"
    cur.execute("""
    INSERT INTO study_sessions (user_id, title, subject, duration, date, type, priority, completed, notes, created_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (user_id, title, subject, 60, retake_date_str, 'quiz_retake', 'high', 0,
          'You scored less than half. Prepare well for retake.', _now_ist_iso()))
    conn.commit()
    cur.close()

# ===== INITIALIZE DATABASE =====
try:
    init_db()
except Exception as e:
    print(f"Database initialization error: {e}")
    # Optionally exit app or handle this error gracefully