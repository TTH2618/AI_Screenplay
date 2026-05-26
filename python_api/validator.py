# Validation agents for each screenplay step.
# Each agent takes the generated output + all prior-step context,
# calls AI to verify coherence, and returns a structured verdict.

import json
import re
import httpx
from config import OPENROUTER_API_KEY, OPENROUTER_MODEL, AI_PROVIDER
from db_runtime import get_active_api_key

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

MAX_RETRIES = 5  # Maximum generation attempts per step before giving up

# ── Validation criteria per tool ─────────────────────────────────────────────

_CRITERIA = {
    'logline': """
- Logline phải chứa đủ 4 yếu tố: NHÂN VẬT CHÍNH (ai, đặc điểm nổi bật), MỤC TIÊU (muốn đạt gì), XUNG ĐỘT (trở ngại/kẻ thù cản đường), STAKES (điều gì xảy ra nếu thất bại).
- Tối đa 2 câu, khoảng 25-50 từ — không quá dài hoặc quá ngắn.
- Phải tạo được sự tò mò, có tính độc đáo, không giống phim đã có.
- Phải rõ ràng về thể loại phim.
- Phải cụ thể, không mơ hồ hay chung chung.
""",
    'theme': """
- Output phải có đúng 14 mục theo đúng thứ tự, mỗi mục bắt đầu bằng dấu # (heading):
  1. CHỦ ĐỀ CHÍNH CỦA KỊCH BẢN
  2. CỐT TRUYỆN
  3. SỰ TRỚ TRÊU KỊCH TÍNH
  4. TRẠNG THÁI BAN ĐẦU
  5. SỰ KIỆN KÍCH ĐỘNG
  6. NHÂN VẬT MUỐN QUAY LẠI
  7. BẠN BUỘC HỌ TIẾN LÊN, NHƯNG KHIẾN HỌ MUỐN TRẠNG THÁI BAN ĐẦU
  8. KHIẾN HỌ NGHI NGỜ NIỀM TIN CỦA CHÍNH MÌNH
  9. CỦNG CỐ PHẢN CHỦ ĐỀ TRONG TÂM TRÍ CÁC NHÂN VẬT
  10. KHOẢNH KHẮC HỌ TRẢI NGHIỆM SỰ HÒA HỢP THỰC SỰ VỚI CHỦ ĐỀ
  11. NHƯNG MỘT SỰ KIỆN KHIẾN HỌ TRỞ LẠI CÁCH CŨ
  12. KHOẢNH KHẮC RÚT RA BÀI HỌC
  13. KHOẢNH KHẮC QUYẾT ĐỊNH
  14. KẾT THÚC
- Mỗi mục phải được điền nội dung cụ thể, không để trống hoặc ghi placeholder như "[...]".
- Chủ đề phải nhất quán và có nguồn gốc từ logline (thể loại, nhân vật, xung đột).
""",
    'character': """
- Output phải là một mảng JSON hợp lệ (parse được bằng json.loads), không có bất kỳ text nào khác ngoài JSON.
- Phải có ít nhất 1 nhân vật chính (vai_tro: "nhân vật chính"), 1 nhân vật phản diện, và ít nhất 1 nhân vật phụ.
- Mỗi nhân vật phải có đủ 8 trường: ho_ten, vai_tro, gioi_tinh, tuoi, quoc_tich, ngoai_hinh, tinh_cach, background.
- Trường ngoai_hinh phải mô tả chi tiết: chiều cao, vóc dáng, màu tóc, màu mắt, đặc điểm nổi bật.
- Trường tinh_cach phải bao gồm: điểm mạnh, điểm yếu, Ghost/Wound, WANT vs NEED.
- Trường background phải bao gồm: xuất thân, sự kiện định hình, vết thương tâm lý, arc dự kiến.
- Nhân vật chính phải có arc gắn với chủ đề (LIE → TRUTH).
- Tất cả nhân vật phải nhất quán với logline và chủ đề đã có.
""",
    'synopsis': """
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
""",
    'structure': """
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
""",
    'beatsheet': """
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
""",
    'scenelist': """
TIÊU CHÍ QUAN TRỌNG NHẤT — ĐÚNG SỐ CẢNH:
- Output PHẢI có ĐÚNG số cảnh mà người dùng yêu cầu (xem trường "SỐ CẢNH YÊU CẦU" trong dữ liệu context). Đếm tổng số cảnh bằng cách đếm các dòng bắt đầu bằng "Cảnh X:" hoặc "Cảnh X." và so sánh với yêu cầu.
- Nếu số cảnh không khớp (nhiều hơn hoặc ít hơn), đây là lỗi NGHÍEM TRỌNG và phải FAIL.
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
""",
    'script': """
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
""",
}

