# Sơ Đồ Hoạt Động — Hệ Thống AI Screenplay

---

## 1. Hoạt Động: Đăng Ký Tài Khoản

```mermaid
flowchart TD
    Start([BAT DAU]) --> A[Truy cap trang Auth]
    A --> B[Dien form dang ky<br/>username - email - password]
    B --> C{Validate<br/>phia client}
    C -->|Sai dinh dang| B
    C -->|Hop le| D[POST /api/auth/register]
    D --> E{Username<br/>du 3 ky tu?}
    E -->|Khong| F[Tra loi 400]
    F --> B
    E -->|Co| G{Password<br/>du 6 ky tu?}
    G -->|Khong| F
    G -->|Co| H[(Kiem tra email<br/>trong DB)]
    H --> I{Email da<br/>ton tai?}
    I -->|Co| J[Loi: Email da duoc su dung]
    J --> B
    I -->|Khong| K[(Kiem tra username<br/>trong DB)]
    K --> L{Username da<br/>ton tai?}
    L -->|Co| M[Loi: Ten dang nhap da ton tai]
    M --> B
    L -->|Khong| N[bcrypt.hash password]
    N --> O[(INSERT users<br/>username - email - hash - full_name)]
    O --> P[201 Dang ky thanh cong]
    P --> Q[Chuyen sang trang Dang nhap]
    Q --> End([KET THUC])

    style Start fill:#22c55e,color:#fff
    style End fill:#ef4444,color:#fff
    style F fill:#fca5a5
    style J fill:#fca5a5
    style M fill:#fca5a5
    style P fill:#86efac
```

---

## 2. Hoạt Động: Đăng Nhập (Email/Password & Google OAuth)

```mermaid
flowchart TD
    Start([BAT DAU]) --> A[Mo trang Auth]
    A --> B{Chon<br/>phuong thuc}

    B -->|Email / Password| C[Nhap email va password]
    C --> D[POST /api/auth/login]
    D --> E[(SELECT user theo email)]
    E --> F{Tim thay<br/>user?}
    F -->|Khong| G[Loi 401: Sai email hoac password]
    G --> C
    F -->|Co| H{Tai khoan<br/>bi khoa?}
    H -->|Co| I[Loi 403: Tai khoan bi khoa]
    I --> End1([KET THUC])
    H -->|Khong| J[bcrypt.compare password]
    J --> K{Mat khau<br/>khop?}
    K -->|Khong| G
    K -->|Co| MERGE

    B -->|Google OAuth| M[Tai Google Sign-In SDK]
    M --> N[Nguoi dung chon tai khoan Google]
    N --> O[Google tra ve id_token]
    O --> P[POST /api/auth/google]
    P --> Q[Verify id_token voi Google]
    Q --> R{Email<br/>da xac minh?}
    R -->|Khong| S[Loi 401: Email chua xac minh]
    S --> End1
    R -->|Co| T[(Tim user theo email)]
    T --> U{User<br/>ton tai?}
    U -->|Khong| V[Tao username tu email<br/>INSERT user moi]
    U -->|Co| W{Tai khoan<br/>bi khoa?}
    V --> W
    W -->|Co| I
    W -->|Khong| MERGE

    MERGE[Kiem tra PRO het han<br/>checkAndDowngradePlan]
    MERGE --> X[jwt.sign id - email - username - is_admin]
    X --> Y[(UPDATE last_login_at)]
    Y --> Z[Tra ve token va user info]
    Z --> AA[Luu token vao localStorage]
    AA --> AB{is_admin?}
    AB -->|Co| AC[Chuyen den admin.html]
    AB -->|Khong| AD[Chuyen den dashboard.html]
    AC --> End2([KET THUC])
    AD --> End2

    style Start fill:#22c55e,color:#fff
    style End1 fill:#ef4444,color:#fff
    style End2 fill:#ef4444,color:#fff
    style G fill:#fca5a5
    style I fill:#fca5a5
    style S fill:#fca5a5
    style Z fill:#86efac
```

---

## 3. Hoạt Động: Quên Mật Khẩu (OTP)

