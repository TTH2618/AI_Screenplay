CRITERIA = """
TIÊU CHÍ QUAN TRỌNG NHẤT — ĐÚNG SỐ CẢNH:
- Output PHẢI có ĐÚNG số cảnh mà người dùng yêu cầu (xem trường "SỐ CẢNH YÊU CẦU" trong dữ liệu context). Đếm tổng số cảnh bằng cách đếm các dòng bắt đầu bằng "Cảnh X:" hoặc "Cảnh X." và so sánh với yêu cầu.
- Nếu số cảnh không khớp (nhiều hơn hoặc ít hơn), đây là lỗi NGHIÊM TRỌNG và phải FAIL.
- Câu chuyện phải đầy đủ từ MỞ ĐẦU đến KẾT THÚC — nếu thiếu cảnh kết hoặc cảnh mở đầu thì FAIL.

TIÊU CHÍ NHẤT QUÁN VỚI CÁC BƯỚC TRƯỚC:
- Tên nhân vật trong các cảnh phải khớp với danh sách nhân vật đã tạo, không được đổi tên hoặc thêm nhân vật mới không có trong hồ sơ.
- Các sự kiện trong cảnh phải phản ánh đúng nội dung synopsis và beat sheet đã có — không được thêm plot mới mâu thuẫn với các bước trước.
- Các cảnh phải được phân bổ theo 4 hồi (SETUP, RESPONSE, ACTION, CLIMAX) theo đúng cấu trúc câu chuyện — hồi nào xảy ra trước thì cảnh thuộc hồi đó phải ở trước.

TIÊU CHÍ PHÁT TRIỂN CỐT TRUYỆN:
- Cốt truyện phải phát triển liên tục — mỗi cảnh phải đẩy câu chuyện tiến lên (thêm thông tin, tăng xung đột, hoặc thay đổi trạng thái nhân vật).
- Phải có sự leo thang rõ ràng từ cảnh đầu đến cảnh cuối (stakes tăng dần, không đứng yên).
- Phải có ít nhất 1 điểm ngoặt rõ ràng ở mỗi hồi.
- Các cảnh cuối (hồi 3) phải thể hiện đối đầu/giải quyết xung đột chính.

TIÊU CHÍ TỐI THIỂU ĐỂ PASS (chỉ fail nếu THỰC SỰ THIẾU):
- Số cảnh phải khớp CHÍNH XÁC với yêu cầu (sai lệch > 1 cảnh là FAIL).
- Mỗi cảnh phải mô tả rõ nhân vật làm gì ở đâu.
- Phải có cảnh mở đầu (giới thiệu) và cảnh kết (giải quyết xung đột).

KHÔNG ĐƯỢC FAIL VÌ:
- Tên hồi viết hơi khác format mẫu.
- Một số cảnh chỉ có 1 câu mô tả thay vì 2 câu.
- Không dùng bảng hay bullet là yêu cầu format — không fail vì format trình bày khác.
"""

CTX_FIELDS = ['synopsis', 'characters', 'beatsheet', 'scene_count']
WINDOWS = (3000, 2000)
MAX_TOKENS = 2048
