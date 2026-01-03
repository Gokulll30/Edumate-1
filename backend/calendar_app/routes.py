# backend/calendar_app/routes.py
"""
Google Calendar Integration Routes
Handles OAuth flow and calendar operations with MySQL backend
FIXED: Session persistence issue + AI scheduled tests support
"""

import requests
from db import get_user_email_by_id, get_db_connection
from flask import Blueprint, request, jsonify, redirect, session
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest
from datetime import datetime, timedelta
import json
import os
import uuid
import secrets

calendar_bp = Blueprint('calendar', __name__, url_prefix='/calendar_app')

# OAuth Configuration
SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'openid',
    'https://www.googleapis.com/auth/userinfo.email'
]

# Try secret files path first (works on Render production)
if os.path.exists('/etc/secrets/client_secret.json'):
    CLIENT_SECRETS_FILE = '/etc/secrets/client_secret.json'
else:
    # fallback for local/dev
    CLIENT_SECRETS_FILE = os.path.join(os.path.dirname(__file__), '..', 'client_secret.json')

with open(CLIENT_SECRETS_FILE) as f:
    secret = json.load(f)

REDIRECT_URI = os.environ.get('REDIRECT_URI', 'https://edumate-2026.vercel.app/calendar_app/oauth2callback')


# ===== HELPER FUNCTIONS =====
def generate_oauth_state():
    """Generate and store OAuth state in database"""
    state = secrets.token_urlsafe(32)
    return state


def save_oauth_state(state, user_id, user_email):
    """Save OAuth state to database instead of session"""
    try:
        db = get_db_connection()
        cur = db.cursor()
        expires_at = (datetime.now() + timedelta(minutes=10)).strftime('%Y-%m-%d %H:%M:%S')
        cur.execute('''
            INSERT INTO oauth_states (state, user_id, user_email, expires_at)
            VALUES (%s, %s, %s, %s)
        ''', (state, user_id, user_email, expires_at))
        db.commit()
        cur.close()
        db.close()
        return True
    except Exception as e:
        print(f"Error saving OAuth state: {e}")
        return False


def verify_and_consume_oauth_state(state, user_id):
    """Verify OAuth state from database and mark as used"""
    try:
        db = get_db_connection()
        cur = db.cursor(dictionary=True)
        
        # Check if state exists and is valid
        cur.execute('''
            SELECT * FROM oauth_states 
            WHERE state = %s AND user_id = %s AND expires_at > NOW()
        ''', (state, user_id))
        
        result = cur.fetchone()
        
        if result:
            # Mark as consumed
            cur.execute('DELETE FROM oauth_states WHERE state = %s', (state,))
            db.commit()
            cur.close()
            db.close()
            return True, result.get('user_email')
        else:
            cur.close()
            db.close()
            return False, None
    except Exception as e:
        print(f"Error verifying OAuth state: {e}")
        return False, None


# ===== OAUTH ROUTES =====

