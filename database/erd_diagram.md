# Sơ đồ Quan hệ Thực thể (ERD) — Hệ thống AI Screenplay

Tài liệu này cung cấp sơ đồ ERD của hệ thống cơ sở dữ liệu `ai_screenplay` bằng cả định dạng hình ảnh trực quan tương thích với **Draw.io** (`mxGraphModel`) và mã nguồn **Mermaid** để hiển thị trực tiếp trong Markdown.

---

## 1. Cách sử dụng file Draw.io (`erd_diagram.drawio`)

Hệ thống đã tự động tạo file thiết kế ERD trực quan tại đường dẫn:
👉 [erd_diagram.drawio](file:///d:/school/AI/FINAL/AI_screenplay/database/erd_diagram.drawio)

Để chỉnh sửa hoặc xem trực quan:
1. Truy cập trang web **[Draw.io](https://app.diagrams.net/)**.
2. Chọn **File -> Open From -> Device...** (Mở từ thiết bị) và chọn file `erd_diagram.drawio` vừa tạo.
3. Hoặc bạn có thể kéo thả trực tiếp file `erd_diagram.drawio` vào tab làm việc của Draw.io.
4. *Sơ đồ đã được sắp xếp khoa học theo 4 nhóm màu:*
   - **Xanh dương (Blue):** Module tài khoản người dùng (`users`, `uploaded_story_files`).
   - **Tím & Hồng (Purple/Rose):** Các bảng lưu trữ kịch bản và phân tích kịch bản bằng AI gắn liền với dự án.
   - **Xanh lá (Green):** Quản lý dự án (`projects`).
   - **Cam (Amber):** Logs cuộc gọi AI (`ai_generation_logs`).
   - **Xám đen (Charcoal):** Cấu hình thanh toán và hệ thống (`custom_plans`, `payment_settings`, `system_prompts`, `payment_orders`).

---

## 2. Sơ đồ ERD bằng Mermaid

Dưới đây là sơ đồ chi tiết các bảng và mối liên kết quan hệ trong cơ sở dữ liệu:

```mermaid
erDiagram
    users ||--o{ projects : "sở hữu"
    users ||--o{ uploaded_story_files : "tải lên"
    users ||--o{ payment_orders : "thanh toán"
    users ||--o{ ai_generation_logs : "tạo ra"
    projects ||--o{ ai_generation_logs : "ghi log"

    %% Các thành phần nội dung của Dự án
    projects ||--o{ loglines : "có"
    projects ||--o{ themes : "có"
    projects ||--o{ characters : "có"
    projects ||--o{ synopses : "có"
    projects ||--o{ structures : "có"
    projects ||--o{ beatsheets : "có"
    projects ||--o{ scenelists : "có"
    projects ||--o{ scripts : "có"
    projects ||--o{ developments : "có"
    projects ||--o{ stories : "có"

    users {
        int id PK
        varchar username UQ
        varchar email UQ
        varchar password
        varchar full_name
        enum gender
        date date_of_birth
        varchar phone
        varchar avatar
        tinyint is_admin
        enum account_status
        enum plan_type
        datetime pro_expires_at
        decimal ai_balance_vnd
        datetime last_login_at
        timestamp created_at
        timestamp updated_at
    }

    projects {
        int id PK
        int user_id FK
        varchar title
        text description
        enum status
        timestamp created_at
        timestamp updated_at
    }

    ai_generation_logs {
        bigint id PK
        int user_id FK
        int project_id FK
        varchar tool_id
        varchar provider
        varchar model_name
        int tokens_in
        int tokens_out
        decimal cost_vnd
        enum call_type
        enum status
        int latency_ms
        varchar error_type
        text error_message
        timestamp created_at
    }

    uploaded_story_files {
        bigint id PK
        int user_id FK
        varchar original_name
        varchar stored_name
        varchar file_type
        bigint size_bytes
        varchar storage_path
        int extracted_chars
        timestamp created_at
    }

    payment_orders {
        int id PK
        int user_id FK
        bigint order_code UQ
        varchar package_id
        int amount
        varchar description
        enum status
        text checkout_url
        varchar payment_link_id
        datetime paid_at
        timestamp created_at
        timestamp updated_at
    }

    custom_plans {
        int id PK
        varchar name
        int months
        int price
        varchar note
        timestamp created_at
    }

    payment_settings {
        int id PK
        varchar setting_key UQ
        text setting_value
        timestamp updated_at
    }

    system_prompts {
        int id PK
        varchar tool_id UQ
        longtext prompt_text
        tinyint is_active
        int updated_by
        timestamp updated_at
    }

    loglines {
        int id PK
        int project_id FK
        longtext input_data
        longtext output_data
        timestamp created_at
    }

    themes {
        int id PK
        int project_id FK
        enum type
        longtext input_data
        longtext output_data
        timestamp created_at
    }

    characters {
        int id PK
        int project_id FK
        enum type
        longtext input_data
        longtext output_data
        timestamp created_at
    }

    synopses {
        int id PK
        int project_id FK
        enum type
        longtext input_data
        longtext output_data
        timestamp created_at
    }

    structures {
        int id PK
        int project_id FK
        enum type
        longtext input_data
        longtext output_data
        timestamp created_at
    }

    beatsheets {
        int id PK
        int project_id FK
        enum type
        longtext input_data
        longtext output_data
        timestamp created_at
    }

    scenelists {
        int id PK
        int project_id FK
        enum type
        longtext input_data
        longtext output_data
        timestamp created_at
    }

    scripts {
        int id PK
        int project_id FK
        enum type
        int scene_number
        varchar scene_label
        longtext input_data
        longtext output_data
        timestamp created_at
        timestamp updated_at
    }

    developments {
        int id PK
        int project_id FK
        enum type
        longtext input_data
        longtext output_data
        timestamp created_at
    }

    stories {
        int id PK
        int project_id FK
        longtext input_data
        longtext output_data
        timestamp created_at
    }
```

---

## 3. Mô tả Chi tiết các Bảng và Quan hệ

### 3.1 Bảng Trung tâm: `users` & `projects`
- **`users`**: Lưu trữ thông tin người dùng bao gồm thông tin cá nhân, phân loại phân quyền (`is_admin`), trạng thái tài khoản (`account_status`), loại gói dịch vụ (`plan_type`: `free`, `pro`), và số dư thanh toán AI (`ai_balance_vnd`).
- **`projects`**: Lưu trữ các dự án viết kịch bản. Mỗi dự án thuộc về một người dùng duy nhất (`user_id` FK -> `users.id`, liên kết **Một-Nhiều**).

### 3.2 Nhóm Bảng Nội dung Dự án (Gắn liền với `projects`)
Hệ thống lưu giữ các bước phân tích kịch bản thành các thực thể riêng biệt thông qua các bảng phụ thuộc dưới quan hệ **Một-Nhiều** với `projects` (`ON DELETE CASCADE`):
- **`loglines`**: Logline tóm tắt ý tưởng cốt lõi của phim.
- **`themes`**: Chủ đề của kịch bản/truyện.
- **`characters`**: Danh sách nhân vật (định dạng JSON).
- **`synopses`**: Tóm tắt cốt truyện cốt lõi.
- **`structures`**: Cấu trúc hồi kịch bản (ví dụ: cấu trúc 3 hồi, 4 hồi).
- **`beatsheets`**: Danh sách các beat cốt truyện.
- **`scenelists`**: Danh sách các cảnh dự kiến.
- **`scripts`**: Kịch bản chi tiết cho từng cảnh (cột `scene_number`, `scene_label` để định dạng).
- **`developments`**: Dữ liệu phát triển thêm các phân đoạn.
- **`stories`**: Nội dung truyện gốc (khi thực hiện phân tích chuyển thể từ truyện sang kịch bản).

> **Lưu ý về cột `type`:** Hầu hết các bảng nội dung đều có cột `type` là `enum('screenplay', 'story')` để phân biệt dữ liệu được tạo theo cơ chế viết kịch bản thông thường từ ý tưởng gốc (`screenplay`) hay là phân tích chuyển thể từ tệp truyện tải lên (`story`).

### 3.3 Nhóm Bảng AI & Logs
- **`ai_generation_logs`**: Ghi lại lịch sử cuộc gọi API đến dịch vụ AI. Liên kết với `users` (ai tạo ra) và `projects` (trong dự án nào). Dùng để quản lý quota, tính toán chi phí (`cost_vnd`), lưu vết token (`tokens_in`, `tokens_out`) và giám sát lỗi.
- **`uploaded_story_files`**: Quản lý các file truyện gốc mà người dùng upload lên hệ thống (PDF, TXT, DOCX), liên kết **Một-Nhiều** với `users` (`user_id` FK).

### 3.4 Nhóm Bảng Thanh toán & Cấu hình
- **`payment_orders`**: Lưu trữ đơn hàng thanh toán của người dùng (nâng cấp gói Pro, nạp tiền AI). Liên kết với `users` qua `user_id`.
- **`custom_plans`**: Cấu hình các gói Pro (tên, số tháng sử dụng, đơn giá).
- **`payment_settings`**: Chứa thông tin cấu hình cổng thanh toán (SePay/VNPay) được quản trị bởi Admin.
- **`system_prompts`**: Lưu trữ các prompt mẫu dùng để giao tiếp với AI cho từng tính năng (`tool_id` làm khóa độc nhất).