```mermaid
flowchart TD
    Start([BAT DAU]) --> A[Nhan Quen mat khau]
    A --> B[Nhap dia chi email]
    B --> C[POST /api/auth/forgot-password]
    C --> D[(SELECT user theo email)]
    D --> E{Email<br/>ton tai?}
    E -->|Khong| F[Tra 200 chung<br/>khong lo thong tin]
    F --> End([KET THUC])
    E -->|Co| G{OTP cu<br/>duoi 60 giay?}
    G -->|Co| H[Loi 429: Cho 60 giay]
    H --> B
    G -->|Khong| I[Tao ma OTP 6 chu so]
    I --> J[Luu vao otpStore<br/>expiresAt = now + 10 phut]
    J --> K[Gui email OTP qua SMTP]
    K --> L[Thong bao email da gui]
    L --> M[Nguoi dung nhap ma OTP]
    M --> N[POST /api/auth/verify-otp]
    N --> O{OTP<br/>het han?}
    O -->|Co| P[Loi: OTP het han]
    P --> B
    O -->|Khong| Q{So lan thu<br/>lon hon 5?}
    Q -->|Co| R[Loi: Qua so lan thu]
    R --> B
    Q -->|Khong| S{OTP<br/>khop?}
    S -->|Khong| T[Tang attempts - Loi OTP sai]
    T --> M
    S -->|Co| U[Tao resetToken JWT - 15 phut]
    U --> V[Nguoi dung nhap mat khau moi]
    V --> W{Password moi<br/>du 6 ky tu?}
    W -->|Khong| X[Loi: Mat khau qua ngan]
    X --> V
    W -->|Co| Y[bcrypt.hash mat khau moi]
    Y --> Z[(UPDATE users SET password)]
    Z --> AA[Dat lai mat khau thanh cong]
    AA --> AB[Chuyen ve trang Dang nhap]
    AB --> End

    style Start fill:#22c55e,color:#fff
    style End fill:#ef4444,color:#fff
    style H fill:#fca5a5
    style P fill:#fca5a5
    style R fill:#fca5a5
    style T fill:#fca5a5
    style X fill:#fca5a5
    style AA fill:#86efac
```

---

## 4. Hoạt Động: Tạo Nội Dung AI (Đồng Bộ - Có Retry)

```mermaid
flowchart TD
    Start([BAT DAU]) --> A[Nguoi dung dien form<br/>va nhan Tao noi dung]
    A --> B[Frontend thu thap form_data<br/>tu cac buoc truoc]
    B --> C[POST /python-api/generate<br/>tool_id - form_data - user_id - project_id]
    C --> D[Node.js proxy den Python Flask]
    D --> E[(Kiem tra Quota<br/>get_user_ai_quota_state)]
    E --> F{Con<br/>quota?}
    F -->|Free >= 10 hoac PRO >= 50| G[Loi 429: Het quota hom nay]
    G --> End1([KET THUC LOI])
    F -->|Con quota| H{Tool can<br/>nhan vat?}
    H -->|Co| I[Load characters JSON<br/>tu file system]
    I --> J[Inject vao form_data]
    J --> K[Khoi tao vong lap<br/>attempt = 1]
    H -->|Khong| K

    K --> L{attempt <= MAX_RETRIES?}
    L -->|Het lan thu| M[Chon ket qua tot nhat<br/>best of retries]
    M --> R

    L -->|Con lan thu| N[Goi AI Provider<br/>POST /v1/chat/completions]
    N --> O{AI API<br/>thanh cong?}
    O -->|Loi API| P[Tra loi ngay<br/>khong retry]
    P --> End1

    O -->|Thanh cong| Q[Lay raw_content va token usage]
    Q --> R2[validate_step<br/>tool_id - raw_content - context]
    R2 --> S{Noi dung<br/>hop le?}
    S -->|valid = true| R[Ket qua cuoi cung]

    S -->|valid = false| T{Con lan<br/>thu?}
    T -->|Co| U[Gan validation_feedback<br/>vao form_data]
    U --> V[attempt += 1]
    V --> L
    T -->|Khong| M

    R --> W[calculate_cost tokens]
    W --> X[(deduct_user_balance<br/>user_id - cost_vnd)]
    X --> Y[(log_generation vao DB)]
    Y --> Z{Thanh cong?}
    Z -->|Co| AA[200 content - validation - quota - cost]
    Z -->|Khong| AB[500 error]
    AA --> AC[Frontend hien thi ket qua]
    AC --> End2([KET THUC])
    AB --> End2

    style Start fill:#22c55e,color:#fff
    style End1 fill:#ef4444,color:#fff
    style End2 fill:#ef4444,color:#fff
    style G fill:#fca5a5
    style P fill:#fca5a5
    style AA fill:#86efac
```