# Story tools have their OWN criteria — must follow the uploaded story content
_CRITERIA['story_theme'] = """
- Output phải có đủ 14 mục theo đúng thứ tự, mỗi mục bắt đầu bằng dấu # (heading).
- Nội dung mỗi mục phải BÁM SÁT nội dung truyện gốc đã tải lên — không được tự sáng tạo thêm chủ đề không có trong truyện.
- Chủ đề và các mục phải xuất phát từ nhân vật, xung đột và sự kiện THỰC SỰ CÓ trong truyện gốc.
- Mỗi mục phải được điền nội dung cụ thể, không để trống hoặc ghi placeholder.
- KHÔNG ĐƯỢC FAIL VÌ: tên mục viết hơi khác nếu nội dung đủ ý, hoặc chủ đề không giống phim Hollywood tiêu chuẩn nếu nó đúng với truyện gốc.
"""

_CRITERIA['story_character'] = """
- Output phải là mảng JSON hợp lệ (parse được bằng json.loads), không có text nào khác ngoài JSON.
- Phải bao gồm TẤT CẢ các nhân vật quan trọng xuất hiện trong truyện gốc — QUAN TRỌNG: không bắt buộc phải có nhân vật phản diện nếu truyện không có.
- Phải có ít nhất 1 nhân vật chính (vai_tro: "nhân vật chính").
- Nhân vật phản diện: chỉ bắt buộc nếu truyện gốc đã có nhân vật đối lập/địch thủ rõ ràng.
- Mỗi nhân vật phải có đủ 8 trường: ho_ten, vai_tro, gioi_tinh, tuoi, quoc_tich, ngoai_hinh, tinh_cach, background.
- Thông tin mỗi nhân vật phải DỰA TRÊN mô tả trong truyện gốc, không được sáng tạo thêm thông tin mâu thuẫn với truyện.
- Nếu truyện không mô tả rõ ngoại hình, có thể suy luận hợp lý nhưng phải ghi chú “suy luận” trong field đó.
- KHÔNG ĐƯỢC FAIL VÌ: thiếu nhân vật phản diện nếu truyện không có, hoặc số lượng nhân vật ít nếu truyện chỉ có ít nhân vật.
"""

_CRITERIA['story_synopsis'] = """
TIÊU CHÍ QUAN TRỌNG NHẤT — BÁM SÁT TRUYỆN GỐC:
- Nội dung synopsis phải phản ánh TRUNG THÀNH với các sự kiện chính trong truyện đã tải lên — không được thêm sự kiện không có trong truyện.
- Tên nhân vật phải khớp với danh sách nhân vật đã phân tích.
- Xung đột và kết thúc phải đúng với câu truyện gốc, không được thay đổi.

TIÊU CHÍ CẤU TRÚC TỐI THIỂU:
- Phải có phần mở đầu (giới thiệu nhân vật/hoàn cảnh từ truyện gốc).
- Phải có phần cao trào hoặc xung đột đỉnh điểm đúng với truyện.
- Phải có kết thúc đúng với truyện gốc (hạnh phúc, bi kịch, hay mở).

KHÔNG ĐƯỢC FAIL VÌ:
- Không có heading rõ ràng nếu nội dung đủ 4 phần.
- Tên section viết khác format mẫu.
- Nội dung khác với cấu trúc phim Hollywood chuẩn nếu đúng với truyện gốc.
"""

_CRITERIA['story_structure'] = """
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
- Output có chúa nhận xét/đánh giá như "Đề xuất tổ chức lại" hay "Truyện chưa có bước này rõ ràng" — đây là phân tích hợp lệ.
- Sự kiện ít chi tiết hơn nếu truyện gốc ngắn.
"""

_CRITERIA['story_beatsheet'] = """
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

_CRITERIA['story_scenelist'] = """
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

_CRITERIA['story_script'] = _CRITERIA['script']  # Script criteria is format-based, same for both


