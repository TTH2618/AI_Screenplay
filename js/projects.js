/**
 * AI Screenplay - Projects Page JavaScript
 * Shared helpers (auth, modals, payment) used by projects.html.
 * Does NOT contain the dashboard-specific DOMContentLoaded logic.
 */

const API_BASE_URL = `${window.location.protocol}//${window.location.host}/api`;

let PLAN_PACKAGES = {
    pro_1m: { id: 'pro_1m', name: 'PRO 1 tháng', months: 1, price: 199000 },
    pro_3m: { id: 'pro_3m', name: 'PRO 3 tháng', months: 3, price: 250000 },
    pro_1y: { id: 'pro_1y', name: 'PRO 1 năm', months: 12, price: 800000 }
};

function getAuthHeaders() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Auth ───────────────────────────────────────────────────────────────────

async function checkAuth() {
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!user) { window.location.href = 'auth.html'; return false; }
    try {
        const userData = JSON.parse(user);
        applyUserToHeader(userData);
        renderSubscription(userData);
        await refreshCurrentUser();
        return true;
    } catch (e) {
        console.error('Error parsing user data:', e);
        doLogout();
        return false;
    }
}

function applyUserToHeader(userData) {
    const name = userData.full_name || userData.username || 'Người dùng';
    const elName = document.getElementById('userName');
    if (elName) elName.textContent = name;

    const badge = document.getElementById('userPlanBadgeNavbar');
    if (badge) {
        if (isProActive(userData)) {
            badge.textContent = 'PRO';
            badge.className = 'user-plan-badge pro';
        } else {
            badge.textContent = 'FREE';
            badge.className = 'user-plan-badge free';
        }
    }

    const adminLink = document.getElementById('adminMenuLink');
    if (adminLink) adminLink.style.display = userData.is_admin ? 'flex' : 'none';
}

function isProActive(userData) {
    if (!userData || userData.plan_type !== 'pro') return false;
    if (!userData.pro_expires_at) return true;
    return new Date(userData.pro_expires_at) > new Date();
}

function formatVnd(amount) {
    return Number(amount || 0).toLocaleString('vi-VN');
}

function formatExpiry(dateValue) {
    if (!dateValue) return 'không thời hạn';
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return 'không xác định';
    return d.toLocaleDateString('vi-VN');
}

function renderSubscription(userData) {
    const badge = document.getElementById('planStatusBadge');
    const description = document.getElementById('planDescription');
    const navBtn = document.getElementById('upgradeNavBtn');
    const navLabel = document.getElementById('upgradeNavLabel');
    if (!badge || !description) return;

    const proActive = isProActive(userData);
    if (proActive) {
        badge.textContent = 'PRO';
        badge.className = 'plan-badge pro';
        description.textContent = `Bạn đang dùng gói PRO đến ${formatExpiry(userData.pro_expires_at)}. Tài khoản PRO được dùng AI không giới hạn.`;
        if (navBtn) navBtn.classList.add('pro-active');
        if (navLabel) navLabel.textContent = 'Gia hạn PRO';
    } else {
        badge.textContent = 'FREE';
        badge.className = 'plan-badge free';
        description.textContent = 'Tài khoản Free: tối đa 10 lượt AI/ngày. PRO: không giới hạn lượt dùng.';
        if (navBtn) navBtn.classList.remove('pro-active');
        if (navLabel) navLabel.textContent = 'Nâng cấp PRO';
    }

    document.querySelectorAll('.btn-package').forEach((btn) => {
        btn.disabled = false;
        const packageId = btn.dataset.package;
        const packageInfo = PLAN_PACKAGES[packageId];
        if (!packageInfo) return;
        btn.textContent = proActive
            ? `Gia hạn ${packageInfo.name} (${formatVnd(packageInfo.price)}đ)`
            : `Nâng cấp ${formatVnd(packageInfo.price)}đ`;
    });
}

