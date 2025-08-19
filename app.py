from flask import Flask, render_template, request, jsonify
import sqlite3
import os
from db_utils import DB_PATH
from db_utils import init_db
from db_utils import store_music_data
from db_utils import fetch_music_by_task_id  # Add this at the top
import json
import requests

init_db()  # ← runs on both local and Railway

app = Flask(__name__)

results = {}  # task_id → list of tracks
callback_results = {}


# 🌐 Serve frontend
@app.route('/')
def home():
    return render_template('index.html')

# 🔐 Suno API config
SUNO_API_URL = "https://api.sunoapi.org/api/v1/generate"
API_KEY = "5a5cfe31ab6fc6df5a79c9744260e8f9"  # Replace with your actual key
CALLBACK_URL = "https://web-production-7eaf4.up.railway.app/generate-music-callback"


# 🚀 Submit generation request
@app.route("/api/simple-generate", methods=["POST"])
def simple_generate():
    data = request.get_json(force=True)
    print("📦 Received payload:", data)

    # Direct assignment with backend defaults
    payload = {
        "prompt": data.get("prompt", "A calm and relaxing piano track with soft melodies"),
        "style": data.get("style", "Classical"),
        "title": data.get("title", "Peaceful Piano Meditation"),
        "customMode": data.get("customMode", False),
        "instrumental": data.get("instrumental", False),
        "model": data.get("model", "V3_5"),
        "negativeTags": data.get("negativeTags", "Heavy Metal, Upbeat Drums"),
        "vocalGender": data.get("vocalGender", "m"),
        "styleWeight": float(data.get("styleWeight", 0.65)),
        "weirdnessConstraint": float(data.get("weirdnessConstraint", 0.65)),
        "audioWeight": data.get("audioWeight", 0.65),
        "callBackUrl": "https://web-production-7eaf4.up.railway.app/generate-music-callback"
    }
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    url = "https://api.sunoapi.org/api/v1/generate"
    print("📤 Sending request to Suno:", url)

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()  # Raises HTTPError for bad responses (4xx/5xx)
        print("✅ Suno response:", response.json())
        return jsonify({"status": "success", "response": response.json()})
    except requests.exceptions.HTTPError as http_err:
        print("❌ HTTP error:", http_err)
        return jsonify({"status": "http_error", "message": str(http_err)}), response.status_code
    except requests.exceptions.RequestException as req_err:
        print("❌ Request error:", req_err)
        return jsonify({"status": "request_error", "message": str(req_err)}), 500
    except Exception as e:
        print("❌ Unexpected error:", e)
        return jsonify({"status": "unexpected_error", "message": str(e)}), 500


# 🎧 Callback from Suno
@app.route('/generate-music-callback', methods=['POST'])
def handle_callback():
    data = request.json

    code = data.get('code')
    msg = data.get('msg')
    callback_data = data.get('data', {})
    task_id = callback_data.get('task_id')
    callback_type = callback_data.get('callbackType')
    music_data = callback_data.get('data', [])

    print(f"Received music generation callback: {task_id}, type: {callback_type}, status: {code}, message: {msg}")

    if code == 200:
        # Task completed successfully
        print("Music generation completed")

        # Store in SQLite
        store_music_data(task_id, callback_type, music_data)

        print(f"Generated {len(music_data)} music tracks:")
        for i, music in enumerate(music_data):
            print(f"Music {i + 1}:")
            print(f"  Title: {music.get('title')}")
            print(f"  Duration: {music.get('duration')} seconds")
            print(f"  Tags: {music.get('tags')}")
            print(f"  Audio URL: {music.get('audio_url')}")
            print(f"  Cover URL: {music.get('image_url')}")

            # Download audio file example
            try:
                audio_url = music.get('audio_url')
                if audio_url:
                    response = requests.get(audio_url)
                    if response.status_code == 200:
                        filename = f"generated_music_{task_id}_{i + 1}.mp3"
                        with open(filename, "wb") as f:
                            f.write(response.content)
                        print(f"Audio saved as {filename}")
            except Exception as e:
                print(f"Audio download failed: {e}")
    else:
        # Task failed
        print(f"Music generation failed: {msg}")

        # Handle failure cases...
        if code == 400:
            print("Parameter error or content violation")
        elif code == 451:
            print("File download failed")
        elif code == 500:
            print("Server internal error")

    # Return 200 status code to confirm callback received
    return jsonify({'status': 'received'}), 200


@app.route('/get-task-result/<task_id>', methods=['GET'])
def get_task_result(task_id):
    try:
        print(f"🔍 Incoming GET for task_id: {task_id}")
        result = fetch_music_by_task_id(task_id)

        if result:
            print(f"✅ Returning {len(result)} tracks")
            return jsonify(result), 200
        else:
            print("⏳ Task still pending or not found.")
            return jsonify({'status': 'pending'}), 202
    except Exception as e:
        print("❌ Exception in get-task-result:", str(e))
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/admin/view-db', methods=['GET'])
def view_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT task_id, callback_type, title, duration, tags, audio_url, image_url, received_at
            FROM generated_music
            ORDER BY received_at DESC
        """)
        rows = cursor.fetchall()
        conn.close()

        result = []
        for row in rows:
            result.append({
                "task_id": row[0],
                "callback_type": row[1],
                "title": row[2],
                "duration": row[3],
                "tags": row[4].split(',') if row[4] else [],
                "audio_url": row[5],
                "image_url": row[6],
                "received_at": row[7]
            })

        print(f"📊 Returning {len(result)} rows from DB")
        return jsonify(result), 200
    except Exception as e:
        print(f"❌ Error in view-db: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
        
if __name__ == "__main__":
    init_db()
    app.run(debug=True)








