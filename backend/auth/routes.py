from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.security import check_password_hash, generate_password_hash
import sqlite3

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(current_app.config.get('DATABASE', 'data/edumate.sqlite3'))
        g.db.row_factory = sqlite3.Row
    return g.db

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json(force=True)
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'success': False, 'error': 'Username and password required'}), 400

        db = get_db()
        user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()

        if user is None or not check_password_hash(user['password_hash'], password):
            return jsonify({'success': False, 'error': 'Invalid username or password'}), 401

        user_data = {key: user[key] for key in user.keys() if key != 'password_hash'}
        # TODO: Add session or token generation here
        return jsonify({'success': True, 'user': user_data})

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
        return jsonify({'success': True, 'user': dict(user)}), 201

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

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
