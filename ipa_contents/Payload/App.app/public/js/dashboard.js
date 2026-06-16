/**
 * AI Screenplay - Dashboard JavaScript
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

// Tool names mapping
const toolNames = {
    logline: 'Tạo Logline',
    theme: 'Xác định Chủ đề',
    character: 'Mô tả Nhân vật',
    synopsis: 'Viết Synopsis',
    structure: 'Cấu trúc 4 Hồi',
    beatsheet: 'Tạo Beat Sheet',
    scenelist: 'Danh sách Cảnh',
    script: 'Viết Kịch bản'
};

const toolOrder = ['logline', 'theme', 'character', 'synopsis', 'structure', 'beatsheet', 'scenelist', 'script'];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Tải giá gói từ server (admin có thể đã chỉnh)
    try {
        const priceRes = await fetch(`${API_BASE_URL}/payment/prices`);
        const priceData = await priceRes.json();
        if (priceData.success && priceData.data) {
            const p = priceData.data;
            const fmt = (n) => Number(n).toLocaleString('vi-VN') + 'đ';
            if (p.pro_1m) {
                PLAN_PACKAGES.pro_1m.price = p.pro_1m;
                const el = document.getElementById('price_display_pro_1m');
                if (el) el.textContent = fmt(p.pro_1m);
            }
            if (p.pro_3m) {
                PLAN_PACKAGES.pro_3m.price = p.pro_3m;
                const el = document.getElementById('price_display_pro_3m');
                if (el) el.textContent = fmt(p.pro_3m);
            }
            if (p.pro_1y) {
                PLAN_PACKAGES.pro_1y.price = p.pro_1y;
                const el = document.getElementById('price_display_pro_1y');
                if (el) el.textContent = fmt(p.pro_1y);
            }
        }
    } catch (e) { /* dùng giá mặc định */ }

    const authenticated = await checkAuth();
    if (!authenticated) {
        return;
    }
    loadProjects();
    setupSearch();

    // Check payment result on page load
    await checkPaymentReturn();

    // Open upgrade modal directly when redirected from free-limit popup.
    if (sessionStorage.getItem('openUpgradeModal') === '1') {
        sessionStorage.removeItem('openUpgradeModal');
        openUpgradeModal();
    }
});

// Check authentication
async function checkAuth() {
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (!user) {
        window.location.href = 'auth.html';
        return false;
    }
    
    try {
        const userData = JSON.parse(user);
        applyUserToHeader(userData);
        renderSubscription(userData);
        await refreshCurrentUser();
        return true;
    } catch (e) {
        console.error('Error parsing user data:', e);
        handleLogout();
        return false;
    }
}

function applyUserToHeader(userData) {
    const name = userData.full_name || userData.username || 'Người dùng';
    document.getElementById('userName').textContent = name;
    document.getElementById('welcomeName').textContent = name;

    const userPlanBadge = document.getElementById('userPlanBadgeNavbar');
    if (userPlanBadge) {
        if (isProActive(userData)) {
            userPlanBadge.textContent = 'PRO';
            userPlanBadge.className = 'user-plan-badge pro';
        } else {
            userPlanBadge.textContent = 'FREE';
            userPlanBadge.className = 'user-plan-badge free';
        }
    }

    const adminLink = document.getElementById('adminMenuLink');
    if (adminLink) {
        adminLink.style.display = userData.is_admin ? 'flex' : 'none';
    }
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
        btn.textContent = proActive ? `Gia hạn ${packageInfo.name} (${formatVnd(packageInfo.price)}đ)` : `Nâng cấp ${formatVnd(packageInfo.price)}đ`;
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
        if (data.user.avatar) {
            updateNavbarAvatar(data.user.avatar);
        }
    } catch (error) {
        console.error('Error refreshing current user:', error);
    }
}

async function upgradePlan(packageId) {
    const packageInfo = PLAN_PACKAGES[packageId];
    if (!packageInfo) {
        showToast('Gói nâng cấp không hợp lệ', 'error');
        return;
    }

    const buttons = document.querySelectorAll('.btn-package');
    buttons.forEach((btn) => {
        btn.disabled = true;
    });

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
        document.querySelectorAll('.btn-package').forEach((btn) => {
            btn.disabled = false;
        });
    }
}

function openUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    if (!modal) return;
    modal.classList.add('active');
    const menu = document.getElementById('userMenu');
    if (menu) {
        menu.classList.remove('active');
    }
}

function closeUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    if (!modal) return;
    modal.classList.remove('active');
}

// Toggle user menu
function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu.classList.toggle('active');
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const userDropdown = document.querySelector('.user-dropdown');
    const menu = document.getElementById('userMenu');
    
    if (!userDropdown.contains(e.target)) {
        menu.classList.remove('active');
    }
});

