import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def check_db():
    try:
        conn = mysql.connector.connect(
            host=os.environ.get("MYSQL_HOST"),
            user=os.environ.get("MYSQL_USER"),
            password=os.environ.get("MYSQL_PASSWORD"),
            database=os.environ.get("MYSQL_DB")
        )
        cur = conn.cursor(dictionary=True)
        print("Connected to DB successfully.")

        cur.execute("SHOW TABLES LIKE 'coding_attempts'")
        table = cur.fetchone()
        if table:
            print("Table 'coding_attempts' exists.")
            cur.execute("DESCRIBE coding_attempts")
            columns = cur.fetchall()
            for col in columns:
                print(f"Column: {col['Field']}, Type: {col['Type']}, Null: {col['Null']}")
        else:
            print("Table 'coding_attempts' DOES NOT exist.")

        cur.execute("SELECT COUNT(*) as count FROM users")
        user_count = cur.fetchone()['count']
        print(f"User count: {user_count}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()
