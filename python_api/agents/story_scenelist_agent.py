CRITERIA = """
TIÊU CHÍ QUAN TRỌNG NHẤT — ĐÚNG SỐ CẢNH VÀ BÁM TRUYỆN:
- Output PHẢI có ĐÚNG số cảnh yêu cầu (xem trường "SỐ CẢNH YÊU CẦU"). Sai lệch > 1 cảnh là FAIL.
- Nội dung từng cảnh phải DỰA TRÊN nội dung TRUYỆN GỐC, không được sáng tạo sự kiện không có trong truyện.
- Tên nhân vật trong các cảnh phải khớp với danh sách nhân vật đã phân tích từ truyện.
- Câu chuyện phải đầy đủ từ MỞ ĐẦU đến KẾT THÚC đúng với kết thúc của truyện gốc.

TIÊU CHÍ TỐI THIỂU:
- Mỗi cảnh phải mô tả rõ nhân vật làm gì ở đâu.
- Phải có cảnh mở đầu và cảnh kết đúng với truyện gốc.

KHÔNG ĐƯỢC FAIL VÌ:
- Tên hồi viết khác format mẫu.
- Một số cảnh chỉ có 1 câu mô tả.
- Nội dung cảnh khác "chuẩn Hollywood" nếu đúng với truyện gốc (ví dụ: không có action scene nếu truyện không có).
"""

CTX_FIELDS = ['story_content', 'synopsis', 'characters', 'beatsheet', 'scene_count']
WINDOWS = (3000, 2000)
MAX_TOKENS = 2048
