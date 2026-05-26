# Hướng dẫn Build iOS App - AI Screenplay

## ⚠️ Yêu cầu: macOS + Xcode

Build iOS **bắt buộc phải có macOS** với Xcode. Trên Windows, bạn cần dùng một trong các cách sau:

---

## Cách 1: Build trực tiếp trên Mac

### Cài đặt môi trường
```bash
# Cài Flutter SDK (nếu chưa có)
brew install flutter

# Kiểm tra Flutter
flutter doctor
```

### Build
```bash
cd "app_web_view (1)"

# Lấy dependencies
flutter pub get

# Cài CocoaPods dependencies
cd ios && pod install && cd ..

# Chạy trên iOS Simulator
flutter run

# Build IPA (TestFlight / App Store)
flutter build ipa --release
```

### IPA output
```
build/ios/ipa/app_web_view.ipa
```

---

## Cách 2: CI/CD với Codemagic (miễn phí 500 phút/tháng)

1. Push code lên GitHub
2. Đăng ký tại https://codemagic.io
3. Kết nối repo → tự động build iOS

---

## Cách 3: GitHub Actions với macOS runner

Tạo file `.github/workflows/ios.yml`:

```yaml
name: Build iOS

on: [push]

jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.32.x'
      - run: cd "app_web_view (1)" && flutter pub get
      - run: cd "app_web_view (1)/ios" && pod install
      - run: cd "app_web_view (1)" && flutter build ios --no-codesign
```

---

## Cấu hình đã hoàn thành

| Hạng mục | Trạng thái |
|---|---|
| Info.plist - URL Scheme (aiscreenplay) | ✅ |
| Info.plist - Camera permission | ✅ |
| Info.plist - Photo Library permission | ✅ |
| Info.plist - Microphone permission | ✅ |
| Info.plist - NSAppTransportSecurity | ✅ |
| AppDelegate.swift - Deep Link handler | ✅ |
| Podfile (iOS 14.0+) | ✅ |
| pubspec.yaml - flutter_launcher_icons | ✅ |

## Nếu dùng Google Sign-In native (tùy chọn)

Thêm `GoogleService-Info.plist` vào `ios/Runner/`:
1. Vào Google Cloud Console → tạo OAuth client iOS
2. Download `GoogleService-Info.plist`
3. Kéo vào Xcode project (ios/Runner)

Hiện tại app dùng Google OAuth qua WebView (flutter_web_auth_2) nên không bắt buộc.
