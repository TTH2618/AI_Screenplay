# BÁO CÁO HỆ THỐNG AI SCREENPLAY
## Nền Tảng Hỗ Trợ Viết Kịch Bản Phim Tự Động Dựa Trên Trí Tuệ Nhân Tạo

---

## 1. GIỚI THIỆU TỔNG QUAN

Hệ thống **AI Screenplay** là một nền tảng web hỗ trợ người dùng tạo ra kịch bản phim hoàn chỉnh thông qua trí tuệ nhân tạo. Hệ thống được thiết kế theo mô hình **pipeline tuần tự 8 bước** — từ việc hình thành ý tưởng ban đầu cho đến việc viết kịch bản chi tiết từng cảnh quay — đảm bảo rằng mỗi bước sinh ra nội dung đều kế thừa và nhất quán với toàn bộ các bước trước đó.

Ngoài chức năng tạo kịch bản gốc, hệ thống còn cung cấp bộ công cụ **phân tích truyện có sẵn**: người dùng có thể tải lên một câu chuyện, truyện ngắn hoặc tác phẩm văn học, và AI sẽ tự động phân tích cấu trúc, nhân vật, chủ đề, sau đó đề xuất cách chuyển thể sang định dạng kịch bản điện ảnh.

Hệ thống hướng đến hai nhóm người dùng chính:
- **Nhà biên kịch nghiệp dư và sinh viên** muốn học cách xây dựng cấu trúc kịch bản theo chuẩn Hollywood.
- **Nhà biên kịch chuyên nghiệp** cần một công cụ hỗ trợ phác thảo nhanh và sinh nội dung cho từng công đoạn.

---

## 2. KIẾN TRÚC HỆ THỐNG

Hệ thống được xây dựng theo kiến trúc **bốn tầng**, phân tách rõ ràng trách nhiệm của từng thành phần:

```
┌─────────────────────────────────────────────────────────────┐
│                  TẦNG GIAO DIỆN (Frontend)                  │
│    HTML/CSS/JS tĩnh · auth.html · dashboard.html · ...      │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (JWT)
┌────────────────────────▼────────────────────────────────────┐
│             TẦNG API NODE.JS (Express · Port 3000)          │
│  /api/auth · /api/projects · /api/ai-responses              │
│  /api/payment · /api/admin                                  │
└──────────────┬─────────────────────────┬────────────────────┘
               │ HTTP (nội bộ)           │ MySQL
┌──────────────▼──────────────┐  ┌───────▼───────────────────┐
│   TẦNG AI PYTHON (Flask)    │  │  TẦNG DỮ LIỆU (MySQL)     │
│   Port 5000 · OpenRouter    │  │  Database: ai_screenplay   │
│   Validation · Retry Loop   │  │  + Filesystem (JSON files) │
└─────────────────────────────┘  └───────────────────────────┘
```

### 2.1 Tầng giao diện (Frontend)

Frontend được xây dựng bằng HTML, CSS và JavaScript thuần, không sử dụng framework frontend. Các trang chính bao gồm:

| Trang | Chức năng |
|-------|-----------|
| `index.html` / `home.html` | Trang chủ giới thiệu hệ thống |
| `auth.html` | Đăng ký / Đăng nhập / Google OAuth |
| `dashboard.html` | Bảng điều khiển chính — quản lý dự án và sử dụng công cụ AI |
| `admin.html` | Bảng quản trị hệ thống (chỉ admin) |

Mỗi trang giao tiếp với backend thông qua REST API, sử dụng JWT Bearer Token lấy từ `localStorage` / `sessionStorage`. Toàn bộ file tĩnh được phục vụ trực tiếp bởi Express server.

### 2.2 Tầng API Node.js

Backend chính được viết bằng **Node.js + Express**, đảm nhận các nghiệp vụ:

