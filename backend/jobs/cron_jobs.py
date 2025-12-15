# backend/jobs/cron_jobs.py
"""
Cron jobs for automated AI Agent cycles
"""

from apscheduler.schedulers.background import BackgroundScheduler
from ai_agent.service import AIAgentService
from db import get_db_connection
import logging

logger = logging.getLogger(__name__)

def start_agent_cron_job():
    """Run AI agent cycle for all active users daily at 2 AM"""
    scheduler = BackgroundScheduler()
    
    def run_daily_agent_cycles():
        print('\n[⏰ Cron] ========== STARTING DAILY AI AGENT RUN ==========')
        try:
            conn = get_db_connection()
            cur = conn.cursor(dictionary=True)
            cur.execute('SELECT id FROM users LIMIT 100')
            users = cur.fetchall()
            cur.close()
            
            print(f"[⏰ Cron] Processing {len(users)} active users...")
            
            for user in users:
                try:
                    AIAgentService.run_agent_cycle(user['id'])
                    print(f"[⏰ Cron] ✅ Completed for user {user['id']}")
                except Exception as e:
                    print(f"[⏰ Cron] ❌ Error for user {user['id']}: {str(e)}")
            
            print('[⏰ Cron] ========== DAILY RUN COMPLETE ==========\n')
            
        except Exception as e:
            print(f"[⏰ Cron] Fatal error: {str(e)}")
    
    # Schedule to run at 2 AM daily
    scheduler.add_job(run_daily_agent_cycles, 'cron', hour=2, minute=0)
    scheduler.start()
    print('[⏰ Cron] Agent cron job scheduled for 2 AM daily')
