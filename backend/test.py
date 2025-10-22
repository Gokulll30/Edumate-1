import mysql.connector
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Rishi@mysql14",
    database="edumate"
)
print("Connected!" if conn.is_connected() else "Connection failed.")
conn.close()