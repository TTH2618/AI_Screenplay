import 'dart:math';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_selector/file_selector.dart';
import 'config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // 💡 Thiết lập chạy ở chế độ toàn màn hình ẩn dải trạng thái Status Bar và phím điều hướng
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

  // Lấy token và user đã lưu (nếu có)
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('access_token');
  final userJson = prefs.getString('user_data');

  runApp(PhatGiaoApp(initialToken: token, initialUserJson: userJson));
}

class PhatGiaoApp extends StatelessWidget {
  final String? initialToken;
  final String? initialUserJson;
  
  static final List<Color> _brandColors = [
    const Color(0xFFB7791F), // Vàng Phật Giáo
    const Color(0xFF1565C0), 
    const Color(0xFF2E7D32),
    const Color(0xFFC62828), 
    const Color(0xFF6A1B9A),
    const Color(0xFF37474F),
  ];

  PhatGiaoApp({super.key, this.initialToken, this.initialUserJson});

  final Color _primaryColor = _brandColors[Random().nextInt(_brandColors.length)];

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: _primaryColor),
        useMaterial3: true,
      ),
      home: WebViewScreen(token: initialToken, userJson: initialUserJson),
    );
  }
}

// ============================================================
// MAIN WEBVIEW SCREEN
// ============================================================
class WebViewScreen extends StatefulWidget {
  final String? token;
  final String? userJson;
  const WebViewScreen({super.key, required this.token, this.userJson});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  double _loadingProgress = 0;
  String? _activeToken;
  String? _activeUserJson;
  bool _isAuthenticating = false;

