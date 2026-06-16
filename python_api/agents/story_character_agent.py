CRITERIA = """
- Output phải là mảng JSON hợp lệ (parse được bằng json.loads), không có text nào khác ngoài JSON.
- Phải bao gồm TẤT CẢ các nhân vật quan trọng xuất hiện trong truyện gốc — QUAN TRỌNG: không bắt buộc phải có nhân vật phản diện nếu truyện không có.
- Phải có ít nhất 1 nhân vật chính (vai_tro: "nhân vật chính").
- Nhân vật phản diện: chỉ bắt buộc nếu truyện gốc đã có nhân vật đối lập/địch thủ rõ ràng.
- Mỗi nhân vật phải có đủ 8 trường: ho_ten, vai_tro, gioi_tinh, tuoi, quoc_tich, ngoai_hinh, tinh_cach, background.
- Thông tin mỗi nhân vật phải DỰA TRÊN mô tả trong truyện gốc, không được sáng tạo thêm thông tin mâu thuẫn với truyện.
- Nếu truyện không mô tả rõ ngoại hình, có thể suy luận hợp lý nhưng phải ghi chú “suy luận” trong field đó.
- KHÔNG ĐƯỢC FAIL VÌ: thiếu nhân vật phản diện nếu truyện không có, hoặc số lượng nhân vật ít nếu truyện chỉ có ít nhân vật.
"""

CTX_FIELDS = ['story_content', 'theme']