- **Xác thực người dùng** (`/api/auth`): đăng ký với mật khẩu BCrypt, đăng nhập trả JWT (HMAC-SHA256, TTL 7 ngày), đăng nhập Google OAuth 2.0, tải lên avatar.
- **Quản lý dự án** (`/api/projects`): CRUD toàn bộ dự án kịch bản của người dùng.
- **Lưu trữ kết quả AI** (`/api/ai-responses`): đọc/ghi kết quả từng bước pipeline vào các bảng chuyên biệt (`loglines`, `themes`, `characters`, `synopses`, `structures`, `beatsheets`, `scenelists`, `scripts`).
- **Thanh toán** (`/api/payment`): tạo link thanh toán PayOS, xử lý webhook nâng cấp tài khoản PRO.
- **Quản trị** (`/api/admin`): xem thống kê, quản lý người dùng, cấu hình API key AI, chỉnh sửa system prompt trực tiếp từ giao diện.

Database sử dụng **MySQL connection pool** (tối đa 10 kết nối đồng thời, charset `utf8mb4`).

### 2.3 Tầng AI Python (Flask Microservice)

Một microservice độc lập viết bằng **Python + Flask** (port 5000) đảm nhận toàn bộ logic tương tác với LLM:

- Nhận yêu cầu từ frontend (qua Node.js proxy hoặc trực tiếp) với `tool_id` và `form_data`.
- Tra cứu API key hiện hành từ database (hỗ trợ thay đổi key không cần deploy lại).
- Xây dựng cặp prompt (system + user) theo `tool_id`.
- Gọi **OpenRouter API** (`google/gemini-2.0-flash-001`) qua HTTPS.
- Chạy **vòng lặp xác thực tự động** (tối đa 5 lần): nếu output không đạt tiêu chí, phản hồi lỗi được đưa vào prompt cho lần thử tiếp theo.
- Khi tool là `character` / `story_character`: parse JSON từ response AI và lưu từng nhân vật thành file `.json` riêng tại `uploads/characters/{project_id}/`.
- Ghi log mỗi lần sinh nội dung vào bảng `ai_generation_logs`.

### 2.4 Tầng dữ liệu

**Cơ sở dữ liệu MySQL** (`ai_screenplay`) gồm các bảng chính:

| Bảng | Nội dung lưu trữ |
|------|-----------------|
| `users` | Thông tin tài khoản, plan (free/pro), thời hạn PRO |
| `projects` | Metadata dự án kịch bản của từng user |
| `loglines` | Kết quả bước tạo logline |
| `themes` | Kết quả phân tích chủ đề (type: screenplay / story) |
| `characters` | Kết quả tạo hồ sơ nhân vật |
| `synopses` | Kết quả viết synopsis |
| `structures` | Kết quả xây dựng cấu trúc 4 hồi |
| `beatsheets` | Kết quả tạo beat sheet 15 beat |
| `scenelists` | Kết quả tạo danh sách cảnh |
| `scripts` | Kết quả viết kịch bản chi tiết từng cảnh |
| `api_credentials` | API key LLM cấu hình động |
| `system_prompts` | Prompt template có thể override qua admin |
| `ai_generation_logs` | Log mọi lần gọi AI (latency, status, model) |
| `payment_orders` | Lịch sử đơn hàng PayOS |

**Filesystem**: mỗi nhân vật được lưu thành file JSON độc lập tại `uploads/characters/{project_id}/{slug_ten_nhan_vat}_{timestamp}.json`, giúp các bước sau pipeline có thể tải và inject trực tiếp vào prompt.

---

## 3. PIPELINE SINH KỊ BẢN 8 BƯỚC

Đây là chức năng cốt lõi của hệ thống. Người dùng bắt đầu từ bước 1 và tiến dần, mỗi bước nhận đầu vào là kết quả đã sinh ra từ toàn bộ các bước trước.