  // Image/File picker
  final ImagePicker _imagePicker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _activeToken = widget.token;
    _activeUserJson = widget.userJson;
    _requestPermissions();
    _initWebView();
  }

  // 💡 Yêu cầu các quyền cần thiết cho việc tải file (ảnh/video/camera) động
  Future<void> _requestPermissions() async {
    try {
      await Permission.storage.request();
      await [
        Permission.photos,
        Permission.videos,
        Permission.camera,
      ].request();
      debugPrint("==> Đã hoàn tất yêu cầu các quyền truy cập tệp/camera hệ thống");
    } catch(e) {
      debugPrint("==> Lỗi khi yêu cầu quyền hệ thống: $e");
    }
  }

  // --- WebView Initialization ---

  void _initWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFFCFAF7))
      // 💡 Bổ sung UserAgent giả lập trình duyệt Chrome Mobile để tránh bị Google chặn đăng nhập trong WebView
      ..setUserAgent("Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) => setState(() => _loadingProgress = progress / 100),
          onPageStarted: (_) => setState(() { _isLoading = true; _hasError = false; }),
          onPageFinished: (_) {
            setState(() => _isLoading = false);
            if (_activeToken != null && _activeUserJson != null) {
              _injectTokenToWeb(_activeToken!, _activeUserJson!);
            }
            // 💡 Inject bridge script để web có thể gọi Flutter picker
            _injectFileBridge();
          },
          onWebResourceError: (error) {
            if (error.isForMainFrame ?? true) {
              setState(() { _isLoading = false; _hasError = true; });
            }
          },
          onNavigationRequest: _handleNavigation,
        ),
      )
      ..addJavaScriptChannel('FlutterBridge', onMessageReceived: _handleWebMessage);

    _setupAppCookie();
    _loadAppUrl(_activeToken);
  }

  // --- Helper Methods ---

  /// Thiết lập cookie định danh để Web nhận biết môi trường App
  Future<void> _setupAppCookie() async {
    final domain = Uri.parse(AppConfig.webBaseUrl).host;
    await WebViewCookieManager().setCookie(
      WebViewCookie(name: 'viewappmobie', value: 'true', domain: domain, path: '/'),
    );
  }

  /// Load trang web chính với token (nếu có)
  void _loadAppUrl(String? token) {
    final url = token != null 
        ? '${AppConfig.webBaseUrl}/dashboard.html?token=$token' 
        : '${AppConfig.webBaseUrl}/dashboard.html';
    _controller.loadRequest(Uri.parse(url));
  }

  /// Chặn các điều hướng không hợp lệ
  NavigationDecision _handleNavigation(NavigationRequest request) {
    final url = request.url;

    if (url.contains('callback') || url.contains('token=')) {
      return NavigationDecision.navigate;
    }

    if (url.contains('google.com') || url.contains('googleapis.com') || url.contains('gstatic.com')) {
      return NavigationDecision.navigate;
    }

    if (url.startsWith(AppConfig.webBaseUrl)) {
      return NavigationDecision.navigate;
    }
    debugPrint('==> Đã chặn điều hướng ngoài: ${request.url}');
    return NavigationDecision.prevent;
  }

  /// Xử lý các thông điệp gửi từ JavaScript
  void _handleWebMessage(JavaScriptMessage message) async {
    final data = message.message;
    debugPrint('==> Bridge received: $data');
    
    if (data == 'LOGOUT') {
      _processLogout();
    } else if (data.startsWith('GOOGLE_LOGIN')) {
      _triggerNativeGoogleLogin();
    } else if (data.startsWith('PICK_IMAGE:')) {
      // Format: PICK_IMAGE:<callbackFunctionName>
      final callbackFn = data.substring('PICK_IMAGE:'.length);
      await _pickImageNative(callbackFn);
    } else if (data.startsWith('PICK_FILE:')) {
      // Format: PICK_FILE:<callbackFunctionName>
      final callbackFn = data.substring('PICK_FILE:'.length);
      await _pickFileNative(callbackFn);
    }
  }

  // ============================================================
  // 💡 Native File Picking - Thay thế WebView file chooser
  // ============================================================

  /// Mở image picker native (camera hoặc gallery) và trả kết quả về WebView
  Future<void> _pickImageNative(String callbackFn) async {
    try {
      // Hiện dialog chọn nguồn ảnh
      final source = await _showImageSourceDialog();
      if (source == null) {
        // User huỷ
        await _controller.runJavaScript('if(typeof $callbackFn === "function") $callbackFn(null);');
        return;
      }

      final XFile? picked = await _imagePicker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1024,
        maxHeight: 1024,
      );

      if (picked == null) {
        await _controller.runJavaScript('if(typeof $callbackFn === "function") $callbackFn(null);');
        return;
      }

      final bytes = await picked.readAsBytes();
      final base64Str = base64Encode(bytes);
      final mimeType = _getMimeType(picked.name);
      final fileName = picked.name;

      debugPrint('==> Đã chọn ảnh: $fileName (${bytes.length} bytes)');

      // Inject base64 data vào WebView để gọi callback
      await _controller.runJavaScript('''
        (function() {
          try {
            var base64 = "$base64Str";
            var mime = "$mimeType";
            var name = "${fileName.replaceAll('"', '\\"')}";
            var dataUrl = "data:" + mime + ";base64," + base64;
            if(typeof $callbackFn === "function") {
              $callbackFn({ base64: base64, dataUrl: dataUrl, mimeType: mime, fileName: name });
            }
          } catch(e) { console.error("Flutter bridge callback error:", e); }
        })();
      ''');
    } catch (e) {
      debugPrint('==> Lỗi pick image: $e');
      await _controller.runJavaScript('if(typeof $callbackFn === "function") $callbackFn(null);');
    }
  }

  /// Mở file picker native cho tài liệu (PDF, DOC, TXT)
  Future<void> _pickFileNative(String callbackFn) async {
    try {
      const typeGroup = XTypeGroup(
        label: 'Tài liệu',
        extensions: ['pdf', 'doc', 'docx', 'txt'],
        mimeTypes: ['application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'],
      );

      final XFile? picked = await openFile(acceptedTypeGroups: [typeGroup]);

      if (picked == null) {
        await _controller.runJavaScript('if(typeof $callbackFn === "function") $callbackFn(null);');
        return;
      }

      final bytes = await picked.readAsBytes();
      final base64Str = base64Encode(bytes);
      final mimeType = _getMimeType(picked.name);
      final fileName = picked.name;

      debugPrint('==> Đã chọn file: $fileName (${bytes.length} bytes)');

      await _controller.runJavaScript('''
        (function() {
          try {
            var base64 = "$base64Str";
            var mime = "$mimeType";
            var name = "${fileName.replaceAll('"', '\\"')}";
            var dataUrl = "data:" + mime + ";base64," + base64;
            if(typeof $callbackFn === "function") {
              $callbackFn({ base64: base64, dataUrl: dataUrl, mimeType: mime, fileName: name });
            }
          } catch(e) { console.error("Flutter bridge callback error:", e); }
        })();
      ''');
    } catch (e) {
      debugPrint('==> Lỗi pick file: $e');
      await _controller.runJavaScript('if(typeof $callbackFn === "function") $callbackFn(null);');
    }
  }

  /// Hiện dialog chọn nguồn ảnh (Camera hoặc Thư viện)
  Future<ImageSource?> _showImageSourceDialog() async {
    if (!mounted) return null;
    return showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFF1E1E2E),
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Chọn ảnh từ',
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _SourceButton(
                    icon: Icons.camera_alt_rounded,
                    label: 'Camera',
                    onTap: () => Navigator.pop(ctx, ImageSource.camera),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _SourceButton(
                    icon: Icons.photo_library_rounded,
                    label: 'Thư viện',
                    onTap: () => Navigator.pop(ctx, ImageSource.gallery),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.pop(ctx, null),
              child: const Text('Huỷ', style: TextStyle(color: Colors.white54)),
            ),
          ],
        ),
      ),
    );
  }

  /// Lấy MIME type từ tên file
  String _getMimeType(String fileName) {
    final ext = fileName.split('.').last.toLowerCase();
    const mimeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
    };
    return mimeMap[ext] ?? 'application/octet-stream';
  }

  // ============================================================
  // 💡 Inject file bridge script vào mỗi trang sau khi load
  // ============================================================
  Future<void> _injectFileBridge() async {
    await _controller.runJavaScript(r'''
      (function() {
        if (window.__flutterFileBridgeInjected) return;
        window.__flutterFileBridgeInjected = true;

        // Hàm tiện ích: Flutter sẽ gọi callback này sau khi user chọn file
        window.__flutterFileCallbacks = {};
        var _cbId = 0;

        /**
         * Gọi Flutter để mở image picker.
         * @param {Function} callback - fn(result) với result = { base64, dataUrl, mimeType, fileName } hoặc null nếu huỷ
         */
        window.flutterPickImage = function(callback) {
          var id = 'imgCb_' + (++_cbId);
          window.__flutterFileCallbacks[id] = function(result) {
            delete window.__flutterFileCallbacks[id];
            callback(result);
          };
          FlutterBridge.postMessage('PICK_IMAGE:window.__flutterFileCallbacks.' + id);
        };

        /**
         * Gọi Flutter để mở file picker (PDF/DOC/TXT).
         * @param {Function} callback - fn(result) với result = { base64, dataUrl, mimeType, fileName } hoặc null nếu huỷ
         */
        window.flutterPickFile = function(callback) {
          var id = 'fileCb_' + (++_cbId);
          window.__flutterFileCallbacks[id] = function(result) {
            delete window.__flutterFileCallbacks[id];
            callback(result);
          };
          FlutterBridge.postMessage('PICK_FILE:window.__flutterFileCallbacks.' + id);
        };

        console.log('[FlutterBridge] File picker bridge injected ✓');
      })();
    ''');
  }

  // --- Core Logic ---

  Future<void> _triggerNativeGoogleLogin() async {
    if (_isAuthenticating) return;
    setState(() {
      _isAuthenticating = true;
      _isLoading = true;
    });

    try {
      const String webClientId = '1063173747780-3bnvhu3bu5mblorremhaam9mpuri7uau.apps.googleusercontent.com';
      
      final GoogleSignIn googleSignIn = GoogleSignIn(
        serverClientId: webClientId,
        scopes: ['email', 'profile'],
      );

      await googleSignIn.signOut();
      
      final GoogleSignInAccount? account = await googleSignIn.signIn();

      if (account == null) {
        setState(() {
          _isAuthenticating = false;
          _isLoading = false;
        });
        return;
      }

      final GoogleSignInAuthentication auth = await account.authentication;
      final String? idToken = auth.idToken;

      if (idToken == null) {
        throw Exception("Không lấy được id_token từ Google Native");
      }

      debugPrint("==> Đăng nhập Google Native thành công, gửi id_token lên server...");

      final response = await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/auth/google'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'id_token': idToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          final token = data['token'];
          final userObj = data['user'];
          final String userJson = jsonEncode(userObj);
          
          debugPrint("==> Đăng nhập backend thành công, lưu token và chèn vào WebView");
          
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('access_token', token);
          await prefs.setString('user_data', userJson);
          
          setState(() {
            _activeToken = token;
          });

          await _injectTokenToWeb(token, userJson);
          
          _controller.loadRequest(Uri.parse('${AppConfig.webBaseUrl}/dashboard.html'));
        } else {
          throw Exception(data['message'] ?? "Lỗi đăng nhập Google từ server");
        }
      } else {
        throw Exception("Lỗi kết nối máy chủ API: ${response.statusCode}");
      }
    } catch (e) {
      debugPrint("==> Lỗi đăng nhập Google Native: $e");
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Lỗi đăng nhập Google: ${e.toString()}")),
        );
      }
    } finally {
      setState(() {
        _isAuthenticating = false;
        _isLoading = false;
      });
    }
  }

  Future<void> _processLogout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('user_data');
    
    await WebViewCookieManager().clearCookies();
    await _setupAppCookie();

    setState(() => _activeToken = null);
    _loadAppUrl(null);
  }


  Future<void> _injectTokenToWeb(String token, String userJson) async {
    final String escapedUserJson = jsonEncode(userJson);
    await _controller.runJavaScript('''
      try {
        localStorage.setItem('token', '$token');
        localStorage.setItem('access_token', '$token');
        localStorage.setItem('user', $escapedUserJson);
        window.dispatchEvent(new CustomEvent('flutter_token_ready', { detail: { token: '$token' } }));
        console.log('[Flutter] Token injected');
      } catch(e) {}
    ''');
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _controller.canGoBack()) {
          _controller.goBack();
        } else if (context.mounted) {
           SystemNavigator.pop();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFFCFAF7),
        body: Stack(
          children: [
            if (!_hasError) WebViewWidget(controller: _controller) else _ErrorView(onRetry: () => _controller.reload()),
            if (_isLoading && !_hasError) _buildProgressBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressBar() {
    return Positioned(
      top: 0, left: 0, right: 0,
      child: LinearProgressIndicator(
        value: _loadingProgress,
        backgroundColor: Colors.transparent,
        color: const Color(0xFFB7791F),
        minHeight: 3,
      ),
    );
  }
}

// ============================================================
// Source Button Widget
// ============================================================
class _SourceButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _SourceButton({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: const Color(0xFF2A2A3E),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white12),
        ),
        child: Column(
          children: [
            Icon(icon, color: const Color(0xFFB7791F), size: 32),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(color: Colors.white, fontSize: 14)),
          ],
        ),
      ),
    );
  }
}

// ============================================================
// ERROR VIEW - Hiển thị khi mất kết nối
// ============================================================
class _ErrorView extends StatelessWidget {
  final VoidCallback onRetry;
  const _ErrorView({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.cloud_off_rounded,
              size: 80,
              color: colorScheme.primary.withValues(alpha: 0.6),
            ),
            const SizedBox(height: 24),
            Text(
              'Mất kết nối Internet',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Không thể tải nội dung. Vui lòng kiểm tra lại đường truyền và thử lại.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Thử lại'),
              style: ElevatedButton.styleFrom(
                backgroundColor: colorScheme.primary,
                foregroundColor: colorScheme.onPrimary,
                padding: const EdgeInsets.symmetric(
                    horizontal: 32, vertical: 15),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
