# Hướng dẫn A → Z: Build iOS IPA trên Windows (không cần Mac)

> **Công nghệ sử dụng:**
> - **Capacitor.js** — đóng gói web app (HTML/CSS/JS) thành native iOS app
> - **GitHub Actions** — build IPA tự động trên máy macOS của GitHub (miễn phí)
> - **AltStore / AltServer** — sideload IPA lên iPhone không cần jailbreak, không cần $99/năm

---

## Tổng quan luồng hoạt động

```
Code (Windows)
    │
    ▼
Push lên GitHub
    │
    ▼
GitHub Actions chạy trên máy macOS (tự động)
    │  ┌── npm install (Capacitor)
    │  ├── npx cap add ios  → tạo Xcode project
    │  ├── npx cap sync ios → copy web files vào iOS
    │  ├── pod install      → cài CocoaPods
    │  └── xcodebuild       → build .app → đóng gói .ipa
    ▼
Download AIScreenplay.ipa từ GitHub Artifacts
    │
    ▼
AltServer (Windows) + AltStore (iPhone)
    │
    ▼
Cài app lên iPhone ✅
```

---

## PHẦN 1 — Chuẩn bị (chỉ làm 1 lần)

### Bước 1 — Cài Git cho Windows

1. Vào https://git-scm.com/download/win → tải và cài đặt
2. Mở PowerShell, kiểm tra: `git --version`

### Bước 2 — Cài Node.js cho Windows

1. Vào https://nodejs.org → tải bản LTS (ví dụ: 20.x)
2. Cài đặt → kiểm tra: `node --version` và `npm --version`

### Bước 3 — Tạo tài khoản GitHub (nếu chưa có)

Vào https://github.com → Sign up

---

## PHẦN 2 — Cấu hình Backend URL (bắt buộc)

Khi app chạy trên iPhone (native), nó không thể gọi về `localhost`.
Bạn cần deploy backend lên internet và điền URL vào `js/config.js`.

Mở file `js/config.js`, tìm dòng:
```js
const PRODUCTION_BACKEND = 'https://YOUR_DEPLOYED_BACKEND_URL';
```

Thay bằng URL thực tế của backend, ví dụ:
```js
const PRODUCTION_BACKEND = 'https://abc123.ngrok-free.app';
// hoặc URL VPS/Heroku/Railway của bạn
```

> **Lưu ý:** Nếu chưa có server deploy, bạn có thể dùng `ngrok` để tạm thời
> expose localhost ra internet trong khi test:
> ```
> ngrok http 3000
> ```
> Sau đó dùng URL ngrok cung cấp (dạng `https://xxxx.ngrok-free.app`).

---

## PHẦN 3 — Tạo repo GitHub và push code

### Bước 4 — Tạo repo trên GitHub

1. Vào https://github.com → **New repository**
2. Đặt tên: `ai-screenplay-studio` → **Private** → **Create repository**
3. **Không tick** "Add README" (repo phải rỗng)

### Bước 5 — Push code lên GitHub

Mở PowerShell tại thư mục dự án:

```powershell
# Di chuyển vào thư mục dự án
cd "d:\school\AI\baocao\doan2_trc_kiem_thu\doan2_trc_kiem_thu (3)\doan2_trc_kiem_thu"

# Khởi tạo git (nếu chưa có)
git init
git add .
git commit -m "Initial commit with iOS Capacitor support"

# Thay YOUR_USERNAME bằng tên GitHub của bạn
git remote add origin https://github.com/YOUR_USERNAME/ai-screenplay-studio.git
git branch -M main
git push -u origin main
```

> **Lưu ý:** GitHub sẽ hỏi username/password. Nếu bị lỗi authentication, dùng
> Personal Access Token (PAT): vào GitHub → Settings → Developer Settings →
> Personal Access Tokens → Generate new token → dùng token đó thay password.

---

## PHẦN 4 — GitHub Actions tự động build IPA

### Bước 6 — Kiểm tra workflow đã có sẵn

File `.github/workflows/build-ios.yml` đã được tạo sẵn trong repo.
Mỗi lần bạn `git push` lên nhánh `main`, workflow tự động chạy.

### Bước 7 — Theo dõi quá trình build

1. Vào repo GitHub → tab **Actions**
2. Thấy workflow **"Build iOS IPA"** đang chạy:
   - 🟡 Vàng = đang chạy (~15–20 phút)
   - ✅ Xanh = thành công
   - ❌ Đỏ = lỗi (xem log để debug)
3. Khi xanh → click vào workflow run → cuộn xuống **Artifacts**
4. Click **AIScreenplay-iOS** → tải về máy
5. Giải nén → được file `AIScreenplay.ipa`