```
Ý tưởng phim
     │
     ▼ Bước 1
 [LOGLINE] ──────────────────────────────────────────────────────────────┐
     │                                                                   │
     ▼ Bước 2                                                            │
 [CHỦ ĐỀ (Theme)] ◄── dùng logline                                       │
     │                                                                   │ Tất cả output
     ▼ Bước 3                                                            │ được tích lũy
 [NHÂN VẬT] ◄── dùng logline + chủ đề                                    │ vào context C_n
     │                                                                   │
     ▼ Bước 4                                                            │
 [SYNOPSIS] ◄── dùng logline + chủ đề + nhân vật                         │
     │                                                                   │
     ▼ Bước 5                                                            │
 [CẤU TRÚC 4 HỒI] ◄── dùng synopsis + nhân vật + chủ đề                  │
     │                                                                   │
     ▼ Bước 6                                                            │
 [BEAT SHEET] ◄── dùng synopsis + cấu trúc + nhân vật                    │
     │                                                                   │
     ▼ Bước 7                                                            │
 [DANH SÁCH CẢNH] ◄── dùng synopsis + cấu trúc + beatsheet + nhân vật    │
     │                                                                   │
     ▼ Bước 8 (lặp lại cho từng cảnh)                                    │
 [KỊCH BẢN CHI TIẾT] ◄── dùng toàn bộ context + kịch bản cảnh trước ─────┘
```

### Chi tiết từng bước

| Bước | Tool ID | Đầu ra | Yêu cầu format |
|------|---------|--------|----------------|
| 1 | `logline` | 1–2 câu, ~25–50 từ, đủ 4 yếu tố: nhân vật – mục tiêu – xung đột – stakes | Văn xuôi tự do |
| 2 | `theme` | 14 mục phân tích hành trình kịch tính theo LIE→TRUTH | Markdown heading chuẩn |
| 3 | `character` | Mảng JSON các nhân vật, mỗi nhân vật có 8 trường bắt buộc | **JSON thuần** (parse được) |
| 4 | `synopsis` | 500–800 từ, đủ 4 phần: mở đầu – phát triển – cao trào – kết thúc | Markdown |
| 5 | `structure` | Cấu trúc 4 hồi theo Story Circle Dan Harmon | Markdown |
| 6 | `beatsheet` | 15 beat theo Save the Cat (Blake Snyder) | Markdown |
| 7 | `scenelist` | Đúng số cảnh người dùng yêu cầu, mỗi cảnh 1–2 câu | Danh sách có số thứ tự |
| 8 | `script` | Kịch bản Hollywood cho đúng 1 cảnh, tối thiểu 5 phân cảnh nhỏ | Format kịch bản chuẩn |

---

## 4. CƠ CHẾ XÁC THỰC VÀ THỬ LẠI TỰ ĐỘNG

Mỗi bước trong pipeline đều được kiểm tra bởi một **validation agent** độc lập trước khi chấp nhận kết quả. Quy trình:

```
Sinh nội dung (Attempt k)
        │
        ▼
Gọi LLM với (system_prompt, user_prompt + feedback_k-1)
        │
        ▼
Gọi Validation LLM với (output, criteria_n)
        │
   ┌────┴────┐
PASS         FAIL
   │            │
   ▼            ▼ (k < 5)
Chấp nhận    Thêm feedback vào prompt → Attempt k+1
   │
   ▼         (k = 5)
Trả kết quả  Trả kết quả best-effort
```

Mỗi công cụ có bộ tiêu chí riêng (`_CRITERIA`):
- **logline**: đủ 4 yếu tố, độ dài hợp lý, không trùng phim đã có.
- **character**: JSON parse được, đủ 8 trường, có đủ nhân vật chính + phản diện + phụ.
- **synopsis**: nhất quán tên nhân vật, đủ 4 phần cấu trúc, có tính nhân quả.
- **script**: đủ 5 phân cảnh, format nhãn `[GÓC MÁY]` / `[TẠO HÌNH NHÂN VẬT]` chính xác.

---

## 5. BỘ CÔNG CỤ PHÂN TÍCH TRUYỆN CÓ SẴN

Ngoài pipeline tạo kịch bản gốc, hệ thống hỗ trợ **phân tích câu chuyện đã có** (`story_*` tools):

