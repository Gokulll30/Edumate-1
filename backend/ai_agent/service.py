# backend/ai_agent/service.py

"""
AI Agent Service - Gemini-powered adaptive testing and scheduling (no brute-force thresholds)
"""

from db import get_db_connection
from .performance_analyzer import PerformanceAnalyzer
from datetime import datetime, timedelta
import json
import os
from google import genai

# Initialize Gemini client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in environment variables")

gemini_client = genai.Client(api_key=GEMINI_API_KEY)


class AIAgentService:
    """AI Agent for intelligent adaptive learning and test scheduling"""

    @staticmethod
    def run_agent_cycle(user_id: int) -> dict:
        """
        Main agent cycle - use Gemini AI to analyze and schedule intelligently
        """
        try:
            print(f"\n[🤖 AI Agent] ========== STARTING GEMINI-POWERED CYCLE FOR USER {user_id} ==========")

            # Step 1: Analyze performance
            print("[🤖 AI Agent] Step 1: Analyzing performance with AI...")
            analysis = PerformanceAnalyzer.analyze_user_performance(user_id)
            
            if not analysis or len(analysis) == 0:
                print("[🤖 AI Agent] ❌ No quiz history found")
                return {
                    'status': 'no_data',
                    'message': 'No quiz attempts found'
                }

            print("[🤖 AI Agent] ✅ Performance analyzed")

            # Step 2: Identify weak and strong topics
            print("[🤖 AI Agent] Step 2: Identifying weak/strong topics with AI...")
            weak_topics = PerformanceAnalyzer.identify_weak_topics(user_id)
            strong_topics = PerformanceAnalyzer.identify_strong_topics(user_id)
            print(f"[🤖 AI Agent] ✅ Found {len(weak_topics)} weak topics, {len(strong_topics)} strong topics")

            # Step 3: Generate Gemini-powered recommendations
            print("[🤖 AI Agent] Step 3: Generating AI recommendations...")
            recommendations = AIAgentService._generate_gemini_recommendations(
                user_id, analysis, weak_topics, strong_topics
            )
            print("[🤖 AI Agent] ✅ Recommendations generated")

            # Step 4: Schedule adaptive tests
            print("[🤖 AI Agent] Step 4: Scheduling AI-optimized tests...")
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
    def _generate_gemini_recommendations(user_id: int, analysis: dict, weak_topics: list, strong_topics: list) -> dict:
        """Generate intelligent recommendations using Gemini AI"""
        try:
            print("[AI Agent] Using Gemini AI for intelligent recommendations")

            # Build context for Gemini
            weak_topics_summary = "\n".join([
                f"- {t['topic']}: {t['averageScore']}% ({t['masteryLevel']}, trend: {t['trend']})"
                for t in weak_topics[:5]
            ])

            strong_topics_summary = "\n".join([
                f"- {t['topic']}: {t['averageScore']}%"
                for t in strong_topics[:3]
            ])

            prompt = f"""You are an expert educational AI coach. Analyze this student's performance and provide learning recommendations.

Weak Topics (need improvement):
{weak_topics_summary if weak_topics_summary else 'None yet'}

Strong Topics (maintain mastery):
{strong_topics_summary if strong_topics_summary else 'None yet'}

Generate a structured study plan. Return JSON:
{{
  "priority_topics": [
    {{
      "topic": "topic name",
      "reason": "why this is important",
      "suggested_difficulty": "easy|medium|hard",
      "days_until_next_test": 2-7,
      "focus_area": "specific concept to focus on"
    }}
  ],
  "reinforcement_topics": [
    {{
      "topic": "topic name",
      "reason": "maintain mastery",
      "suggested_difficulty": "hard",
      "days_until_next_test": 7-14
    }}
  ],
  "overall_feedback": "1-2 sentence encouraging feedback with specific next steps"
}}

Return ONLY JSON, no markdown."""

            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )

            recommendations = json.loads(response.text)
            
            return {
                'priorityTopics': recommendations.get('priority_topics', []),
                'reinforcementTopics': recommendations.get('reinforcement_topics', []),
                'generalAdvice': recommendations.get('overall_feedback', 'Keep practicing!')
            }

        except Exception as e:
            print(f"[AI Agent] Error generating Gemini recommendations: {str(e)}")
            # Fallback to basic recommendations
            return {
                'priorityTopics': [
                    {
                        'topic': t['topic'],
                        'reason': f"Below proficiency ({t['averageScore']:.0f}%)",
                        'suggested_difficulty': 'easy' if t['averageScore'] < 50 else 'medium',
                        'days_until_next_test': 2 if t['trend'] == 'declining' else 4,
                        'focus_area': 'Fundamentals'
                    }
                    for t in weak_topics[:3]
                ],
                'reinforcementTopics': [
                    {
                        'topic': t['topic'],
                        'reason': 'Maintain mastery',
                        'suggested_difficulty': 'hard',
                        'days_until_next_test': 7
                    }
                    for t in strong_topics[:2]
                ],
                'generalAdvice': 'Focus on weak areas and maintain your strengths!'
            }

    @staticmethod
    def _schedule_adaptive_tests(user_id: int, recommendations: dict) -> list:
        """Schedule adaptive tests in database based on Gemini recommendations"""
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

            # Schedule priority topics
            for topic_data in recommendations.get('priorityTopics', []):
                test_date = now + timedelta(days=topic_data.get('days_until_next_test', 3))
                reason = f"AI Priority: {topic_data.get('focus_area', 'Weak performance')}"
                
                try:
                    cur.execute(insert_query, [
                        user_id,
                        topic_data['topic'],
                        test_date,
                        topic_data.get('suggested_difficulty', 'medium'),
                        reason
                    ])
                    scheduled_tests.append({
                        'topic': topic_data['topic'],
                        'date': str(test_date),
                        'type': 'priority',
                        'difficulty': topic_data.get('suggested_difficulty', 'medium')
                    })
                    print(f"✅ Scheduled priority test: {topic_data['topic']} on {test_date}")
                except Exception as e:
                    print(f"❌ Error scheduling priority test for {topic_data['topic']}: {str(e)}")

            # Schedule reinforcement topics
            for topic_data in recommendations.get('reinforcementTopics', []):
                test_date = now + timedelta(days=topic_data.get('days_until_next_test', 7))
                reason = "AI Reinforcement: Maintain mastery"
                
                try:
                    cur.execute(insert_query, [
                        user_id,
                        topic_data['topic'],
                        test_date,
                        topic_data.get('suggested_difficulty', 'hard'),
                        reason
                    ])
                    scheduled_tests.append({
                        'topic': topic_data['topic'],
                        'date': str(test_date),
                        'type': 'reinforcement',
                        'difficulty': topic_data.get('suggested_difficulty', 'hard')
                    })
                    print(f"✅ Scheduled reinforcement test: {topic_data['topic']} on {test_date}")
                except Exception as e:
                    print(f"❌ Error scheduling reinforcement test for {topic_data['topic']}: {str(e)}")

            conn.commit()
            cur.close()

            return scheduled_tests

        except Exception as e:
            print(f"[AI Agent] Error scheduling tests: {str(e)}")
            raise   