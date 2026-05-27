// Auth.js - Xử lý đăng nhập và đăng ký

// Ưu tiên APP_CONFIG từ config.js (native Capacitor app dùng ngrok/production URL)
// Fallback về location-based URL khi chạy trên trình duyệt thường
const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)
    ? window.APP_CONFIG.API_BASE_URL
    : `${window.location.protocol}//${window.location.host}/api`;
let googleInitPromise = null;

// Lưu session/tokens
function persistSession(user, token, remember = true) {
    if (remember) {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
    } else {
        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('token', token);
    }
}

// Toggle between login and register forms
function showRegister() {
    document.getElementById('login-form-container').classList.add('hidden');
    document.getElementById('register-form-container').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('register-form-container').classList.add('hidden');
    document.getElementById('login-form-container').classList.remove('hidden');
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password i');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.classList.remove('fa-eye');
        button.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        button.classList.remove('fa-eye-slash');
        button.classList.add('fa-eye');
    }
}

// Password strength checker
function checkPasswordStrength(password) {
    const strengthIndicator = document.getElementById('password-strength');
    if (!strengthIndicator) return;
    
    // Remove all classes
    strengthIndicator.className = 'password-strength';
    
    if (password.length === 0) {
        return;
    }
    
    let strength = 0;
    
    // Length check
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    
    // Character variety
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    if (strength <= 2) {
        strengthIndicator.classList.add('weak');
    } else if (strength <= 4) {
        strengthIndicator.classList.add('medium');
    } else {
        strengthIndicator.classList.add('strong');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    }[type] || 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Handle Login
async function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const remember = form.querySelector('input[name="remember"]').checked;
    
    // Validation
    if (!email || !password) {
        showToast('Vui lòng điền đầy đủ thông tin', 'warning');
        return;
    }
    
    if (!isValidEmail(email)) {
        showToast('Email không hợp lệ', 'error');
        return;
    }
    
    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = '<i class="fas fa-spinner"></i> Đang đăng nhập...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, remember })
        });
        
        const data = await response.json();
        
        if (data.success) {
            persistSession(data.user, data.token, remember);
            showToast('Đăng nhập thành công!', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showToast(data.message || 'Đăng nhập thất bại', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Lỗi kết nối server', 'error');
    } finally {
        // Reset button
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Đăng nhập';
    }
}

// Handle Register
async function handleRegister(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const fullname = document.getElementById('register-fullname').value.trim();
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const termsAccepted = form.querySelector('input[name="terms"]').checked;
    
    // Validation
    if (!fullname || !username || !email || !password || !confirmPassword) {
        showToast('Vui lòng điền đầy đủ thông tin', 'warning');
        return;
    }
    
    if (!isValidEmail(email)) {
        showToast('Email không hợp lệ', 'error');
        return;
    }
    
    if (username.length < 3) {
        showToast('Tên đăng nhập phải có ít nhất 3 ký tự', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Mật khẩu phải có ít nhất 6 ký tự', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Mật khẩu xác nhận không khớp', 'error');
        return;
    }
    
    if (!termsAccepted) {
        showToast('Vui lòng đồng ý với điều khoản sử dụng', 'warning');
        return;
    }
    
    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = '<i class="fas fa-spinner"></i> Đang đăng ký...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: fullname,
                username,
                email,
                password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
            
            // Switch to login form after short delay
            setTimeout(() => {
                showLogin();
                // Pre-fill email
                document.getElementById('login-email').value = email;
            }, 1500);
        } else {
            showToast(data.message || 'Đăng ký thất bại', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showToast('Lỗi kết nối server', 'error');
    } finally {
        // Reset button
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Đăng ký';
    }
}

// Chờ script Google Identity Services sẵn sàng
function waitForGoogleLibrary(timeout = 7000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const interval = setInterval(() => {
            if (window.google && window.google.accounts && window.google.accounts.id) {
                clearInterval(interval);
                resolve();
            } else if (Date.now() - start > timeout) {
                clearInterval(interval);
                reject(new Error('Google Identity Services không tải kịp thời'));
            }
        }, 50);
    });
}

// Xử lý credential trả về từ Google
async function handleGoogleCredential(response) {
    const credential = response?.credential;
    if (!credential) {
        showToast('Không nhận được mã Google', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id_token: credential })
        });

        const data = await res.json();

        if (data.success) {
            persistSession(data.user, data.token, true);
            showToast('Đăng nhập Google thành công', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        } else {
            showToast(data.message || 'Đăng nhập Google thất bại', 'error');
        }
    } catch (error) {
        console.error('Google login error:', error);
        showToast('Lỗi kết nối Google', 'error');
    }
}