| Tool ID | Chức năng |
|---------|-----------|
| `story_theme` | Phân tích chủ đề, LIE/TRUTH, hành trình nhân vật của truyện |
| `story_character` | Phân tích hồ sơ từng nhân vật (vai trò, arc, Ghost/Wound, WANT vs NEED) |
| `story_synopsis` | Viết lại synopsis theo chuẩn 4 phần điện ảnh |
| `story_structure` | Phân tích cấu trúc 4 hồi, xác định turning points |
| `story_beatsheet` | Ánh xạ câu chuyện vào 15 beat Save the Cat |
| `story_scenelist` | Phân chia câu chuyện thành danh sách cảnh |
| `story_script` | Viết kịch bản chi tiết cho từng cảnh dựa trên truyện gốc |

Người dùng tải lên nội dung truyện (text), hệ thống lưu vào bảng `stories` và cung cấp toàn bộ chuỗi công cụ phân tích tuần tự.

---

## 6. HỆ THỐNG XÁC THỰC VÀ PHÂN QUYỀN

### 6.1 Đăng ký / Đăng nhập thường

1. Người dùng gửi `email + password`.
2. Server kiểm tra email, băm mật khẩu với **BCrypt** (saltRounds = 10).
3. Trả về **JWT** ký bằng HMAC-SHA256, payload chứa `{ id, email, username, is_admin, plan_type, pro_expires_at }`, TTL 7 ngày.
4. Frontend lưu token vào `localStorage` (Remember me) hoặc `sessionStorage`.

### 6.2 Google OAuth 2.0

1. Frontend lấy Google ID Token qua Google Sign-In SDK.
2. Gửi token lên `/api/auth/google`.
3. Server xác thực với Google Public Key Set, trích xuất `(email, name, sub)`.
4. **Upsert** tài khoản: nếu email đã tồn tại → trả JWT user cũ; nếu chưa → tạo mới với username = `slug(email prefix)` (đảm bảo unique).
5. Trả JWT tương tự flow thường.

### 6.3 Phân quyền

| Quyền | Điều kiện |
|-------|-----------|
| Truy cập API thông thường | Token JWT hợp lệ |
| Gọi AI (free) | `usage(user, today) < 10` |
| Gọi AI (không giới hạn) | `plan_type = 'pro'` và `pro_expires_at > NOW()` |
| Truy cập admin | `is_admin = 1` và `account_status ≠ 'banned'` |

---

## 7. HỆ THỐNG THANH TOÁN VÀ GÓI PRO

Thanh toán được tích hợp với **PayOS** (cổng thanh toán Việt Nam). Có ba gói dịch vụ:

| Gói | Thời hạn | Giá |
|-----|----------|-----|
| PRO 1 tháng | 30 ngày | 199.000 VNĐ |
| PRO 3 tháng | 90 ngày | 250.000 VNĐ |
| PRO 1 năm | 365 ngày | 800.000 VNĐ |

**Luồng thanh toán:**

```
User chọn gói
     │
     ▼
Server tạo payment link PayOS (lưu tạm pendingOrders Map)
     │
     ▼
Redirect user đến trang thanh toán PayOS
     │
     ▼
PayOS gọi webhook về server (xác thực chữ ký)
     │
     ▼
Server nâng cấp plan:
  pro_expires_at = max(now, hiện tại) + months
  Lưu payment_orders vào DB
     │
     ▼
User nhận thông báo thành công
```

Nếu user đã có PRO còn hạn, thời gian mua thêm sẽ được **cộng dồn** (không reset), đảm bảo quyền lợi người dùng.

---

## 8. BẢNG QUẢN TRỊ (Admin Panel)

Admin dashboard cung cấp các tính năng:

- **Thống kê tổng quan**: tổng số người dùng, user mới hôm nay / tuần / tháng, số tài khoản PRO đang hoạt động, biểu đồ tăng trưởng PRO 14 ngày gần nhất, tổng số dự án, tổng nội dung AI đã sinh.
- **Quản lý người dùng**: xem danh sách, ban/unban tài khoản, xem lịch sử sử dụng.
- **Quản lý API Credentials**: thêm/sửa/xóa API key LLM theo provider, mask key khi hiển thị.
- **Quản lý System Prompts**: xem và chỉnh sửa prompt template cho từng tool trực tiếp từ giao diện (ghi đè vào bảng `system_prompts` thay vì sửa code).
- **Log sinh nội dung AI**: xem chi tiết latency, model, status, error của từng lần gọi AI.

