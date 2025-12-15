# backend/ai_agent/routes.py
"""
AI Agent API Routes
"""

from flask import Blueprint, request, jsonify, g
from .service import AIAgentService
from .performance_analyzer import PerformanceAnalyzer
from auth.routes import decode_auth_token
from db import get_db_connection

ai_agent_bp = Blueprint('ai_agent', __name__)

def get_user_from_token():
    """Extract user from JWT token"""
    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if not token:
        return None
    
    user_data = decode_auth_token(token)
    if user_data and "username" in user_data:
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute('SELECT * FROM users WHERE username = %s', (user_data["username"],))
        user = cur.fetchone()
        cur.close()
        return dict(user) if user else None
    
    return None

@ai_agent_bp.route('/analysis', methods=['GET'])
def get_performance_analysis():
    """GET /api/ai-agent/analysis - Get performance analysis for user"""
    try:
        user = get_user_from_token()
        
        if not user or "id" not in user:
            return jsonify({"success": False, "error": "Authentication required"}), 401
        
        print(f"[API] Fetching analysis for user: {user['id']}")
        
        analysis = PerformanceAnalyzer.analyze_user_performance(user['id'])
        
        if not analysis:
            return jsonify({
                "success": True,
                "data": None,
                "message": "No quiz attempts yet"
            })
        
        return jsonify({"success": True, "data": analysis})
        
    except Exception as e:
        print(f"[API] Error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@ai_agent_bp.route('/weak-topics', methods=['GET'])
def get_weak_topics():
    """GET /api/ai-agent/weak-topics - Get weak topics identified by AI"""
    try:
        user = get_user_from_token()
        
        if not user or "id" not in user:
            return jsonify({"success": False, "error": "Authentication required"}), 401
        
        print(f"[API] Fetching weak topics for user: {user['id']}")
        
        weak_topics = PerformanceAnalyzer.identify_weak_topics(user['id'])
        
        return jsonify({"success": True, "data": weak_topics})
        
    except Exception as e:
        print(f"[API] Error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@ai_agent_bp.route('/run-cycle', methods=['POST'])
def run_agent_cycle():
    """POST /api/ai-agent/run-cycle - Manually trigger AI agent cycle (for testing)"""
    try:
        user = get_user_from_token()
        
        if not user or "id" not in user:
            return jsonify({"success": False, "error": "Authentication required"}), 401
        
        print(f"[API] Running agent cycle for user: {user['id']}")
        
        result = AIAgentService.run_agent_cycle(user['id'])
        
        return jsonify({"success": True, "data": result})
        
    except Exception as e:
        print(f"[API] Error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@ai_agent_bp.route('/scheduled-tests', methods=['GET'])
def get_scheduled_tests():
    """GET /api/ai-agent/scheduled-tests - Get AI-scheduled tests for user"""
    try:
        user = get_user_from_token()
        
        if not user or "id" not in user:
            return jsonify({"success": False, "error": "Authentication required"}), 401
        
        print(f"[API] Fetching scheduled tests for user: {user['id']}")
        
        conn = get_db_connection()
        cur = conn.cursor(dictionary=True)
        
        query = """
        SELECT 
            id,
            topic,
            scheduled_date,
            difficulty_level,
            reason,
            status
        FROM scheduled_tests
        WHERE user_id = %s AND status = 'pending'
        ORDER BY scheduled_date ASC
        """
        
        cur.execute(query, (user['id'],))
        results = cur.fetchall()
        cur.close()
        
        return jsonify({"success": True, "data": results})
        
    except Exception as e:
        print(f"[API] Error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500
