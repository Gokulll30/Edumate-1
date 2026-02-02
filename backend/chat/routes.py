
from flask import Blueprint, request, jsonify, Response, stream_with_context
import os
import requests
from db import (
    get_db_connection,
    get_chat_history,
    get_user_by_username,
    get_chat_sessions,
    get_chat_sessions_by_ids,
    delete_chat_session_anonymous,
    create_chat_session,
    delete_chat_session,
    rename_chat_session,
    save_chat_message,
)
from auth.routes import decode_auth_token
from chat.service import get_chat_response
from chat.service import get_groq_response


# Define blueprint without url_prefix — the prefix is applied when registering in app.py
chat_bp = Blueprint("chat", __name__)

@chat_bp.route("", methods=["POST"])
@chat_bp.route("/", methods=["POST"])
def chat():
    print("chat route called")  # Debug print for route hit
    
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    data = request.get_json()
    user = None
    
    if token:
        user_data = decode_auth_token(token)
        if user_data and "username" in user_data:
            user = get_user_by_username(user_data["username"])
    
    user_id = user["id"] if user else None
    
    if "message" not in data:
        return jsonify({"error": "No message provided"}), 400
    
    user_message = data.get("message", "")
    session_id = data.get("session_id")
    # Ensure session_id is an int if provided
    try:
        session_id = int(session_id) if session_id is not None else None
    except Exception:
        session_id = None
    file_text = data.get("fileText", "")  # Context from uploaded file if any
    
    # Combine user message and file text if provided
    combined_message = user_message
    if file_text:
        combined_message = f"{user_message}\n\nContext from uploaded file:\n{file_text}"
    
    # If no session_id provided, create a session (user_id may be None for anonymous sessions)
    if session_id is None:
        try:
            session_id = create_chat_session(user_id, "New Chat")
        except Exception as e:
            print("Warning: failed to create chat session:", e)

    # Get response using Groq (pass session_id so DB messages are grouped)
    bot_reply = get_chat_response(combined_message, user_id, session_id)

    return jsonify({"reply": bot_reply, "success": True, "session_id": session_id})


@chat_bp.route("/stream", methods=["POST"])
def chat_stream():
    """Streaming endpoint: returns Server-Sent-Event style chunks of the reply.
    This simulates streaming for clients that want incremental updates.
    """
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    data = request.get_json() or {}
    user = None
    if token:
        user_data = decode_auth_token(token)
        if user_data and "username" in user_data:
            user = get_user_by_username(user_data["username"])

    user_id = user["id"] if user else None

    user_message = data.get("message", "")
    session_id = data.get("session_id")
    try:
        session_id = int(session_id) if session_id is not None else None
    except Exception:
        session_id = None
    file_text = data.get("fileText", "")

    combined_message = user_message
    if file_text:
        combined_message = f"{user_message}\n\nContext from uploaded file:\n{file_text}"

    # ensure session
    if session_id is None:
        try:
            session_id = create_chat_session(user_id, "New Chat")
        except Exception as e:
            print("Warning: failed to create chat session:", e)

    # Save user message (non-blocking for stream)
    try:
        save_chat_message(user_id, "user", combined_message, session_id)
    except Exception as e:
        print("Warning: failed to save user message (stream):", e)

    def generate():
        # Generate full reply (optimized by service)
        bot_reply = ""
        try:
            bot_reply = get_groq_response(combined_message)
        except Exception as e:
            bot_reply = f"Error: {str(e)}"

        # Stream out the reply in small chunks to simulate real-time typing
        try:
            chunk_size = 40
            for i in range(0, len(bot_reply), chunk_size):
                chunk = bot_reply[i : i + chunk_size]
                # SSE-style minimal framing
                yield f"data: {chunk}\n\n"
                import time

                time.sleep(0.04)
        finally:
            # After streaming completes, save bot reply to DB
            try:
                save_chat_message(user_id, "bot", bot_reply, session_id)
            except Exception as e:
                print("Warning: failed to save bot message (stream):", e)

    return Response(stream_with_context(generate()), mimetype="text/event-stream")