---

## 9. QUẢN LÝ NHÂN VẬT (Character File System)

Khi bước `character` hoặc `story_character` tạo ra nhân vật thành công, hệ thống:

1. Parse mảng JSON từ response AI.
2. Với mỗi nhân vật, tạo file `{slug_ho_ten}_{timestamp}.json` tại `uploads/characters/{project_id}/`.
3. Mỗi file chứa đủ 8 trường: `ho_ten`, `vai_tro`, `gioi_tinh`, `tuoi`, `quoc_tich`, `ngoai_hinh`, `tinh_cach`, `background`.

Ở các bước sau (synopsis, structure, beatsheet, scenelist, script), hệ thống tự động **load toàn bộ file JSON của project** và inject vào `form_data.characters` trước khi xây dựng prompt, đảm bảo tên và tính cách nhân vật nhất quán xuyên suốt.

Nếu validation thất bại và cần thử lại bước character, toàn bộ file JSON của lần thử trước sẽ bị **xóa tự động** trước khi thử lại.

---

## 10. TÍNH LIÊN TỤC GIỮA CÁC CẢNH (Script Continuity)

Khi viết kịch bản (bước 8), hệ thống duy trì tính liên tục giữa các cảnh thông qua hai cơ chế:

**Cơ chế 1 — Context cảnh lân cận**: Hàm `_extract_scene_neighbors` phân tích danh sách cảnh và cung cấp cho LLM:
- Nội dung cảnh trước (không được viết lại).
- Nội dung cảnh hiện tại (cần viết).
- Nội dung cảnh sau (không được viết vào cảnh hiện tại).

**Cơ chế 2 — Previous script injection**: Nếu người dùng cung cấp kịch bản cảnh trước đã hoàn thành (`previous_script`), toàn bộ nội dung đó được inject vào prompt với chỉ thị LLM phải viết tiếp liền mạch, giữ nguyên trạng thái cảm xúc và tone từ điểm kết thúc cảnh trước.

---

## 11. LUỒNG XỬ LÝ ĐẦU-CUỐI (End-to-End Workflow)

```
1. Người dùng đăng nhập (JWT)
         │
         ▼
2. Tạo / mở dự án kịch bản
         │
         ▼
3. Chọn bước pipeline (ví dụ: Bước 1 - Logline)
         │
         ▼
4. Frontend gửi POST /api/generate (Python API)
   {tool_id, form_data, user_id, project_id}
         │
         ▼
5. Python API kiểm tra quota
   ├── Free và hết quota → 429 Too Many Requests
   └── OK → tiếp tục
         │
         ▼
6. Load API key từ DB, build system_prompt + user_prompt
         │
         ▼
7. Gọi OpenRouter (Gemini 2.0 Flash)
         │
         ▼
8. Validation loop (tối đa 5 lần)
   ├── PASS → tiếp tục
   └── FAIL → thêm feedback → gọi lại LLM
         │
         ▼
9. Nếu tool là character: parse JSON → lưu file .json
         │
         ▼
10. Ghi ai_generation_log (latency, status, model)
         │
         ▼
11. Trả HTML-formatted content về frontend
         │
         ▼
12. Frontend hiển thị kết quả, cập nhật context
    cho bước tiếp theo
         │
         ▼
13. (Tùy chọn) Người dùng lưu kết quả → Node.js
    lưu vào bảng tương ứng (themes, characters, ...)
```

---

## 11.1. XỬ LÝ REQUEST TỐN THỜI GIAN — ASYNC JOB QUEUE

Các yêu cầu gọi AI (đặc biệt khi có validation loop tới 5 lần) có thể mất từ **10–60 giây**. Thay vì giữ kết nối HTTP mở và để trình duyệt chờ (synchronous), hệ thống cung cấp mô hình **submit → poll** không đồng bộ:

### Luồng tổng quan

