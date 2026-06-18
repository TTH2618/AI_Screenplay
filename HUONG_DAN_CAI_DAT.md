# Hướng dẫn cài đặt và cấu hình hệ thống AI Screenplay

Tài liệu này hướng dẫn chi tiết cách thiết lập, cài đặt và vận hành hệ thống **AI Screenplay** trên môi trường cục bộ (Local Development) và môi trường thực tế (Production Deployment).

---

## 1. Yêu cầu hệ thống tối thiểu

Để hệ thống hoạt động ổn định, máy chủ hoặc máy tính cá nhân của bạn cần đáp ứng các điều kiện sau:

- **Hệ điều hành**: Windows 10/11, macOS, hoặc Linux (khuyến nghị Ubuntu 20.04 LTS trở lên cho production).
- **Node.js**: Phiên bản `>= 18.x` (kèm theo `npm >= 9.x`).
- **Python**: Phiên bản `>= 3.8` (kèm theo trình quản lý gói `pip >= 21.x`).
- **Cơ sở dữ liệu**: MySQL `>= 8.0` hoặc PostgreSQL `>= 12.x` (hệ thống tự động hỗ trợ cả hai và hỗ trợ tự động đồng bộ dữ liệu từ MySQL sang PostgreSQL).
- **Mạng**: Kết nối Internet để kết nối các API của OpenRouter, Google Auth và các dịch vụ thanh toán/gửi thư (PayOS/SePay, VNPAY, Nodemailer).

---

## 2. Cấu hình biến môi trường (`.env`)

Dự án sử dụng duy nhất một tệp cấu hình biến môi trường `.env` đặt tại thư mục gốc của dự án. Hãy sao chép từ tệp mẫu `.env.example` và điều chỉnh các giá trị tương ứng:

```bash
cp .env.example .env
```

### Chi tiết các biến cấu hình cần thiết:

| Tên biến | Mô tả | Giá trị ví dụ / Mặc định |
| :--- | :--- | :--- |
| **Cấu hình trí tuệ nhân tạo (AI)** | | |
| `AI_PROVIDER` | Nhà cung cấp dịch vụ AI sử dụng. | `openrouter` |
| `OPENROUTER_API_KEY` | API Key kết nối dịch vụ OpenRouter. | `sk-or-v1-your-key-here...` |
| `OPENROUTER_MODEL` | Tên mô hình AI mặc định được gọi qua OpenRouter. | `google/gemini-2.5-flash-lite` |
| **Cấu hình Python AI API** | | |
| `PYTHON_API_HOST` | Địa chỉ IP máy chủ API Flask lắng nghe. | `0.0.0.0` |
| `PYTHON_API_PORT` | Cổng dịch vụ Flask AI. | `5000` |
| `FLASK_DEBUG` | Chế độ gỡ lỗi của Flask (bật trong phát triển). | `True` |
| **Cấu hình Cơ sở dữ liệu (MySQL)** | | |
| `DB_HOST` | Địa chỉ máy chủ cơ sở dữ liệu MySQL. | `localhost` |
| `DB_PORT` | Cổng kết nối dịch vụ MySQL. | `3306` |
| `DB_USER` | Tên tài khoản MySQL. | `root` |
| `DB_PASSWORD` | Mật khẩu tài khoản MySQL. | `mat_khau_cua_ban` |
| `DB_NAME` | Tên cơ sở dữ liệu dự án. | `ai_screenplay` |
| **Cấu hình Cơ sở dữ liệu (PostgreSQL)** | | |
| `PG_HOST` | Địa chỉ máy chủ cơ sở dữ liệu PostgreSQL. | `localhost` |
| `PG_PORT` | Cổng kết nối dịch vụ PostgreSQL. | `5432` |
| `PG_USER` | Tên tài khoản PostgreSQL. | `postgres` |
| `PG_PASSWORD` | Mật khẩu tài khoản PostgreSQL. | `mat_khau_cua_ban` |
| `PG_NAME` | Tên cơ sở dữ liệu PostgreSQL. | `ai_screenplay` |
| `DB_TYPE` | Chọn loại cơ sở dữ liệu ưu tiên (`mysql` hoặc `postgres`). | `mysql` |
| **Cấu hình Máy chủ Node.js chính** | | |
| `PORT` | Cổng chạy máy chủ chính Node.js Express. | `3000` |
| `JWT_SECRET` | Khóa bí mật dùng để ký mã thông báo JWT. | `thay-bang-chuoi-bao-mat-32-ky-tu` |
| `GOOGLE_CLIENT_ID` | Client ID ứng dụng Google (cho đăng nhập Google). | `123456-abc.apps.googleusercontent.com` |
| `APP_URL` | URL công khai của ứng dụng chính. | `http://localhost:3000` |
| **Tích hợp Cổng thanh toán PayOS/SePay** | | |
| `PAYOS_CLIENT_ID` | Client ID được cung cấp bởi PayOS/SePay. | `payos_client_id_vi_du` |
| `PAYOS_API_KEY` | API Key được cung cấp bởi PayOS/SePay. | `payos_api_key_vi_du` |
| `PAYOS_CHECKSUM_KEY` | Checksum Key kiểm tra tính toàn vẹn dữ liệu. | `payos_checksum_key_vi_du` |
| `PAYOS_ENV` | Môi trường giao dịch (sandbox / production). | `production` |
| **Tích hợp Cổng thanh toán VNPAY** | | |
| `VNPAY_TMN_CODE` | Mã Website đăng ký tích hợp cổng VNPAY. | `TMN_CODE_VI_DU` |
| `VNPAY_HASH_SECRET` | Khóa bảo mật ký chữ ký số giao dịch VNPAY. | `HASH_SECRET_VI_DU` |
| `VNPAY_URL` | Đường dẫn gọi cổng thanh toán VNPAY Sandbox. | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` |
| `VNPAY_RETURN_URL` | Địa chỉ URL nhận kết quả thanh toán từ VNPAY. | `http://localhost:3000/api/payment/vnpay/return` |
| **Cấu hình Email (Nodemailer)** | | |
| `EMAIL_HOST` | Máy chủ gửi thư SMTP. | `smtp.gmail.com` |
| `EMAIL_PORT` | Cổng kết nối dịch vụ gửi thư SMTP (587 cho TLS). | `587` |
| `EMAIL_USER` | Tên tài khoản email gửi tin. | `tuthehien2618@gmail.com` |
| `EMAIL_PASS` | Mật khẩu ứng dụng (App Password) của tài khoản email. | `yowp jeoz swhx yqgc` |
| `EMAIL_FROM` | Tên người gửi và email đi. | `AI Screenplay <tuthehien2618@gmail.com>` |

---

## 3. Cài đặt và vận hành cục bộ (Local Development)

### Bước 1: Tải mã nguồn về máy
```bash
git clone <repository-url>
cd AI_screenplay
```

### Bước 2: Thiết lập cơ sở dữ liệu (MySQL & PostgreSQL)