@calendar_bp.route('/connect', methods=['GET'])
def connect_calendar():
    """Initiate Google Calendar OAuth flow"""
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'success': False, 'error': 'User ID required'}), 400

    try:
        user_email = get_user_email_by_id(int(user_id))
        if not user_email:
            return jsonify({'success': False, 'error': 'Email not found for user'}), 404

        # Generate state and save to database
        state = generate_oauth_state()
        if not save_oauth_state(state, user_id, user_email):
            return jsonify({'success': False, 'error': 'Failed to initialize connection'}), 500

        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )

        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            login_hint=user_email,
            state=state  # Use our custom state
        )

        return jsonify({
            'success': True,
            'authUrl': authorization_url,
            'state': state
        })
    except Exception as e:
        print(f"Error in connect_calendar: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@calendar_bp.route('/oauth2callback', methods=['GET'])
def oauth2callback():
    """Handle OAuth callback from Google"""
    try:
        state = request.args.get('state')
        code = request.args.get('code')
        error = request.args.get('error')
        user_id = request.args.get('user_id')

        # Handle OAuth errors
        if error:
            return f'''
            <html>
            <head><title>Authorization Error</title></head>
            <body style="font-family: Arial; text-align: center; padding: 40px;">
                <h2>❌ Authorization Failed</h2>
                <p>Error: {error}</p>
                <p>Please try connecting again from the application.</p>
                <a href="https://edumate-2026.vercel.app" style="color: #6366f1;">Go back to application</a>
            </body>
            </html>
            ''', 400

        # Get user_id from session if not in URL
        if not user_id:
            user_id = session.get('user_id')

        if not state or not code or not user_id:
            return '''
            <html>
            <head><title>Invalid Request</title></head>
            <body style="font-family: Arial; text-align: center; padding: 40px;">
                <h2>❌ Invalid Request</h2>
                <p>Missing required parameters.</p>
                <p>Please try connecting again from the application.</p>
                <a href="https://edumate-2026.vercel.app" style="color: #6366f1;">Go back to application</a>
            </body>
            </html>
            ''', 400

        # Verify state from database
        state_valid, user_email = verify_and_consume_oauth_state(state, user_id)
        if not state_valid:
            return '''
            <html>
            <head><title>Session Expired</title></head>
            <body style="font-family: Arial; text-align: center; padding: 40px;">
                <h2>❌ Session Expired</h2>
                <p>Your authorization request has expired.</p>
                <p>Please try connecting again from the application.</p>
                <a href="https://edumate-2026.vercel.app" style="color: #6366f1;">Go back to application</a>
            </body>
            </html>
            ''', 400

        # Exchange code for credentials
        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI,
            state=state
        )

        flow.fetch_token(authorization_response=request.url)
        credentials = flow.credentials

        # Save credentials to database
        db = get_db_connection()
        cur = db.cursor()
        
        credentials_data = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }

        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        cur.execute('''
            INSERT INTO calendar_tokens (user_id, email, credentials, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
            email = VALUES(email),
            credentials = VALUES(credentials),
            updated_at = VALUES(updated_at)
        ''', (user_id, user_email, json.dumps(credentials_data), now, now))

        db.commit()
        cur.close()
        db.close()

        # Clear session data
        session.pop('state', None)
        session.pop('user_id', None)
        session.pop('user_email', None)

        return '''
        <html>
        <head>
            <title>Authorization Successful</title>
            <script>
                window.addEventListener('load', function() {
                    setTimeout(function() {
                        window.location.href = 'https://edumate-2026.vercel.app/study-planner';
                    }, 2000);
                });
            </script>
        </head>
        <body style="font-family: Arial; text-align: center; padding: 40px;">
            <h2>✅ Google Calendar Connected Successfully!</h2>
            <p>Your account has been connected.</p>
            <p>Redirecting you back to the application...</p>
            <a href="https://edumate-2026.vercel.app/study-planner" style="color: #6366f1;">Click here if not redirected</a>
        </body>
        </html>
        '''
    except Exception as e:
        print(f"Error in oauth2callback: {e}")
        return f'''
        <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial; text-align: center; padding: 40px;">
            <h2>❌ Connection Failed</h2>
            <p>Error: {str(e)}</p>
            <p>Please try connecting again from the application.</p>
            <a href="https://edumate-2026.vercel.app" style="color: #6366f1;">Go back to application</a>
        </body>
        </html>
        ''', 500


