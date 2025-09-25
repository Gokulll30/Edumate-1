"""
SQLite helper for EduMate — robust with study session support and progress.
"""
import sqlite3
import os
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from typing import Optional, Dict, List, Any


DB_CONN = None
DB_PATH = None


# IST time helper (India Standard Time, UTC+05:30)
def _now_ist_iso():
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist).isoformat()


def _ensure_tables(conn: sqlite3.Connection):
    cur = conn.cursor()
    # users table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        name TEXT,
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
    # chats table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)
    # quiz attempts table - added user_name column
    cur.execute("""
    CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        user_name TEXT,
        subject TEXT,
        difficulty TEXT,
        num_questions INTEGER,
        score REAL,
        taken_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)
    # quiz answers table - added user_name column
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
    """
    Ensure schema changes for older DBs
    """
    try:
        cur = conn.cursor()
        # Check users table has 'name' column
        cur.execute("PRAGMA table_info(users)")
        user_cols = [r["name"] for r in cur.fetchall()]
        if "name" not in user_cols:
            cur.execute("ALTER TABLE users ADD COLUMN name TEXT")
            conn.commit()
        # Check progress table has 'total_hours' column
        cur.execute("PRAGMA table_info(progress)")
        progress_cols = [r["name"] for r in cur.fetchall()]
        if "total_hours" not in progress_cols:
            cur.execute("ALTER TABLE progress ADD COLUMN total_hours REAL DEFAULT 0")
            conn.commit()

        # Add user_name column to quiz_attempts if missing
        cur.execute("PRAGMA table_info(quiz_attempts)")
        attempt_cols = [r["name"] for r in cur.fetchall()]
        if "user_name" not in attempt_cols:
            cur.execute("ALTER TABLE quiz_attempts ADD COLUMN user_name TEXT")
            conn.commit()

        # Add user_name column to quiz_answers if missing
        cur.execute("PRAGMA table_info(quiz_answers)")
        answer_cols = [r["name"] for r in cur.fetchall()]
        if "user_name" not in answer_cols:
            cur.execute("ALTER TABLE quiz_answers ADD COLUMN user_name TEXT")
            conn.commit()

    except Exception:
        pass


def init_db(path: Optional[str] = None):
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
    global DB_CONN, DB_PATH
    if DB_CONN:
        return DB_CONN
    return init_db(DB_PATH)


def save_quiz_attempt(user_id: int, user_name: str, subject: str, difficulty: str, num_questions: int, score: float, qnas: list):
    conn = get_conn()
    cur = conn.cursor()
    taken_at = _now_ist_iso()
    cur.execute("""
        INSERT INTO quiz_attempts (user_id, user_name, subject, difficulty, num_questions, score, taken_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, user_name, subject, difficulty, num_questions, score, taken_at))
    attempt_id = cur.lastrowid
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


# ---------- User / Auth ----------