#### Cách 1: Sử dụng MySQL (Mặc định)
1. Khởi động dịch vụ MySQL trên máy tính của bạn.
2. Đăng nhập và tạo cơ sở dữ liệu mới có tên `ai_screenplay` hỗ trợ bảng mã UTF-8:
   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ai_screenplay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```
3. Nạp cấu trúc bảng và dữ liệu mẫu có sẵn từ tệp SQL:
   ```bash
   mysql -u root -p ai_screenplay < database/ai_screenplay.sql
   ```

#### Cách 2: Sử dụng PostgreSQL
1. Khởi động dịch vụ PostgreSQL trên máy tính của bạn.
2. Đảm bảo cấu hình các biến môi trường `PG_...` và đặt `DB_TYPE=postgres` trong `.env`.
3. Hệ thống có cơ chế tự động kiểm tra, nếu cơ sở dữ liệu PostgreSQL chưa tồn tại sẽ tự khởi tạo mới, đồng thời tự động đồng bộ hóa cấu trúc và dữ liệu từ MySQL sang PostgreSQL khi khởi động Node.js server.
   *Vì vậy, để sử dụng PostgreSQL, hãy nạp dữ liệu mẫu vào MySQL trước (theo Cách 1), sau đó khởi chạy ứng dụng để hệ thống tự động nhân bản sang PostgreSQL.*

### Bước 3: Cài đặt và cấu hình Node.js backend
Di chuyển vào thư mục `server`, cài đặt các thư viện Node.js cần thiết:
```bash
cd server
npm install
cd ..
```

### Bước 4: Cài đặt và cấu hình Python AI API
Khởi tạo môi trường ảo Python và cài đặt các thư viện trí tuệ nhân tạo:

- **Trên Windows (PowerShell/CMD)**:
  ```powershell
  python -m venv .venv
  .venv\Scripts\activate
  pip install -r python_api/requirements.txt
  ```

- **Trên macOS / Linux**:
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r python_api/requirements.txt
  ```

---

## 4. Khởi động các dịch vụ cục bộ