### Chạy thủ công (không cần push code)

Vào tab **Actions** → chọn workflow **Build iOS IPA** → click **Run workflow** → **Run workflow**

---

## PHẦN 5 — Cài AltStore lên iPhone từ Windows

### Bước 8 — Cài phần mềm cần thiết trên Windows

Cài theo đúng thứ tự:

1. **iTunes** (bản từ Apple, KHÔNG phải Microsoft Store):
   - Vào https://www.apple.com/itunes/ → Download iTunes for Windows
   
2. **iCloud for Windows**:
   - Vào https://support.apple.com/en-us/103232 → Download iCloud for Windows

3. **AltServer for Windows**:
   - Vào https://altstore.io → Download → AltServer for Windows
   - Giải nén và chạy `AltInstaller.exe` → cài đặt

### Bước 9 — Khởi động AltServer

1. Chạy **AltServer** → icon xuất hiện ở system tray (góc phải màn hình, gần đồng hồ)
2. Nếu không thấy icon, click mũi tên `^` để mở rộng system tray

### Bước 10 — Cài AltStore lên iPhone

1. Cắm iPhone vào PC bằng cáp USB
2. Mở **iTunes** → trust máy tính nếu iPhone hỏi "Trust This Computer?"
3. Click icon **AltServer** ở system tray → **Install AltStore** → chọn iPhone
4. Nhập **Apple ID** và **mật khẩu Apple ID** của bạn
   - Dùng tài khoản Apple miễn phí là được, không cần $99/năm Developer Account
5. Chờ ~1–2 phút
6. Trên iPhone: **Settings → General → VPN & Device Management**
   → Tìm tên Apple ID của bạn → **Trust** → Trust
7. Mở app **AltStore** trên iPhone → đăng nhập bằng Apple ID

---

## PHẦN 6 — Sideload IPA lên iPhone

### Bước 11 — Sideload qua AltServer trên PC (khuyến nghị)

1. Đảm bảo iPhone đang cắm USB (hoặc cùng WiFi với PC đang chạy AltServer)
2. Click icon **AltServer** ở system tray → **Sideload .ipa**
3. Chọn file `AIScreenplay.ipa` vừa tải về
4. Chờ AltServer ký và cài đặt (~1–2 phút)
5. Vào iPhone → mở app **AI Screenplay Studio** ✅

### Bước 11 (Thay thế) — Sideload qua AltStore trên iPhone

1. Copy file `AIScreenplay.ipa` sang iPhone bằng AirDrop hoặc email
2. Trên iPhone: tap vào file `.ipa` → chọn **Open in AltStore**
3. AltStore tự ký và cài

---

## PHẦN 7 — Gia hạn app (mỗi 7 ngày)

Apple ID miễn phí chỉ cho phép certificate có hạn 7 ngày.
Để gia hạn:

1. Cắm iPhone vào PC (hoặc cùng WiFi)
2. AltServer phải đang chạy
3. Mở app **AltStore** trên iPhone → **My Apps** → swipe phải vào app → **Refresh**

> **Mẹo:** Bật **"Refresh Apps"** trong AltStore settings để tự động gia hạn khi
> iPhone cùng WiFi với PC đang chạy AltServer.

---

## PHẦN 8 — Cập nhật app

Mỗi khi cập nhật code:

```powershell
git add .
git commit -m "Cập nhật tính năng XYZ"
git push
```

GitHub Actions tự động build IPA mới → tải về → sideload lại qua AltStore.

---

## Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| Build đỏ ❌ trên Actions | Xem log trong tab Actions | Click vào step bị lỗi để đọc chi tiết |
| `pod install` thất bại | CocoaPods network issue | Thêm `--repo-update` (đã có trong workflow) |
| "App could not be installed" | Certificate hết hạn | Refresh app trong AltStore |
| AltServer không thấy iPhone | iTunes/iCloud chưa đúng version | Tải iTunes từ apple.com, không dùng Store |
| App gọi API thất bại | Backend URL chưa cấu hình | Sửa `PRODUCTION_BACKEND` trong `js/config.js` |
| "Untrusted Developer" | Chưa trust certificate | Settings → VPN & Device Management → Trust |

---

## Cấu trúc files iOS đã tạo

```
doan2_trc_kiem_thu/
├── .github/
│   └── workflows/
│       └── build-ios.yml      ← GitHub Actions workflow
├── capacitor.config.json      ← Cấu hình Capacitor / app ID
├── package.json               ← Capacitor dependencies
├── js/
│   └── config.js              ← Đã thêm native app URL detection
└── ios.md                     ← File này
```