def create_user(username: str, password_plain: str, name: Optional[str] = None) -> Dict:
    conn = get_conn()
    cur = conn.cursor()
    existing = cur.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if existing:
        raise ValueError("username_exists")
    password_hash = generate_password_hash(password_plain)
    created_at = _now_ist_iso()
    cur.execute("INSERT INTO users (username, name, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (username, name, password_hash, created_at))
    user_id = cur.lastrowid
    # initialize progress row
    cur.execute("INSERT OR IGNORE INTO progress (user_id, tasks_completed, sessions_completed, tests_taken, total_hours) VALUES (?, 0, 0, 0, 0)",
                (user_id,))
    conn.commit()
    row = cur.execute("SELECT id, username, name, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else {"id": user_id, "username": username, "name": name}


def get_user_by_username(username: str) -> Optional[Dict]:
    conn = get_conn()
    row = conn.execute("SELECT id, username, name, created_at FROM users WHERE username = ?", (username,)).fetchone()
    return dict(row) if row else None


def verify_user(username: str, password_plain: str) -> Dict:
    conn = get_conn()
    cur = conn.cursor()
    row = cur.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not row:
        return {"status": "no_user"}
    if not check_password_hash(row["password_hash"], password_plain):
        return {"status": "invalid_password"}
    return {"status": "ok", "user": {"id": row["id"], "username": row["username"], "name": row["name"]}}


# ---------- Login sessions ----------


def log_login(user_id: int) -> int:
    conn = get_conn()
    cur = conn.cursor()
    login_at = _now_ist_iso()
    cur.execute("INSERT INTO login_sessions (user_id, login_at) VALUES (?, ?)", (user_id, login_at))
    conn.commit()
    return cur.lastrowid


def log_logout(session_id: int):
    conn = get_conn()
    cur = conn.cursor()
    row = cur.execute("SELECT login_at FROM login_sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        return
    login_at = datetime.fromisoformat(row["login_at"])
    ist = timezone(timedelta(hours=5, minutes=30))
    logout_at = datetime.now(ist)
    active_seconds = int((logout_at - login_at).total_seconds())
    cur.execute("UPDATE login_sessions SET logout_at = ?, active_seconds = ? WHERE id = ?",
                (logout_at.isoformat(), active_seconds, session_id))
    conn.commit()


# ---------- Study Sessions (planner) ----------


def add_study_session(user_id: int, title: str, subject: str, duration: int, date: str, time: str, type_: str, priority: str, notes: Optional[str] = None) -> Dict:
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
    conn = get_conn()
    rows = conn.execute("SELECT * FROM study_sessions WHERE user_id = ? ORDER BY date, time", (user_id,)).fetchall()
    return [dict(r) for r in rows]


def delete_study_session(session_id: int, user_id: int) -> bool:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM study_sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
    conn.commit()
    return cur.rowcount > 0


def toggle_study_completion(session_id: int, user_id: int) -> Optional[Dict]:
    conn = get_conn()
    cur = conn.cursor()
    row = cur.execute("SELECT completed FROM study_sessions WHERE id = ? AND user_id = ?", (session_id, user_id)).fetchone()
    if not row:
        return None
    newval = 0 if row["completed"] else 1
    cur.execute("UPDATE study_sessions SET completed = ? WHERE id = ? AND user_id = ?", (newval, session_id, user_id))
    conn.commit()
    return dict(cur.execute("SELECT * FROM study_sessions WHERE id = ?", (session_id,)).fetchone())


# ---------- Progress summary ----------


def compute_progress(user_id: int) -> Dict[str, Any]:
    conn = get_conn()
    cur = conn.cursor()
    total_sessions = cur.execute("SELECT COUNT(*) as c FROM study_sessions WHERE user_id = ?", (user_id,)).fetchone()["c"]
    completed_sessions = cur.execute("SELECT COUNT(*) as c FROM study_sessions WHERE user_id = ? AND completed = 1",
                                     (user_id,)).fetchone()["c"]
    total_minutes = cur.execute("SELECT COALESCE(SUM(duration),0) as s FROM study_sessions WHERE user_id = ?", (user_id,)).fetchone()["s"]
    completed_minutes = cur.execute(
        "SELECT COALESCE(SUM(duration),0) as s FROM study_sessions WHERE user_id = ? AND completed = 1", (user_id,)).fetchone()[
        "s"]
    tests_taken = cur.execute("SELECT COUNT(*) as c FROM tests WHERE user_id = ?", (user_id,)).fetchone()["c"]
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


def save_chat_message(user_id: int, role: str, content: str):
    conn = get_conn()
    cur = conn.cursor()
    timestamp = _now_ist_iso()
    cur.execute(
        "INSERT INTO chats (user_id, role, content, timestamp) VALUES (?, ?, ?, ?)",
        (user_id, role, content, timestamp)
    )
    conn.commit()
    return cur.lastrowid


def get_chat_history(user_id: int, limit: int = 50):
    conn = get_conn()
    cur = conn.cursor()
    rows = cur.execute(
        "SELECT id, user_id, role, content, timestamp FROM chats WHERE user_id = ? ORDER BY id DESC LIMIT ?",
        (user_id, limit)
    ).fetchall()
    return [dict(r) for r in rows][::-1]


try:
    init_db()
except Exception:
    pass