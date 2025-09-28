from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.security import check_password_hash, generate_password_hash
import sqlite3
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

SECRET_KEY='Kjs8u9dxw7Gkn2LbVbXEcmJNv4Y6Tq1D'


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

        return jsonify({'success': True, 'token': token, 'user': user_data})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json(force=True)
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'success': False, 'error': 'Username and password required'}), 400

        db = get_db()
        exist = db.execute('SELECT 1 FROM users WHERE username = ?', (username,)).fetchone()
        if exist:
            return jsonify({'success': False, 'error': 'Username already taken'}), 400

        pw_hash = generate_password_hash(password)
        db.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', (username, pw_hash))
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
