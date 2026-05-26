const API_BASE = `${window.location.protocol}//${window.location.host}/api/admin`;
const TOKEN = localStorage.getItem('token') || sessionStorage.getItem('token');
const USER = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');

const TOOL_IDS = [
    'logline', 'theme', 'character', 'synopsis', 'structure', 'beatsheet', 'scenelist', 'script',
    'story_theme', 'story_character', 'story_synopsis', 'story_structure', 'story_beatsheet', 'story_scenelist', 'story_script'
];

let promptCache = [];

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TOKEN}`
    };
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    location.href = 'auth.html';
}

function goDashboard() {
    location.href = 'dashboard.html';
}

async function api(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: authHeaders(),
        ...opts
    });

    const data = await res.json();
    if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
            alert(data.message || 'Bạn không có quyền truy cập Admin');
            location.href = 'dashboard.html';
            throw new Error('Unauthorized');
        }
        throw new Error(data.message || 'API error');
    }
    return data;
}

function setupTabs() {
    document.querySelectorAll('.tab').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });
}

function renderStats(data) {
    window.lastOverviewData = data;
    const stats = document.getElementById('overviewStats');
    const totalUsers = Number(data.users.total || 0);
    const proUsers = Number(data.users.pro_total || 0);
    stats.innerHTML = `
        <div class="stat-card"><h4>Tổng tài khoản</h4><b>${totalUsers}</b></div>
        <div class="stat-card"><h4>Đăng ký hôm nay</h4><b>${data.users.new_today}</b></div>
        <div class="stat-card"><h4>Tổng dự án</h4><b>${data.resources.total_projects}</b></div>
        <div class="stat-card"><h4>Tổng nội dung AI</h4><b>${data.resources.total_ai_contents}</b></div>
        <div class="stat-card"><h4>Tài khoản PRO đang hoạt động</h4><b>${proUsers}</b></div>
        <div class="stat-card"><h4>Đăng ký tháng này</h4><b>${data.users.new_month}</b></div>
    `;
    drawAccountPieChart(totalUsers, proUsers);
}

function drawAccountPieChart(totalUsers, proUsers) {
    const canvas = document.getElementById('accountPieChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.clientWidth;
    const compact = w < 560;
    const h = canvas.height = compact ? 340 : 280;

    ctx.clearRect(0, 0, w, h);
    const safeTotal = Math.max(Number(totalUsers || 0), 0);
    const safePro = Math.min(Math.max(Number(proUsers || 0), 0), safeTotal);
    const nonPro = Math.max(safeTotal - safePro, 0);

    if (safeTotal === 0) {
        ctx.fillStyle = '#5b7694';
        ctx.font = '14px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('Chưa có dữ liệu tài khoản', w / 2, h / 2);
        return;
    }

    const cx = compact ? w / 2 : Math.min(170, w * 0.35);
    const cy = compact ? 126 : h / 2;
    const radius = Math.min(94, h * 0.36);

    const proAngle = (safePro / safeTotal) * Math.PI * 2;

    // PRO slice
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + proAngle);
    ctx.closePath();
    ctx.fillStyle = '#1f6ed4';
    ctx.fill();

    // Non-PRO slice
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, -Math.PI / 2 + proAngle, -Math.PI / 2 + Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#dbe9fb';
    ctx.fill();

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Center label
    ctx.fillStyle = '#12263f';
    ctx.font = 'bold 18px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(`${safeTotal}`, cx, cy - 6);
    ctx.font = '13px Segoe UI';
    ctx.fillStyle = '#5b7694';
    ctx.fillText('Tổng TK', cx, cy + 16);

    // Legend and details
    const legendX = compact ? Math.max(14, (w - 230) / 2) : Math.max(280, w * 0.55);
    const legendY = compact ? (cy + radius + 20) : (cy - 30);
    const proPct = ((safePro / safeTotal) * 100).toFixed(1);
    const nonProPct = ((nonPro / safeTotal) * 100).toFixed(1);

    ctx.textAlign = 'left';
    ctx.font = '14px Segoe UI';

    ctx.fillStyle = '#1f6ed4';
    ctx.fillRect(legendX, legendY, 12, 12);
    ctx.fillStyle = '#12263f';
    ctx.fillText(`PRO: ${safePro} (${proPct}%)`, legendX + 18, legendY + 11);

    ctx.fillStyle = '#dbe9fb';
    ctx.fillRect(legendX, legendY + 26, 12, 12);
    ctx.fillStyle = '#12263f';
    ctx.fillText(`FREE: ${nonPro} (${nonProPct}%)`, legendX + 18, legendY + 37);
}

function userRow(u) {
    const isBanned = u.account_status === 'banned';
    return `
        <tr>
            <td data-label="ID">${u.id}</td>
            <td data-label="User">${u.username}</td>
            <td data-label="Email">${u.email}</td>
            <td data-label="Plan">
                <select id="plan-${u.id}">
                    <option value="free" ${u.plan_type === 'free' ? 'selected' : ''}>Free</option>
                    <option value="pro" ${u.plan_type === 'pro' ? 'selected' : ''}>PRO</option>
                </select>
            </td>
            <td data-label="Hết hạn PRO"><input id="exp-${u.id}" type="datetime-local" value="${u.pro_expires_at ? new Date(u.pro_expires_at).toISOString().slice(0,16) : ''}"></td>
            <td data-label="Trạng thái">
                <select id="status-${u.id}">
                    <option value="active" ${!isBanned ? 'selected' : ''}>Active</option>
                    <option value="banned" ${isBanned ? 'selected' : ''}>Banned</option>
                </select>
            </td>
            <td data-label="Admin"><input id="admin-${u.id}" type="checkbox" ${u.is_admin ? 'checked' : ''}></td>
            <td data-label="Hành động"><button class="btn primary" onclick="saveUser(${u.id})">Lưu</button></td>
        </tr>
    `;
}

async function loadUsers(query = '') {
    const data = await api(`/users${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    document.getElementById('usersTable').innerHTML = data.data.map(userRow).join('');
}

