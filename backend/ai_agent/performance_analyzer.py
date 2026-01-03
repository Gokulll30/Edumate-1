# backend/ai_agent/performance_analyzer.py

"""
Performance Analyzer - Analyzes quiz attempts and identifies weak/strong topics using Gemini AI
"""

from db import get_db_connection
from datetime import datetime
import os
from google import genai

# Initialize Gemini client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in environment variables")

gemini_client = genai.Client(api_key=GEMINI_API_KEY)


class PerformanceAnalyzer:
    """Analyzes user performance across topics using Gemini AI"""

    @staticmethod
    def analyze_user_performance(user_id: int) -> dict:
        """
        Analyze user performance across all topics using Gemini AI
        Returns: { topic: { averageScore, attempts, trend, masteryLevel, recentScores, aiInsight } }
        """
        try:
            print(f"[PerformanceAnalyzer] Analyzing performance for user: {user_id}")
            conn = get_db_connection()
            cur = conn.cursor(dictionary=True)

            # Query: Get aggregate stats per topic
            query = """
            SELECT
                topic,
                AVG(percentage) as average_score,
                COUNT(*) as attempts,
                MAX(taken_at) as last_attempted
            FROM quiz_attempts
            WHERE user_id = %s
            GROUP BY topic
            ORDER BY average_score ASC
            """

            cur.execute(query, (user_id,))
            results = cur.fetchall()

            if not results:
                print("[PerformanceAnalyzer] No quiz attempts found")
                cur.close()
                return None

            print(f"[PerformanceAnalyzer] Found {len(results)} topics")
            analysis = {}

            # For each topic, get trend analysis and AI insights
            for row in results:
                topic = row['topic']
                
                # Get last 5 attempts to calculate trend
                trend_query = """
                SELECT percentage
                FROM quiz_attempts
                WHERE user_id = %s AND topic = %s
                ORDER BY taken_at DESC
                LIMIT 5
                """

                cur.execute(trend_query, (user_id, topic))
                trend_results = cur.fetchall()
                recent_scores = [r['percentage'] for r in trend_results]

                # Calculate trend
                trend = 'stable'
                if len(recent_scores) >= 2:
                    recent_avg = sum(recent_scores[:2]) / 2
                    older_avg = sum(recent_scores[2:]) / len(recent_scores[2:]) if len(recent_scores) > 2 else recent_avg
                    if recent_avg > older_avg + 5:
                        trend = 'improving'
                    elif recent_avg < older_avg - 5:
                        trend = 'declining'

                # Determine mastery level
                avg_score = row['average_score']
                if avg_score >= 80:
                    mastery_level = 'expert'
                elif avg_score >= 70:
                    mastery_level = 'proficient'
                elif avg_score >= 60:
                    mastery_level = 'intermediate'
                else:
                    mastery_level = 'novice'

                # Get Gemini AI insight for this topic
                ai_insight = PerformanceAnalyzer._get_gemini_topic_insight(
                    topic, avg_score, trend, recent_scores
                )

                analysis[topic] = {
                    'averageScore': round(avg_score, 2),
                    'attempts': row['attempts'],
                    'trend': trend,
                    'masteryLevel': mastery_level,
                    'lastAttempted': str(row['last_attempted']) if row['last_attempted'] else None,
                    'recentScores': recent_scores,
                    'aiInsight': ai_insight
                }

            cur.close()
            print("[PerformanceAnalyzer] ✅ Analysis complete")
            return analysis

        except Exception as e:
            print(f"[PerformanceAnalyzer] ❌ Error: {str(e)}")
            raise

    @staticmethod
    def _get_gemini_topic_insight(topic: str, avg_score: float, trend: str, recent_scores: list) -> str:
        """Get AI-powered insight for a specific topic using Gemini"""
        try:
            prompt = f"""You are an educational AI coach analyzing a student's performance on "{topic}".

Student Performance Data:
- Average Score: {avg_score:.1f}%
- Trend: {trend}
- Recent Scores: {recent_scores}

Provide ONE short, actionable insight (max 20 words) about this topic. Be encouraging but honest.
Examples:
- "Solid foundation, but practice more on X concept"
- "Great improvement! Focus on edge cases next"
- "Struggling here - break it into smaller steps"

Just the insight, no preamble."""

            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            
            return response.text.strip()
        except Exception as e:
            print(f"[PerformanceAnalyzer] Error getting Gemini insight: {str(e)}")
            # Fallback: Use simple heuristic
            if trend == 'declining':
                return "Performance declining - increase practice frequency"
            elif avg_score < 60:
                return "Below proficiency - focus on fundamentals"
            else:
                return "Making progress - keep practicing"

    @staticmethod
    def identify_weak_topics(user_id: int) -> list:
        """Identify weak topics using AI-enhanced classification"""
        try:
            analysis = PerformanceAnalyzer.analyze_user_performance(user_id)
            if not analysis:
                return []

            # Use Gemini to intelligently classify weak topics
            weak_topics = PerformanceAnalyzer._classify_weak_topics_with_gemini(analysis)
            
            print(f"[PerformanceAnalyzer] Found {len(weak_topics)} weak topics")
            return weak_topics

        except Exception as e:
            print(f"[PerformanceAnalyzer] Error identifying weak topics: {str(e)}")
            raise

    @staticmethod
    def _classify_weak_topics_with_gemini(analysis: dict) -> list:
        """Use Gemini to intelligently classify which topics need attention"""
        try:
            topics_data = "\n".join([
                f"- {topic}: {data['averageScore']:.1f}% (trend: {data['trend']}, mastery: {data['masteryLevel']})"
                for topic, data in analysis.items()
            ])

            prompt = f"""Analyze this student's quiz performance and identify the TOP weak topics that need immediate focus.

Performance Summary:
{topics_data}

Return a JSON list of weak topics (max 3) with this structure:
{{
  "weak_topics": [
    {{
      "topic": "topic name",
      "priority": "high|medium",
      "reason": "specific reason why this topic needs work"
    }}
  ]
}}

Return ONLY the JSON, no markdown or preamble."""

            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )

            import json
            result = json.loads(response.text)
            
            # Map back to full analysis data
            weak_topics = []
            for item in result.get('weak_topics', []):
                topic_name = item['topic']
                if topic_name in analysis:
                    weak_topics.append({
                        'topic': topic_name,
                        **analysis[topic_name],
                        'priority': item['priority'],
                        'reason': item['reason']
                    })
            
            return weak_topics

        except Exception as e:
            print(f"[PerformanceAnalyzer] Error in Gemini classification: {str(e)}")
            # Fallback to rule-based
            return [
                {'topic': topic, **stats}
                for topic, stats in analysis.items()
                if stats['averageScore'] < 60 or stats['trend'] == 'declining'
            ]

    @staticmethod
    def identify_strong_topics(user_id: int) -> list:
        """Identify strong topics (score >= 80)"""
        try:
            analysis = PerformanceAnalyzer.analyze_user_performance(user_id)
            if not analysis:
                return []

            strong_topics = [
                {'topic': topic, **stats}
                for topic, stats in analysis.items()
                if stats['averageScore'] >= 80
            ]

            print(f"[PerformanceAnalyzer] Found {len(strong_topics)} strong topics")
            return strong_topics

        except Exception as e:
            print(f"[PerformanceAnalyzer] Error identifying strong topics: {str(e)}")
            raise