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
        return '<h1>Error: Invalid session</h1><p>Please try connecting again.</p>', 400

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
            ON DUPLICATE KEY UPDATE
              email = VALUES(email),
              credentials = VALUES(credentials),
              updated_at = VALUES(updated_at)''',
            (user_id, user_email, json.dumps(credentials_data), now, now)
        )
        db.commit()
        cur.close()

        session.pop('state', None)
        session.pop('user_id', None)
        session.pop('user_email', None)

        return '''<html><head><title>Calendar Connected</title><style>
                    body {font-family:Arial;display:flex;justify-content:center;align-items:center;
                    height:100vh;margin:0;background:linear-gradient(135deg,#667eea,#764ba2);color:white;}
                    .container{text-align:center;padding:40px;background:rgba(255,255,255,0.1);
                    border-radius:20px;backdrop-filter:blur(10px);}
                    .success-icon{font-size:64px;margin-bottom:20px;}h1{margin:0 0 10px 0;}p{margin:0 0 20px 0;opacity:0.9;}
                    </style></head><body><div class="container"><div class="success-icon">✓</div>
                    <h1>Calendar Connected!</h1><p>You can close this window now.</p>
                    <p style="font-size:14px;">Redirecting...</p></div>
                    <script>setTimeout(() => {window.close();}, 2000);</script></body></html>'''
    except Exception as e:
        print(f"Error in oauth2callback: {e}")
        return f'<html><head><title>Connection Failed</title><style>body{{font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#1a1a1a;color:white;}}.container{{text-align:center;padding:40px;background:rgba(255,0,0,0.1);border-radius:20px;}}</style></head><body><div class="container"><h1>❌ Connection Failed</h1><p>Error: {str(e)}</p><p>Please try again from the application.</p></div></body></html>', 500

# ===== CALENDAR OPERATIONS =====

def get_calendar_service(user_id):
    db = get_db_connection()
    cur = db.cursor(dictionary=True)
    cur.execute('SELECT credentials FROM calendar_tokens WHERE user_id = %s', (user_id,))
    row = cur.fetchone()
    cur.close()
    
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
            db = get_db_connection()
            cur = db.cursor()
            now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cur.execute(
                'UPDATE calendar_tokens SET credentials = %s, updated_at = %s WHERE user_id = %s',
                (json.dumps(credentials_data), now, user_id)
            )
            db.commit()
            cur.close()
        except Exception as e:
            print(f"Token refresh failed: {e}")
            return None
    
    return build('calendar', 'v3', credentials=credentials)

@calendar_bp.route('/check-connection', methods=['GET'])
def check_connection():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({'success': False, 'error': 'User ID required'}), 400
    
    db = get_db_connection()
    cur = db.cursor(dictionary=True)
    cur.execute('SELECT email, created_at FROM calendar_tokens WHERE user_id = %s', (user_id,))
    row = cur.fetchone()
    cur.close()
    
    if row:
        return jsonify({
            'success': True,
            'connected': True,
            'email': row['email'],
            'connectedAt': row['created_at'].isoformat() if row['created_at'] else None
        })
    else:
        return jsonify({'success': True, 'connected': False})

@calendar_bp.route('/create-event', methods=['POST'])
def create_event():
    data = request.get_json()
    user_id = data.get('userId')
    session_id = data.get('sessionId')
    title = data.get('title')
    description = data.get('description', '')
    date = data.get('date')
    time = data.get('time')
    duration = data.get('duration', 60)
    
    if not all([user_id, title, date, time]):
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
    
    service = get_calendar_service(user_id)
    if not service:
        return jsonify({'success': False, 'error': 'Calendar not connected'}), 400
    
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
                    {'method': 'email', 'minutes': 24 * 60},
                ],
            },
        }
        
        created_event = service.events().insert(
            calendarId='primary',
            body=event
        ).execute()
        
        db = get_db_connection()
        cur = db.cursor()
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        cur.execute('''INSERT INTO calendar_events (user_id, session_id, event_id, created_at)
            VALUES (%s, %s, %s, %s)''', (user_id, session_id, created_event['id'], now))
        
        cur.execute('''UPDATE study_sessions SET calendar_event_id = %s WHERE id = %s AND user_id = %s''',
            (created_event['id'], session_id, user_id))
        
        db.commit()
        cur.close()
        
        return jsonify({
            'success': True,
            'eventId': created_event['id'],
            'htmlLink': created_event.get('htmlLink')
        })
        
    except Exception as e:
        print(f"Error creating calendar event: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@calendar_bp.route('/update-event', methods=['PUT'])
def update_event():
    data = request.get_json()
    user_id = data.get('userId')
    event_id = data.get('eventId')
    
    if not user_id or not event_id:
        return jsonify({'success': False, 'error': 'User ID and Event ID required'}), 400
    
    service = get_calendar_service(user_id)
    if not service:
        return jsonify({'success': False, 'error': 'Calendar not connected'}), 400
    
    try:
        event = service.events().get(calendarId='primary', eventId=event_id).execute()
        
        if 'title' in data:
            event['summary'] = data['title']
        if 'description' in data:
            event['description'] = data['description']
        if 'date' in data and 'time' in data:
            start_datetime = datetime.strptime(f"{data['date']} {data['time']}", '%Y-%m-%d %H:%M')
            duration = data.get('duration', 60)
            end_datetime = start_datetime + timedelta(minutes=duration)
            
            event['start'] = {
                'dateTime': start_datetime.isoformat(),
                'timeZone': 'Asia/Kolkata',
            }
            event['end'] = {
                'dateTime': end_datetime.isoformat(),
                'timeZone': 'Asia/Kolkata',
            }
        
        updated_event = service.events().update(
            calendarId='primary',
            eventId=event_id,
            body=event
        ).execute()
        
        return jsonify({'success': True, 'eventId': updated_event['id']})
        
    except Exception as e:
        print(f"Error updating calendar event: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@calendar_bp.route('/delete-event', methods=['DELETE'])
def delete_event():
    user_id = request.args.get('userId')
    event_id = request.args.get('eventId')
    
    if not user_id or not event_id:
        return jsonify({'success': False, 'error': 'User ID and Event ID required'}), 400
    
    service = get_calendar_service(user_id)
    if not service:
        return jsonify({'success': False, 'error': 'Calendar not connected'}), 400
    
    try:
        service.events().delete(calendarId='primary', eventId=event_id).execute()
        
        db = get_db_connection()
        cur = db.cursor()
        cur.execute('DELETE FROM calendar_events WHERE user_id = %s AND event_id = %s', 
                  (user_id, event_id))
        db.commit()
        cur.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        print(f"Error deleting calendar event: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@calendar_bp.route('/disconnect', methods=['POST'])
def disconnect_calendar():
    data = request.get_json()
    user_id = data.get('userId')
    
    if not user_id:
        return jsonify({'success': False, 'error': 'User ID required'}), 400
    
    db = get_db_connection()
    cur = db.cursor()
    cur.execute('DELETE FROM calendar_tokens WHERE user_id = %s', (user_id,))
    cur.execute('DELETE FROM calendar_events WHERE user_id = %s', (user_id,))
    db.commit()
    cur.close()
    
    return jsonify({'success': True})