async function refreshCurrentUser() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!data.success || !data.user) return;

        const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
        storage.setItem('user', JSON.stringify(data.user));
        applyUserToHeader(data.user);
        renderSubscription(data.user);
        if (data.user.avatar) updateNavbarAvatar(data.user.avatar);
    } catch (error) {
        console.error('Error refreshing current user:', error);
    }
}

// ─── Navigation ──────────────────────────────────────────────────────────────

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) menu.classList.toggle('active');
}

document.addEventListener('click', (e) => {
    const userDropdown = document.querySelector('.user-dropdown');
    const menu = document.getElementById('userMenu');
    if (userDropdown && menu && !userDropdown.contains(e.target)) {
        menu.classList.remove('active');
    }
});

function doLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    window.location.href = 'auth.html';
}

function handleLogout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) doLogout();
}

// ─── Navigation helpers ───────────────────────────────────────────────────────

function openProject(projectId) {
    sessionStorage.setItem('openProject', projectId);
    window.location.href = 'index.html';
}

function startNewProject() {
    sessionStorage.setItem('newProject', 'true');
    window.location.href = 'index.html';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ─── Upgrade Modal ────────────────────────────────────────────────────────────

function openUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    if (!modal) return;
    modal.classList.add('active');
    const menu = document.getElementById('userMenu');
    if (menu) menu.classList.remove('active');
}

function closeUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    if (!modal) return;
    modal.classList.remove('active');
}

