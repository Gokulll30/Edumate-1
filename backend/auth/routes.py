from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
from db import get_db_connection

load_dotenv()

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")
SECRET_KEY = 'Kjs8u9dxw7Gkn2LbVbXEcmJNv4Y6Tq1D'

def create_auth_token(user_data):
    """
    Create a JWT token with user id and username, valid for 7 days
    """
    payload = {
        "id": user_data["id"],
        "username": user_data["username"],
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token

def decode_auth_token(token):
    """
    Decode the JWT token and return the payload or None if invalid/expired
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json(force=True)
        login_input = data.get('username') or data.get('email')
        password = data.get('password')

        if not login_input or not password:
            return jsonify({'success': False, 'error': 'Username/email and password required'}), 400

        conn = get_db_connection()

        # --- Use a fresh cursor for each query ---
        # 1. SELECT user by username or email
        select_cur = conn.cursor(dictionary=True)
        select_cur.execute('SELECT * FROM users WHERE username = %s OR email = %s', (login_input, login_input))
        user = select_cur.fetchone()
        select_cur.close()  # Always close SELECT cursor after fetching

        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'success': False, 'error': 'Invalid username or password'}), 401

        user_data = {k: user[k] for k in user.keys() if k != 'password_hash'}
        token = create_auth_token(user_data)

        # 2. Log successful login (separate cursor)
        try:
            log_cur = conn.cursor()
            log_cur.execute(
                "INSERT INTO login_sessions (user_id, login_at) VALUES (%s, %s)",
                (user['id'], datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            )
            conn.commit()
            log_cur.close()
        except Exception:
            pass

        return jsonify({'success': True, 'token': token, 'user': user_data})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json(force=True)
        username = data.get('username')
        password = data.get('password')
        email = data.get('email', '')

        if not username or not password:
            return jsonify({'success': False, 'error': 'Username and password required'}), 400

        conn = get_db_connection()
        # 1. Check existence
        exist_cur = conn.cursor(dictionary=True)
        exist_cur.execute('SELECT 1 FROM users WHERE username = %s', (username,))
        exist = exist_cur.fetchone()
        exist_cur.close()
        if exist:
            return jsonify({'success': False, 'error': 'Username already taken'}), 400

        # 2. Insert new user
        pw_hash = generate_password_hash(password)
        insert_cur = conn.cursor()
        insert_cur.execute(
            'INSERT INTO users (username, email, password_hash, created_at) VALUES (%s, %s, %s, %s)',
            (username, email, pw_hash, datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        )
        conn.commit()
        insert_cur.close()

        # 3. Get user for response
        fetch_cur = conn.cursor(dictionary=True)
        fetch_cur.execute('SELECT id, username FROM users WHERE username = %s', (username,))
        user = fetch_cur.fetchone()
        fetch_cur.close()
        user_data = {"id": user["id"], "username": user["username"]}
        token = create_auth_token(user_data)

        return jsonify({'success': True, 'token': token, 'user': user_data}), 201

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/profile', methods=['GET'])
def profile():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"error": "Token required"}), 401

    user_data = decode_auth_token(token)
    if not user_data:
        return jsonify({"error": "Invalid or expired token"}), 401

    conn = get_db_connection()
    cur = conn.cursor(dictionary=True)
    cur.execute('SELECT id, username FROM users WHERE username = %s', (user_data["username"],))
    user = cur.fetchone()
    cur.close()
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"id": user["id"], "username": user["username"]})

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Logout endpoint - mainly for frontend to clear token
    Can also update login_sessions table if needed
    """
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if token:
        user_data = decode_auth_token(token)
        if user_data:
            try:
                conn = get_db_connection()
                logout_cur = conn.cursor()
                logout_cur.execute("""
                    UPDATE login_sessions 
                    SET logout_at = %s,
                        active_seconds = TIMESTAMPDIFF(SECOND, login_at, %s)
                    WHERE user_id = %s AND logout_at IS NULL
                    ORDER BY login_at DESC LIMIT 1
                """, (datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                      datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                      user_data["id"]))
                conn.commit()
                logout_cur.close()
            except Exception:
                pass

    return jsonify({'success': True, 'message': 'Logged out successfully'})

@auth_bp.route('/verify', methods=['GET'])
def verify_token():
    """
    Verify if a token is still valid
    """
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"valid": False, "error": "No token provided"}), 401

    user_data = decode_auth_token(token)
    if not user_data:
        return jsonify({"valid": False, "error": "Invalid or expired token"}), 401

    return jsonify({"valid": True, "user": {"id": user_data["id"], "username": user_data["username"]}})

# Helper function for other routes to get authenticated user
def get_user_from_token():
    """
    Helper function to get user from auth token - can be imported by other routes
    """
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None

    user_data = decode_auth_token(token)
    if user_data and "username" in user_data:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute('SELECT * FROM users WHERE username = %s', (user_data["username"],))
        user = cur.fetchone()
        cur.close()
        return user
    return None

# JSON error handlers
@auth_bp.app_errorhandler(404)
def handle_404(e):
    return jsonify({'success': False, 'error': 'Not found'}), 404

@auth_bp.app_errorhandler(405)
def handle_405(e):
    return jsonify({'success': False, 'error': 'Method not allowed'}), 405

@auth_bp.app_errorhandler(500)
def handle_500(e):
    return jsonify({'success': False, 'error': 'Internal server error'}), 500