async function saveUser(id) {
    const plan = document.getElementById(`plan-${id}`).value;
    const exp = document.getElementById(`exp-${id}`).value;
    const status = document.getElementById(`status-${id}`).value;
    const isAdmin = document.getElementById(`admin-${id}`).checked;

    await api(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
            plan_type: plan,
            pro_expires_at: exp || null,
            account_status: status,
            is_admin: isAdmin
        })
    });
    alert('Đã cập nhật người dùng');
    await loadUsers();
}

async function loadLogs() {
    const data = await api('/generation-logs');
    const rows = data.data.map((x) => `
        <tr>
            <td data-label="Thời gian">${new Date(x.created_at).toLocaleString('vi-VN')}</td>
            <td data-label="User">${x.user_id || '-'}</td>
            <td data-label="Project">${x.project_id || '-'}</td>
            <td data-label="Tool">${x.tool_id}</td>
            <td data-label="Provider">${x.provider}</td>
            <td data-label="Latency">${x.latency_ms} ms</td>
            <td data-label="Status"><span class="badge ${x.status === 'success' ? 'success' : 'error'}">${x.status}</span></td>
            <td data-label="Lỗi">${x.error_type || '-'}</td>
        </tr>
    `).join('');
    document.getElementById('logsTable').innerHTML = rows;
}

async function loadSettings() {
    const [promptRes, keyRes] = await Promise.all([api('/system-prompts'), api('/api-keys')]);
    promptCache = promptRes.data || [];

    const sel = document.getElementById('promptTool');
    sel.innerHTML = TOOL_IDS.map((toolId) => `<option value="${toolId}">${toolId}</option>`).join('');
    sel.addEventListener('change', fillPromptEditor);
    fillPromptEditor();

    document.getElementById('apiKeyList').innerHTML = (keyRes.data || []).map((x) => (
        `<p><b>${x.provider}</b>: <code>${x.api_key_masked}</code> <span>${new Date(x.updated_at).toLocaleString('vi-VN')}</span></p>`
    )).join('');

    await loadPaymentSettings();
    await loadPlanPrices();
}

function fillPromptEditor() {
    const toolId = document.getElementById('promptTool').value;
    const found = promptCache.find((x) => x.tool_id === toolId);
    document.getElementById('promptText').value = found ? found.prompt_text : '';
}

async function savePrompt() {
    const toolId = document.getElementById('promptTool').value;
    const promptText = document.getElementById('promptText').value.trim();
    if (!promptText) return alert('Prompt không được để trống');

    await api(`/system-prompts/${toolId}`, {
        method: 'PUT',
        body: JSON.stringify({ prompt_text: promptText })
    });
    alert('Đã lưu system prompt');
    await loadSettings();
}