// Handle logout
function handleLogout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        window.location.href = 'auth.html';
    }
}

// Load projects from database
async function loadProjects() {
    try {
        const response = await fetch(`${API_BASE_URL}/projects`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            }
        });
        const data = await response.json();
        if (response.status === 401 || response.status === 403) {
            handleLogout();
            return;
        }
        
        if (data.success && data.data.length > 0) {
            // Load steps for each project
            const projectsWithSteps = await Promise.all(
                data.data.map(async (project) => {
                    try {
                        const stepsResponse = await fetch(`${API_BASE_URL}/ai-responses/project/${project.id}`, {
                            headers: {
                                'Content-Type': 'application/json',
                                ...getAuthHeaders()
                            }
                        });
                        const stepsData = await stepsResponse.json();
                        
                        if (stepsData.success) {
                            project.steps = {};
                            stepsData.data.forEach(step => {
                                project.steps[step.tool_type] = step;
                            });
                        } else {
                            project.steps = {};
                        }
                    } catch (e) {
                        project.steps = {};
                    }
                    return project;
                })
            );
            
            renderProjects(projectsWithSteps);
            updateStats(projectsWithSteps);
        } else {
            showEmptyState();
            updateStats([]);
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        showEmptyState();
    }
}

// Render projects
function renderProjects(projects) {
    const grid = document.getElementById('projectsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (projects.length === 0) {
        showEmptyState();
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Sort by updated_at descending
    projects.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    
    // Show max 6 recent projects
    const recentProjects = projects.slice(0, 6);
    
    const projectsHTML = recentProjects.map(project => {
        const stepsCount = Object.keys(project.steps || {}).length;
        const progress = Math.round((stepsCount / 8) * 100);
        const status = getProjectStatus(project, stepsCount);
        const lastStep = getLastCompletedStep(project.steps);
        const date = formatDate(project.updated_at);
        
        return `
            <div class="project-card" onclick="openProject(${project.id})">
                <div class="project-header">
                    <div class="project-icon">
                        <i class="fas fa-film"></i>
                    </div>
                    <span class="project-status ${status.class}">${status.text}</span>
                </div>
                <h3 class="project-title">${escapeHtml(project.title || 'Dự án không tên')}</h3>
                <div class="project-meta">
                    <span><i class="fas fa-clock"></i> ${date}</span>
                    <span><i class="fas fa-tasks"></i> ${stepsCount}/8 bước</span>
                </div>
                <div class="project-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-label">
                        <!-- <span>${lastStep}</span> --!>
                        <span>${progress}%</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    grid.innerHTML = projectsHTML;
}

// Get project status
function getProjectStatus(project, stepsCount) {
    if (stepsCount >= 8) {
        return { text: 'Hoàn thành', class: 'completed' };
    } else if (stepsCount > 0) {
        return { text: 'Đang thực hiện', class: 'in-progress' };
    } else {
        return { text: 'Bản nháp', class: 'draft' };
    }
}

// Get last completed step
function getLastCompletedStep(steps) {
    if (!steps || Object.keys(steps).length === 0) {
        return 'Chưa bắt đầu';
    }
    
    let lastIndex = -1;
    Object.keys(steps).forEach(tool => {
        const index = toolOrder.indexOf(tool);
        if (index > lastIndex) {
            lastIndex = index;
        }
    });
    
    if (lastIndex >= 0) {
        return toolNames[toolOrder[lastIndex]];
    }
    
    return 'Chưa bắt đầu';
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
}

// Update stats
function updateStats(projects) {
    const total = projects.length;
    const completed = projects.filter(p => Object.keys(p.steps || {}).length >= 8).length;
    const inProgress = projects.filter(p => {
        const steps = Object.keys(p.steps || {}).length;
        return steps > 0 && steps < 8;
    }).length;
    
    let totalGenerated = 0;
    projects.forEach(p => {
        totalGenerated += Object.keys(p.steps || {}).length;
    });
    
    animateNumber('totalProjects', total);
    animateNumber('completedProjects', completed);
    animateNumber('inProgressProjects', inProgress);
    animateNumber('totalGenerated', totalGenerated);
}

// Animate number
function animateNumber(elementId, target) {
    const element = document.getElementById(elementId);
    const duration = 1000;
    const start = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * easeProgress);
        
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Show empty state
function showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    emptyState.style.display = 'block';
}

// Setup search
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const query = e.target.value.toLowerCase();
            filterProjects(query);
        }, 300));
    }
}

// Filter projects
function filterProjects(query) {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach(card => {
        const title = card.querySelector('.project-title').textContent.toLowerCase();
        if (title.includes(query)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Open tool
function openTool(toolId) {
    // Store the tool to open
    sessionStorage.setItem('openTool', toolId);
    window.location.href = 'index.html';
}



// Open project
function openProject(projectId) {
    sessionStorage.setItem('openProject', projectId);
    window.location.href = 'index.html';
}

// Start new project
function startNewProject() {
    sessionStorage.setItem('newProject', 'true');
    window.location.href = 'index.html';
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add animation to tool cards on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px'
};

const toolObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `all 0.4s ease ${index * 0.05}s`;
        toolObserver.observe(card);
    });
});

// =====================================================
// Profile & Password Management
// =====================================================

// Show toast notification
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

// Open profile modal
async function openProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.classList.add('active');
    document.getElementById('userMenu').classList.remove('active');
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
    document.getElementById('profileModal').classList.remove('active');
    document.getElementById('passwordForm').reset();
    const strengthEl = document.getElementById('passwordStrength');
    if (strengthEl) strengthEl.innerHTML = '';
}

// Switch tabs inside profile modal
function switchTab(tab) {
    const profileContent = document.getElementById('tabContentProfile');
    const passwordContent = document.getElementById('tabContentPassword');
    const paymentHistoryContent = document.getElementById('tabContentPaymentHistory');
    const tabProfile = document.getElementById('tabProfile');
    const tabPassword = document.getElementById('tabPassword');
    const tabPaymentHistory = document.getElementById('tabPaymentHistory');

    // Hide all tabs
    profileContent.style.display = 'none';
    passwordContent.style.display = 'none';
    if (paymentHistoryContent) paymentHistoryContent.style.display = 'none';
    tabProfile.classList.remove('active');
    tabPassword.classList.remove('active');
    if (tabPaymentHistory) tabPaymentHistory.classList.remove('active');

    if (tab === 'profile') {
        profileContent.style.display = '';
        tabProfile.classList.add('active');
    } else if (tab === 'password') {
        passwordContent.style.display = '';
        tabPassword.classList.add('active');
    } else if (tab === 'paymentHistory') {
        if (paymentHistoryContent) paymentHistoryContent.style.display = '';
        if (tabPaymentHistory) tabPaymentHistory.classList.add('active');
        loadPaymentHistory();
    }
}

// Handle profile update
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
            // Update stored user data
            const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
            storage.setItem('user', JSON.stringify(data.user));

            const name = data.user.full_name || data.user.username || 'Người dùng';
            document.getElementById('userName').textContent = name;
            document.getElementById('welcomeName').textContent = name;

            // Update avatar in navbar if available
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

// ===========================================================
// Avatar Upload - Hỗ trợ cả Flutter Native picker và Web input file
// ===========================================================

/**
 * Hàm khởi động chọn ảnh: tự động dùng Flutter bridge nếu chạy trong app, fallback về input file
 */
function triggerAvatarPick() {
    // Kiểm tra xem có đang chạy trong Flutter WebView không
    if (typeof FlutterBridge !== 'undefined' && typeof window.flutterPickImage === 'function') {
        // Dùng Flutter native image picker
        window.flutterPickImage(function(result) {
            if (!result) {
                console.log('[Avatar] User hủy chọn ảnh');
                return;
            }
            handleAvatarUploadFromBase64(result);
        });
    } else {
        // Fallback: trigger input file bình thường (web desktop)
        const input = document.getElementById('avatarInput');
        if (input) input.click();
    }
}

/**
 * Xử lý ảnh từ Flutter bridge (base64 data)
 */
async function handleAvatarUploadFromBase64(result) {
    try {
        showToast('Đang tải ảnh lên...', 'info');

        // Convert base64 sang Blob
        const byteCharacters = atob(result.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: result.mimeType });

        // Kiểm tra kích thước (2MB)
        if (blob.size > 2 * 1024 * 1024) {
            showToast('File ảnh không được vượt quá 2MB', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('avatar', blob, result.fileName || 'avatar.jpg');

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
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

/**
 * Fallback: xử lý upload từ <input type="file"> trên web thường
 */
async function handleAvatarUploadFromInput(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showToast('File ảnh không được vượt quá 2MB', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
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

// Update navbar avatar
function updateNavbarAvatar(avatarUrl) {
    const avatarDiv = document.querySelector('.user-avatar');
    if (avatarDiv && avatarUrl) {
        avatarDiv.innerHTML = `<img src="${avatarUrl}?t=${Date.now()}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
}

// Open password modal
function openPasswordModal() {
    document.getElementById('profileModal').classList.add('active');
    document.getElementById('userMenu').classList.remove('active');
    switchTab('password');
    document.getElementById('passwordForm').reset();
    const strengthEl = document.getElementById('passwordStrength');
    if (strengthEl) strengthEl.innerHTML = '';
}

function closePasswordModal() {
    closeProfileModal();
}

// Toggle password visibility
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

// Handle password change
async function handlePasswordChange(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword.length < 6) {
        showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast('Xác nhận mật khẩu không khớp', 'error');
        return;
    }

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

// Password strength checker for new password field
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

// Close modals when clicking overlay
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// Load navbar avatar on init
document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (user) {
        try {
            const userData = JSON.parse(user);
            if (userData.avatar) {
                updateNavbarAvatar(userData.avatar);
            }
        } catch (e) {}
    }
});

window.upgradePlan = upgradePlan;
window.openUpgradeModal = openUpgradeModal;
window.closeUpgradeModal = closeUpgradeModal;

// =====================================================
// SePay Payment System
// =====================================================

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
        <div class="payment-result-icon ${iconInfo.cls}">
            <i class="${iconInfo.icon}"></i>
        </div>
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
    // Clean URL params
    const url = new URL(window.location);
    url.searchParams.delete('payment');
    url.searchParams.delete('orderCode');
    url.searchParams.delete('code');
    url.searchParams.delete('id');
    url.searchParams.delete('cancel');
    url.searchParams.delete('status');
    window.history.replaceState({}, '', url);
}
window.closePaymentResult = closePaymentResult;

