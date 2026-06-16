CRITERIA = """
CÁCH ĐỌC OUTPUT (quan trọng — đọc kỹ trước khi đánh giá):
- Mỗi beat được viết dưới dạng heading: ### BEAT X: [TÊN BEAT] (Trang ...) — ví dụ "### BEAT 1: OPENING IMAGE (Trang 1)".
- Tên beat nằm SAU tiền tố "BEAT X:" và TRƯỚC thông tin trang trong ngoặc.
- Các trường trong mỗi beat: **Mục đích:**, **Nội dung:**, và các trường phụ tùy beat.
- Cuối output có phần "## SƠ ĐỒ LIÊN KẾT CÁC BEAT".

TIÊU CHÍ QUAN TRỌNG NHẤT — NHẤT QUÁN VỚI CÁC BƯỚC TRƯỚC:
- Tên nhân vật trong các beat phải khớp với hồ sơ nhân vật đã tạo.
- Nội dung từng beat phải phản ánh đúng synopsis và cấu trúc 4 hồi đã có, không mâu thuẫn.
- Arc nhân vật (LIE → TRUTH) phải thể hiện qua OPENING IMAGE → FINAL IMAGE.

TIÊU CHÍ CẤU TRÚC TỐI THIỂU (chỉ fail nếu THIẾU HOÀN TOÀN):
- Phải nhận ra đủ 15 beat — tìm theo tên beat trong heading (dạng "BEAT X: [TÊN]"), không cần tên chính xác từng chữ, chỉ cần nhận ra được đây là beat nào trong 15 beat Save the Cat.
- Mỗi beat phải có ít nhất 1 đoạn nội dung mô tả sự kiện cụ thể.
- MIDPOINT phải đề cập đến False Victory hoặc False Defeat (hoặc từ tương đương trong tiếng Việt như "Thắng lợi giả", "Thất bại giả").
- FINALE phải có mô tả đối đầu cuối cùng và kết quả.

KHÔNG ĐƯỢC FAIL VÌ:
- Heading có thêm số trang như "(Trang 55)" hay prefix "BEAT 9:".
- Tên beat viết hơi khác như "DARK NIGHT OF SOUL" thiếu "THE", "B-STORY" thay vì "B STORY".
- Không đếm đủ 15 nếu các beat rõ ràng hiện diện theo nội dung — đếm theo nội dung, không đếm theo heading.
- FINALE không liệt kê đủ 5 tên bước tiếng Anh miễn nội dung finale đủ chi tiết.
- Một số beat ở giữa (8-13) ít chi tiết hơn các beat đầu/cuối.
"""

CTX_FIELDS = ['synopsis', 'structure', 'characters']
WINDOWS = (4000, 2500)
MAX_TOKENS = 2048