# Which context fields are relevant for each tool (keeps prompt size small)
_CTX_FIELDS = {
    'logline':     [],
    'theme':       ['logline'],
    'character':   ['logline', 'theme'],
    'synopsis':    ['logline', 'theme', 'characters'],
    'structure':   ['logline', 'synopsis', 'characters'],
    'beatsheet':   ['synopsis', 'structure', 'characters'],
    'scenelist':   ['synopsis', 'characters', 'beatsheet', 'scene_count'],
    'script':      ['synopsis', 'characters', 'scenelist', 'scene_number'],
}
# Story tools need story_content in context to verify content stays true to the source
_CTX_FIELDS['story_theme']     = ['story_content']
_CTX_FIELDS['story_character']  = ['story_content', 'theme']
_CTX_FIELDS['story_synopsis']   = ['story_content', 'characters', 'theme']
_CTX_FIELDS['story_structure']  = ['story_content', 'synopsis', 'characters']
_CTX_FIELDS['story_beatsheet']  = ['story_content', 'synopsis', 'structure', 'characters']
_CTX_FIELDS['story_scenelist']  = ['story_content', 'synopsis', 'characters', 'beatsheet', 'scene_count']
_CTX_FIELDS['story_script']     = ['synopsis', 'characters', 'scenelist', 'scene_number']

_CTX_LABELS = {
    'logline': 'LOGLINE', 'theme': 'CHỦ ĐỀ', 'characters': 'NHÂN VẬT',
    'synopsis': 'SYNOPSIS', 'structure': 'CẤU TRÚC 4 HỒI',
    'beatsheet': 'BEAT SHEET',
    'scenelist': 'DANH SÁCH CẢNH', 'scene_count': 'SỐ CẢNH YÊU CẦU',
    'scene_number': 'SỐ CẢNH HIỆN TẠI',
    'story_content': 'NỘI DUNG TRUYỆN GỐC',
}
_CTX_MAX_CHARS = 1200  # max chars per context field to keep total prompt size manageable


# Per-field context size overrides for specific tool+field combos
# scenelist must be fully visible for script boundary validation
_CTX_FIELD_MAX = {
    ('script',       'scenelist'): 12000,
    ('story_script', 'scenelist'): 12000,
}


def _build_validation_prompt(tool_id: str, generated_output: str, context: dict) -> str:
    """Build the validation prompt for a given tool."""
    criteria = _CRITERIA.get(tool_id, '- Nội dung phải hợp lý và nhất quán với các bước trước.')

    # Only include context fields relevant to this tool
    relevant_fields = _CTX_FIELDS.get(tool_id, list(_CTX_LABELS.keys()))
    ctx_parts = []
    for field in relevant_fields:
        value = context.get(field, '').strip()
        if value:
            # allow much larger context for story_content so validator can read the full story
            field_max_chars = (
                15000 if field == 'story_content'
                else _CTX_FIELD_MAX.get((tool_id, field), _CTX_MAX_CHARS)
            )
            
            if len(value) > field_max_chars:
                if field == 'story_content':
                    # For long stories, keep head and tail
                    half = field_max_chars // 2
                    truncated = value[:half] + '\n\n...(đoạn giữa được lược bỏ)...\n\n' + value[-half:]
                else:
                    truncated = value[:field_max_chars] + '...(lược bỏ)'
            else:
                truncated = value
                
            label = _CTX_LABELS.get(field, field.upper())
            ctx_parts.append(f"### {label}:\n{truncated}")

    ctx_text = '\n\n'.join(ctx_parts) if ctx_parts else '(Chưa có dữ liệu bước trước)'

    # Per-tool output window sizes (head + tail) to keep prompt manageable
    _WINDOWS = {
        'beatsheet': (4000, 2500), 'story_beatsheet': (4000, 2500),
        'scenelist': (3000, 2000), 'story_scenelist': (3000, 2000),
        'script':    (3000, 2000), 'story_script':    (3000, 2000),
    }
    _HEAD, _TAIL = _WINDOWS.get(tool_id, (2500, 1500))
    _LIMIT = _HEAD + _TAIL
    if len(generated_output) > _LIMIT:
        head = generated_output[:_HEAD]
        tail = generated_output[-_TAIL:]
        output_display = head + f"\n\n...[đoạn giữa đã lược bỏ, tổng {len(generated_output)} ký tự]...\n\n" + tail
    else:
        output_display = generated_output

    # Sanitize: replace stray backslashes that could corrupt the JSON response
    output_display = output_display.replace('\\', '/')

    return f"""Bạn là một biên tập viên kịch bản Hollywood chuyên nghiệp. Nhiệm vụ của bạn là KIỂM TRA chất lượng và tính nhất quán của đầu ra bước "{tool_id}".

## DỮ LIỆU CÁC BƯỚC TRƯỚC:
{ctx_text}

## ĐẦU RA CẦN KIỂM TRA (bước "{tool_id}"):
{output_display}

## TIÊU CHÍ KIỂM TRA:
{criteria}

## HƯỚNG DẪN:
Đánh giá đầu ra theo các tiêu chí trên. Trả về JSON hợp lệ (không có text khác):

{{
  "valid": true hoặc false,
  "score": số từ 1-10,
  "issues": ["vấn đề 1 nếu có", "vấn đề 2 nếu có"],
  "suggestions": ["hướng dẫn sửa cụ thể cho vấn đề 1", "hướng dẫn sửa cụ thể cho vấn đề 2"],
  "reason": "giải thích ngắn gọn tại sao hợp lệ hoặc không hợp lệ"
}}

Mỗi phần tử trong "suggestions" phải là một chỉ dẫn CỤ THỂ và HÀNH ĐỘNG ĐƯỢC về cách sửa vấn đề tương ứng trong "issues".
Chỉ trả về JSON, không có markdown, không có text giải thích."""


