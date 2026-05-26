# 🎬 AI Screenplay - Hệ thống tạo kịch bản phim tự động

Ứng dụng web giúp nhà biên kịch tạo kịch bản phim chuyên nghiệp với sự hỗ trợ của trí tuệ nhân tạo (AI). Hệ thống hướng dẫn người dùng qua 9 bước từ ý tưởng ban đầu đến kịch bản hoàn chỉnh.

![AI Screenplay](https://img.shields.io/badge/AI-Screenplay-blue)
![Python](https://img.shields.io/badge/Python-3.8+-green)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange)

---

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt](#-cài-đặt)
- [Cấu hình](#-cấu-hình)
- [Chạy ứng dụng](#-chạy-ứng-dụng)
- [Mô tả chi tiết các file](#-mô-tả-chi-tiết-các-file)
- [API Documentation](#-api-documentation)
- [Hướng dẫn sử dụng](#-hướng-dẫn-sử-dụng)

---

## ✨ Tính năng

### 9 Công cụ viết kịch bản
1. **Tạo Logline** - Tóm tắt phim trong 1-2 câu
2. **Xác định Chủ đề** - Thông điệp sâu sắc của phim
3. **Mô tả Nhân vật** - Hồ sơ chi tiết nhân vật
4. **Viết Tóm tắt (Synopsis)** - Tóm tắt toàn bộ câu chuyện
5. **Cấu trúc 4 Hồi** - Phân chia theo Story Circle
6. **Phát triển Nhân vật** - Arc phát triển chi tiết
7. **Tạo Beat Sheet** - Theo mô hình Save the Cat
8. **Danh sách Cảnh** - 30-40 cảnh chi tiết
9. **Viết Kịch bản** - Format chuẩn Hollywood

### Tính năng khác
- 🔐 Đăng nhập / Đăng ký với JWT authentication
- 🛡️ Trang quản trị `admin.html` cho admin (dashboard thống kê, quản lý user, logs AI, system prompts, API keys, tài nguyên)
- 📁 Quản lý dự án (tạo, lưu, xóa)
- 🔄 Auto-fill dữ liệu giữa các bước
- ✏️ Chỉnh sửa kết quả trực tiếp
- 📥 Xuất kịch bản (copy, download)
- 🎨 Giao diện thân thiện, responsive

---

## 🏗 Kiến trúc hệ thống

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Frontend      │────▶│  Node.js API    │────▶│    MySQL        │
│   (HTML/JS)     │     │  (Port 3000)    │     │   Database      │
│                 │     │                 │     │                 │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         │ AI Requests
         ▼
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│   Python API    │────▶│   Groq API      │
│   (Port 5000)   │     │   (LLaMA 3.3)   │
│                 │     │                 │
└─────────────────┘     └─────────────────┘
```

---

## 📁 Cấu trúc thư mục

```
AI/
├── 📄 index.html              # Trang chính của ứng dụng
├── 📄 auth.html               # Trang đăng nhập/đăng ký
├── 📄 README.md               # File hướng dẫn này
│
├── 📁 css/                    # Stylesheets
│   ├── style.css              # CSS chính cho ứng dụng
│   └── auth.css               # CSS cho trang đăng nhập
│
├── 📁 js/                     # Frontend JavaScript
│   ├── app.js                 # Logic chính, định nghĩa tools
│   ├── api.js                 # API client kết nối backend
│   ├── auth.js                # Xử lý đăng nhập/đăng ký
│   └── projectManager.js      # Quản lý dự án
│
├── 📁 server/                 # Node.js Backend
│   ├── server.js              # Express server chính
│   ├── package.json           # Dependencies
│   ├── .env                   # Biến môi trường
│   ├── 📁 config/
│   │   └── database.js        # Kết nối MySQL
│   ├── 📁 routes/
│   │   ├── auth.js            # API xác thực
│   │   ├── projects.js        # API quản lý dự án
│   │   └── aiResponses.js     # API lưu kết quả AI
│   └── 📁 middleware/         # Middleware (nếu có)
│
├── 📁 python_api/             # Python AI Backend
│   ├── app.py                 # Flask server chính
│   ├── config.py              # Cấu hình API
│   ├── prompts.py             # System prompts cho AI
│   ├── ai_service.py          # Xử lý gọi Groq API
│   └── requirements.txt       # Python dependencies
│
└── 📁 database/               # Database schemas
    ├── schema.sql             # Schema chính
    └── migration_update_tool_types.sql  # Migration files
```

---

## 💻 Yêu cầu hệ thống

| Phần mềm | Phiên bản | Mục đích |
|----------|-----------|----------|
| Node.js | 18.0+ | Backend server |
| Python | 3.8+ | AI API server |
| MySQL | 8.0+ | Database |
| npm | 9.0+ | Package manager |
| pip | 21.0+ | Python packages |

---

## 🚀 Cài đặt

### Bước 1: Clone/Download dự án

```bash
# Nếu dùng Git
git clone <repository-url>
cd AI

# Hoặc download và giải nén vào thư mục AI
```

### Bước 2: Cài đặt MySQL Database

```sql
-- Mở MySQL Workbench hoặc command line
-- Chạy file schema.sql để tạo database

SOURCE database/schema.sql;

-- Migration mở rộng cho admin panel
SOURCE database/admin_features.sql;

-- Hoặc chạy từng lệnh:
CREATE DATABASE IF NOT EXISTS ai_screenplay 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Bước 3: Cài đặt Node.js Backend

```bash
# Di chuyển vào thư mục server
cd server

# Cài đặt dependencies
npm install

# Tạo file .env (nếu chưa có)
# Xem phần Cấu hình bên dưới
```

### Bước 4: Cài đặt Python AI API

```bash
# Di chuyển vào thư mục python_api
cd python_api

# Cài đặt dependencies
pip install -r requirements.txt

# Hoặc
python -m pip install -r requirements.txt
```

---

## ⚙️ Cấu hình

### File `server/.env`

```env
# Cấu hình MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password    # Thay bằng password MySQL của bạn
DB_NAME=ai_screenplay
DB_PORT=3306

# Cấu hình Server
PORT=3000

# JWT Secret (dùng cho xác thực)
JWT_SECRET=your_secret_key_here    # Thay bằng key bất kỳ
```

### File `python_api/config.py`

```python
# Groq API Configuration
GROQ_API_KEY = 'your_groq_api_key'  # Lấy từ https://console.groq.com
GROQ_MODEL = 'llama-3.3-70b-versatile'

# Server Configuration
HOST = '0.0.0.0'
PORT = 5000
DEBUG = True
```

### Lấy Groq API Key

1. Truy cập https://console.groq.com
2. Đăng ký/Đăng nhập tài khoản
3. Vào mục API Keys
4. Tạo API key mới
5. Copy và dán vào `python_api/config.py`

---

## ▶️ Chạy ứng dụng

### Cách 1: Chạy thủ công (2 terminal)

**Terminal 1 - Node.js Server (Port 3000):**
```bash
cd server
node server.js
```

**Terminal 2 - Python AI API (Port 5000):**
```bash
cd python_api
python app.py
```

### Cách 2: Dùng script (Windows)

Tạo file `start.bat`:
```batch
@echo off
start cmd /k "cd server && node server.js"
start cmd /k "cd python_api && python app.py"
echo Servers started!
echo Node.js: http://localhost:3000
echo Python:  http://localhost:5000
```

### Truy cập ứng dụng

- **Trang chính:** http://localhost:3000
- **Đăng nhập:** http://localhost:3000/auth.html
- **Python API:** http://localhost:5000
- **Health check:** http://localhost:5000/api/health

---

## 📝 Mô tả chi tiết các file

### 📁 Frontend (HTML/CSS/JS)

#### `index.html`
**Mục đích:** Trang chính của ứng dụng

**Cấu trúc:**
- **Sidebar:** Menu công cụ, lịch sử dự án, nút tạo mới, thông tin user
- **Main content:** Form nhập liệu cho từng công cụ
- **Result panel:** Hiển thị kết quả AI, toolbar chỉnh sửa
- **Loading overlay:** Hiển thị khi đang tạo nội dung

---

#### `auth.html`
**Mục đích:** Trang đăng nhập và đăng ký

**Tính năng:**
- Form đăng nhập với email/password
- Form đăng ký với validation
- Kiểm tra độ mạnh password
- Toggle hiện/ẩn password
- Remember me option
- Toast notifications

---

#### `css/style.css`
**Mục đích:** Stylesheet chính (~1400 dòng)

**Các section:**
- Reset & Base styles
- Sidebar styles
- Main content styles
- Form styles
- Result panel styles
- Loading overlay
- Next step button
- Toolbar styles
- Responsive styles

---

#### `css/auth.css`
**Mục đích:** Stylesheet cho trang đăng nhập

**Các section:**
- Auth container layout
- Branding section (left)
- Form section (right)
- Input styles
- Button styles
- Password strength indicator
- Toast notifications
- Responsive breakpoints

---

#### `js/app.js`
**Mục đích:** Logic chính của ứng dụng (~1600 dòng)

**Các chức năng chính:**

```javascript
// 1. Tool Definitions - Định nghĩa 9 công cụ
const tools = {
    logline: { title, description, icon, fields, generatePrompt },
    theme: { ... },
    // ... 9 tools
};

// 2. Auto-fill Mapping - Mapping dữ liệu giữa các bước
const autoFillMapping = {
    theme: { logline: 'logline' },
    character: { logline: 'logline', theme: 'theme' },
    // ...
};

// 3. Core Functions
checkUserAuth()          // Kiểm tra đăng nhập
loadTool(toolId)         // Load công cụ
handleSubmit(event)      // Xử lý submit form
generateContent(toolId, formData)  // Gọi Python API
displayResult(content)   // Hiển thị kết quả
goToNextStep()           // Chuyển bước tiếp theo

// 4. Toolbar Functions
formatHeading()          // Format tiêu đề
formatBold()             // In đậm
formatItalic()           // In nghiêng
formatTable()            // Chèn bảng
// ...

// 5. Utility Functions
saveResult()             // Lưu kết quả
copyResult()             // Copy vào clipboard
downloadResult()         // Tải xuống file
```

---

#### `js/api.js`
**Mục đích:** API client kết nối Node.js backend

**Functions:**
```javascript
const API = {
    baseURL: 'http://localhost:3000/api',
    
    // Projects
    getProjects()
    createProject(data)
    updateProject(id, data)
    deleteProject(id)
    
    // AI Responses
    saveAIResponse(data)
    getAIResponses(projectId)
}
```

---

#### `js/auth.js`
**Mục đích:** Xử lý authentication

**Functions:**
```javascript
showRegister()           // Hiện form đăng ký
showLogin()              // Hiện form đăng nhập
togglePassword(inputId)  // Ẩn/hiện password
checkPasswordStrength()  // Kiểm tra độ mạnh password
handleLogin(event)       // Xử lý đăng nhập
handleRegister(event)    // Xử lý đăng ký
checkAuth()              // Kiểm tra đã đăng nhập
logout()                 // Đăng xuất
```

---

#### `js/projectManager.js`
**Mục đích:** Quản lý dự án

**Functions:**
```javascript
const ProjectManager = {
    currentProject: null,
    
    createNewProject()      // Tạo dự án mới
    loadProjectsFromDB()    // Load danh sách từ DB
    selectProject(id)       // Chọn dự án
    deleteProject(id)       // Xóa dự án
    saveStepToProject()     // Lưu bước vào dự án
    getCurrentProject()     // Lấy dự án hiện tại
}
```

---

### 📁 Node.js Backend

#### `server/server.js`
**Mục đích:** Express server chính

**Cấu trúc:**
```javascript
// 1. Import dependencies
const express = require('express');
const cors = require('cors');

// 2. Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const aiResponseRoutes = require('./routes/aiResponses');

// 3. Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(..));  // Serve frontend

// 4. Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/ai-responses', aiResponseRoutes);

// 5. Health check
app.get('/api/health', ...)

// 6. Error handling
app.use((err, req, res, next) => ...)
```

---

#### `server/config/database.js`
**Mục đích:** Kết nối MySQL database

**Exports:**
```javascript
module.exports = {
    pool,           // MySQL connection pool
    query,          // Execute query helper
    testConnection  // Test connection
}
```

---

#### `server/routes/auth.js`
**Mục đích:** API routes cho authentication

**Endpoints:**
| Method | Path | Mô tả |
|--------|------|-------|
| POST | /api/auth/register | Đăng ký tài khoản |
| POST | /api/auth/login | Đăng nhập |
| GET | /api/auth/me | Lấy thông tin user |
| PUT | /api/auth/update | Cập nhật thông tin |
| PUT | /api/auth/change-password | Đổi mật khẩu |

---

#### `server/routes/projects.js`
**Mục đích:** API routes quản lý dự án

**Endpoints:**
| Method | Path | Mô tả |
|--------|------|-------|
| GET | /api/projects | Lấy danh sách dự án |
| GET | /api/projects/:id | Lấy chi tiết dự án |
| POST | /api/projects | Tạo dự án mới |
| PUT | /api/projects/:id | Cập nhật dự án |
| DELETE | /api/projects/:id | Xóa dự án |

---

#### `server/routes/aiResponses.js`
**Mục đích:** API routes lưu kết quả AI

**Endpoints:**
| Method | Path | Mô tả |
|--------|------|-------|
| GET | /api/ai-responses/:projectId | Lấy responses của dự án |
| POST | /api/ai-responses | Lưu response mới |
| PUT | /api/ai-responses/:id | Cập nhật response |

---

### 📁 Python AI Backend

#### `python_api/app.py`
**Mục đích:** Flask server xử lý AI requests

**Endpoints:**
```python
@app.route('/')
def index():
    # API documentation
    
@app.route('/api/health')
def health_check():
    # Kiểm tra kết nối Groq API
    
@app.route('/api/tools')
def get_tools():
    # Danh sách công cụ
    
@app.route('/api/generate', methods=['POST'])
def generate():
    # Tạo nội dung AI
    # Input: { tool_id, form_data }
    # Output: { success, content }
```

---

#### `python_api/config.py`
**Mục đích:** Cấu hình cho Python API

**Variables:**
```python
GROQ_API_KEY    # API key cho Groq
GROQ_MODEL      # Model AI (llama-3.3-70b-versatile)
HOST            # Server host (0.0.0.0)
PORT            # Server port (5000)
DEBUG           # Debug mode
```

---

#### `python_api/prompts.py`
**Mục đích:** System prompts cho từng công cụ

**Contents:**
```python
SYSTEM_PROMPTS = {
    'logline': "Bạn là nhà biên kịch Hollywood...",
    'theme': "...",
    'character': "...",
    # ... 9 prompts
}

def get_system_prompt(tool_id) -> str
def build_user_prompt(tool_id, form_data) -> str
```

---

#### `python_api/ai_service.py`
**Mục đích:** Xử lý gọi Groq API

**Functions:**
```python
def create_groq_client():
    # Tạo Groq client
    
def generate_content(tool_id, form_data) -> dict:
    # Gọi Groq API và trả về kết quả
    # Returns: { success, content, raw_content }
    
def format_response_to_html(content) -> str:
    # Convert markdown sang HTML
    
def test_connection() -> dict:
    # Test kết nối Groq API
```

---

### 📁 Database

#### `database/schema.sql`
**Mục đích:** Schema chính của database

**Tables:**
```sql
-- Người dùng
CREATE TABLE users (
    id, username, email, password, full_name,
    created_at, updated_at
);

-- Dự án
CREATE TABLE projects (
    id, user_id, title, description, status,
    created_at, updated_at
);

-- Kết quả AI
CREATE TABLE ai_responses (
    id, project_id, tool_type, input_data, output_data,
    created_at
);

-- Các bảng phụ: loglines, themes, characters, scenes...
```

---

## 📚 API Documentation

### Node.js API (Port 3000)

#### Authentication
```http
POST /api/auth/register
Content-Type: application/json

{
    "username": "user1",
    "email": "user@example.com",
    "password": "password123",
    "full_name": "Nguyễn Văn A"
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "password123"
}
```

#### Projects
```http
GET /api/projects
Authorization: Bearer <token>

POST /api/projects
{
    "title": "Phim mới",
    "description": "Mô tả phim"
}
```

### Python AI API (Port 5000)

```http
POST /api/generate
Content-Type: application/json

{
    "tool_id": "logline",
    "form_data": {
        "movie_idea": "Một thám tử điều tra vụ án bí ẩn..."
    }
}
```

**Response:**
```json
{
    "success": true,
    "content": "<h2>LOGLINE</h2><p>...</p>",
    "raw_content": "## LOGLINE\n...",
    "model": "llama-3.3-70b-versatile",
    "tool_id": "logline"
}
```

---

## 📖 Hướng dẫn sử dụng

### 1. Đăng ký / Đăng nhập
- Truy cập http://localhost:3000/auth.html
- Đăng ký tài khoản mới hoặc đăng nhập

### 2. Tạo kịch bản mới
- Click "Tạo kịch bản mới" ở sidebar
- Nhập tên cho dự án

### 3. Sử dụng công cụ
- Chọn công cụ từ menu (bắt đầu từ "Tạo Logline")
- Điền thông tin vào form
- Click "Tạo Nội dung"
- Đợi AI xử lý (10-30 giây)

### 4. Chỉnh sửa kết quả
- Kết quả hiển thị ở panel bên phải
- Có thể chỉnh sửa trực tiếp (contenteditable)
- Sử dụng toolbar để format

### 5. Chuyển bước tiếp theo
- Sau khi hoàn thành, click "Bước tiếp theo"
- Dữ liệu tự động điền vào bước tiếp theo

### 6. Lưu / Xuất kết quả
- Click icon Save để lưu
- Click icon Copy để copy vào clipboard
- Click icon Download để tải file

---

## 🔧 Troubleshooting

### Lỗi: "Port 3000/5000 already in use"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Hoặc dùng PowerShell
Get-Process -Name node | Stop-Process -Force
Get-Process -Name python | Stop-Process -Force
```

### Lỗi: "MySQL connection error"
1. Kiểm tra MySQL service đang chạy
2. Kiểm tra thông tin trong file `.env`
3. Đảm bảo database `ai_screenplay` đã được tạo

### Lỗi: "Groq API error"
1. Kiểm tra API key trong `python_api/config.py`
2. Kiểm tra internet connection
3. Kiểm tra quota trên https://console.groq.com

---

## 👥 Tác giả

- **Tên:** [Tên của bạn]
- **Email:** [Email của bạn]
- **Trường:** [Tên trường]

---

## 📄 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

## 🙏 Acknowledgments

- [Groq](https://groq.com) - AI API provider
- [LLaMA 3.3](https://ai.meta.com/llama/) - AI Model
- [Flask](https://flask.palletsprojects.com/) - Python web framework
- [Express.js](https://expressjs.com/) - Node.js web framework
- [MySQL](https://mysql.com/) - Database
- [Font Awesome](https://fontawesome.com/) - Icons
