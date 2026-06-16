CRITERIA = """
TIÊU CHÍ QUAN TRỌNG NHẤT — BÁM SÁT TRUYỆN GỐC:
- Nội dung từng beat phải MAP tới sự kiện THỰC SỰ trong truyện gốc, không được tự sáng tạo.
- Tên nhân vật trong các beat phải khớp với danh sách nhân vật từ truyện.
- Nếu truyện thiếu một beat nào (ví dụ: không có B-Story), được phép bỏ qua hoặc ghi chú "Truyện không có beat này" — KHÔNG fail vì thiếu beat không có trong truyện.

TIÊU CHÍ TỐI THIỂU:
- Phải nhận ra đủ 15 beat trong cấu trúc — có thể bỏ qua beat không tìm thấy trong truyện và ghi rõ lý do.
- Mỗi beat có nội dung phải dựa trên truyện gốc hoặc giải thích tại sao không áp dụng được.
- MIDPOINT và FINALE phải dựa trên sự kiện có thực trong truyện.

KHÔNG ĐƯỢC FAIL VÌ:
- Thiếu beat không có trong truyện (ví dụ B-Story, Fun & Games nếu truyện không có).
- MIDPOINT không có "False Victory/Defeat" nếu truyện không có điểm này.
- Tên beat viết hơi khác chuẩn nếu nội dung đúng với truyện.
"""

CTX_FIELDS = ['story_content', 'synopsis', 'structure', 'characters']
WINDOWS = (4000, 2500)
MAX_TOKENS = 2048
