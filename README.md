# AI Screenplay - Hệ thống tạo kịch bản phim tự động

Hệ thống hỗ trợ nhà biên kịch tạo kịch bản phim chuyên nghiệp với sự hỗ trợ của trí tuệ nhân tạo.

## Tong quan (Overview)

Hệ thống AI Screenplay là ứng dụng web hiện đại hỗ trợ nhà biên kịch xây dựng kịch bản phim chuyên nghiệp từ ý tưởng sơ khởi ban đầu đến tác phẩm hoàn chỉnh với sự hỗ trợ từ trí tuệ nhân tạo. Ứng dụng cung cấp quy trình sáng tác tuần tự gồm chín công cụ tương ứng với chín bước thiết yếu trong quy chuẩn biên kịch điện ảnh. Quy trình bắt đầu bằng việc tạo tóm tắt phim ngắn gọn (Logline), định hình chủ đề cốt lõi (Theme), phác thảo hồ sơ nhân vật chi tiết (Character Profile) và xây dựng cốt truyện khái quát (Synopsis). Tiếp theo, hệ thống hỗ trợ phân bổ cốt truyện theo cấu trúc bốn hồi (4-Act Structure), phát triển hành trình tâm lý nhân vật (Character Arc), lập danh mục phân cảnh chi tiết (Beat Sheet), liệt kê danh sách phân cảnh (Scene List) và cuối cùng là tạo kịch bản chi tiết định dạng chuẩn Hollywood (Hollywood Script).

Bên cạnh các tính năng sinh nội dung bằng AI, hệ thống còn được trang bị đầy đủ cơ chế quản trị và các dịch vụ bổ sung chuyên nghiệp. Người dùng có thể đăng ký tài khoản và đăng nhập bảo mật bằng cơ chế mã hóa JWT hoặc liên kết trực tiếp thông qua tài khoản Google. Để phục vụ việc mua gói nâng cấp và nạp số dư tín dụng, hệ thống tích hợp hai cổng thanh toán trực tuyến phổ biến là VNPAY Sandbox và PayOS. Đối với quản trị viên, trang quản trị chuyên biệt cung cấp giao diện dashboard thống kê tổng quan hiệu năng, quản lý tài khoản người dùng, xem nhật ký gọi AI chi tiết (bao gồm thời gian phản hồi, số token tiêu thụ và chi phí tương ứng), cấu hình hệ thống prompt mẫu và trực tiếp quản lý các khóa API cùng tài nguyên lưu trữ của hệ thống.

---

## Yeu cau He thong (System Requirements)

Hệ thống yêu cầu các thành phần phần mềm và môi trường tối thiểu sau đây để có thể cài đặt và vận hành ổn định:

- Python >= 3.8
- Node.js >= 18.x
- MySQL >= 8.0
- npm >= 9.x
- pip >= 21.x
- Kết nối Internet ổn định để giao tiếp với dịch vụ OpenRouter AI, Google Auth và các cổng thanh toán trực tuyến

---

## Cai dat & Chay thu cuc bo (Local Setup)

### 1. Sao chép mã nguồn về máy cục bộ

Mở terminal và chạy lệnh sau để tải mã nguồn dự án:

```bash
git clone <repository-url>
cd AI_screenplay
```

### 2. Thiết lập cơ sở dữ liệu MySQL

Khởi động dịch vụ MySQL của bạn, tạo cơ sở dữ liệu mới và thực thi các tệp tin SQL trong thư mục database để khởi tạo cấu trúc bảng:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ai_screenplay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p ai_screenplay < database/ai_screenplay.sql
```

### 3. Cài đặt và cấu hình Máy chủ Node.js Backend

Di chuyển vào thư mục server, sao chép tệp cấu hình mẫu và tiến hành cài đặt các gói phụ thuộc:

```bash
cd server
cp .env.example .env
npm install
cd ..
```

*Lưu ý: Mở tệp server/.env bằng trình soạn thảo và điền thông tin kết nối MySQL cùng các khóa bảo mật.*

### 4. Cài đặt và cấu hình Máy chủ Python AI Backend

Tạo môi trường ảo Python ở thư mục gốc của dự án, kích hoạt môi trường ảo và cài đặt các thư viện cần thiết trong thư mục python_api:

```bash
python -m venv .venv

