/**
 * config.js - Cấu hình URL API tự động theo môi trường
 *
 * Kiến trúc MỚI (1 port duy nhất):
 * ─────────────────────────────────────────────────────
 *  Trình duyệt → Node.js :3000 (tất cả request)
 *                   ├── /api/*         → Xử lý bởi Node.js
 *                   └── /python-api/*  → Proxy nội bộ → Python :5000
 *
 *  Lợi ích:
 *   ✅ Chỉ cần 1 port để ngrok / deploy
 *   ✅ Không bị lỗi CORS giữa 2 domain khác nhau
 *   ✅ Hoạt động đúng trên mọi thiết bị (điện thoại, internet)
 */

(function () {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol; // 'http:' hoặc 'https:'
    const port     = window.location.port;     // cổng hiện tại (ví dụ: '3000' hoặc '' nếu 80/443)

    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    // Xây dựng base URL của Node.js (cùng origin với trang hiện tại)
    // Ví dụ:  http://localhost:3000  hoặc  https://abc.ngrok-free.app
    const nodeHost = `${protocol}//${hostname}${port ? ':' + port : ''}`;

    // Xuất ra biến toàn cục để các file JS khác dùng chung
    window.APP_CONFIG = {
        /**
         * Base URL của Node.js REST API
         * Dùng trong api.js, auth.js, dashboard.js, admin.js, ...
         */
        API_BASE_URL: `${nodeHost}/api`,

        /**
         * Base URL của Python AI service — trỏ qua proxy của Node.js
         * Node.js sẽ forward /python-api/* → Python :5000/api/*
         * Dùng trong api.js (AI_API_BASE_URL)
         */
        AI_API_BASE_URL: `${nodeHost}/python-api`,

        /**
         * URL đầy đủ của Python API (kèm prefix /python-api)
         * Dùng trong app.js (PYTHON_API_URL)
         */
        PYTHON_API_URL: `${nodeHost}/python-api`,
    };

    console.log(`[Config] Môi trường : ${isLocal ? 'LOCAL' : 'PRODUCTION / TUNNEL'}`);
    console.log(`[Config] Node API   → ${window.APP_CONFIG.API_BASE_URL}`);
    console.log(`[Config] Python AI  → ${window.APP_CONFIG.PYTHON_API_URL}`);
    console.log(`[Config] (Python chạy nội bộ, Node.js proxy /python-api/* → :5000/api/*)`);

    // ─── Tự động thêm header ngrok-skip-browser-warning ──────────────────────
    // Ngrok free plan hiển thị trang cảnh báo HTML thay vì forward request.
    // Header này yêu cầu ngrok bỏ qua trang cảnh báo đó cho fetch/XHR.
    // Chỉ áp dụng khi đang chạy qua ngrok (domain kết thúc bằng .ngrok-free.app
    // hoặc .ngrok.io hoặc .ngrok.app).
    const isNgrok = /\.ngrok(-free)?\.app$|\.ngrok\.io$/.test(hostname);

    if (isNgrok) {
        console.log('[Config] Phát hiện ngrok → tự động thêm header ngrok-skip-browser-warning');
        const _originalFetch = window.fetch.bind(window);
        window.fetch = function (input, init = {}) {
            const headers = new Headers(init.headers || {});
            // Chỉ thêm vào request gửi đến cùng domain (tránh ảnh hưởng CDN ngoài)
            const targetUrl = typeof input === 'string' ? input : (input.url || '');
            const isSameOrigin = !targetUrl.startsWith('http') || targetUrl.startsWith(nodeHost);
            if (isSameOrigin) {
                headers.set('ngrok-skip-browser-warning', 'true');
            }
            return _originalFetch(input, { ...init, headers });
        };
    }
    // ─────────────────────────────────────────────────────────────────────────
})();