### Cách 1: Khởi động nhanh bằng tệp tin batch (chỉ dành cho Windows)
Bạn nhấp đúp vào tệp tin [start.bat](file:///d:/school/AI/FINAL/AI_screenplay/start.bat) ở thư mục gốc của dự án hoặc chạy lệnh sau trong terminal:
```bash
start.bat
```
*Tệp kịch bản này sẽ tự động khởi động máy chủ chính Express (cổng 3000), máy chủ Flask AI (cổng 5000) và đường hầm ngrok công khai.*

### Cách 2: Khởi động thủ công bằng các cửa sổ terminal riêng biệt

1. **Terminal 1: Khởi chạy Node.js Express Backend**
   ```bash
   cd server
   npm start
   # Hoặc dùng để tự động reload khi chỉnh sửa file: npm run dev
   ```

2. **Terminal 2: Khởi chạy Python Flask AI API**
   - Đảm bảo môi trường ảo `.venv` đã được kích hoạt.
   - **Trên Windows**:
     ```powershell
     .venv\Scripts\activate
     cd python_api
     python app.py
     ```
   - **Trên macOS/Linux**:
     ```bash
     source .venv/bin/activate
     cd python_api
     python app.py
     ```

Sau khi chạy thành công, truy cập ứng dụng thông qua trình duyệt tại địa chỉ: **`http://localhost:3000`**.

---

## 5. Hướng dẫn Triển khai trên Máy chủ Linux thực tế (Ubuntu)

Quy trình triển khai sử dụng dịch vụ **PM2** làm phần mềm quản trị tiến trình và **Nginx** làm cổng Reverse Proxy tiếp nhận và điều phối request.

### Bước 1: Cài đặt các phần mềm phụ thuộc hệ thống
Thực hiện cài đặt Node.js, Python, MySQL và Nginx trên Ubuntu:
```bash
sudo apt update
sudo apt install -y nodejs npm python3 python3-pip python3-venv mysql-server nginx
```

### Bước 2: Thiết lập MySQL Server
1. Mở giao diện dòng lệnh MySQL:
   ```bash
   sudo mysql
   ```
2. Tạo cơ sở dữ liệu và phân quyền cho người dùng chuyên biệt:
   ```sql
   CREATE DATABASE ai_screenplay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'screenplay_user'@'localhost' IDENTIFIED BY 'mat_khau_bao_mat_cua_ban';
   GRANT ALL PRIVILEGES ON ai_screenplay.* TO 'screenplay_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```
3. Nạp cơ sở dữ liệu mẫu của dự án:
   ```bash
   mysql -u screenplay_user -p ai_screenplay < /path/to/your/project/database/ai_screenplay.sql
   ```

### Bước 3: Cấu hình thư mục dự án và cài đặt package
Di chuyển mã nguồn dự án vào thư mục vận hành (ví dụ: `/var/www/ai-screenplay`).

1. **Thiết lập biến môi trường**:
   ```bash
   cd /var/www/ai-screenplay
   cp .env.example .env
   nano .env
   ```
   *Cập nhật các thông số cơ sở dữ liệu (MySQL hoặc PostgreSQL như `PG_USER=postgres`, `PG_PASSWORD=mat_khau_bao_mat_cua_ban`, `DB_TYPE=postgres`), cấu hình Email Nodemailer, các khóa API và tham số thanh toán thực tế.*

2. **Cài đặt thư viện Node.js**:
   ```bash
   cd server
   npm install --production
   cd ..
   ```

3. **Cài đặt thư viện Python trong môi trường ảo**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r python_api/requirements.txt
   deactivate
   ```

### Bước 4: Cấu hình và quản lý tiến trình bằng PM2
Cài đặt công cụ PM2 để giám sát và giữ cho các backend luôn hoạt động ổn định:
```bash
sudo npm install -g pm2

# 1. Khởi động Node.js Express server
pm2 start server/server.js --name "ai-screenplay-node"

# 2. Khởi động Python Flask server thông qua môi trường ảo .venv
pm2 start "python_api/app.py" --name "ai-screenplay-python" --interpreter .venv/bin/python

# 3. Đăng ký tự động khởi chạy khi reboot máy chủ
pm2 save
pm2 startup
```

### Bước 5: Cấu hình Nginx và SSL làm Reverse Proxy
1. Tạo tệp cấu hình ảo mới trong Nginx:
   ```bash
   sudo nano /etc/nginx/sites-available/ai-screenplay
   ```
2. Nhập nội dung cấu hình sau (thay thế `ten_mien_cua_ban.com` bằng domain thực tế của bạn):
   ```nginx
   server {
       listen 80;
       server_name ten_mien_cua_ban.com;

       # Giới hạn kích thước tệp tin upload lên (như truyện gốc)
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
3. Kích hoạt cấu hình và khởi động lại Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/ai-screenplay /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```
4. Cài đặt chứng chỉ bảo mật SSL miễn phí bằng Certbot (Let's Encrypt):
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d ten_mien_cua_ban.com
   ```
   *Certbot sẽ tự động cấu hình SSL và tự động chuyển hướng mọi truy cập HTTP sang HTTPS an toàn.*

---

## 6. Các vấn đề thường gặp và cách gỡ lỗi

1. **Lỗi kết nối cơ sở dữ liệu (`Error: Connect ECONNREFUSED`)**:
   - Kiểm tra xem dịch vụ MySQL đã được khởi chạy chưa (`sudo systemctl status mysql` trên Ubuntu).
   - Kiểm tra lại các thông số cấu hình `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` trong tệp `.env` đã trùng khớp với thông số MySQL chưa.

2. **Lỗi `Python AI service không khả dụng` khi gọi AI**:
   - Kiểm tra trạng thái máy chủ Python Flask qua PM2 (`pm2 status`).
   - Kiểm tra xem cổng 5000 có bị ứng dụng khác chiếm dụng không.
   - Thử truy cập trực tiếp URL kiểm tra sức khỏe dịch vụ: `http://localhost:5000/api/health`.

3. **Lỗi gọi sinh AI không trả về kết quả**:
   - Kiểm tra lại khóa `OPENROUTER_API_KEY` trong tệp `.env`. Đảm bảo tài khoản OpenRouter của bạn còn đủ số dư tín dụng để thực hiện cuộc gọi.
   - Kiểm tra file log của Python để xác định lỗi chi tiết:
     ```bash
     pm2 logs ai-screenplay-python
     ```