---

## 5. Hoạt Động: Tạo Nội Dung AI Bất Đồng Bộ (Async Job)

```mermaid
flowchart TD
    Start([BAT DAU]) --> A[Frontend gui yeu cau]
    A --> B[POST /python-api/generate-async]
    B --> C[Python: don dep job cu het TTL]
    C --> D[Tao job_id = uuid4]
    D --> E[Luu vao _jobs<br/>status: pending]
    E --> F[Khoi dong Background Thread<br/>_run_job job_id - data]
    F --> G[202: Tra ve job_id ngay lap tuc]
    G --> H[Frontend bat dau polling]

    subgraph POLL ["Vong lap Polling - Frontend"]
        H --> I[GET /python-api/job/job_id]
        I --> J{Status?}
        J -->|pending hoac processing| K[Cap nhat progress bar]
        K --> L[Cho 2 giay]
        L --> I
        J -->|done| M[Lay result tu response]
        J -->|error| N[Hien thi loi]
    end

    subgraph BG ["Background Thread - Python"]
        F --> BG1[Kiem tra Quota]
        BG1 --> BG2{Quota OK?}
        BG2 -->|Khong| BG3[_jobs: status = error<br/>error_code = 429]
        BG2 -->|Co| BG4[Load characters neu can]
        BG4 --> BG5[Vong lap Generate - Validate]
        BG5 --> BG6[Tinh cost va tru balance]
        BG6 --> BG7[log_generation vao DB]
        BG7 --> BG8[_jobs: status = done<br/>result = ket qua]
    end

    M --> O[Frontend render noi dung]
    O --> End([KET THUC])
    N --> End
    BG3 --> J

    style Start fill:#22c55e,color:#fff
    style End fill:#ef4444,color:#fff
    style M fill:#86efac
    style N fill:#fca5a5
    style BG3 fill:#fca5a5
    style BG8 fill:#86efac
```

---

## 6. Hoạt Động: Thanh Toán & Nâng Cấp PRO

```mermaid
flowchart TD
    Start([BAT DAU]) --> A[Nguoi dung chon goi PRO]
    A --> B[GET /api/payment/prices]
    B --> C[Hien thi cac goi<br/>1 thang - 3 thang - 1 nam]
    C --> D{Chon cong<br/>thanh toan}

    D -->|SePay| E[POST /api/payment/create]
    E --> F[Tao orderCode 12 so]
    F --> G[SePay SDK: initOneTimePaymentFields<br/>amount - orderCode - URLs]
    G --> H[Luu pendingOrders Map<br/>orderCode voi userId - packageId]
    H --> I[Tra ve checkoutUrl va formFields]
    I --> J[Redirect nguoi dung den SePay]
    J --> K[Nguoi dung chuyen khoan<br/>ngan hang]

    D -->|VNPay| E2[POST /api/payment/vnpay/create]
    E2 --> F2[Tao orderCode DDHHMMss]
    F2 --> G2[vnpayCreateUrl<br/>Ky HMAC-SHA512]
    G2 --> H2[Luu pendingOrders Map]
    H2 --> I2[Tra ve vnpayUrl]
    I2 --> J2[Redirect den VNPay Gateway]
    J2 --> K2[Nguoi dung thanh toan<br/>ATM hoac Credit Card]

    K --> L{Ket qua SePay}
    L -->|Thanh cong| M[SePay gui IPN<br/>POST /api/payment/ipn]
    M --> N[Xac thuc X-Secret-Key]
    N --> O{Hop le?}
    O -->|Khong| P[Loi 401 Unauthorized]
    P --> End1([KET THUC TU CHOI])
    O -->|Co| Q[(Kiem tra order trong DB)]
    Q --> R{Da xu ly?}
    R -->|Co| S[200 OK bo qua duplicate]
    R -->|Khong| T[(INSERT payment_orders<br/>status = paid)]
    T --> U[(UPDATE users<br/>plan_type = pro<br/>pro_expires_at = now + months)]
    U --> V[Xoa khoi pendingOrders]
    V --> W[200 success]

    K2 --> X{Ket qua VNPay}
    X -->|Thanh cong| Y[VNPay redirect ve RETURN_URL<br/>vnp_ResponseCode = 00]
    Y --> Z[Xac thuc chu ky<br/>vnpayVerify HMAC-SHA512]
    Z --> AA{Chu ky<br/>hop le?}
    AA -->|Khong| AB[Redirect loi]
    AB --> End2([KET THUC LOI])
    AA -->|Co va code = 00| T

    L -->|Huy hoac Loi| AC[Redirect cancel / error URL]
    X -->|Huy hoac Loi| AC
    AC --> End2

    W --> FE[Frontend redirect<br/>dashboard?payment=success]
    FE --> BB[POST /api/payment/verify-return]
    BB --> CC[(Kiem tra DB order da paid?)]
    CC -->|Co IPN truoc| DD[200 status = paid]
    CC -->|Chua| EE[Goi SePay API order.retrieve]
    EE --> FF{API tra paid?}
    FF -->|Co| T
    FF -->|Khong| GG[pending - frontend retry]
    DD --> HH[Hien thi nang cap thanh cong]
    HH --> End3([KET THUC THANH CONG])

    style Start fill:#22c55e,color:#fff
    style End1 fill:#ef4444,color:#fff
    style End2 fill:#ef4444,color:#fff
    style End3 fill:#22c55e,color:#fff
    style P fill:#fca5a5
    style AB fill:#fca5a5
    style AC fill:#fca5a5
    style U fill:#a3e635
    style HH fill:#86efac
```