async function upgradePlan(packageId) {
    const packageInfo = PLAN_PACKAGES[packageId];
    if (!packageInfo) { showToast('Gói nâng cấp không hợp lệ', 'error'); return; }

    document.querySelectorAll('.btn-package').forEach(btn => { btn.disabled = true; });
    showPaymentLoading();

    try {
        const response = await fetch(`${API_BASE_URL}/payment/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ package_id: packageId })
        });
        const data = await response.json();
        hidePaymentLoading();
        if (data.success && data.data) {
            closeUpgradeModal();
            submitSePayForm(data.data);
        } else {
            showToast(data.message || 'Không thể tạo đơn thanh toán', 'error');
        }
    } catch (error) {
        console.error('Error creating payment:', error);
        hidePaymentLoading();
        showToast('Lỗi kết nối server', 'error');
    } finally {
        document.querySelectorAll('.btn-package').forEach(btn => { btn.disabled = false; });
    }
}

window.upgradePlan = upgradePlan;
window.openUpgradeModal = openUpgradeModal;
window.closeUpgradeModal = closeUpgradeModal;

// ─── Profile Modal ────────────────────────────────────────────────────────────

async function openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;
    modal.classList.add('active');
    const menu = document.getElementById('userMenu');
    if (menu) menu.classList.remove('active');
    switchTab('profile');

    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
        });
        const data = await response.json();
        if (data.success) {
            const u = data.user;
            document.getElementById('profileFullName').value = u.full_name || '';
            document.getElementById('profileUsername').value = u.username || '';
            document.getElementById('profileGender').value = u.gender || '';
            document.getElementById('profileDob').value = u.date_of_birth ? u.date_of_birth.split('T')[0] : '';
            document.getElementById('profilePhone').value = u.phone || '';
            document.getElementById('profileEmail').value = u.email || '';

            const avatarImg = document.getElementById('avatarImage');
            const avatarIcon = document.querySelector('#avatarPreview > i');
            if (u.avatar) {
                avatarImg.src = u.avatar;
                avatarImg.style.display = 'block';
                if (avatarIcon) avatarIcon.style.display = 'none';
            } else {
                avatarImg.style.display = 'none';
                if (avatarIcon) avatarIcon.style.display = '';
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.remove('active');
    const pwForm = document.getElementById('passwordForm');
    if (pwForm) pwForm.reset();
    const strengthEl = document.getElementById('passwordStrength');
    if (strengthEl) strengthEl.innerHTML = '';
}

function switchTab(tab) {
    const profileContent = document.getElementById('tabContentProfile');
    const passwordContent = document.getElementById('tabContentPassword');
    const paymentHistoryContent = document.getElementById('tabContentPaymentHistory');
    const tabProfile = document.getElementById('tabProfile');
    const tabPassword = document.getElementById('tabPassword');
    const tabPaymentHistory = document.getElementById('tabPaymentHistory');

    [profileContent, passwordContent, paymentHistoryContent].forEach(el => { if (el) el.style.display = 'none'; });
    [tabProfile, tabPassword, tabPaymentHistory].forEach(el => { if (el) el.classList.remove('active'); });

    if (tab === 'profile') {
        if (profileContent) profileContent.style.display = '';
        if (tabProfile) tabProfile.classList.add('active');
    } else if (tab === 'password') {
        if (passwordContent) passwordContent.style.display = '';
        if (tabPassword) tabPassword.classList.add('active');
    } else if (tab === 'paymentHistory') {
        if (paymentHistoryContent) paymentHistoryContent.style.display = '';
        if (tabPaymentHistory) tabPaymentHistory.classList.add('active');
        loadPaymentHistory();
    }
}

async function handleProfileUpdate(event) {
    event.preventDefault();
    const btn = document.getElementById('profileSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

    const body = {
        full_name: document.getElementById('profileFullName').value.trim(),
        username: document.getElementById('profileUsername').value.trim(),
        gender: document.getElementById('profileGender').value || null,
        date_of_birth: document.getElementById('profileDob').value || null,
        phone: document.getElementById('profilePhone').value.trim() || null
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (data.success) {
            const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
            storage.setItem('user', JSON.stringify(data.user));
            const name = data.user.full_name || data.user.username || 'Người dùng';
            const elName = document.getElementById('userName');
            if (elName) elName.textContent = name;
            updateNavbarAvatar(data.user.avatar);
            showToast('Cập nhật thông tin thành công!');
            closeProfileModal();
        } else {
            showToast(data.message || 'Cập nhật thất bại', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Lỗi kết nối server', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Lưu thay đổi';
    }
}

function triggerAvatarPick() {
    if (typeof FlutterBridge !== 'undefined' && typeof window.flutterPickImage === 'function') {
        window.flutterPickImage(function(result) {
            if (!result) return;
            handleAvatarUploadFromBase64(result);
        });
    } else {
        const input = document.getElementById('avatarInput');
        if (input) input.click();
    }
}

async function handleAvatarUploadFromBase64(result) {
    try {
        showToast('Đang tải ảnh lên...', 'info');
        const byteCharacters = atob(result.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: result.mimeType });
        if (blob.size > 2 * 1024 * 1024) { showToast('File ảnh không được vượt quá 2MB', 'error'); return; }

        const formData = new FormData();
        formData.append('avatar', blob, result.fileName || 'avatar.jpg');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData
        });
        const data = await response.json();
        if (data.success) {
            const avatarImg = document.getElementById('avatarImage');
            const avatarIcon = document.querySelector('#avatarPreview > i');
            avatarImg.src = data.user.avatar + '?t=' + Date.now();
            avatarImg.style.display = 'block';
            if (avatarIcon) avatarIcon.style.display = 'none';
            const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
            const user = JSON.parse(storage.getItem('user'));
            user.avatar = data.user.avatar;
            storage.setItem('user', JSON.stringify(user));
            updateNavbarAvatar(data.user.avatar);
            showToast('Cập nhật ảnh đại diện thành công!');
        } else {
            showToast(data.message || 'Upload thất bại', 'error');
        }
    } catch (error) {
        console.error('Error uploading avatar from base64:', error);
        showToast('Lỗi kết nối server', 'error');
    }
}

async function handleAvatarUploadFromInput(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('File ảnh không được vượt quá 2MB', 'error'); return; }

    const formData = new FormData();
    formData.append('avatar', file);
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData
        });
        const data = await response.json();
        if (data.success) {
            const avatarImg = document.getElementById('avatarImage');
            const avatarIcon = document.querySelector('#avatarPreview > i');
            avatarImg.src = data.user.avatar + '?t=' + Date.now();
            avatarImg.style.display = 'block';
            if (avatarIcon) avatarIcon.style.display = 'none';
            const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
            const user = JSON.parse(storage.getItem('user'));
            user.avatar = data.user.avatar;
            storage.setItem('user', JSON.stringify(user));
            updateNavbarAvatar(data.user.avatar);
            showToast('Cập nhật ảnh đại diện thành công!');
        } else {
            showToast(data.message || 'Upload thất bại', 'error');
        }
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showToast('Lỗi kết nối server', 'error');
    }
    event.target.value = '';
}

function updateNavbarAvatar(avatarUrl) {
    const avatarDiv = document.querySelector('.user-avatar');
    if (avatarDiv && avatarUrl) {
        avatarDiv.innerHTML = `<img src="${avatarUrl}?t=${Date.now()}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

async function handlePasswordChange(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword.length < 6) { showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'error'); return; }
    if (newPassword !== confirmPassword) { showToast('Xác nhận mật khẩu không khớp', 'error'); return; }

    const btn = document.getElementById('passwordSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    try {
        const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await response.json();
        if (data.success) {
            showToast('Đổi mật khẩu thành công!');
            closeProfileModal();
        } else {
            showToast(data.message || 'Đổi mật khẩu thất bại', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showToast('Lỗi kết nối server', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-lock"></i> Đổi mật khẩu';
    }
}

// Password strength checker
document.addEventListener('DOMContentLoaded', () => {
    const newPwInput = document.getElementById('newPassword');
    if (newPwInput) {
        newPwInput.addEventListener('input', () => {
            const val = newPwInput.value;
            const strengthEl = document.getElementById('passwordStrength');
            if (!strengthEl) return;
            if (!val) { strengthEl.innerHTML = ''; return; }
            let score = 0;
            if (val.length >= 6) score++;
            if (val.length >= 8) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;
            const levels = [
                { label: 'Rất yếu', cls: 'strength-weak' },
                { label: 'Yếu', cls: 'strength-weak' },
                { label: 'Trung bình', cls: 'strength-medium' },
                { label: 'Mạnh', cls: 'strength-strong' },
                { label: 'Rất mạnh', cls: 'strength-strong' }
            ];
            const level = levels[Math.min(score, 4)];
            strengthEl.innerHTML = `<span class="${level.cls}">${level.label}</span>`;
        });
    }
});

// Close modals on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
});

// Load navbar avatar from storage
document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (user) {
        try { const ud = JSON.parse(user); if (ud.avatar) updateNavbarAvatar(ud.avatar); } catch (e) {}
    }
    // Load plan prices
    fetch(`${API_BASE_URL}/payment/prices`)
        .then(r => r.json())
        .then(priceData => {
            if (priceData.success && priceData.data) {
                const p = priceData.data;
                const fmt = n => Number(n).toLocaleString('vi-VN') + 'đ';
                if (p.pro_1m) { PLAN_PACKAGES.pro_1m.price = p.pro_1m; const el = document.getElementById('price_display_pro_1m'); if (el) el.textContent = fmt(p.pro_1m); }
                if (p.pro_3m) { PLAN_PACKAGES.pro_3m.price = p.pro_3m; const el = document.getElementById('price_display_pro_3m'); if (el) el.textContent = fmt(p.pro_3m); }
                if (p.pro_1y) { PLAN_PACKAGES.pro_1y.price = p.pro_1y; const el = document.getElementById('price_display_pro_1y'); if (el) el.textContent = fmt(p.pro_1y); }
            }
        })
        .catch(() => {});
});