@calendar_bp.route('/disconnect', methods=['POST'])
def disconnect_calendar():
    """Disconnect Google Calendar"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'User ID required'}), 400

        db = get_db_connection()
        cur = db.cursor()
        cur.execute('DELETE FROM calendar_tokens WHERE user_id = %s', (user_id,))
        db.commit()
        cur.close()
        db.close()

        return jsonify({'success': True, 'message': 'Calendar disconnected'})
    except Exception as e:
        print(f"Error in disconnect_calendar: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@calendar_bp.route('/status', methods=['GET'])
def calendar_status():
    """Get calendar connection status"""
    try:
        user_id = request.args.get('userId')
        if not user_id:
            return jsonify({'success': False, 'error': 'User ID required'}), 400

        db = get_db_connection()
        cur = db.cursor(dictionary=True)
        cur.execute('SELECT * FROM calendar_tokens WHERE user_id = %s', (user_id,))
        result = cur.fetchone()
        cur.close()
        db.close()

        if result:
            return jsonify({
                'success': True,
                'connected': True,
                'email': result.get('email'),
                'connectedAt': result.get('created_at')
            })
        else:
            return jsonify({
                'success': True,
                'connected': False
            })
    except Exception as e:
        print(f"Error in calendar_status: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@calendar_bp.route('/add-event', methods=['POST'])
def add_event():
    """Add a test to Google Calendar (manual add from UI)"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        topic = data.get('topic')
        event_date = data.get('event_date')
        difficulty = data.get('difficulty', 'medium')

        if not all([user_id, topic, event_date]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400

        db = get_db_connection()
        cur = db.cursor(dictionary=True)
        cur.execute('SELECT credentials FROM calendar_tokens WHERE user_id = %s', (user_id,))
        token_row = cur.fetchone()
        cur.close()
        db.close()

        if not token_row or not token_row['credentials']:
            return jsonify({'success': False, 'error': 'Calendar not connected'}), 400

        credentials_data = json.loads(token_row['credentials'])
        credentials = Credentials(
            token=credentials_data['token'],
            refresh_token=credentials_data.get('refresh_token'),
            token_uri=credentials_data.get('token_uri'),
            client_id=credentials_data.get('client_id'),
            client_secret=credentials_data.get('client_secret'),
            scopes=credentials_data.get('scopes', SCOPES)
        )

        # Refresh token if expired
        if credentials.expired and credentials.refresh_token:
            request_obj = GoogleRequest()
            credentials.refresh(request_obj)

        service = build('calendar', 'v3', credentials=credentials)

        if isinstance(event_date, str):
            from dateutil import parser as date_parser
            event_datetime = date_parser.isoparse(event_date)
        else:
            event_datetime = event_date

        event = {
            'summary': f'📝 {topic} - {difficulty.upper()} Quiz',
            'description': f'Quiz\nTopic: {topic}\nDifficulty: {difficulty}',
            'start': {
                'dateTime': event_datetime.isoformat(),
                'timeZone': 'UTC'
            },
            'end': {
                'dateTime': (event_datetime + timedelta(hours=1)).isoformat(),
                'timeZone': 'UTC'
            },
            'colorId': '1' if difficulty == 'easy' else ('2' if difficulty == 'hard' else '3'),
        }

        created_event = service.events().insert(calendarId='primary', body=event).execute()

        return jsonify({
            'success': True,
            'eventId': created_event.get('id'),
            'message': f'Event created for {topic}'
        })
    except Exception as e:
        print(f"Error creating event: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ===== AI AGENT INTEGRATION =====

def create_calendar_event_for_test(user_id, topic, scheduled_date, difficulty='medium'):
    """
    Helper function called by AI agent service.py to create Google Calendar event
    Returns True on success, False if calendar not connected
    """
    try:
        db = get_db_connection()
        cur = db.cursor(dictionary=True)
        cur.execute('SELECT credentials FROM calendar_tokens WHERE user_id = %s', (user_id,))
        token_row = cur.fetchone()
        cur.close()
        db.close()

        if not token_row or not token_row['credentials']:
            print(f"⚠️ User {user_id} hasn't connected Google Calendar - skipping GCal event")
            return False

        # Parse stored credentials
        credentials_data = json.loads(token_row['credentials'])
        credentials = Credentials(
            token=credentials_data['token'],
            refresh_token=credentials_data.get('refresh_token'),
            token_uri=credentials_data.get('token_uri'),
            client_id=credentials_data.get('client_id'),
            client_secret=credentials_data.get('client_secret'),
            scopes=credentials_data.get('scopes', SCOPES)
        )

        # Refresh expired token
        if credentials.expired and credentials.refresh_token:
            request_obj = GoogleRequest()
            credentials.refresh(request_obj)

        # Build calendar service
        service = build('calendar', 'v3', credentials=credentials)

        # Parse datetime
        if isinstance(scheduled_date, str):
            from dateutil import parser as date_parser
            test_datetime = date_parser.isoparse(scheduled_date)
        else:
            test_datetime = scheduled_date

        # Create event
        event = {
            'summary': f'📝 {topic} - {difficulty.upper()} Quiz',
            'description': f'AI-Scheduled Quiz\nTopic: {topic}\nDifficulty: {difficulty}\nScheduled by: AI Agent',
            'start': {
                'dateTime': test_datetime.isoformat(),
                'timeZone': 'UTC'
            },
            'end': {
                'dateTime': (test_datetime + timedelta(hours=1)).isoformat(),
                'timeZone': 'UTC'
            },
            'colorId': '1' if difficulty == 'easy' else ('2' if difficulty == 'hard' else '3'),
            'extendedProperties': {
                'private': {
                    'ai_scheduled': 'true',
                    'topic': topic,
                    'difficulty': difficulty
                }
            }
        }

        # Insert event
        created_event = service.events().insert(calendarId='primary', body=event).execute()
        print(f"📅 Created GCal event: {topic} (ID: {created_event.get('id')})")
        return True
    except Exception as e:
        print(f"❌ Error in create_calendar_event_for_test: {str(e)}")
        return False


@calendar_bp.route('/create-ai-event', methods=['POST'])
def create_ai_scheduled_event():
    """
    REST endpoint for creating AI-scheduled calendar events
    Called by service.py or frontend to sync scheduled tests to GCal
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        topic = data.get('topic')
        scheduled_date = data.get('scheduled_date')
        difficulty = data.get('difficulty', 'medium')

        if not all([user_id, topic, scheduled_date]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400

        # Call helper function
        success = create_calendar_event_for_test(
            user_id=user_id,
            topic=topic,
            scheduled_date=scheduled_date,
            difficulty=difficulty
        )

        if success:
            return jsonify({
                'success': True,
                'message': f'Calendar event created for {topic}'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Calendar not connected for this user'
            }), 200
    except Exception as e:
        print(f"Error creating AI calendar event: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@calendar_bp.route('/scheduled-tests', methods=['GET'])
def get_scheduled_tests():
    """
    Get all AI-scheduled tests for a user
    Called by frontend to display in StudyPlanner and ProgressTracker
    """
    try:
        user_id = request.args.get('userId')
        if not user_id:
            return jsonify({'success': False, 'error': 'User ID required'}), 400

        db = get_db_connection()
        cur = db.cursor(dictionary=True)

        cur.execute('''
            SELECT id, topic, scheduled_date, difficulty_level, reason, status
            FROM scheduled_tests
            WHERE user_id = %s
            ORDER BY scheduled_date ASC
        ''', (user_id,))

        tests = cur.fetchall()
        cur.close()
        db.close()

        return jsonify({
            'success': True,
            'data': tests if tests else []
        })
    except Exception as e:
        print(f"Error fetching scheduled tests: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500