---

## 7. Hoạt Động: Pipeline 8 Bước Tạo Kịch Bản

```mermaid
flowchart TD
    Start([BAT DAU]) --> P0[Nguoi dung nhap y tuong phim]

    subgraph B1 ["Buoc 1: Logline"]
        P0 --> S1A[Dien movie_idea - genre - tone]
        S1A --> S1B[AI tao Logline]
        S1B --> S1C{Validate OK?}
        S1C -->|Khong dat| S1D[Retry voi feedback]
        S1D --> S1B
        S1C -->|Dat| S1E[Luu Logline]
    end

    subgraph B2 ["Buoc 2: Chu de"]
        S1E --> S2A[AI xac dinh Chu de<br/>dua tren Logline]
        S2A --> S2B{Validate OK?}
        S2B -->|Khong dat| S2C[Retry]
        S2C --> S2A
        S2B -->|Dat| S2D[Luu Theme]
    end

    subgraph B3 ["Buoc 3: Nhan vat"]
        S2D --> S3A[AI tao danh sach nhan vat]
        S3A --> S3B{Validate OK?}
        S3B -->|Khong dat| S3C[Xoa JSON cu - Retry]
        S3C --> S3A
        S3B -->|Dat| S3D[Luu nhan vat vao JSON files]
        S3D --> S3E[Nhan vat san sang]
    end

    subgraph B4 ["Buoc 4: Synopsis"]
        S3E --> S4A[Load characters tu JSON]
        S4A --> S4B[AI viet Synopsis<br/>Logline + Theme + Characters]
        S4B --> S4C{Validate OK?}
        S4C -->|Khong dat| S4D[Retry]
        S4D --> S4B
        S4C -->|Dat| S4E[Luu Synopsis]
    end

    subgraph B5 ["Buoc 5: Cau truc 4 Hoi"]
        S4E --> S5A[AI tao cau truc 4 hoi]
        S5A --> S5B{Validate OK?}
        S5B -->|Khong dat| S5C[Retry]
        S5C --> S5A
        S5B -->|Dat| S5D[Luu Structure]
    end

    subgraph B6 ["Buoc 6: Beat Sheet"]
        S5D --> S6A[AI tao Beat Sheet]
        S6A --> S6B{Validate OK?}
        S6B -->|Khong dat| S6C[Retry]
        S6C --> S6A
        S6B -->|Dat| S6D[Luu Beatsheet]
    end

    subgraph B7 ["Buoc 7: Danh sach Canh"]
        S6D --> S7A[AI tao Scene List]
        S7A --> S7B{Validate OK?}
        S7B -->|Khong dat| S7C[Retry]
        S7C --> S7A
        S7B -->|Dat| S7D[Luu Scenelist]
    end

    subgraph B8 ["Buoc 8: Viet Kich ban"]
        S7D --> S8A[Chon canh can viet]
        S8A --> S8B[AI viet kich ban chi tiet]
        S8B --> S8C{Validate OK?}
        S8C -->|Khong dat| S8D[Retry]
        S8D --> S8B
        S8C -->|Dat| S8E[Kich ban hoan chinh]
    end

    S8E --> SAVE[(Luu vao ai_responses)]
    SAVE --> EXPORT{Xuat file?}
    EXPORT -->|Co| EXP[Xuat PDF hoac DOCX hoac TXT]
    EXPORT -->|Khong| End([KET THUC])
    EXP --> End

    style Start fill:#22c55e,color:#fff
    style End fill:#22c55e,color:#fff
    style SAVE fill:#a3e635
    style S1E fill:#86efac
    style S2D fill:#86efac
    style S3E fill:#86efac
    style S4E fill:#86efac
    style S5D fill:#86efac
    style S6D fill:#86efac
    style S7D fill:#86efac
    style S8E fill:#86efac
```

