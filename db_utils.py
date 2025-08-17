import sqlite3
DB_PATH = 'music.db'
def store_music_data(task_id, callback_type, music_data):
    try:
        conn = sqlite3.connect(DB_PATH)
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

        for music in music_data:
            cursor.execute("""
                INSERT INTO generated_music (task_id, callback_type, title, duration, tags, audio_url, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                task_id,
                callback_type,
                music.get('title'),
                music.get('duration'),
                ','.join(music.get('tags', [])) if isinstance(music.get('tags'), list) else music.get('tags'),
                music.get('audio_url'),
                music.get('image_url')
            ))

        conn.commit()
        conn.close()
        print("✅ Stored in music.db")
    except Exception as e:
        print(f"❌ DB insert failed: {e}")

def fetch_music_by_task_id(task_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT title, duration, tags, audio_url, image_url, received_at
            FROM generated_music
            WHERE task_id = ?
        """, (task_id,))
        
        rows = cursor.fetchall()
        conn.close()

        result = []
        for row in rows:
            result.append({
                "title": row[0],
                "duration": row[1],
                "tags": row[2].split(',') if row[2] else [],
                "audio_url": row[3],
                "image_url": row[4],
                "received_at": row[5]
            })
        return result
    except Exception as e:
        print(f"❌ DB fetch failed: {e}")
        return None

