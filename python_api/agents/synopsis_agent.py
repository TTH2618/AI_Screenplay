CRITERIA = """
TIÊU CHÍ QUAN TRỌNG NHẤT — NHẤT QUÁN NỘI DUNG VỚI CÁC BƯỚC TRƯỚC:
- Tên nhân vật xuất hiện trong synopsis phải khớp với danh sách nhân vật đã tạo, không được đổi tên hoặc thêm nhân vật mới.
- Xung đột và mục tiêu nhân vật chính phải nhất quán với logline và chủ đề đã xác định.
- Arc nhân vật chính phải phản ánh hành trình LIE → TRUTH như chủ đề đã mô tả.
- Thể loại và tone của câu chuyện phải khớp với logline.

CÁCH KIỂM TRA 4 PHẦN (đọc toàn bộ nội dung trước khi đánh giá):
- Phần MỞ ĐẦU/Setup: tìm đoạn giới thiệu nhân vật, cuộc sống ban đầu, sự kiện kích động — có thể nằm dưới heading ### MỞ ĐẦU hoặc ### Setup hoặc đoạn văn đầu tiên.
- Phần PHÁT TRIỂN/Confrontation: tìm đoạn mô tả nhân vật đối mặt thử thách, midpoint — có thể nằm dưới heading ### PHÁT TRIỂN hoặc là các đoạn giữa.
- Phần CAO TRÀO/Crisis: tìm đoạn mô tả đỉnh điểm xung đột, all is lost, quyết định cuối — THƯỜNG NẰM Ở CUỐI OUTPUT, dưới heading ### CAO TRÀO hoặc nội dung cao trào.
- Phần KẾT THÚC/Resolution: tìm đoạn kết thúc câu chuyện — THƯỜNG LÀ ĐOẠN CUỐI CÙNG, dưới heading ### KẾT THÚC hoặc đoạn văn kết.

TIÊU CHÍ TỐI THIỂU ĐỂ PASS (chỉ fail nếu THỰC SỰ THIẾU):
- Câu chuyện phải có phần mở đầu (giới thiệu nhân vật/hoàn cảnh) — nếu có thì PASS mục này.
- Câu chuyện phải có phần cao trào hoặc xung đột đỉnh điểm — nếu thấy bất kỳ đoạn nào mô tả đối đầu/thử thách lớn thì PASS.
- Câu chuyện phải có kết thúc — nếu đoạn cuối của output mô tả kết quả/trạng thái cuối thì PASS, KHÔNG fail vì không thấy heading "KẾT THÚC".
- Câu chuyện phải dùng đúng tên nhân vật từ bước trước.

KHÔNG ĐƯỢC FAIL VÌ:
- Không thấy heading "CAO TRÀO" hay "KẾT THÚC" viết hoa — nội dung đủ là đủ.
- Output bị cắt ở giữa nhưng phần đã có đủ setup + phát triển + có dấu hiệu cao trào.
- Tên section viết khác format mẫu (Mở đầu, Phát triển, Climax, Ending đều chấp nhận).
- Độ dài không đủ 500 từ nếu nội dung đã đủ 4 phần ý nghĩa.
"""

CTX_FIELDS = ['logline', 'theme', 'characters']
