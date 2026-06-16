CRITERIA = """
- Output phải là một mảng JSON hợp lệ (parse được bằng json.loads), không có bất kỳ text nào khác ngoài JSON.
- Phải có ít nhất 1 nhân vật chính (vai_tro: "nhân vật chính"), 1 nhân vật phản diện, và ít nhất 1 nhân vật phụ.
- Mỗi nhân vật phải có đủ 8 trường: ho_ten, vai_tro, gioi_tinh, tuoi, quoc_tich, ngoai_hinh, tinh_cach, background.
- Trường ngoai_hinh phải mô tả chi tiết: chiều cao, vóc dáng, màu tóc, màu mắt, đặc điểm nổi bật.
- Trường tinh_cach phải bao gồm: điểm mạnh, điểm yếu, Ghost/Wound, WANT vs NEED.
- Trường background phải bao gồm: xuất thân, sự kiện định hình, vết thương tâm lý, arc dự kiến.
- Nhân vật chính phải có arc gắn với chủ đề (LIE → TRUTH).
- Tất cả nhân vật phải nhất quán với logline và chủ đề đã có.
"""

CTX_FIELDS = ['logline', 'theme']
