import os
from groq import Groq
from dotenv import load_dotenv
from typing import Optional
from db import save_chat_message, get_session_by_id, set_session_title

# Load environment variables
load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# In-memory chat history
chat_history = []

def get_groq_response(user_message: str, max_tokens: int = 1000, remember: bool = True):
    """
    Get response from Groq AI
    """
    global chat_history

    # Add user message to history
    if remember:
        chat_history.append({"role": "user", "content": user_message})

    # Build messages including history
    messages = [
        {"role": "system", "content": "You are EduMate, a helpful AI study assistant."}
    ]

    if remember:
        messages += chat_history
    else:
        messages.append({"role": "user", "content": user_message})

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",  # or "llama-3.2-8b-instant"
            messages=messages,
            max_tokens=max_tokens,
        )
        # Extract AI response
        ai_message = response.choices[0].message.content.strip()

        # Add AI message to history
        if remember:
            chat_history.append({"role": "assistant", "content": ai_message})

        return ai_message
    except Exception as e:
        return f"Error: {str(e)}"

def clear_chat_history():
    """Call this to reset the conversation memory."""
    global chat_history
    chat_history = []

def get_chat_response(message: str, user_id: Optional[int], session_id: Optional[int] = None) -> str:
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
            save_chat_message(user_id, "user", message, session_id)
        except Exception as e:
            # log but continue — we still want to return a reply
            print("Warning: failed to save user message:", e)

        # After saving the user message, try to generate a short session title
        # from the user's first message so the UI shows a meaningful name.
        try:
            if session_id is not None:
                sess = get_session_by_id(session_id)
                if sess and (not sess.get('title') or sess.get('title') == 'New Chat'):
                    # Simple heuristic: take up to first 6 words, remove newlines, limit length
                    def _make_title(text: str) -> str:
                        s = text.strip().split('\n')[0]
                        words = s.split()
                        title = ' '.join(words[:6])
                        if len(title) > 40:
                            title = title[:40].rstrip() + '..'
                        # sanitize
                        return title.replace("'", "").replace('"', '')

                    gen = _make_title(message)
                    if gen:
                        try:
                            set_session_title(session_id, gen)
                        except Exception as e:
                            print("Warning: failed to set session title:", e)
        except Exception as e:
            print("Warning while generating session title:", e)

        # Generate reply using Groq
        bot_reply = get_groq_response(message)

        # Save bot reply in DB (role 'bot')
        try:
            save_chat_message(user_id, "bot", bot_reply, session_id)
        except Exception as e:
            print("Warning: failed to save bot message:", e)

        return bot_reply

    except Exception as e:
        # Last-resort fallback string so the route doesn't crash.
        print("Error in get_chat_response:", e)
        return "Sorry — something went wrong while preparing the reply."

# Expose functions from this module
__all__ = ["get_chat_response", "clear_chat_history"]
