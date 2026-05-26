import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // ✅ Hỗ trợ deep link callback sau Google OAuth (flutter_web_auth_2)
  override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    // Xử lý scheme aiscreenplay://...
    if url.scheme == "aiscreenplay" {
      return super.application(app, open: url, options: options)
    }
    return super.application(app, open: url, options: options)
  }
}