def validate_step(tool_id: str, generated_output: str, context: dict) -> dict:
    """
    Validate the generated output for a given tool step.

    Args:
        tool_id:           The tool that produced the output (e.g. 'theme').
        generated_output:  The raw text output from the AI generation step.
        context:           Dict of all previous step outputs keyed by step name.

    Returns:
        {
            'valid': bool,
            'score': int (1-10),
            'issues': list[str],
            'reason': str,
        }
    """
    try:
        runtime_api_key = get_active_api_key(AI_PROVIDER) or OPENROUTER_API_KEY
        headers = {
            "Authorization": f"Bearer {runtime_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "AI Screenplay Validator",
        }
        payload = {
            "model": OPENROUTER_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Bạn là một biên tập viên kịch bản chuyên nghiệp. "
                        "Nhiệm vụ: kiểm tra chất lượng đầu ra của AI. "
                        "Chỉ trả về JSON, không có bất kỳ text nào khác."
                    ),
                },
                {
                    "role": "user",
                    "content": _build_validation_prompt(tool_id, generated_output, context),
                },
            ],
            "temperature": 0.2,
            # script/scenelist responses are longer — give the model enough room
            "max_tokens": 2048 if tool_id in ('scenelist', 'script', 'story_scenelist', 'story_script', 'beatsheet', 'story_beatsheet') else 1024,
        }

        with httpx.Client(timeout=60.0) as client:
            response = client.post(OPENROUTER_API_URL, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        raw = data['choices'][0]['message']['content'].strip()

        # Strip markdown fences if present
        raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
        raw = re.sub(r'```\s*$', '', raw, flags=re.MULTILINE).strip()

        # Robust JSON extraction: find the outermost {...} block
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if json_match:
            raw = json_match.group(0)

        # If JSON is truncated (unterminated), attempt to repair it
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            # Close any open string/array/object so json.loads can parse partial output
            _repair = raw
            # Count unclosed brackets
            open_braces   = _repair.count('{') - _repair.count('}')
            open_brackets = _repair.count('[') - _repair.count(']')
            # Ensure last string is terminated
            if _repair.count('"') % 2 != 0:
                _repair += '"'
            for _ in range(max(open_brackets, 0)):
                _repair += ']'
            for _ in range(max(open_braces, 0)):
                _repair += '}'
            result = json.loads(_repair)
        return {
            'valid': bool(result.get('valid', False)),
            'score': int(result.get('score', 0)),
            'issues': result.get('issues', []),
            'suggestions': result.get('suggestions', []),
            'reason': result.get('reason', ''),
        }

    except Exception as e:
        print(f"⚠️  Validator error for {tool_id}: {e}")
        # On validator failure, allow the output through (fail-open)
        return {
            'valid': True,
            'score': 7,
            'issues': [],
            'suggestions': [],
            'reason': f'Validator gặp lỗi kỹ thuật ({e}), chấp nhận kết quả.',
        }