# Kích hoạt trên Windows (Command Prompt hoặc PowerShell)
.venv\Scripts\activate

# Hoặc kích hoạt trên Linux/macOS
# source .venv/bin/activate

cd python_api
cp .env.example .env
pip install -r requirements.txt
cd ..
```

*Lưu ý: Mở tệp python_api/.env bằng trình soạn thảo và điền khóa API OpenRouter cùng mô hình AI muốn cấu hình.*

### 5. Khởi động các máy chủ dịch vụ

#### Cách 1: Khởi động nhanh bằng tệp kịch bản trên Windows

Nhấp đúp chuột vào tệp tin hoặc chạy lệnh sau trong terminal:

```cmd
start.bat
```

#### Cách 2: Khởi động thủ công bằng hai cửa sổ Terminal riêng biệt

- Cửa sổ Terminal 1 (Node.js Server):

```bash
cd server
npm start
```

- Cửa sổ Terminal 2 (Python AI Server):

```bash
# Đảm bảo môi trường ảo .venv đã được kích hoạt trước khi chạy
cd python_api
python app.py
```

### 6. Truy cập ứng dụng

Sau khi khởi động thành công, các dịch vụ sẽ hoạt động tại các địa chỉ sau:

- Trang làm việc chính (Frontend): http://localhost:3000
- Trang đăng nhập/đăng ký: http://localhost:3000/auth.html
- Trang giới thiệu dịch vụ (Dashboard): http://localhost:3000/dashboard.html
- Trang quản trị viên: http://localhost:3000/admin.html
- Python AI API (Nội bộ): http://localhost:5000
- Kiểm tra sức khỏe dịch vụ AI: http://localhost:5000/api/health

---

## Cau hinh Bien Moi truong (Environment Variables)

Sao chép các tệp tin cấu hình mẫu thành cấu hình thực tế và cập nhật đầy đủ thông tin trước khi vận hành hệ thống.

### Cấu hình môi trường cho Node.js Server (tệp server/.env)

| Tên biến | Mô tả | Ví dụ |
| :--- | :--- | :--- |
| DB_HOST | Địa chỉ máy chủ cơ sở dữ liệu MySQL | localhost |
| DB_USER | Tên người dùng kết nối cơ sở dữ liệu MySQL | root |
| DB_PASSWORD | Mật khẩu truy cập cơ sở dữ liệu MySQL | mat_khau_cua_ban |
| DB_NAME | Tên cơ sở dữ liệu sử dụng cho dự án | ai_screenplay |
| DB_PORT | Cổng kết nối cơ sở dữ liệu MySQL | 3306 |
| PORT | Cổng dịch vụ chạy máy chủ chính Express.js | 3000 |
| PYTHON_PORT | Cổng kết nối đến dịch vụ Python Flask API | 5000 |
| JWT_SECRET | Khóa bí mật dùng ký mã thông báo bảo mật JWT | changeme-use-strong-secret-key-32-chars |
| GOOGLE_CLIENT_ID | Khóa ứng dụng Google Client ID cho đăng nhập liên kết | 123456789.apps.googleusercontent.com |
| PAYOS_CLIENT_ID | Mã định danh khách hàng tích hợp cổng thanh toán PayOS | payos_client_id_vi_du |
| PAYOS_API_KEY | Khóa API bảo mật của cổng thanh toán PayOS | payos_api_key_vi_du |
| PAYOS_CHECKSUM_KEY | Khóa kiểm tra toàn vẹn dữ liệu từ cổng PayOS | payos_checksum_key_vi_du |
| APP_URL | Địa chỉ URL chạy ứng dụng chính dùng cho phản hồi thanh toán | http://localhost:3000 |
| VNPAY_TMN_CODE | Mã website đăng ký tích hợp trên cổng VNPAY | TMN_CODE_VI_DU |
| VNPAY_HASH_SECRET | Khóa bảo mật ký chữ ký số giao dịch của cổng VNPAY | HASH_SECRET_VI_DU |
| VNPAY_URL | Đường dẫn kết nối cổng thanh toán Sandbox của VNPAY | https://sandbox.vnpayment.vn/paymentv2/vpcpay.html |
| VNPAY_RETURN_URL | URL nhận kết quả trả về từ VNPAY sau thanh toán | http://localhost:3000/api/payment/vnpay/return |

### Cấu hình môi trường cho Python AI Server (tệp python_api/.env)

| Tên biến | Mô tả | Ví dụ |
| :--- | :--- | :--- |
| OPENROUTER_API_KEY | Khóa kết nối API của nhà cung cấp dịch vụ OpenRouter | sk-or-v1-abcdef1234567890 |
| OPENROUTER_MODEL | Tên mô hình ngôn ngữ lớn cấu hình để gọi qua OpenRouter | google/gemini-2.5-flash-lite |
| PYTHON_API_HOST | Địa chỉ IP lắng nghe của dịch vụ Flask API | 0.0.0.0 |
| PYTHON_API_PORT | Cổng chạy máy chủ Python Flask | 5000 |
| FLASK_DEBUG | Bật hoặc tắt trạng thái gỡ lỗi trực tiếp của Flask | True |

---

## Cau truc Thu muc (Project Structure)

Cấu trúc thư mục chính của dự án được tổ chức rõ ràng phân tách giữa giao diện người dùng, máy chủ điều phối và dịch vụ xử lý ngôn ngữ AI:

```
AI_screenplay/
├── css/                             # Các tệp thiết kế giao diện (CSS)
│   ├── auth.css                     # Thiết kế trang đăng nhập và đăng ký tài khoản
│   └── style.css                    # Thiết kế chính của toàn bộ giao diện hệ thống
├── database/                        # Kịch bản cơ sở dữ liệu và các tệp di cư SQL
│   ├── ai_screenplay.sql            # Cấu trúc bảng gốc và dữ liệu mẫu mặc định
│   ├── payment_orders.sql           # Cấu trúc bảng lưu thông tin hóa đơn PayOS
│   └── token_billing.sql            # Bản cập nhật di cư theo dõi và thanh toán token
├── js/                              # Các tệp xử lý logic phía trình duyệt (JS)
│   ├── api.js                       # Đối tượng API giao tiếp với Node.js backend
│   ├── app.js                       # Quản lý giao diện, các bước tạo kịch bản tuần tự
│   ├── auth.js                      # Xử lý quy trình đăng nhập, đăng ký và đăng xuất
│   └── projectManager.js            # Quản lý danh sách dự án và cập nhật bước kịch bản
├── python_api/                      # Dịch vụ Python AI Backend (Flask)
│   ├── ai_service.py                # Xử lý kết nối và gửi yêu cầu đến OpenRouter API
│   ├── app.py                       # Điểm đầu vào chính định nghĩa API Flask
│   ├── character_files.py           # Quản lý lưu trữ và phân tích thông tin nhân vật
│   ├── config.py                    # Khởi tạo và nạp cấu hình từ môi trường
│   ├── db_runtime.py                # Quản lý các lệnh cơ sở dữ liệu lúc vận hành
│   ├── generate_script_md_cli.py    # Kịch bản hỗ trợ xuất kịch bản ra định dạng Markdown
│   ├── prompts.py                   # Danh sách prompt mẫu của các công cụ biên kịch
│   ├── requirements.txt             # Định nghĩa danh sách thư viện Python cần thiết
│   ├── story_prompts.py             # Prompt xây dựng kịch bản từ câu chuyện gốc
│   ├── validator.py                 # Bộ xác thực chất lượng đầu ra của AI
│   ├── .env                         # Tệp cấu hình môi trường thực tế (không commit)
│   └── .env.example                 # Mẫu khai báo biến môi trường cho Flask
├── server/                          # Máy chủ chính Node.js (Express)
│   ├── config/
│   │   └── database.js              # Khởi tạo kết nối hồ chứa (Connection Pool) MySQL
│   ├── middleware/                  # Chứa các bộ lọc kiểm soát yêu cầu đầu vào
│   ├── routes/                      # Định nghĩa các tuyến đường xử lý API
│   │   ├── admin.js                 # API phục vụ bảng quản trị của admin
│   │   ├── aiResponses.js           # API quản lý kết quả đầu ra từ AI
│   │   ├── auth.js                  # API xác thực tài khoản và phân quyền
│   │   ├── payment.js               # API tích hợp VNPAY, PayOS và quản lý ví
│   │   └── projects.js              # API xử lý thông tin dự án kịch bản phim
│   ├── migrate_payment.js           # Kịch bản cập nhật cấu trúc cơ sở dữ liệu thanh toán
│   ├── package.json                 # Khai báo các thư viện Node.js cần thiết
│   ├── server.js                    # Điểm khởi chạy chính ứng dụng Node.js, xử lý proxy
│   ├── .env                         # Tệp cấu hình môi trường thực tế (không commit)
│   └── .env.example                 # Mẫu khai báo biến môi trường cho Express
├── uploads/                         # Thư mục lưu trữ các tệp tải lên của hệ thống
├── admin.html                       # Giao diện quản trị hệ thống
├── auth.html                        # Giao diện đăng nhập và đăng ký
├── dashboard.html                   # Giao diện trang chủ cá nhân và mua gói dịch vụ
├── home.html                        # Giao diện khu vực soạn thảo kịch bản chính
├── index.html                       # Giao diện trang gốc thực hiện chuyển hướng mặc định
├── projects.html                    # Giao diện quản lý các dự án kịch bản cá nhân
├── package.json                     # Cấu hình Capacitor phục vụ đóng gói ứng dụng di động
├── start.bat                        # Kịch bản khởi động nhanh toàn bộ hệ thống trên Windows
└── .gitignore                       # Định nghĩa các tệp và thư mục Git bỏ qua khi commit
```

---

## Danh sach API Endpoint (API Reference)

Tất cả các endpoint API của máy chủ Node.js chính đều được định cấu hình mặc định bắt đầu bằng tiền tố `/api`. Phía máy khách (Frontend) khi thực hiện các cuộc gọi đến `/python-api/*` sẽ được máy chủ Node.js chuyển tiếp tự động thông qua proxy tới `/api/*` trên máy chủ Python Flask (Cổng 5000).

### 1. Nhóm Xác thực tài khoản (Authentication API)

| Phương thức | Endpoint | Xác thực | Mô tả |
| :--- | :--- | :--- | :--- |
| POST | /api/auth/register | Không | Đăng ký tài khoản người dùng mới |
| POST | /api/auth/login | Không | Đăng nhập tài khoản, nhận về mã thông báo JWT |
| GET | /api/auth/me | Bearer Token | Lấy thông tin chi tiết của người dùng đang đăng nhập |
| PUT | /api/auth/update | Bearer Token | Cập nhật thông tin hồ sơ cá nhân người dùng |
| PUT | /api/auth/change-password | Bearer Token | Thực hiện thay đổi mật khẩu người dùng |

### 2. Nhóm Quản lý dự án kịch bản (Projects API)

| Phương thức | Endpoint | Xác thực | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | /api/projects | Bearer Token | Lấy danh sách toàn bộ dự án kịch bản của người dùng |
| GET | /api/projects/:id | Bearer Token | Lấy chi tiết thông tin và các bước của một dự án cụ thể |
| POST | /api/projects | Bearer Token | Khởi tạo một dự án kịch bản phim mới |
| PUT | /api/projects/:id | Bearer Token | Cập nhật thông tin tiêu đề, mô tả của dự án |
| DELETE | /api/projects/:id | Bearer Token | Xóa bỏ hoàn toàn dự án kịch bản khỏi tài khoản |

### 3. Nhóm Quản lý kết quả lưu trữ AI (AI Responses API)

| Phương thức | Endpoint | Xác thực | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | /api/ai-responses/:projectId | Bearer Token | Lấy tất cả kết quả sinh của AI đã lưu trong dự án |
| POST | /api/ai-responses | Bearer Token | Lưu trữ một kết quả sinh kịch bản mới từ AI |
| PUT | /api/ai-responses/:id | Bearer Token | Cập nhật nội dung kết quả sinh đã có của dự án |

### 4. Nhóm Cổng thanh toán (Payment API)

| Phương thức | Endpoint | Xác thực | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | /api/payment/prices | Không | Lấy bảng giá các gói cước nâng cấp dịch vụ |
| GET | /api/payment/gateways | Không | Kiểm tra trạng thái hoạt động của các cổng thanh toán |
| POST | /api/payment/create | Bearer Token | Khởi tạo đơn hàng thanh toán nâng cấp tài khoản qua SePay |
| GET | /api/payment/ipn | Không | Endpoint kiểm tra sức khỏe dịch vụ IPN SePay |
| POST | /api/payment/ipn | Không | Nhận thông báo giao dịch thành công (IPN) từ SePay |
| POST | /api/payment/verify-return | Bearer Token | Xác thực trạng thái đơn hàng khi người dùng được chuyển hướng |
| GET | /api/payment/check/:orderCode | Bearer Token | Truy vấn trực tiếp trạng thái thanh toán của một đơn hàng |
| GET | /api/payment/history | Bearer Token | Lấy lịch sử các giao dịch đã hoàn tất của tài khoản |
| POST | /api/payment/cancel/:orderCode | Bearer Token | Hủy đơn hàng đang chờ thanh toán |
| POST | /api/payment/vnpay/create | Bearer Token | Khởi tạo liên kết thanh toán nâng cấp tài khoản qua VNPAY |
| GET | /api/payment/vnpay/return | Không | Nhận phản hồi chuyển hướng từ khách hàng của VNPAY |
| GET | /api/payment/vnpay/ipn | Không | Nhận thông báo cập nhật giao dịch ngầm (IPN) từ VNPAY |

### 5. Nhóm Quản trị hệ thống (Admin API)

Tất cả các endpoint dưới đây đều yêu cầu quyền quản trị viên (`is_admin = 1`).

| Phương thức | Endpoint | Xác thực | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | /api/admin/dashboard | Bearer Token | Thống kê số lượng người dùng, cuộc gọi AI, tài nguyên hệ thống |
| GET | /api/admin/users | Bearer Token | Tra cứu và tìm kiếm thông tin tài khoản người dùng |
| PUT | /api/admin/users/:id | Bearer Token | Cập nhật phân quyền admin, khóa hoặc kích hoạt tài khoản |
| GET | /api/admin/generation-logs | Bearer Token | Xem lịch sử các lượt gọi sinh nội dung kịch bản AI |
| GET | /api/admin/ai-config | Bearer Token | Lấy cấu hình nhà cung cấp và mô hình AI hiện tại |
| PUT | /api/admin/ai-config | Bearer Token | Cập nhật cấu hình dịch vụ AI và khóa API OpenRouter mới |
| GET | /api/admin/test-ai | Bearer Token | Kiểm tra kết nối tới máy chủ dịch vụ Python Flask API |
| GET | /api/admin/system-prompts | Bearer Token | Lấy danh sách các prompt hệ thống của chín công cụ |
| PUT | /api/admin/system-prompts/:toolId | Bearer Token | Cập nhật nội dung prompt hệ thống cho công cụ cụ thể |
| GET | /api/admin/api-keys | Bearer Token | Lấy thông tin các API key đã lưu trữ (được che bớt ký tự) |
| PUT | /api/admin/api-keys/:provider | Bearer Token | Thêm mới hoặc thay đổi API key cho nhà cung cấp |
| GET | /api/admin/projects | Bearer Token | Thống kê danh sách toàn bộ dự án kịch bản trên hệ thống |
| GET | /api/admin/story-files | Bearer Token | Thống kê danh sách các tệp tin tài nguyên đã tải lên |
| DELETE | /api/admin/story-files/:id | Bearer Token | Xóa bỏ tệp tin tài nguyên khỏi hệ thống và ổ cứng |
| GET | /api/admin/payment-settings | Bearer Token | Lấy danh sách các biến cấu hình cổng thanh toán |
| PUT | /api/admin/payment-settings | Bearer Token | Cập nhật tham số kết nối cho SePay hoặc VNPAY |
| GET | /api/admin/plan-prices | Bearer Token | Xem giá cấu hình của các gói dịch vụ nâng cấp PRO |
| PUT | /api/admin/plan-prices | Bearer Token | Thay đổi biểu giá của các gói PRO mặc định |
| GET | /api/admin/custom-plans | Bearer Token | Lấy danh sách các gói dịch vụ tùy chọn do quản trị thiết lập |
| POST | /api/admin/custom-plans | Bearer Token | Thêm mới một gói nâng cấp tùy chọn |
| PUT | /api/admin/custom-plans/:id | Bearer Token | Cập nhật thông tin gói nâng cấp tùy chọn |
| DELETE | /api/admin/custom-plans/:id | Bearer Token | Xóa bỏ gói nâng cấp tùy chọn |
| GET | /api/admin/payment-orders | Bearer Token | Xem toàn bộ hóa đơn và doanh thu thu được của hệ thống |
| GET | /api/admin/landing-config | Bearer Token | Lấy cấu hình hiển thị nội dung trang giới thiệu ngoài |
| PUT | /api/admin/landing-config | Bearer Token | Cập nhật cấu hình hiển thị trang giới thiệu |
| GET | /api/admin/token-pricing | Bearer Token | Xem cấu hình đơn giá của 1.000 token đầu vào và đầu ra |
| PUT | /api/admin/token-pricing | Bearer Token | Thay đổi đơn giá tính phí token cho người dùng |
| GET | /api/admin/token-stats | Bearer Token | Thống kê lượng tiêu thụ token và chi phí theo ngày/người dùng |
| PUT | /api/admin/users/:id/balance | Bearer Token | Điều chỉnh trực tiếp số dư tín dụng AI của tài khoản người dùng |

### 6. Nhóm Dịch vụ AI (Python Flask API)

Mặc dù các tuyến này chạy trực tiếp trên cổng 5000, frontend nên truy cập qua proxy Node.js sử dụng đường dẫn `/python-api/*`.

| Phương thức | Endpoint | Xác thực | Mô tả |
| :--- | :--- | :--- | :--- |
| GET | /api/health | Không | Kiểm tra trạng thái máy chủ AI và kết nối OpenRouter |
| GET | /api/tools | Không | Lấy thông tin các công cụ biên kịch AI hỗ trợ |
| POST | /api/generate | Không | Gọi AI đồng bộ để phân tích và sinh nội dung kịch bản |
| POST | /api/generate-async | Không | Gửi yêu cầu sinh AI bất đồng bộ (trả về Job ID ngay lập tức) |
| GET | /api/job/:job_id | Không | Theo dõi trạng thái tiến trình và nhận kết quả của tác vụ bất đồng bộ |
| GET | /api/characters | Không | Lấy thông tin hồ sơ nhân vật dạng JSON lưu trữ trong dự án |
| POST | /api/characters | Không | Thêm hồ sơ một nhân vật mới dạng tệp JSON |
| PUT | /api/characters | Không | Cập nhật hồ sơ nhân vật JSON |
| DELETE | /api/characters | Không | Xóa toàn bộ hồ sơ nhân vật của dự án để chuẩn bị tạo lại |
| POST | /api/characters/generate-one | Không | Yêu cầu AI phác họa nhanh hồ sơ một nhân vật đơn lẻ |
| POST | /api/extract-text | Không | Đọc và rút trích nội dung từ tệp văn bản tải lên (txt, pdf, docx) |

---

## Huong dan Trien khai (Deployment)

Hướng dẫn triển khai hệ thống lên máy chủ Linux chạy hệ điều hành Ubuntu/Debian sử dụng phần mềm quản lý tiến trình PM2 và Nginx làm Reverse Proxy.

### 1. Cài đặt các thành phần phần mềm hệ thống

Thực thi các lệnh sau để cài đặt môi trường cần thiết:

```bash
sudo apt update
sudo apt install -y nodejs npm python3 python3-pip python3-venv mysql-server nginx
```

### 2. Thiết lập cơ sở dữ liệu MySQL trên môi trường thực tế

Đăng nhập vào MySQL và thiết lập cơ sở dữ liệu:

```bash
sudo mysql

# Trong MySQL CLI, chạy các câu lệnh sau:
CREATE DATABASE ai_screenplay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'screenplay_user'@'localhost' IDENTIFIED BY 'mat_khau_bao_mat_cua_ban';
GRANT ALL PRIVILEGES ON ai_screenplay.* TO 'screenplay_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Nạp các cấu trúc dữ liệu và di cư:

```bash
mysql -u screenplay_user -p ai_screenplay < database/ai_screenplay.sql
```

### 3. Cài đặt mã nguồn và phụ thuộc

Di chuyển mã nguồn vào thư mục triển khai (ví dụ: `/var/www/ai-screenplay`).

#### Thiết lập Node.js Server:
```bash
cd server
npm install --production
cp .env.example .env
# Chỉnh sửa tệp tin .env với các thông số thực tế của bạn
nano .env
cd ..
```

#### Thiết lập Python AI Server:
```bash
python3 -m venv .venv
source .venv/bin/activate
cd python_api
pip install -r requirements.txt
cp .env.example .env
# Chỉnh sửa tệp tin .env với khóa OpenRouter thực tế của bạn
nano .env
cd ..
```

### 4. Quản lý tiến trình bằng PM2

Cài đặt PM2 toàn cục thông qua npm để đảm bảo ứng dụng tự khởi chạy lại khi gặp lỗi hoặc khi máy chủ khởi động lại:

```bash
sudo npm install -g pm2

# Khởi chạy máy chủ chính Node.js Express
pm2 start server/server.js --name "ai-screenplay-node"

# Khởi chạy máy chủ dịch vụ Python Flask
pm2 start "python_api/app.py" --name "ai-screenplay-python" --interpreter .venv/bin/python

# Lưu cấu hình và kích hoạt khởi động cùng hệ thống
pm2 save
pm2 startup
```

### 5. Cấu hình Nginx làm cổng Reverse Proxy

Tạo một tệp tin cấu hình Nginx mới cho dự án:

```bash
sudo nano /etc/nginx/sites-available/ai-screenplay
```

Thêm nội dung cấu hình sau (thay thế `your_domain.com` bằng tên miền thực tế của bạn):

```nginx
server {
    listen 80;
    server_name your_domain.com;

    # Cấu hình kích thước tải lên tối đa cho tệp kịch bản
    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Kích hoạt cấu hình và khởi động lại dịch vụ Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/ai-screenplay /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```