---

## 8. Hoạt Động: Phân Tích Truyện → Kịch Bản (Story Mode)

```mermaid
flowchart TD
    Start([BAT DAU]) --> A[Nguoi dung tai len file truyen<br/>PDF - TXT - DOCX]
    A --> B{Dinh dang<br/>file hop le?}
    B -->|Khong| C[Bao loi dinh dang]
    C --> A
    B -->|Co| D[Server doc va extract<br/>noi dung van ban]
    D --> E[Luu story_content vao project]
    E --> F[Hien thi noi dung truyen]
    F --> G[Nguoi dung chon<br/>buoc phan tich]

    subgraph ANALYZE ["Cac buoc phan tich"]
        G --> H1[Phan tich Chu de<br/>tool: story_theme]
        G --> H2[Tao Nhan vat<br/>tool: story_character]
        G --> H3[Tom tat noi dung<br/>tool: story_synopsis]
        G --> H4[Tao Cau truc<br/>tool: story_structure]
        G --> H5[Tao Beat Sheet<br/>tool: story_beatsheet]
        G --> H6[Tao Danh sach Canh<br/>tool: story_scenelist]
        G --> H7[Chuyen the Kich ban<br/>tool: story_script]
    end

    H1 --> I[Python: generate_story_analysis<br/>tool_id - story_content - previous_analyses]
    H2 --> I
    H3 --> I
    H4 --> I
    H5 --> I
    H6 --> I
    H7 --> I

    I --> J[get_story_analysis_prompt<br/>build_story_analysis_user_prompt]
    J --> K[Goi AI Provider<br/>timeout = 180 giay]
    K --> L{AI phan hoi<br/>thanh cong?}
    L -->|Khong| M[Tra loi cho frontend]
    M --> G
    L -->|Co| N[format_response_to_html]
    N --> O[Tra ket qua phan tich]
    O --> P[Luu vao previous_analyses]
    P --> Q{Tiep tuc<br/>buoc khac?}
    Q -->|Co| G
    Q -->|Khong| R[Luu tat ca ket qua vao du an]
    R --> End([KET THUC])

    style Start fill:#22c55e,color:#fff
    style End fill:#22c55e,color:#fff
    style C fill:#fca5a5
    style M fill:#fca5a5
    style O fill:#86efac
```

---

## 9. Hoạt Động: Quản Trị Hệ Thống (Admin)

