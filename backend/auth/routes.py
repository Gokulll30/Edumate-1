from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.security import check_password_hash, generate_password_hash
import sqlite3
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

SECRET_KEY = 'Kjs8u9dxw7Gkn2LbVbXEcmJNv4Y6Tq1D'

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(current_app.config.get('DATABASE', 'data/edumate.sqlite3'))
        g.db.row_factory = sqlite3.Row
    return g.db

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
        username = data.get('username') or data.get('email')
        password = data.get('password')

        if not username or not password:
            return jsonify({'success': False, 'error': 'Username and password required'}), 400

        db = get_db()
        user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()

        if user is None or not check_password_hash(user['password_hash'], password):
            return jsonify({'success': False, 'error': 'Invalid username or password'}), 401

        user_data = {key: user[key] for key in user.keys() if key != 'password_hash'}
        token = create_auth_token(user_data)

        # Log successful login (optional)
        try:
            db.execute("""
                INSERT INTO login_sessions (user_id, login_at) 
                VALUES (?, datetime('now'))
            """, (user['id'],))
            db.commit()
        except:
            pass  # Continue even if logging fails

        return jsonify({'success': True, 'token': token, 'user': user_data})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json(force=True)
        username = data.get('username')
        password = data.get('password')
        email = data.get('email', '')  # Optional email field

        if not username or not password:
            return jsonify({'success': False, 'error': 'Username and password required'}), 400

        db = get_db()
        exist = db.execute('SELECT 1 FROM users WHERE username = ?', (username,)).fetchone()
        if exist:
            return jsonify({'success': False, 'error': 'Username already taken'}), 400

        pw_hash = generate_password_hash(password)
        
        # Handle different user table structures
        try:
            # Try with email column first
            db.execute('INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, datetime("now"))', 
                      (username, email, pw_hash))
        except sqlite3.OperationalError:
            # Fall back to basic structure
            try:
                db.execute('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, datetime("now"))', 
                          (username, pw_hash))
            except sqlite3.OperationalError:
                # Most basic structure
                db.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', 
                          (username, pw_hash))
        
        db.commit()

        user = db.execute('SELECT id, username FROM users WHERE username = ?', (username,)).fetchone()
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

    db = get_db()
    user = db.execute('SELECT id, username FROM users WHERE username = ?', (user_data["username"],)).fetchone()
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
                db = get_db()
                # Update last login session logout time
                db.execute("""
                    UPDATE login_sessions 
                    SET logout_at = datetime('now'),
                        active_seconds = (strftime('%s', datetime('now')) - strftime('%s', login_at))
                    WHERE user_id = ? AND logout_at IS NULL
                    ORDER BY login_at DESC LIMIT 1
                """, (user_data["id"],))
                db.commit()
            except:
                pass  # Continue even if logging fails
    
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
        db = get_db()
        user = db.execute('SELECT * FROM users WHERE username = ?', (user_data["username"],)).fetchone()
        return dict(user) if user else None
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
