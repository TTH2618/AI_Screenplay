CRITERIA = """
TIÊU CHÍ QUAN TRỌNG NHẤT — NHẤT QUÁN VỚI CÁC BƯỚC TRƯỚC:
- Tên nhân vật xuất hiện trong mỗi hồi phải khớp với danh sách nhân vật đã tạo, không được dùng tên khác hoặc thêm nhân vật mới.
- Các sự kiện chính trong từng hồi phải phản ánh đúng nội dung synopsis đã có, không mâu thuẫn hoặc thêm plot mới không có trong synopsis.
- Arc nhân vật (hành trình thay đổi) phải nhất quán với chủ đề LIE → TRUTH đã xác định.

TIÊU CHÍ CẤU TRÚC TỐI THIỂU (chỉ fail nếu THIẾU HOÀN TOÀN):
- Phải có 4 phần tương ứng Hồi 1 (SETUP), Hồi 2A (RESPONSE), Hồi 2B (ACTION), Hồi 3 (CLIMAX) — tên heading có thể kèm thông tin phụ như số trang, thời lượng, miễn nhận ra được đây là 4 hồi.
- Mỗi hồi phải có ít nhất 2 đoạn văn mô tả sự kiện cụ thể, không được để trống hoặc chỉ có tiêu đề.
- Phải có phần tổng quan arc nhân vật ở cuối (tên section có thể viết khác miễn nhận ra được ý).

KHÔNG ĐƯỢC FAIL VÌ:
- Heading có thêm thông tin phụ như "(Trang 1-25)" hay "(khoảng 25 phút)".
- Không có dấu --- phân cách nếu các hồi vẫn rõ ràng và phân tách bằng heading.
- Cách diễn đạt hoặc số lượng đoạn văn khác với mẫu miễn nội dung đủ ý.
- Sự kiện chi tiết hơn hoặc ít hơn synopsis miễn không mâu thuẫn với synopsis.
"""

CTX_FIELDS = ['logline', 'synopsis', 'characters']