```mermaid
flowchart TD
    Start([ADMIN DANG NHAP]) --> A{is_admin = true?}
    A -->|Khong| B[Loi 403 Khong co quyen]
    B --> End1([KET THUC TU CHOI])
    A -->|Co| C[Truy cap admin.html]
    C --> D{Chon chuc nang}

    D -->|Dashboard| E[GET /api/admin/stats]
    E --> F[(Tong users - PRO users<br/>Doanh thu - Luot AI)]
    F --> G[Hien thi bieu do va so lieu]
    G --> D

    D -->|Quan ly Users| H[GET /api/admin/users]
    H --> I[Hien thi danh sach users]
    I --> J{Hanh dong?}
    J -->|Khoa TK| K[PUT users/:id/status<br/>banned]
    J -->|Mo khoa| L[PUT users/:id/status<br/>active]
    J -->|Nang cap PRO| M[PUT users/:id/plan<br/>plan_type: pro]
    J -->|Ha cap Free| N[PUT users/:id/plan<br/>plan_type: free]
    K --> O[(UPDATE users account_status)]
    L --> O
    M --> P[(UPDATE users plan_type)]
    N --> P
    O --> D
    P --> D

    D -->|Cai dat AI| Q[Xem cau hinh AI hien tai]
    Q --> R[Thay doi Provider - Model - API Key]
    R --> S[POST /api/admin/settings]
    S --> T[Ghi vao file .env]
    T --> U[POST Python /api/reload-config]
    U --> V[Python reload .env<br/>Cau hinh moi co hieu luc]
    V --> D

    D -->|Cong thanh toan| W[Xem cau hinh SePay - VNPay]
    W --> X{Thao tac?}
    X -->|Bat/Tat cong| Y[(UPDATE payment_settings<br/>sepay_enabled hoac vnpay_enabled)]
    X -->|Cap nhat gia| Z[(UPDATE payment_settings<br/>price_pro_1m - 3m - 1y)]
    X -->|Goi tuy chinh| AA[(INSERT UPDATE custom_plans)]
    Y --> D
    Z --> D
    AA --> D

    D -->|Log AI| BB[GET /api/admin/ai-logs]
    BB --> CC[(SELECT ai_generation_logs)]
    CC --> DD[Hien thi user - tool - tokens - cost - latency]
    DD --> D

    D -->|Thoat| End2([KET THUC])

    style Start fill:#22c55e,color:#fff
    style End1 fill:#ef4444,color:#fff
    style End2 fill:#ef4444,color:#fff
    style B fill:#fca5a5
    style V fill:#86efac
```

---

## 10. Hoạt Động: Tự Động Hạ Cấp PRO Hết Hạn

```mermaid
flowchart TD
    subgraph CRON ["Cron Job - Moi 1 gio"]
        C1([Trigger moi 60 phut]) --> C2[(UPDATE users<br/>SET plan_type = free<br/>pro_expires_at = NULL<br/>WHERE plan_type = pro<br/>AND pro_expires_at < NOW)]
        C2 --> C3{affectedRows > 0?}
        C3 -->|Co| C4[Log: N tai khoan ha cap]
        C3 -->|Khong| C5[Khong co thay doi]
        C4 --> C6([Cho 1 gio tiep theo])
        C5 --> C6
    end

    subgraph LOGIN ["Kiem tra khi Dang nhap"]
        L1([Nguoi dung dang nhap]) --> L2[(SELECT user info)]
        L2 --> L3{plan_type = pro<br/>va pro_expires_at < NOW?}
        L3 -->|Khong het han| L4[Giu nguyen PRO]
        L3 -->|Het han| L5[(UPDATE users<br/>plan_type = free<br/>pro_expires_at = NULL)]
        L5 --> L6[Tra ve user voi plan_type = free]
        L4 --> L7[Tra ve user voi plan_type = pro]
        L6 --> L8[Frontend thong bao PRO het han]
        L7 --> L9[Dang nhap binh thuong]
    end

    style C1 fill:#f59e0b,color:#fff
    style L1 fill:#3b82f6,color:#fff
    style L5 fill:#fca5a5
    style L6 fill:#fca5a5
    style L8 fill:#fde68a
```

---

> **Lưu ý:** Tất cả các luồng AI (sơ đồ 4, 5, 7, 8) đều đi qua Python Flask API (port 5000) được proxy bởi Node.js (port 3000) qua đường dẫn `/python-api/*`.

> **Cơ chế Validate & Retry** là trọng tâm của hệ thống: mỗi lần tạo nội dung AI đều tự động kiểm tra chất lượng. Nếu không đạt, hệ thống gửi feedback cho AI và thử lại tối đa `MAX_RETRIES` lần trước khi trả về kết quả tốt nhất.