```
Frontend                          Python API (Flask)
   │                                     │
   │  POST /api/generate-async           │
   │  {tool_id, form_data, ...}  ──────► │ 1. Validate input
   │                                     │ 2. Tạo job (UUID) → _jobs dict
   │  202 Accepted                       │ 3. Khởi động background thread
   │◄── {job_id: "uuid", status:         │    (_run_job chạy nền)
   │         "pending"}                  │
   │                                     │    [background thread]
   │                                     │    ├─ Kiểm tra quota
   │  (cách 3 giây)                      │    ├─ Inject characters
   │  GET /api/job/{uuid}        ──────► │    ├─ Generate content
   │◄── {status: "processing",           │    ├─ Validate (tối đa 5 lần)
   │     progress: "Tạo nội dung         │    └─ Ghi kết quả vào _jobs
   │              – lần 2/5..."}         │
   │                                     │
   │  (cách 3 giây)                      │
   │  GET /api/job/{uuid}        ──────► │
   │◄── {status: "done",                 │
   │     result: { content, ... }}       │
```

### Các trạng thái job

| Trạng thái | Ý nghĩa |
|------------|---------|
| `pending`    | Job đã được tạo, đang chờ thread xử lý |
| `processing` | Thread đang chạy pipeline (generate + validate) |
| `done`       | Hoàn thành thành công; `result` chứa nội dung AI |
| `error`      | Thất bại; `error` chứa thông báo lỗi, `error_code` chứa mã HTTP tương ứng |