async function saveApiKey() {
    const provider = document.getElementById('apiProvider').value.trim();
    const key = document.getElementById('apiKeyValue').value.trim();
    if (!provider || !key) return alert('Vui lòng nhập đầy đủ provider và key');

    await api(`/api-keys/${encodeURIComponent(provider)}`, {
        method: 'PUT',
        body: JSON.stringify({ api_key: key })
    });
    alert('Đã cập nhật API key');
    document.getElementById('apiKeyValue').value = '';
    await loadSettings();
}

async function loadPaymentSettings() {
    try {
        const data = await api('/payment-settings');
        const s = data.data || {};
        document.getElementById('psMerchantId').value = s.merchant_id || '';
        document.getElementById('psEnv').value = s.env || 'sandbox';
        document.getElementById('psAppUrl').value = s.app_url || '';
        // Hiển thị IPN URL dựa vào app_url đã lưu
        const appUrl = (s.app_url || window.location.origin).replace(/\/$/, '');
        const ipnEl = document.getElementById('ipnUrlDisplay');
        if (ipnEl) ipnEl.textContent = `${appUrl}/api/payment/ipn`;
        document.getElementById('paymentSettingsInfo').innerHTML = s.secret_key_masked
            ? `<p><b>Secret Key</b>: <code>${s.secret_key_masked}</code></p>`
            : '<p style="color:#5b7694;"><i>Secret Key chưa được cấu hình</i></p>';
    } catch (e) {
        document.getElementById('paymentSettingsInfo').innerHTML = '<p style="color:#dc2626;"><i>Lỗi tải cấu hình thanh toán</i></p>';
    }
}

async function savePaymentSettings() {
    const merchantId = document.getElementById('psMerchantId').value.trim();
    const secretKey = document.getElementById('psSecretKey').value.trim();
    const env = document.getElementById('psEnv').value.trim();
    const appUrl = document.getElementById('psAppUrl').value.trim();

    if (!merchantId) {
        return alert('Vui lòng nhập Merchant ID');
    }

    const body = { merchant_id: merchantId, env, app_url: appUrl };
    if (secretKey) body.secret_key = secretKey;

    await api('/payment-settings', {
        method: 'PUT',
        body: JSON.stringify(body)
    });

    alert('Đã lưu cấu hình SePay PG');
    document.getElementById('psSecretKey').value = '';
    await loadPaymentSettings();
}

function formatVnd(n) {
    if (!n && n !== 0) return '0';
    return Number(n).toLocaleString('vi-VN');
}

async function loadPlanPrices() {
    try {
        const data = await api('/plan-prices');
        const p = data.data || {};
        const pro_1m = p.pro_1m || 199000;
        const pro_3m = p.pro_3m || 250000;
        const pro_1y = p.pro_1y || 800000;
        document.getElementById('price_pro_1m').value = pro_1m;
        document.getElementById('price_pro_3m').value = pro_3m;
        document.getElementById('price_pro_1y').value = pro_1y;
        document.getElementById('price_pro_1m_display').textContent = formatVnd(pro_1m) + 'đ';
        document.getElementById('price_pro_3m_display').textContent = formatVnd(pro_3m) + 'đ';
        document.getElementById('price_pro_1y_display').textContent = formatVnd(pro_1y) + 'đ';
    } catch (e) {
        console.error('Lỗi tải giá gói:', e);
    }
}

async function savePlanPrices() {
    const pro_1m = parseInt(document.getElementById('price_pro_1m').value);
    const pro_3m = parseInt(document.getElementById('price_pro_3m').value);
    const pro_1y = parseInt(document.getElementById('price_pro_1y').value);

    if (!pro_1m || pro_1m < 1000 || !pro_3m || pro_3m < 1000 || !pro_1y || pro_1y < 1000) {
        return alert('Giá gói phải là số nguyên tối thiểu 1.000đ');
    }

    try {
        await api('/plan-prices', {
            method: 'PUT',
            body: JSON.stringify({ pro_1m, pro_3m, pro_1y })
        });
        alert('Đã cập nhật giá gói thành công');
        await loadPlanPrices();
    } catch (e) {
        alert('Lỗi: ' + e.message);
    }
}

async function loadResources() {
    const projectsRes = await api('/projects');

    document.getElementById('projectsTable').innerHTML = projectsRes.data.map((p) => (
        `<tr>
            <td data-label="ID">${p.id}</td>
            <td data-label="Tiêu đề">${p.title}</td>
            <td data-label="Người tạo">${p.user_id}</td>
            <td data-label="Ngày tạo">${new Date(p.created_at).toLocaleString('vi-VN')}</td>
        </tr>`
    )).join('');
}