// Khởi tạo nút đăng nhập/đăng ký Google
async function initGoogleSignIn() {
    if (googleInitPromise) return googleInitPromise;

    googleInitPromise = (async () => {
        try {
            const configResponse = await fetch(`${API_BASE_URL}/auth/google-config`);
            const config = await configResponse.json();

            if (!config.success || !config.clientId) {
                throw new Error(config.message || 'Chưa cấu hình Google Client ID');
            }

            await waitForGoogleLibrary();

            google.accounts.id.initialize({
                client_id: config.clientId,
                callback: handleGoogleCredential,
                cancel_on_tap_outside: false
            });

            const loginBtn = document.getElementById('google-login-btn');
            if (loginBtn) {
                google.accounts.id.renderButton(loginBtn, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    width: 300,
                    text: 'signin_with'
                });
            }

            const registerBtn = document.getElementById('google-register-btn');
            if (registerBtn) {
                google.accounts.id.renderButton(registerBtn, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    width: 300,
                    text: 'signup_with'
                });
            }

            // Kích hoạt One Tap nếu có
            google.accounts.id.prompt();
        } catch (error) {
            console.error('Google init failed:', error);
            showToast(error.message || 'Không thể khởi tạo đăng nhập Google', 'error');
        }
    })();

    return googleInitPromise;
}

// Check if user is already logged in
function checkAuth() {
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (user) {
        // Already logged in, redirect to dashboard
        window.location.href = 'dashboard.html';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check auth status
    checkAuth();

    // Kiểm tra xem có đang chạy trong App WebView không thông qua cookie hoặc Bridge
    const isApp = document.cookie.includes('viewappmobie=true') || (window.FlutterBridge !== undefined);
    
    if (isApp) {
        console.log('[Auth] Đang chạy trong App di động -> Dùng Đăng nhập Google Native (Gốc)');
        const loginBtn = document.getElementById('google-login-btn');
        if (loginBtn) {
            // Thay thế bằng nút bấm HTML đẹp giống hệt nút Google Web nhưng tự tạo để bắt click
            loginBtn.innerHTML = `
                <button type="button" class="btn-native-google" style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 300px;
                    height: 44px;
                    background-color: #ffffff;
                    border: 1px solid #dadce0;
                    border-radius: 4px;
                    box-shadow: none;
                    cursor: pointer;
                    font-family: Roboto, Arial, sans-serif;
                    font-size: 14px;
                    font-weight: 500;
                    color: #3c4043;
                    padding: 0 12px;
                    margin: 0 auto;
                    transition: background-color .218s, border-color .218s;
                ">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 48 48" style="margin-right: 10px;">
                        <g>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                            <path fill="#4285F4" d="M46.5 24c0-1.63-.15-3.2-.43-4.75H24v9h12.75c-.55 3-2.25 5.54-4.8 7.25l7.46 5.78C43.79 36.39 46.5 30.83 46.5 24z"></path>
                            <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"></path>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.46-5.78c-2.2 1.47-5.02 2.34-8.43 2.34-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        </g>
                    </svg>
                    <span>Đăng nhập bằng Google</span>
                </button>
            `;
            
            loginBtn.querySelector('button').addEventListener('click', () => {
                console.log('[Auth] Kích hoạt Đăng nhập Google Native qua Flutter Bridge...');
                window.FlutterBridge.postMessage('GOOGLE_LOGIN');
            });
        }
    } else {
        // Khởi tạo Google Sign-In trên trình duyệt thông thường
        initGoogleSignIn();
    }
    
    // Attach form handlers
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Password strength checker
    const passwordInput = document.getElementById('register-password');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            checkPasswordStrength(e.target.value);
        });
    }
    
    // Real-time password match validation
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', (e) => {
            const password = document.getElementById('register-password').value;
            if (e.target.value && e.target.value !== password) {
                e.target.classList.add('invalid');
                e.target.classList.remove('valid');
            } else if (e.target.value === password) {
                e.target.classList.add('valid');
                e.target.classList.remove('invalid');
            }
        });
    }
});

// Logout function (can be called from main app)
function logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    window.location.href = 'auth.html';
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { logout, checkAuth };
}
