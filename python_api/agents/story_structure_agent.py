CRITERIA = """
CÁCH ĐỌC OUTPUT (quan trọng — output dùng cùng format với công cụ tạo cấu trúc 4 hồi):
- Output bắt đầu bằng ## CẤU TRÚC 4 HỒI.
- Mỗi hồi có heading dạng: ### HỒI 1: SETUP (Trang 1-25, khoảng 25 phút) — tên hồi nằm sau ### và có thể kèm thông tin số trang và thời lượng trong ngoặc.
- Mỗi hồi có dòng **Mục tiêu hồi này:** rồi đến các đoạn văn mô tả chi tiết.
- Hồi có thể ngăn cách bằng --- hoặc chỉ bằng heading mới.
- Cuối output có phần ## TỔNG QUAN ARC NHÂN VẬT QUA 4 HỒI (hoặc tên tương đương).

TIÊU CHÍ QUAN TRỌNG NHẤT — BÁM SÁT NỘI DUNG TRUYỆN GỐC:
- Các sự kiện được gán vào từng hồi phải xuất phát từ nội dung truyện gốc — không được thêm sự kiện hư cấu mâu thuẫn với truyện.
- Tên nhân vật phải khớp với danh sách nhân vật đã phân tích từ truyện.
- Diễn biến trong từng hồi phải nhất quán với synopsis đã tạo.
- Cấu trúc phải phản ánh đúng diễn biến của truyện (bao gồm cả kết thúc bi kịch/mở nếu truyện có).

TIÊU CHÍ TỐI THIỂU ĐỂ PASS (chỉ fail nếu THIẾU HOÀN TOÀN):
- Phải nhận ra được 4 hồi: HỒI 1/SETUP, HỒI 2A/RESPONSE, HỒI 2B/ACTION, HỒI 3/CLIMAX — tên có thể kèm số trang hay thời lượng, miễn nhận ra được đây là 4 hồi.
- Mỗi hồi phải có ít nhất 1 đoạn văn mô tả sự kiện, không được để trống hoàn toàn.
- Phải có phần tổng quan arc hoặc nhận xét hành trình nhân vật ở cuối (tên section có thể viết khác).

KHÔNG ĐƯỢC FAIL VÌ:
- Heading có thêm thông tin phụ như "(Trang 1-25)" hay "(khoảng 25 phút)".
- Không có dấu --- phân cách nếu các hồi vẫn rõ ràng qua heading.
- Arc nhân vật không theo LIE → TRUTH nếu truyện gốc không có hành trình nội tâm rõ ràng.
- Output có chứa nhận xét/đánh giá như "Đề xuất tổ chức lại" hay "Truyện chưa có bước này rõ ràng" — đây là phân tích hợp lệ.
- Sự kiện ít chi tiết hơn nếu truyện gốc ngắn.
"""

CTX_FIELDS = ['story_content', 'synopsis', 'characters']
