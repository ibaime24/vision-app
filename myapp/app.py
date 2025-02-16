import os
from flask import Flask, request, jsonify
from openai_utils import analyze_image_with_openai
from speech_utils import text_to_speech_lmnt

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return "Hello from your Heroku Flask app!"

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON body found"}), 400

    base64_image = data.get("image")
    text = data.get("text")

    if not base64_image:
        return jsonify({"error": "Missing 'image' in request"}), 400

    try:
        analysis = analyze_image_with_openai(base64_image, text)
        return jsonify({"response": analysis}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/speech', methods=['POST'])
def speech():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON body found"}), 400

    text = data.get("text")
    if not text:
        return jsonify({"error": "Missing 'text' in request"}), 400

    try:
        # Convert text to speech (bytes)
        audio_data = text_to_speech_lmnt(text)

        # You could also base64-encode the audio if you want to send it inline
        # import base64
        # encoded_audio = base64.b64encode(audio_data).decode('utf-8')
        # return jsonify({"audio_base64": encoded_audio}), 200

        # or store somewhere and return a URL, or just return the raw bytes:
        # For now, let's just be simplistic:
        return audio_data, 200, {'Content-Type': 'audio/mpeg'}
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    
if __name__ == '__main__':
    # Running locally: python app.py
    # On Heroku, gunicorn will call: web: gunicorn app:app
    app.run(debug=True)