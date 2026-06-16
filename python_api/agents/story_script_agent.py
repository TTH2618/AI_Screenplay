CRITERIA = """
CÁCH KIỂM TRA NỘI DUNG CẢNH:

BƯỚC 1 — XÁC ĐỊNH CẢNH HIỆN TẠI:
- Đọc trường "SỐ CẢNH HIỆN TẠI" trong context. Giá trị có dạng "Cảnh N: [mô tả]" hoặc chỉ "Cảnh N".
- Phần mô tả sau dấu ":" là NỘI DUNG YÊU CẦU của cảnh này.

BƯỚC 2 — KIỂM TRA NỘI DUNG KHỚP:
- Tìm dòng "Cảnh N:" trong "DANH SÁCH CẢNH" để đọc mô tả chính thức của cảnh.
- Output có thể hiện đúng nội dung/sự kiện mô tả trong dòng đó không? Nếu KHÔNG → FAIL.
- Output có lan sang nội dung của cảnh N+1 (dòng kế tiếp trong danh sách cảnh) không? Nếu CÓ → FAIL.

NGUYÊN TẮC:
- Chỉ FAIL "không khớp nội dung" khi output viết sự kiện hoàn toàn khác với mô tả cảnh N trong danh sách.
- Chỉ FAIL "lan sang cảnh sau" khi output thực sự dàn dựng sự kiện CỤ THỂ của cảnh N+1, không phải khi chỉ có câu gợi mở hoặc kết thúc tự nhiên.
- KHÔNG kiểm tra cảnh trước (N-1) — không quan trọng.

TIÊU CHÍ FORMAT (chỉ fail nếu THIẾU HOÀN TOÀN):
- Phải có ít nhất 5 PHÂN CẢNH nhỏ (đánh dấu bằng [PHÂN CẢNH 1], [PHÂN CẢNH 2], ...).
- Mỗi phân cảnh phải có đủ [GÓC MÁY], [TẠO HÌNH NHÂN VẬT], và action/dialogue.
- Tên nhân vật phải nhất quán với hồ sơ nhân vật.
- Ngoại hình/quần áo nhân vật phải đồng bộ giữa các phân cảnh.
- Cảnh phải có xung đột/tension và kết thúc khác với cách bắt đầu.
"""

CTX_FIELDS = ['synopsis', 'characters', 'scenelist', 'scene_number']
CTX_FIELD_MAX = {'scenelist': 12000}
WINDOWS = (3000, 2000)
MAX_TOKENS = 2048