@chat_bp.route("/youtube/search", methods=["POST"])
def youtube_search():
    """Search YouTube for a query using server-side API key and return top results.
    Expects JSON body: { query: string, maxResults?: number }
    """
    data = request.get_json() or {}
    query = data.get("query")
    max_results = int(data.get("maxResults", 2))
    if not query:
        return jsonify({"success": False, "error": "No query provided"}), 400

    api_key = os.getenv("YOUTUBE_API_KEY")
    if not api_key:
        return jsonify({"success": False, "error": "YOUTUBE_API_KEY not configured on server"}), 500

    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max_results,
        "key": api_key,
    }

    try:
        resp = requests.get(url, params=params, timeout=8)
        if resp.status_code != 200:
            return jsonify({"success": False, "error": "YouTube API error", "details": resp.text}), resp.status_code
        body = resp.json()
        videos = []
        for item in body.get("items", []):
            vid = item.get("id", {}).get("videoId")
            snip = item.get("snippet", {})
            if not vid:
                continue
            videos.append({
                "videoId": vid,
                "title": snip.get("title"),
                "description": snip.get("description"),
                "channelTitle": snip.get("channelTitle"),
                "thumbnail": (snip.get("thumbnails") or {}).get("high", {}).get("url") or (snip.get("thumbnails") or {}).get("default", {}).get("url"),
                "publishTime": snip.get("publishTime"),
            })

        return jsonify({"success": True, "videos": videos})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@chat_bp.route("/history", methods=["GET"])
def chat_history():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = None
    
    if token:
        user_data = decode_auth_token(token)
        if user_data and "username" in user_data:
            user = get_user_by_username(user_data["username"])
    
    user_id = user["id"] if user else None

    limit = int(request.args.get("limit", 50))
    session_id = request.args.get("session_id")
    session_id = int(session_id) if session_id else None

    # If session_id provided, allow fetching history by session even for anonymous users
    if session_id is not None:
        history = get_chat_history(user_id, limit, session_id)
        return jsonify({"history": history})

    if not user_id:
        return jsonify({"history": []})

    history = get_chat_history(user_id, limit, None)
    return jsonify({"history": history})


@chat_bp.route("/sessions", methods=["GET", "POST"])
def chat_sessions():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = None

    if token:
        user_data = decode_auth_token(token)
        if user_data and "username" in user_data:
            user = get_user_by_username(user_data["username"])

    user_id = user["id"] if user else None

    if request.method == "GET":
        # Allow clients to request specific session ids (useful for anonymous users
        # that keep a list of session ids in localStorage). If `ids` query param is
        # present, return those sessions regardless of authentication.
        ids_param = request.args.get("ids")
        if ids_param:
            try:
                ids = [int(x) for x in ids_param.split(",") if x.strip()]
                sessions = get_chat_sessions_by_ids(ids)
                return jsonify({"success": True, "sessions": sessions})
            except Exception:
                return jsonify({"success": False, "sessions": [], "error": "Invalid ids parameter"}), 400

        # If no ids param provided, require authentication to list user sessions
        if not user_id:
            return jsonify({"success": True, "sessions": []})
        sessions = get_chat_sessions(user_id)
        return jsonify({"success": True, "sessions": sessions})

    # POST -> create new session
    data = request.get_json() or {}
    title = data.get("title", "New Chat")
    # Allow creating sessions for anonymous users (user_id may be None)
    session_id = create_chat_session(user_id, title)
    return jsonify({"success": True, "session_id": session_id})


@chat_bp.route("/sessions/<int:session_id>", methods=["DELETE", "PUT"])
def chat_session_modify(session_id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = None

    if token:
        user_data = decode_auth_token(token)
        if user_data and "username" in user_data:
            user = get_user_by_username(user_data["username"])

    user_id = user["id"] if user else None
    if request.method == "DELETE":
        # Allow anonymous deletion if the session belongs to an anonymous creator
        if not user_id:
            ok = delete_chat_session_anonymous(session_id)
            return jsonify({"success": bool(ok)})

        ok = delete_chat_session(session_id, user_id)
        return jsonify({"success": bool(ok)})

    # PUT -> rename
    data = request.get_json() or {}
    title = data.get("title")
    if not title:
        return jsonify({"success": False, "error": "No title provided"}), 400
    ok = rename_chat_session(session_id, title, user_id)
    return jsonify({"success": bool(ok)})
