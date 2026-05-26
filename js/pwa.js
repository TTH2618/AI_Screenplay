// PWA Installation Controller for AI Screenplay
(function() {
    'use strict';

    // 1. Đăng ký Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((reg) => console.log('[PWA] Service Worker registered successfully', reg.scope))
                .catch((err) => console.error('[PWA] Service Worker registration failed', err));
        });
    }

    // Biến lưu trữ sự kiện cài đặt của Android
    let deferredPrompt = null;
    let installButton = null;
    let iosModal = null;

    // Kiểm tra xem ứng dụng có đang chạy ở chế độ Standalone (Đã cài đặt) không
    const isStandalone = () => {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone || 
               document.referrer.includes('android-app://');
    };

    // Kiểm tra xem thiết bị có phải là iOS không
    const isIOS = () => {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    };

    // Kiểm tra xem trình duyệt có phải là Safari trên iOS không
    const isSafari = () => {
        const ua = navigator.userAgent;
        return isIOS() && /Safari/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua);
    };

    // Khởi tạo giao diện cài đặt PWA di động
    const initInstallUI = () => {
        // Nếu đã cài đặt rồi, không hiện nút nữa
        if (isStandalone()) {
            console.log('[PWA] Đang chạy ở chế độ độc lập (standalone) - Đã cài đặt.');
            return;
        }

        // Tránh tạo trùng lặp nút cài đặt
        if (document.getElementById('pwa-install-trigger')) {
            return;
        }

        // 2. Tạo nút nổi Cài đặt (Glassmorphism)
        installButton = document.createElement('button');
        installButton.className = 'pwa-install-btn';
        installButton.id = 'pwa-install-trigger';
        installButton.innerHTML = `
            <i class="fas fa-circle-down"></i>
            <span>Cài đặt Ứng dụng</span>
        `;
        document.body.appendChild(installButton);

        // 3. Tạo Modal hướng dẫn cho iOS (nếu là iOS)
        if (isIOS()) {
            createIOSModal();
        }

        // Lắng nghe sự kiện click trên nút cài đặt
        installButton.addEventListener('click', handleInstallClick);
    };

    // Tạo hộp thoại hướng dẫn cài đặt trên iOS Safari
    const createIOSModal = () => {
        if (document.getElementById('pwa-ios-guide-modal')) return;

        iosModal = document.createElement('div');
        iosModal.className = 'pwa-ios-modal';
        iosModal.id = 'pwa-ios-guide-modal';
        
        iosModal.innerHTML = `
            <div class="pwa-ios-card">
                <div class="pwa-ios-header">
                    <h3>Cài đặt AI Screenplay</h3>
                    <button class="pwa-ios-close" id="pwa-ios-modal-close" title="Đóng">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="pwa-ios-app-info">
                    <img class="pwa-ios-app-icon" src="icons/icon-192.png" alt="AI Screenplay Icon">
                    <div class="pwa-ios-app-details">
                        <h4>AI Screenplay</h4>
                        <p>Ứng dụng tạo kịch bản phim thông minh</p>
                    </div>
                </div>

                <div class="pwa-ios-steps">
                    <div class="pwa-ios-step">
                        <div class="pwa-ios-step-num">1</div>
                        <div class="pwa-ios-step-text">
                            Bấm vào biểu tượng chia sẻ <strong>"Chia sẻ"</strong> <span class="pwa-inline-icon"><i class="fas fa-share-nodes"></i> Share</span> trên thanh công cụ của Safari (nằm ở dưới cùng hoặc trên cùng của màn hình).
                        </div>
                    </div>
                    
                    <div class="pwa-ios-step">
                        <div class="pwa-ios-step-num">2</div>
                        <div class="pwa-ios-step-text">
                            Cuộn xuống danh sách tùy chọn và chọn <strong>"Thêm vào MH chính"</strong> <span class="pwa-inline-icon"><i class="fa-regular fa-square-plus"></i> Add to Home Screen</span>.
                        </div>
                    </div>
                    
                    <div class="pwa-ios-step">
                        <div class="pwa-ios-step-num">3</div>
                        <div class="pwa-ios-step-text">
                            Bấm vào chữ <strong>"Thêm"</strong> (Add) ở góc trên bên phải để hoàn tất cài đặt ứng dụng.
                        </div>
                    </div>
                </div>

                <button class="pwa-ios-footer-btn" id="pwa-ios-modal-confirm">Tôi đã hiểu</button>
            </div>
        `;
        
        document.body.appendChild(iosModal);

        // Nút đóng modal
        const closeBtn = iosModal.querySelector('#pwa-ios-modal-close');
        const confirmBtn = iosModal.querySelector('#pwa-ios-modal-confirm');
        
        const closeModal = () => {
            iosModal.classList.remove('show');
        };

        closeBtn.addEventListener('click', closeModal);
        confirmBtn.addEventListener('click', closeModal);
        iosModal.addEventListener('click', (e) => {
            if (e.target === iosModal) {
                closeModal();
            }
        });
    };

    // Xử lý sự kiện click
    const handleInstallClick = () => {
        if (isIOS()) {
            // iOS Safari - Show custom instructions modal
            if (iosModal) {
                iosModal.classList.add('show');
            } else {
                createIOSModal();
                setTimeout(() => iosModal.classList.add('show'), 50);
            }
        } else if (deferredPrompt) {
            // Android / Chrome / PC - Trigger browser native prompt
            installButton.classList.remove('show'); // Ẩn nút nổi tạm thời
            deferredPrompt.prompt();
            
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('[PWA] User accepted the install prompt');
                } else {
                    console.log('[PWA] User dismissed the install prompt');
                    installButton.classList.add('show'); // Hiện lại nút nếu bị hủy
                }
                deferredPrompt = null;
            });
        } else {
            // Trường hợp trình duyệt khác hoặc desktop không kích hoạt được beforeinstallprompt
            alert('Vui lòng mở menu trình duyệt di động và chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính" để cài đặt ứng dụng.');
        }
    };

    // 2. Lắng nghe sự kiện beforeinstallprompt (Android / Chrome / PC)
    window.addEventListener('beforeinstallprompt', (e) => {
        // Ngăn trình duyệt tự động hiển thị banner mặc định
        e.preventDefault();
        // Lưu sự kiện lại để kích hoạt sau
        deferredPrompt = e;
        
        console.log('[PWA] beforeinstallprompt event fired');
        
        // Nếu nút chưa được tạo, khởi tạo ngay
        if (!installButton) {
            initInstallUI();
        }
        
        // Hiển thị nút cài đặt di động
        if (installButton) {
            installButton.classList.add('show');
        }
    });

    // 3. Xử lý trường hợp iOS Safari đặc biệt (vì iOS không có event beforeinstallprompt)
    window.addEventListener('DOMContentLoaded', () => {
        // Chờ DOM load xong
        setTimeout(() => {
            // Nếu là thiết bị iOS và chạy trong trình duyệt Safari thường (chưa cài đặt), hiển thị nút cài đặt
            if (isIOS() && isSafari() && !isStandalone()) {
                console.log('[PWA] iOS Safari detected - showing custom install prompt UI');
                if (!installButton) {
                    initInstallUI();
                }
                if (installButton) {
                    installButton.classList.add('show');
                }
            }
        }, 1500); // Trì hoãn nhẹ để người dùng không cảm thấy phiền lúc vừa vào trang
    });

    // Theo dõi xem ứng dụng đã được cài đặt thành công chưa
    window.addEventListener('appinstalled', (evt) => {
        console.log('[PWA] Application installed successfully!');
        if (installButton) {
            installButton.classList.remove('show');
        }
        deferredPrompt = null;
    });

})();
