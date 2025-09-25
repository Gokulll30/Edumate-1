from flask import Blueprint, request, jsonify, current_app
import db
import jwt
import datetime
import os

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

JWT_SECRET = os.getenv("JWT_SECRET", "your_secret_key_here")
JWT_ALGORITHM = "HS256"
JWT_EXP_DELTA_SECONDS = 86400  # 1 day token expiry


def encode_auth_token(user_id, username):
    try:
        payload = {
            "exp": datetime.datetime.utcnow() + datetime.timedelta(seconds=JWT_EXP_DELTA_SECONDS),
            "iat": datetime.datetime.utcnow(),
            "sub": user_id,
            "username": username,
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    except Exception:
        return None


def decode_auth_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"user_id": payload["sub"], "username": payload["username"]}
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


@auth_bp.route("/signup", methods=["POST"])
def signup():
    print("Signup endpoint hit")
    try:
        data = request.get_json(force=True) or {}
    except Exception as e:
        current_app.logger.error("Failed to parse JSON: %s", e)
        return jsonify({"success": False, "error": "invalid_json"}), 400

    name = data.get("name", "") or ""
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"success": False, "error": "missing_fields"}), 400

    try:
        user = db.create_user(email, password, name)
        return jsonify({"success": True, "user": user}), 201
    except ValueError as e:
        if str(e) == "username_exists":
            return jsonify({"success": False, "error": "username_exists"}), 400
        current_app.logger.error("Signup failed ValueError: %s", e)
        return jsonify({"success": False, "error": "unknown"}), 500
    except Exception as e:
        current_app.logger.error("Internal error in signup: %s", e, exc_info=True)
        return jsonify({"success": False, "error": "server_error", "detail": str(e)}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    print("Login endpoint hit")
    try:
        data = request.get_json(force=True) or {}
    except Exception as e:
        current_app.logger.error("Failed to parse JSON: %s", e)
        return jsonify({"success": False, "error": "invalid_json"}), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"success": False, "error": "missing_fields"}), 400

    try:
        result = db.verify_user(email, password)

        if result.get("status") == "no_user":
            return jsonify({"success": False, "error": "no_user"}), 404
        if result.get("status") == "invalid_password":
            return jsonify({"success": False, "error": "invalid_password"}), 401

        user = result.get("user")
        token = encode_auth_token(user["id"], user["username"])
        if not token:
            raise Exception("Token generation failed")

        try:
            db.log_login(int(user["id"]))
        except Exception as e:
            current_app.logger.warning("Failed to log login: %s", e)
            pass

        progress = db.compute_progress(int(user["id"]))
        return jsonify({"success": True, "user": user, "token": token, "progress": progress}), 200

    except Exception as e:
        current_app.logger.error("Internal error in login: %s", e, exc_info=True)
        return jsonify({"success": False, "error": "server_error", "detail": str(e)}), 500