### API Endpoints

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/generate-async` | `POST` | Submit job; trả về `job_id` ngay lập tức (HTTP 202) |
| `/api/job/<job_id>`   | `GET`  | Poll trạng thái job; trả về `status`, `progress`, `result` hoặc `error` |

### Cơ chế lưu trữ job (In-memory Store)

Job được lưu trong dict Python `_jobs` được bảo vệ bởi `threading.Lock()`:

```python
_jobs[job_id] = {
    'status':     'pending',      # pending | processing | done | error
    'progress':   'Đang chờ...',  # mô tả bước hiện tại (hiển thị cho user)
    'result':     None,           # kết quả đầy đủ khi status = "done"
    'error':      None,           # thông báo lỗi khi status = "error"
    'error_code': None,           # mã lỗi HTTP (ví dụ: 429 nếu hết quota)
    'tool_id':    'logline',
    'created_at': datetime.utcnow(),
}
```

Job hết hạn sau **1 giờ** (`_JOB_TTL = 3600`). Hàm `_evict_old_jobs()` dọn dẹp các job `done`/`error` quá TTL và được gọi mỗi khi có submit mới.

### Frontend polling (JavaScript)

Hàm `generateWithPolling()` trong `js/api.js` đóng gói toàn bộ luồng submit + poll:

```javascript
const result = await API.AsyncJob.generateWithPolling(
    { tool_id: 'logline', form_data: { movie_idea: '...' }, user_id, project_id },
    {
        interval:   3000,        // poll mỗi 3 giây
        timeout:    300_000,     // tối đa 5 phút
        onProgress: (msg, status) => updateUI(msg, status),
    }
);
```

Vòng lặp poll tự động dừng khi job chuyển sang `done` hoặc `error`, hoặc khi vượt quá `timeout`.

---

## 12. CÔNG NGHỆ SỬ DỤNG

| Lớp | Công nghệ |
|-----|-----------|
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Backend chính | Node.js 18+, Express.js 4 |
| Xác thực | JWT (jsonwebtoken), BCrypt, Google OAuth 2.0 |
| AI Microservice | Python 3.10+, Flask, httpx |
| LLM Gateway | OpenRouter API (`google/gemini-2.0-flash-001`) |
| Database | MySQL / MariaDB 10.4+, mysql2/promise |
| File Upload | Multer (avatar), Python filesystem (character JSON) |
| Thanh toán | PayOS SDK Node.js |
| ORM/Query | Raw SQL qua mysql2 pool |
| Môi trường | dotenv, CORS |

---

## 13. CÁC TÍNH NĂNG NỔI BẬT

1. **Pipeline nhất quán**: Mỗi bước tự động nhận toàn bộ context từ các bước trước, loại bỏ mâu thuẫn giữa tên nhân vật, sự kiện và chủ đề.

2. **Tự sửa lỗi**: Vòng lặp validation + retry với feedback cụ thể giúp AI tự nhận ra và sửa lỗi format/nội dung mà không cần người dùng can thiệp.

3. **Quản lý nhân vật phân tán**: Character files JSON độc lập cho phép tái sử dụng và cập nhật nhân vật linh hoạt giữa các bước.

4. **Prompt động**: System prompt có thể được ghi đè qua admin panel mà không cần deploy lại server, cho phép tinh chỉnh chất lượng output liên tục.

5. **Quota và monetization**: Hệ thống phân biệt rõ tài khoản Free (10 lượt/ngày) và PRO (không giới hạn), tích hợp thanh toán tự động qua PayOS.

6. **Audit trail đầy đủ**: Mọi lần gọi AI đều được log kèm user, project, tool, model, latency và kết quả, phục vụ cho việc giám sát và tối ưu.

7. **Dual authentication**: Hỗ trợ cả đăng nhập email/password truyền thống lẫn Google OAuth, đảm bảo trải nghiệm người dùng linh hoạt.

---

## 14. CẤU TRÚC THƯ MỤC DỰ ÁN

```
doan2/
├── index.html / home.html / auth.html     # Frontend pages
├── dashboard.html / admin.html
├── css/                                   # Stylesheets
├── js/                                    # Frontend JS controllers
│   ├── app.js                             # Core app logic
│   ├── auth.js                            # Auth flows
│   ├── dashboard.js                       # Dashboard & pipeline UI
│   ├── admin.js                           # Admin panel
│   ├── api.js                             # API call helpers
│   ├── home.js                            # Landing page
│   └── projectManager.js                 # Project management
├── server/                                # Node.js backend
│   ├── server.js                          # Express app entry point
│   ├── config/database.js                 # MySQL connection pool
│   └── routes/                            # Route handlers
│       ├── auth.js                        # Authentication
│       ├── projects.js                    # Project CRUD
│       ├── aiResponses.js                 # AI result storage
│       ├── payment.js                     # PayOS integration
│       └── admin.js                       # Admin endpoints
├── python_api/                            # AI microservice
│   ├── app.py                             # Flask entry point
│   ├── ai_service.py                      # OpenRouter API calls
│   ├── prompts.py                         # System & user prompts
│   ├── story_prompts.py                   # Story analysis prompts
│   ├── validator.py                       # Validation agents
│   ├── character_files.py                 # Character JSON manager
│   ├── db_runtime.py                      # DB access (keys, logs)
│   ├── config.py                          # Config from .env
│   └── requirements.txt                   # Python dependencies
├── database/
│   ├── ai_screenplay.sql                  # Full DB schema + seeds
│   └── payment_orders.sql                 # Payment orders schema
├── uploads/
│   ├── avatars/                           # User avatars
│   └── characters/{project_id}/          # Character JSON files
└── start.bat                              # Development startup script
```

---

## 15. KẾT LUẬN

Hệ thống AI Screenplay đề xuất một kiến trúc rõ ràng cho bài toán sinh nội dung sáng tạo đòi hỏi tính nhất quán cao — vấn đề cốt lõi mà các ứng dụng AI thế hệ hiện tại thường bỏ qua khi chỉ cho phép người dùng tương tác từng câu hỏi riêng lẻ. Bằng cách xây dựng **pipeline tích lũy context** kết hợp với **vòng lặp tự xác thực**, hệ thống đảm bảo rằng kịch bản cuối cùng là một tác phẩm thống nhất, từ logline đến từng dòng thoại, thay vì một tập hợp các đoạn văn rời rạc.

Hướng phát triển tiếp theo bao gồm: hỗ trợ xuất file PDF/DOCX theo chuẩn kịch bản Hollywood, tích hợp multi-agent viết song song nhiều cảnh, và bổ sung mô hình phân tích tình cảm để đánh giá tone của từng cảnh trong toàn bộ kịch bản.
