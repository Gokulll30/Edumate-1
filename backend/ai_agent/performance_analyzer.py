# backend/ai_agent/performance_analyzer.py
"""
Performance Analyzer - Analyzes quiz attempts and identifies weak/strong topics
"""

from db import get_db_connection
from datetime import datetime

class PerformanceAnalyzer:
    """Analyzes user performance across topics"""

    @staticmethod
    def analyze_user_performance(user_id: int) -> dict:
        """
        Analyze user performance across all topics
        Returns: { topic: { averageScore, attempts, trend, masteryLevel, recentScores } }
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
            
            # For each topic, get trend analysis
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
                
                analysis[topic] = {
                    'averageScore': round(avg_score, 2),
                    'attempts': row['attempts'],
                    'trend': trend,
                    'masteryLevel': mastery_level,
                    'lastAttempted': str(row['last_attempted']) if row['last_attempted'] else None,
                    'recentScores': recent_scores
                }
            
            cur.close()
            print("[PerformanceAnalyzer] ✅ Analysis complete")
            return analysis
            
        except Exception as e:
            print(f"[PerformanceAnalyzer] ❌ Error: {str(e)}")
            raise

    @staticmethod
    def identify_weak_topics(user_id: int) -> list:
        """Identify weak topics (score < 60 or declining trend)"""
        try:
            analysis = PerformanceAnalyzer.analyze_user_performance(user_id)
            if not analysis:
                return []
            
            weak_topics = [
                {'topic': topic, **stats}
                for topic, stats in analysis.items()
                if stats['averageScore'] < 60 or stats['trend'] == 'declining'
            ]
            
            weak_topics.sort(key=lambda x: x['averageScore'])
            print(f"[PerformanceAnalyzer] Found {len(weak_topics)} weak topics")
            return weak_topics
            
        except Exception as e:
            print(f"[PerformanceAnalyzer] Error identifying weak topics: {str(e)}")
            raise

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