// ─── Payment helpers ──────────────────────────────────────────────────────────

function showPaymentLoading() {
    const overlay = document.getElementById('paymentLoadingOverlay');
    if (overlay) overlay.classList.add('active');
}

function hidePaymentLoading() {
    const overlay = document.getElementById('paymentLoadingOverlay');
    if (overlay) overlay.classList.remove('active');
}

function showPaymentResult(type, title, message, details) {
    const overlay = document.getElementById('paymentResultOverlay');
    const card = document.getElementById('paymentResultCard');
    if (!overlay || !card) return;
    const iconMap = {
        success: { icon: 'fas fa-check', cls: 'success' },
        error: { icon: 'fas fa-times', cls: 'error' },
        pending: { icon: 'fas fa-clock', cls: 'pending' }
    };
    const iconInfo = iconMap[type] || iconMap.pending;
    let detailsHtml = '';
    if (details) {
        detailsHtml = `<div class="payment-result-details">`;
        for (const [label, value] of Object.entries(details)) {
            detailsHtml += `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${value}</span></div>`;
        }
        detailsHtml += `</div>`;
    }
    card.innerHTML = `
        <div class="payment-result-icon ${iconInfo.cls}"><i class="${iconInfo.icon}"></i></div>
        <h3>${title}</h3>
        <p>${message}</p>
        ${detailsHtml}
        <div class="payment-result-actions">
            <button class="btn-payment-close primary" onclick="closePaymentResult()">Đóng</button>
        </div>
    `;
    overlay.classList.add('active');
}

