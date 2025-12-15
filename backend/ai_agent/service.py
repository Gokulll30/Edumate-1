# backend/ai_agent/service.py
"""
AI Agent Service - Main logic for adaptive testing and scheduling
"""

from db import get_db_connection
from .performance_analyzer import PerformanceAnalyzer
from datetime import datetime, timedelta
import json

class AIAgentService:
    """AI Agent for adaptive learning and test scheduling"""

    @staticmethod
    def run_agent_cycle(user_id: int) -> dict:
        """
        Main agent cycle - analyze performance and schedule tests
        """
        try:
            print(f"\n[🤖 AI Agent] ========== STARTING CYCLE FOR USER {user_id} ==========")
            
            # Step 1: Analyze performance
            print("[🤖 AI Agent] Step 1: Analyzing performance...")
            analysis = PerformanceAnalyzer.analyze_user_performance(user_id)
            
            if not analysis or len(analysis) == 0:
                print("[🤖 AI Agent] ❌ No quiz history found")
                return {
                    'status': 'no_data',
                    'message': 'No quiz attempts found'
                }
            
            print("[🤖 AI Agent] ✅ Performance analyzed")
            
            # Step 2: Identify weak and strong topics
            print("[🤖 AI Agent] Step 2: Identifying weak/strong topics...")
            weak_topics = PerformanceAnalyzer.identify_weak_topics(user_id)
            strong_topics = PerformanceAnalyzer.identify_strong_topics(user_id)
            print(f"[🤖 AI Agent] ✅ Found {len(weak_topics)} weak topics, {len(strong_topics)} strong topics")
            
            # Step 3: Generate recommendations
            print("[🤖 AI Agent] Step 3: Generating recommendations...")
            recommendations = AIAgentService._generate_recommendations(user_id, analysis, weak_topics, strong_topics)
            print("[🤖 AI Agent] ✅ Recommendations generated")
            
            # Step 4: Schedule adaptive tests
            print("[🤖 AI Agent] Step 4: Scheduling adaptive tests...")
            scheduled_tests = AIAgentService._schedule_adaptive_tests(user_id, recommendations)
            print(f"[🤖 AI Agent] ✅ Scheduled {len(scheduled_tests)} tests")
            
            print("[🤖 AI Agent] ========== CYCLE COMPLETE ==========\n")
            
            return {
                'status': 'success',
                'analysis': analysis,
                'weakTopics': weak_topics,
                'strongTopics': strong_topics,
                'recommendations': recommendations,
                'scheduledTests': scheduled_tests
            }
            
        except Exception as e:
            print(f"[🤖 AI Agent] ❌ Error: {str(e)}")
            raise

    @staticmethod
    def _generate_recommendations(user_id: int, analysis: dict, weak_topics: list, strong_topics: list) -> dict:
        """Generate AI-powered recommendations (rule-based)"""
        try:
            # Rule-based recommendations
            print("[AI Agent] Using rule-based recommendations")
            
            priority_topics = []
            for topic_data in weak_topics[:3]:  # Top 3 weak topics
                priority_topics.append({
                    'topic': topic_data['topic'],
                    'reason': 'Performance declining' if topic_data['trend'] == 'declining' else 'Below proficiency',
                    'difficulty': 'easy' if topic_data['averageScore'] < 50 else 'medium',
                    'daysUntilNextTest': 2 if topic_data['trend'] == 'declining' else 4
                })
            
            reinforcement_topics = []
            for topic_data in strong_topics[:2]:  # Top 2 strong topics
                reinforcement_topics.append({
                    'topic': topic_data['topic'],
                    'reason': 'Maintain mastery',
                    'difficulty': 'hard',
                    'daysUntilNextTest': 7
                })
            
            first_weak = weak_topics[0]['topic'] if weak_topics else 'your weak areas'
            first_strong = strong_topics[0]['topic'] if strong_topics else 'your strengths'
            
            return {
                'priorityTopics': priority_topics,
                'reinforcementTopics': reinforcement_topics,
                'generalAdvice': f'Focus on {first_weak} first. You\'re doing great in {first_strong}!'
            }
            
        except Exception as e:
            print(f"[AI Agent] Error generating recommendations: {str(e)}")
            raise

    @staticmethod
    def _schedule_adaptive_tests(user_id: int, recommendations: dict) -> list:
        """Schedule adaptive tests in database"""
        try:
            conn = get_db_connection()
            cur = conn.cursor()
            
            scheduled_tests = []
            now = datetime.now()
            
            insert_query = """
            INSERT INTO scheduled_tests 
            (user_id, topic, scheduled_date, difficulty_level, reason, status, created_by, created_at)
            VALUES (%s, %s, %s, %s, %s, 'pending', 'ai_agent', NOW())
            """
            
            all_topics = [
                {**t, 'type': 'priority'} 
                for t in (recommendations.get('priorityTopics') or [])
            ] + [
                {**t, 'type': 'reinforcement'} 
                for t in (recommendations.get('reinforcementTopics') or [])
            ]
            
            if not all_topics:
                cur.close()
                return []
            
            # Schedule each test
            for topic_data in all_topics:
                test_date = now + timedelta(days=topic_data['daysUntilNextTest'])
                reason = 'weak_performance' if topic_data['type'] == 'priority' else 'strength_reinforcement'
                
                try:
                    cur.execute(insert_query, [
                        user_id,
                        topic_data['topic'],
                        test_date,
                        topic_data['difficulty'],
                        reason
                    ])
                    
                    scheduled_tests.append({
                        'topic': topic_data['topic'],
                        'date': str(test_date),
                        'type': topic_data['type']
                    })
                    
                    print(f"✅ Scheduled test for {topic_data['topic']}")
                    
                except Exception as e:
                    print(f"❌ Error scheduling test for {topic_data['topic']}: {str(e)}")
            
            conn.commit()
            cur.close()
            
            return scheduled_tests
            
        except Exception as e:
            print(f"[AI Agent] Error scheduling tests: {str(e)}")
            raise