const PACKAGE_NAMES = {
    pro_1m: 'PRO 1 tháng',
    pro_3m: 'PRO 3 tháng',
    pro_1y: 'PRO 1 năm'
};

const STATUS_MAP = {
    paid: { label: 'Đã thanh toán', cls: 'success' },
    pending: { label: 'Chờ TT', cls: 'warning' },
    cancelled: { label: 'Đã hủy', cls: 'error' },
    expired: { label: 'Hết hạn', cls: 'muted' }
};

function formatVnd(n) {
    return Number(n || 0).toLocaleString('vi-VN');
}

function renderPaymentSummary(summary) {
    const el = document.getElementById('paymentSummaryStats');
    if (!el) return;
    el.innerHTML = `
        <div class="stat-card"><h4>Tổng đơn</h4><b>${summary.total_orders || 0}</b></div>
        <div class="stat-card"><h4>Đã thanh toán</h4><b style="color:#16a34a">${summary.paid_orders || 0}</b></div>
        <div class="stat-card"><h4>Doanh thu</h4><b style="color:#1f6ed4">${formatVnd(summary.total_revenue)}đ</b></div>
        <div class="stat-card"><h4>Đang chờ / Đã hủy</h4><b>${summary.pending_orders || 0} / ${summary.cancelled_orders || 0}</b></div>
    `;
}

function paymentRow(p) {
    const st = STATUS_MAP[p.status] || STATUS_MAP.pending;
    const created = new Date(p.created_at).toLocaleString('vi-VN');
    const paid = p.paid_at ? new Date(p.paid_at).toLocaleString('vi-VN') : '-';
    return `
        <tr>
            <td data-label="Mã đơn"><code>${p.order_code}</code></td>
            <td data-label="Người dùng">${p.username || '-'}</td>
            <td data-label="Email">${p.email || '-'}</td>
            <td data-label="Gói">${PACKAGE_NAMES[p.package_id] || p.package_id}</td>
            <td data-label="Số tiền"><b>${formatVnd(p.amount)}đ</b></td>
            <td data-label="Ngày tạo">${created}</td>
            <td data-label="Ngày thanh toán">${paid}</td>
        </tr>
    `;
}

async function loadPayments(query = '') {
    try {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        params.set('status', 'paid');
        const qs = params.toString();

        const data = await api(`/payment-orders${qs ? `?${qs}` : ''}`);
        document.getElementById('paymentsTable').innerHTML = (data.data || []).map(paymentRow).join('') || '<tr><td colspan="7" style="text-align:center;color:#5b7694;padding:24px;">Chưa có giao dịch nào</td></tr>';
        renderPaymentSummary(data.summary || {});
    } catch (e) {
        console.error('loadPayments error:', e);
        document.getElementById('paymentsTable').innerHTML = `<tr><td colspan="7" style="text-align:center;color:#dc2626;padding:24px;">Lỗi tải dữ liệu: ${e.message}</td></tr>`;
    }
}

async function init() {
    if (!TOKEN || !USER) {
        location.href = 'auth.html';
        return;
    }
    document.getElementById('adminName').textContent = USER.full_name || USER.username || 'Admin';

    setupTabs();
    document.getElementById('userSearch').addEventListener('input', (e) => loadUsers(e.target.value));

    // Payment filters
    let paymentSearchTimer;
    document.getElementById('paymentSearch').addEventListener('input', (e) => {
        clearTimeout(paymentSearchTimer);
        paymentSearchTimer = setTimeout(() => {
            loadPayments(e.target.value);
        }, 300);
    });

    const overview = await api('/dashboard');
    renderStats(overview.data);
    await loadUsers();
    await loadLogs();
    await loadSettings();
    await loadResources();
    await loadPayments();
}

window.saveUser = saveUser;
window.savePrompt = savePrompt;
window.saveApiKey = saveApiKey;
window.savePaymentSettings = savePaymentSettings;
window.savePlanPrices = savePlanPrices;
window.logout = logout;
window.goDashboard = goDashboard;

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (window.lastOverviewData) {
            drawAccountPieChart(window.lastOverviewData.users.total, window.lastOverviewData.users.pro_total);
        }
    }, 150);
});

init().catch((err) => {
    console.error(err);
    alert(err.message || 'Không thể tải trang admin');
});