function closePaymentResult() {
    const overlay = document.getElementById('paymentResultOverlay');
    if (overlay) overlay.classList.remove('active');
    const url = new URL(window.location);
    ['payment', 'orderCode', 'code', 'id', 'cancel', 'status'].forEach(k => url.searchParams.delete(k));
    window.history.replaceState({}, '', url);
}
window.closePaymentResult = closePaymentResult;

function submitSePayForm(paymentData) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentData.checkoutUrl;
    form.style.display = 'none';
    const fields = paymentData.formFields || {};
    Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value != null ? String(value) : '';
        form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
}

async function loadPaymentHistory() {
    const container = document.getElementById('paymentHistoryContainer');
    if (!container) return;
    container.innerHTML = `<div class="payment-history-empty"><i class="fas fa-spinner fa-spin"></i><p>Đang tải...</p></div>`;
    try {
        const response = await fetch(`${API_BASE_URL}/payment/history`, {
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
        });
        const data = await response.json();
        if (!data.success || !data.data || data.data.length === 0) {
            container.innerHTML = `<div class="payment-history-empty"><i class="fas fa-receipt"></i><p>Chưa có lịch sử thanh toán nào</p></div>`;
            return;
        }
        const statusMap = {
            paid: { label: 'Đã thanh toán', cls: 'paid' },
            pending: { label: 'Chờ thanh toán', cls: 'pending' },
            cancelled: { label: 'Đã hủy', cls: 'cancelled' },
            expired: { label: 'Hết hạn', cls: 'expired' }
        };
        const rows = data.data.map(order => {
            const pkg = PLAN_PACKAGES[order.package_id];
            const status = statusMap[order.status] || statusMap.pending;
            const date = new Date(order.created_at).toLocaleDateString('vi-VN', {
                year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
            });
            return `<tr>
                <td>${pkg?.name || order.package_id}</td>
                <td class="payment-amount">${formatVnd(order.amount)}đ</td>
                <td><span class="payment-status-badge ${status.cls}">${status.label}</span></td>
                <td>${date}</td>
            </tr>`;
        }).join('');
        container.innerHTML = `
            <table class="payment-history-table">
                <thead><tr><th>Gói</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
    } catch (error) {
        console.error('Error loading payment history:', error);
        container.innerHTML = `<div class="payment-history-empty"><i class="fas fa-exclamation-triangle"></i><p>Lỗi tải lịch sử thanh toán</p></div>`;
    }
}
window.loadPaymentHistory = loadPaymentHistory;