// =====================================================
// SePay PG Checkout
// =====================================================

/**
 * Tạo form ẩn với formFields từ SePay SDK và tự động submit
 * @param {{ checkoutUrl: string, formFields: Record<string, string>, orderCode: string }} paymentData
 */
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

/**
 * Xử lý khi SePay redirect người dùng về dashboard
 * URL dạng: /dashboard.html?payment=success|error|cancel&orderCode=xxx
 */
async function checkPaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const orderCode = params.get('orderCode');
    if (!paymentStatus || !orderCode) return;

    // Xóa params khỏi URL ngay lập tức
    const url = new URL(window.location);
    ['payment', 'orderCode'].forEach(k => url.searchParams.delete(k));
    window.history.replaceState({}, '', url);

    if (paymentStatus === 'success') {
        // Gọi SePay API để xác nhận thật sự, không chỉ chờ IPN
        let attempts = 0;
        const maxAttempts = 6;

        const verifyReturn = async () => {
            attempts++;
            try {
                const response = await fetch(`${API_BASE_URL}/payment/verify-return`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ orderCode })
                });
                const data = await response.json();

                if (data.success && data.data?.status === 'paid') {
                    if (data.data.user) {
                        const storage = localStorage.getItem('user') ? localStorage : sessionStorage;
                        storage.setItem('user', JSON.stringify(data.data.user));
                        applyUserToHeader(data.data.user);
                        renderSubscription(data.data.user);
                    }
                    const order = data.data.order;
                    const pkg = PLAN_PACKAGES[order?.package_id];
                    showPaymentResult('success', 'Thanh toán thành công! 🎉', 'Tài khoản đã được nâng cấp lên PRO.', {
                        'Gói': pkg?.name || order?.package_id,
                        'Số tiền': `${formatVnd(order?.amount)}đ`,
                        'Mã đơn': orderCode
                    });
                } else if (attempts < maxAttempts) {
                    // Thử lại sau 1.5s
                    setTimeout(verifyReturn, 1500);
                } else {
                    showPaymentResult('success', 'Đang xử lý thanh toán...', 'Vui lòng tải lại trang để xem cập nhật.', {
                        'Mã đơn': orderCode
                    });
                }
            } catch (e) {
                if (attempts < maxAttempts) {
                    setTimeout(verifyReturn, 1500);
                }
            }
        };

        await verifyReturn();

    } else if (paymentStatus === 'cancel') {
        showToast('Bạn đã hủy thanh toán.', 'info');
    } else if (paymentStatus === 'error') {
        showToast('Thanh toán thất bại. Vui lòng thử lại.', 'error');
    }
}

// Load payment history
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
            container.innerHTML = `
                <div class="payment-history-empty">
                    <i class="fas fa-receipt"></i>
                    <p>Chưa có lịch sử thanh toán nào</p>
                </div>
            `;
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
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });

            return `
                <tr>
                    <td>${pkg?.name || order.package_id}</td>
                    <td class="payment-amount">${formatVnd(order.amount)}đ</td>
                    <td><span class="payment-status-badge ${status.cls}">${status.label}</span></td>
                    <td>${date}</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="payment-history-table">
                <thead>
                    <tr>
                        <th>Gói</th>
                        <th>Số tiền</th>
                        <th>Trạng thái</th>
                        <th>Ngày</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading payment history:', error);
        container.innerHTML = `
            <div class="payment-history-empty">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Lỗi tải lịch sử thanh toán</p>
            </div>
        `;
    }
}
window.loadPaymentHistory = loadPaymentHistory;
