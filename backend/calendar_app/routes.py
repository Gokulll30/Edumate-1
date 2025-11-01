"""
Google Calendar Integration Routes
Handles OAuth flow and calendar operations
"""
from db import get_user_email_by_id
from flask import Blueprint, request, jsonify, redirect, session, g, current_app
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest
from datetime import datetime, timedelta
import sqlite3
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

CLIENT_SECRETS_FILE = os.path.join(os.path.dirname(__file__), '..', 'client_secret.json')
REDIRECT_URI = os.environ.get('REDIRECT_URI', 'http://localhost:5001/calendar/oauth2callback')

def get_db():
    """Get database connection"""
    if 'db' not in g:
        db_path = current_app.config.get('DATABASE', 
            os.path.join(os.path.dirname(__file__), '..', 'data', 'edumate.sqlite3'))
        g.db = sqlite3.connect(db_path)
        g.db.row_factory = sqlite3.Row
    return g.db

# ===== OAUTH ROUTES =====

@calendar_bp.route('/connect', methods=['GET'])
def connect_calendar():
    """Initiate OAuth flow"""
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'success': False, 'error': 'User ID required'}), 400
    email = get_user_email_by_id(int(user_id))
    if not email:
        return jsonify({'success': False, 'error': 'Email not found for user'}), 404
    try:
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
        return jsonify({'success': False, 'error': str(e)}), 500

@calendar_bp.route('/oauth2callback')
def oauth2callback():
    """Handle OAuth callback"""
    state = session.get('state')
    user_id = session.get('user_id')
    user_email = session.get('user_email')
    
    if not state or not user_id:
        return '<h1>Error: Invalid session</h1>', 400
    
    try:
        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES,
            state=state,
            redirect_uri=REDIRECT_URI
        )
        
        flow.fetch_token(authorization_response=request.url)
        credentials = flow.credentials
        
        db = get_db()
        credentials_data = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
        
        db.execute('''
            INSERT OR REPLACE INTO calendar_tokens 
            (user_id, email, credentials, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
        ''', (user_id, user_email, json.dumps(credentials_data)))
        db.commit()
        
        session.pop('state', None)
        session.pop('user_id', None)
        session.pop('user_email', None)
        
        return '''
        <html>
            <body style="display:flex;justify-content:center;align-items:center;height:100vh;
                         font-family:Arial;background:linear-gradient(135deg,#667eea,#764ba2);color:white;">
                <div style="text-align:center;padding:40px;background:rgba(255,255,255,0.1);
                           border-radius:20px;">
                    <div style="font-size:64px;margin-bottom:20px;">✓</div>
                    <h1>Calendar Connected!</h1>
                    <p>Closing window...</p>
                </div>
                <script>setTimeout(() => window.close(), 2000);</script>
            </body>
        </html>
        '''
    except Exception as e:
        return f'<h1>Error: {str(e)}</h1>', 500

# ===== CALENDAR OPERATIONS =====

def get_calendar_service(user_id):
    """Get authenticated Calendar service"""
    db = get_db()
    row = db.execute(
        'SELECT credentials FROM calendar_tokens WHERE user_id = ?',
        (user_id,)
    ).fetchone()
    
    if not row:
        return None
    
    credentials_data = json.loads(row['credentials'])
    credentials = Credentials(
        token=credentials_data['token'],
        refresh_token=credentials_data.get('refresh_token'),
        token_uri=credentials_data['token_uri'],
        client_id=credentials_data['client_id'],
        client_secret=credentials_data['client_secret'],
        scopes=credentials_data['scopes']
    )
    
    if credentials.expired and credentials.refresh_token:
        try:
            credentials.refresh(GoogleRequest())
            credentials_data['token'] = credentials.token
            db.execute(
                'UPDATE calendar_tokens SET credentials = ?, updated_at = datetime("now") WHERE user_id = ?',
                (json.dumps(credentials_data), user_id)
            )
            db.commit()
        except Exception as e:
            print(f"Token refresh failed: {e}")
            return None
    
    return build('calendar', 'v3', credentials=credentials)

