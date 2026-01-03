# backend/calendar_app/routes.py
"""
Google Calendar Integration Routes
Handles OAuth flow and calendar operations with MySQL backend
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

# ===== OAUTH ROUTES =====

@calendar_bp.route('/connect', methods=['GET'])
def connect_calendar():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'success': False, 'error': 'User ID required'}), 400
    
    try:
        user_email = get_user_email_by_id(int(user_id))
        if not user_email:
            return jsonify({'success': False, 'error': 'Email not found for user'}), 404
        
        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )
        
        session['user_id'] = user_id
        session['user_email'] = user_email
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            login_hint=user_email
        )
        
        session['state'] = state
        
        return jsonify({'success': True, 'authUrl': authorization_url})
    except Exception as e:
        print(f"Error in connect_calendar: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@calendar_bp.route('/oauth2callback')
def oauth2callback():
    state = session.get('state')
    user_id = session.get('user_id')
    user_email = session.get('user_email')
    
    if not state or not user_id:
        return '<html><body style="font-family: Arial; text-align: center; padding: 50px;"><h1>❌ Error</h1><p>Please try connecting again.</p></body></html>', 400
    
    try:
        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES,
            state=state,
            redirect_uri=REDIRECT_URI
        )
        
        flow.fetch_token(authorization_response=request.url)
        credentials = flow.credentials
        
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
        
        cur.execute(
            '''INSERT INTO calendar_tokens (user_id, email, credentials, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE email = VALUES(email), credentials = VALUES(credentials), updated_at = VALUES(updated_at)''',
            (user_id, user_email, json.dumps(credentials_data), now, now)
        )
        
        db.commit()
        cur.close()
        
        session.pop('state', None)
        session.pop('user_id', None)
        session.pop('user_email', None)
        
        return '''
        <html>
        <head>
            <title>Calendar Connected</title>
            <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
                .container { text-align: center; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #333; margin: 0 0 20px 0; }
                p { color: #666; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✅ Calendar Connected Successfully!</h1>
                <p>You can close this window now.</p>
                <p>Redirecting...</p>
                <script>
                    setTimeout(function() {
                        window.close();
                    }, 2000);
                </script>
            </div>
        </body>
        </html>
        '''
    except Exception as e:
        print(f"Error in oauth2callback: {e}")
        return f'''
        <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>❌ Connection Failed</h1>
            <p>Error: {str(e)}</p>
            <p>Please try again from the application.</p>
        </body>
        </html>
        ''', 500


@calendar_bp.route('/disconnect', methods=['POST'])
def disconnect_calendar():
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
        
        return jsonify({'success': True, 'message': 'Calendar disconnected'})
    except Exception as e:
        print(f"Error in disconnect_calendar: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@calendar_bp.route('/status', methods=['GET'])
def calendar_status():
    try:
        user_id = request.args.get('userId')
        if not user_id:
            return jsonify({'success': False, 'error': 'User ID required'}), 400
        
        db = get_db_connection()
        cur = db.cursor(dictionary=True)
        
        cur.execute('SELECT * FROM calendar_tokens WHERE user_id = %s', (user_id,))
        result = cur.fetchone()
        cur.close()
        
        if result:
            return jsonify({'success': True, 'connected': True, 'email': result.get('email')})
        else:
            return jsonify({'success': True, 'connected': False})
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


# ===== AI AGENT INTEGRATION (NEW) =====

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