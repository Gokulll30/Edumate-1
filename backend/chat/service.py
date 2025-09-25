# backend/chat/service.py
"""
Service layer for chat logic.
Provides get_chat_response(message, user_id) which:
 - saves the incoming user message to the chats table
 - generates a reply (stubbed here; replace with real LLM call)
 - saves the bot reply to the chats table
 - returns the reply text
"""

from typing import Optional
from db import save_chat_message  # uses the DB helper you already have
import traceback
import html

def _generate_bot_reply_stub(user_message: str) -> str:
    """
    Minimal, safe stub reply generator.
    Replace this with an LLM / external AI call when ready.
    """
    # keep reply short and deterministic; sanitize to avoid accidental HTML injection
    safe_msg = html.escape(user_message.strip())
    if not safe_msg:
        return "I didn't receive any text. Please type your question or upload your notes."
    # Simple canned responses for common intents (you can expand)
    lower = safe_msg.lower()
    if "quiz" in lower or "generate quiz" in lower or "make a quiz" in lower:
        return "Sure — I can generate a quiz from your materials. Upload the file and tell me the difficulty you'd like (easy/medium/hard)."
    if "schedule" in lower or "study plan" in lower:
        return "I can help create a study schedule. Tell me the exam date, subjects and how many hours per day you can study."
    if "hello" in lower or "hi" in lower:
        return "Hello! How can I help you with your studies today?"
    # default echo-style answer with guidance
    return f"I received your message: \"{safe_msg}\". Tell me what you'd like me to do (summarize, make a quiz, create a plan, explain a concept, etc.)."

def get_chat_response(message: str, user_id: Optional[int]) -> str:
    """
    Main entrypoint used by the Flask route.
    - message: full user message (may include appended fileText context)
    - user_id: database user id (or None for anonymous)
    Returns: bot reply string
    Saves both user and bot messages to the `chats` table.
    """
    try:
        # Save the user message in DB (role 'user')
        try:
            save_quit = save_chat_message(user_id, "user", message)
        except Exception as e:
            # log but continue — we still want to return a reply
            print("Warning: failed to save user message:", e)
            traceback.print_exc()

        # Generate reply (stub). Replace this call with your LLM integration.
        bot_reply = _generate_bot_reply_stub(message)

        # Save bot reply in DB (role 'bot')
        try:
            save_chat_message(user_id, "bot", bot_reply)
        except Exception as e:
            print("Warning: failed to save bot message:", e)
            traceback.print_exc()

        return bot_reply
    except Exception as e:
        # Last-resort fallback string so the route doesn't crash.
        print("Error in get_chat_response:", e)
        traceback.print_exc()
        return "Sorry — something went wrong while preparing the reply."

# Expose only get_chat_response from this module.
__all__ = ["get_chat_response"]
