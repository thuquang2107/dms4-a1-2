import os
import json
import google.generativeai as genai
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from concurrent.futures import ThreadPoolExecutor

# Tải các biến môi trường từ file .env
load_dotenv()

# --- Cấu hình API của Gemini ---
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
# Sử dụng model nhanh hơn và rẻ hơn cho tác vụ phân loại đơn giản
model = genai.GenerativeModel('gemini-2.5-pro')

# --- Cấu hình API của YouTube ---
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
YOUTUBE_API_SERVICE_NAME = 'youtube'
YOUTUBE_API_VERSION = 'v3'

# Khởi tạo ứng dụng Flask
app = Flask(__name__)
def search_youtube_playlists(query, max_results=5): # Tăng số lượng kết quả mỗi thể loại
    """Sử dụng YouTube API để tìm kiếm playlist dựa trên một truy vấn."""
    try:
        youtube = build(YOUTUBE_API_SERVICE_NAME, YOUTUBE_API_VERSION, developerKey=YOUTUBE_API_KEY)
        search_response = youtube.search().list(
            q=f"{query} playlist",
            part='snippet',
            maxResults=max_results,
            type='playlist'
        ).execute()

        playlists = []
        for item in search_response.get('items', []):
            playlists.append({
                'id': item['id']['playlistId'],
                'title': item['snippet']['title'],
                'thumbnail': item['snippet']['thumbnails']['high']['url'] # Lấy ảnh chất lượng cao hơn
            })
        return query, playlists # Trả về cả query để ghép nối lại
    except HttpError as e:
        print(f"An HTTP error {e.resp.status} occurred:\n{e.content}")
        return query, []
    except Exception as e:
        print(f"An error occurred while searching for '{query}': {e}")
        return query, []

@app.route('/')
def index():
    """Render trang chủ."""
    return render_template('index.html')

@app.route('/get_recommendation', methods=['POST'])
def get_recommendation():
    """Nhận yêu cầu, hỏi Gemini, sau đó tìm kiếm song song trên YouTube."""
    try:
        user_input = request.json['prompt']
        if not user_input:
            return jsonify({'error': 'Vui lòng nhập sở thích của bạn.'}), 400

        # --- Bước 1: Yêu cầu Gemini gợi ý thể loại ---
        prompt = f"""
        Based on the user preference "{user_input}", suggest up to 3 most relevant music genres.
        Respond ONLY with a valid JSON object, with no extra text or markdown.
        The JSON object must have a single key "genres" which is an array of strings.
        Example: {{"genres": ["Synthwave", "Chillhop", "Future Funk"]}}
        """
        
        gemini_response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json" # Yêu cầu Gemini trả về JSON
            )
        )
        
        suggested_genres = json.loads(gemini_response.text).get('genres', [])

        if not suggested_genres:
            return jsonify({'error': 'Không thể tìm thấy thể loại phù hợp.'}), 404

        # --- Bước 2: Tìm kiếm playlist trên YouTube SONG SONG ---
        playlist_results = {}
        # ThreadPoolExecutor cho phép chạy các lệnh gọi API cùng lúc
        with ThreadPoolExecutor(max_workers=len(suggested_genres)) as executor:
            # Gửi tất cả các yêu cầu tìm kiếm cùng lúc
            futures = [executor.submit(search_youtube_playlists, genre) for genre in suggested_genres]
            # Thu thập kết quả khi chúng hoàn thành
            for future in futures:
                genre, playlists = future.result()
                playlist_results[genre] = playlists
        
        # --- Bước 3: Sắp xếp lại kết quả theo thứ tự ban đầu ---
        recommendations = []
        for genre in suggested_genres:
            recommendations.append({
                'genre': genre,
                'playlists': playlist_results.get(genre, [])
            })

        return jsonify({'recommendations': recommendations})

    except json.JSONDecodeError:
        return jsonify({'error': 'Lỗi xử lý phản hồi từ AI. Vui lòng thử lại.'}), 500
    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({'error': 'Đã xảy ra lỗi ở phía server.'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) # Chạy trên cổng 5000