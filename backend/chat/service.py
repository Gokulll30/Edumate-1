import os
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# In-memory chat history
chat_history = []

def get_chat_response(user_message: str, max_tokens: int = 1000, remember: bool = True):
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
