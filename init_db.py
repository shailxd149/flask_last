import sqlite3

conn = sqlite3.connect('music.db')
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS generated_music (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT,
    callback_type TEXT,
    title TEXT,
    duration INTEGER,
    tags TEXT,
    audio_url TEXT,
    image_url TEXT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

conn.commit()
conn.close()
print("✅ music.db and table created.")