@calendar_bp.route('/check-connection', methods=['GET'])
def check_connection():
    """Check connection status"""
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'success': False, 'error': 'User ID required'}), 400
    
    db = get_db()
    row = db.execute(
        'SELECT email, created_at FROM calendar_tokens WHERE user_id = ?',
        (user_id,)
    ).fetchone()
    
    if row:
        return jsonify({
            'success': True,
            'connected': True,
            'email': row['email'],
            'connectedAt': row['created_at']
        })
    return jsonify({'success': True, 'connected': False})

@calendar_bp.route('/create-event', methods=['POST'])
def create_event():
    """Create calendar event"""
    data = request.get_json()
    user_id = data.get('userId')
    session_id = data.get('sessionId')
    title = data.get('title')
    description = data.get('description', '')
    date = data.get('date')
    time = data.get('time')
    duration = data.get('duration', 60)
    
    if not all([user_id, title, date, time]):
        return jsonify({'success': False, 'error': 'Missing fields'}), 400
    
    service = get_calendar_service(user_id)
    if not service:
        return jsonify({'success': False, 'error': 'Not connected'}), 400
    
    try:
        start_datetime = datetime.strptime(f'{date} {time}', '%Y-%m-%d %H:%M')
        end_datetime = start_datetime + timedelta(minutes=duration)
        
        event = {
            'summary': title,
            'description': description,
            'start': {
                'dateTime': start_datetime.isoformat(),
                'timeZone': 'Asia/Kolkata',
            },
            'end': {
                'dateTime': end_datetime.isoformat(),
                'timeZone': 'Asia/Kolkata',
            },
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'popup', 'minutes': 30},
                    {'method': 'popup', 'minutes': 10},
                    {'method': 'email', 'minutes': 1440},
                ],
            },
        }
        
        created_event = service.events().insert(
            calendarId='primary',
            body=event
        ).execute()
        
        db = get_db()
        db.execute('''
            INSERT INTO calendar_events (user_id, session_id, event_id, created_at)
            VALUES (?, ?, ?, datetime('now'))
        ''', (user_id, session_id, created_event['id']))
        
        db.execute('''
            UPDATE study_sessions 
            SET calendar_event_id = ? 
            WHERE id = ? AND user_id = ?
        ''', (created_event['id'], session_id, user_id))
        
        db.commit()
        
        return jsonify({
            'success': True,
            'eventId': created_event['id'],
            'htmlLink': created_event.get('htmlLink')
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@calendar_bp.route('/delete-event', methods=['DELETE'])
def delete_event():
    """Delete calendar event"""
    user_id = request.args.get('userId')
    event_id = request.args.get('eventId')
    
    if not user_id or not event_id:
        return jsonify({'success': False, 'error': 'Missing parameters'}), 400
    
    service = get_calendar_service(user_id)
    if not service:
        return jsonify({'success': False, 'error': 'Not connected'}), 400
    
    try:
        service.events().delete(calendarId='primary', eventId=event_id).execute()
        
        db = get_db()
        db.execute('DELETE FROM calendar_events WHERE user_id = ? AND event_id = ?', 
                  (user_id, event_id))
        db.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@calendar_bp.route('/disconnect', methods=['POST'])
def disconnect_calendar():
    """Disconnect calendar"""
    data = request.get_json()
    user_id = data.get('userId')
    
    if not user_id:
        return jsonify({'success': False, 'error': 'User ID required'}), 400
    
    db = get_db()
    db.execute('DELETE FROM calendar_tokens WHERE user_id = ?', (user_id,))
    db.execute('DELETE FROM calendar_events WHERE user_id = ?', (user_id,))
    db.commit()
    
    return jsonify({'success': True})
