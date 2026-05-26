# Tổng quan dự án AI Screenplay và Cách thức hoạt động

Dự án AI Screenplay là một hệ thống ứng dụng web kết hợp trí tuệ nhân tạo (AI) giúp tự động hóa quy trình viết kịch bản phim. Ứng dụng cung cấp 9 công cụ hướng dẫn người dùng từng bước từ lúc lên ý tưởng (Logline) đến khi hoàn thiện kịch bản chi tiết.

## 1. Cấu trúc thư mục và Ý nghĩa các file

### 📁 Frontend (Giao diện người dùng)
Giao diện ứng dụng được viết bằng HTML, CSS và JavaScript thuần (Vanilla JS).
- **`index.html`**: Trang chính chứa giao diện 9 bước viết kịch bản (Logline, Theme, Synopsis, v.v.).
- **`auth.html`**: Trang xử lý đăng nhập và đăng ký tài khoản.
- **`dashboard.html`, `home.html`**: Các trang giao diện hiển thị cho người dùng sau khi đã đăng nhập (trang chủ, bảng điều khiển quản lý dự án).
- **`admin.html`**: Trang quản trị hệ thống dành cho Admin (Dashboard thống kê, quản lý user, cấu hình prompts AI).
- **`css/`**: Thư mục chứa các tệp định dạng giao diện (`style.css`, `auth.css`, `dashboard.css`, `admin.css`).
- **`js/`**: Thư mục chứa các logic frontend.
  - `app.js`: File chứa logic chính, quản lý trạng thái của 9 công cụ AI, luân chuyển dữ liệu và xử lý các thao tác tương tác của người dùng.
  - `api.js`: File chứa các cấu hình và function gọi đến Node.js API (CRUD dữ liệu người dùng, dự án).
  - `auth.js`: Xử lý luồng đăng ký, đăng nhập và bảo mật (JWT).
  - `projectManager.js`: Chịu trách nhiệm khởi tạo, lưu trữ và quản lý phiên làm việc của các kịch bản/dự án đang được viết.
  - `admin.js`: File logic xử lý hiển thị số liệu quản trị hệ thống.

### 📁 Backend Node.js (`server/`)
Chịu trách nhiệm vận hành nghiệp vụ web thông thường: Xác thực người dùng, lưu trữ dữ liệu (Database MySQL) và quản lý thanh toán.
- **`server.js`**: File khởi tạo Express server (mặc định Port 3000), cấu hình Middleware, Routing, và kết nối DB.
- **`package.json`**: Quản lý các thư viện npm (Express, MySQL2, JWT, PayOS, v.v.).
- **`config/database.js`**: Quản lý kết nối (Connection Pool) đến MySQL Database.
- **`routes/`**: Các endpoint chia theo nhóm chức năng:
  - `auth.js`: Các API xử lý đăng ký, đăng nhập (hashing mật khẩu bằng bcrypt và cấp phát JWT token).
  - `projects.js`: Các API quản lý dự án của người dùng (Tạo mới, sửa, xóa, lấy danh sách).
  - `aiResponses.js`: Các API dùng để sao lưu và truy xuất lại kết quả AI đã sinh ra trước đó vào DB.
  - `admin.js`: Các API thống kê và quản lý người dùng dành riêng cho quyền Admin.
  - `payment.js`: Tích hợp hệ thống PayOS để xử lý quá trình người dùng nâng cấp gói tài khoản (Pro/VIP).

### 📁 Backend Python AI (`python_api/`)
Chịu trách nhiệm trực tiếp giao tiếp với các mô hình ngôn ngữ lớn (LLM - như LLaMA thông qua nền tảng Groq/OpenRouter) để thực thi nghiệp vụ sinh nội dung sáng tạo.
- **`app.py`**: Khởi tạo Flask API server (mặc định Port 5000) xử lý các AI endpoint (điển hình là endpoint `/api/generate` để sinh kịch bản) và chức năng đọc file (pdf, docx, txt).
- **`config.py`**: Chứa các biến cấu hình kết nối AI như Model, Server Host, Port, Provider.
- **`ai_service.py`**: Chứa các phương thức wrapper gọi trực tiếp ra Groq/OpenRouter API và xử lý lỗi kết nối.
- **`prompts.py`** và **`story_prompts.py`**: Định nghĩa và thiết kế "System Prompts" phức tạp cho từng loại nhiệm vụ cụ thể của AI (Ví dụ: Logline prompt, Character prompt, v.v.)
- **`db_runtime.py`**: Xử lý việc kiểm tra số dư Token (Quota) cho người dùng Free/Pro và log lại lịch sử chạy AI thẳng vào MySQL.
- **`generate_script_md_cli.py`**: Công cụ CLI tự động hóa tạo kịch bản nguyên khối thông qua một file JSON metadata được cung cấp và tổng hợp thành tệp Markdown.

