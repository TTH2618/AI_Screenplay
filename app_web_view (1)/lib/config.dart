// ============================================================
// ⚙️ FILE CẤU HÌNH FLUTTER APP
// ⚠️ Thêm file này vào .gitignore nếu chứa thông tin nhạy cảm
// ============================================================

class AppConfig {
  // ── BASE URLs ──────────────────────────────────────────────
  // 💡 HƯỚNG DẪN CẤU HÌNH URL:
  // 1. Nếu chạy Android Emulator: Dùng 'http://10.0.2.2:3000' để trỏ về localhost máy tính.
  // 2. Nếu chạy iOS Simulator: Dùng 'http://localhost:3000'.
  // 3. Nếu chạy thiết bị thật (qua WiFi): Dùng IP máy tính của bạn (VD: 'http://192.168.1.15:3000').
  // 4. Nếu chạy qua ngrok/tunnel: Dùng link ngrok của bạn (VD: 'https://xxx.ngrok-free.app').
  
  /// URL backend Node.js (không có dấu / ở cuối)
  static const String apiBaseUrl = 'https://pesky-unlaced-guidable.ngrok-free.dev/api';

  /// URL frontend web (không có dấu / ở cuối)
  static const String webBaseUrl = 'https://pesky-unlaced-guidable.ngrok-free.dev';

  // ── OAUTH DEEP LINK ────────────────────────────────────────
  /// Scheme cho Deep Link callback sau Google OAuth
  /// Phải khớp với android:scheme trong AndroidManifest.xml
  static const String callbackScheme = 'aiscreenplay';

  // ── APP INFO ───────────────────────────────────────────────
  static const String appName = 'AI Screenplay';
  static const String appVersion = '1.0.0';

  // ── COMPUTED ───────────────────────────────────────────────
  /// URL endpoint đăng nhập Google dành cho Flutter (Nếu có cấu hình OAuth)
  static String get googleLoginFlutterUrl =>
      '$apiBaseUrl/auth/google/login/flutter?callback_scheme=$callbackScheme';
}