### 📁 Các phần khác
- **`database/`**: Chứa các file lệnh SQL (`ai_screenplay.sql`, `payment_orders.sql`) để định nghĩa cấu trúc cơ sở dữ liệu MySQL (bảng users, projects, orders, v.v.).
- **`start.bat`**: File batch script dùng trên môi trường Windows để tự động bật lên 2 cửa sổ CMD khởi chạy đồng thời Node.js server và Python Flask server.
- **`README.md`**: File tài liệu mô tả chi tiết dự án, cách cài đặt và cấu hình.

---

## 2. Cách thức hoạt động của Hệ thống (Luồng làm việc)

**1. Khởi động và Truy cập:**
- Người quản trị chạy tệp `start.bat` để kích hoạt Node.js Backend (chạy ở port 3000) và Python AI Backend (chạy ở port 5000).
- Người dùng vào giao diện `index.html` hoặc `auth.html` (được Node.js cung cấp tĩnh). Họ thực hiện đăng ký và đăng nhập, nhận về token JWT xác thực.

**2. Quản lý dự án:**
- Tại Dashboard, người dùng tạo một dự án mới (Ví dụ: "Phim viễn tưởng 2026").
- Yêu cầu này được Javascript client (`api.js`) gọi lên **Node.js Server** qua `/api/projects`. Node.js lưu vào MySQL và trả về `project_id`.

**3. Quy trình AI sinh Kịch bản (9 Bước):**
- Trong màn hình làm việc (`index.html`), người dùng ở **Bước 1 (Logline)** nhập ý tưởng cơ bản và bấm "Tạo nội dung".
- Javascript trên frontend (`app.js`) sẽ lấy dữ liệu này, đóng gói và gửi HTTP POST đến `/api/generate` của **Python Server**.
- Trong Python (`app.py`), nó kiểm tra người dùng có đủ số lượt dùng AI trong ngày không (`db_runtime.py`).
- Nó chọn ra Prompt thích hợp từ file `prompts.py` dựa vào `tool_id` và gọi API lên nhà cung cấp LLM (thông qua `ai_service.py`).
- Kết quả văn bản (kịch bản/tóm tắt/v.v.) từ AI được trả về cho Client. Hệ thống cho phép người dùng xem kết quả ở màn hình bên phải và có thể dùng thanh công cụ text-editor để tuỳ ý chỉnh sửa.

**4. Dịch chuyển luồng dữ liệu:**
- Khi người dùng bấm "Lưu và Tiếp tục", kết quả này được Frontend gọi API sang **Node.js** lưu vào Database (để không bị mất).
- Đồng thời, thông tin của bước này tự động (Auto-fill) đẩy sang **Bước 2 (Theme - Chủ đề)** để làm ngữ cảnh bối cảnh (context) cho lần gọi AI kế tiếp, đảm bảo AI sinh ra kịch bản đồng nhất từ đầu đến cuối.

**5. Nâng cấp tài khoản (Automated Payment):**
- Khi hết lượt sử dụng AI, người dùng có thể thanh toán nâng cấp Pro.
- Khi người dùng gửi yêu cầu thanh toán, Frontend gọi API thanh toán của **Node.js** (`/routes/payment.js`).
- Hệ thống gọi qua dịch vụ **PayOS**, tạo QR thanh toán. Sau khi giao dịch ngân hàng thành công, PayOS gửi Webhook thông báo về hệ thống Node.js, cập nhật trạng thái `is_pro_active = true` trong database để cho phép gọi API Python mà không bị giới hạn quota.
