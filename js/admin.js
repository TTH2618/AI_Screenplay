const API_BASE = `${window.location.protocol}//${window.location.host}/api/admin`;
const TOKEN = localStorage.getItem('token') || sessionStorage.getItem('token');
const USER = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');


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
            showToast(data.message || 'Bạn không có quyền truy cập Admin', 'error');
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

            const tab = btn.dataset.tab;
            if (tab === 'prompt-api') loadAiConfig();
            else if (tab === 'payment-config') loadPaymentSettings();
            else if (tab === 'plan-pricing') loadPlanPrices();
            else if (tab === 'landing-page') loadLandingConfig();
            else if (tab === 'token-billing') loadTokenBilling();
            else if (tab === 'seo-config') loadSeoConfig();
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
        <div class="stat-card"><h4>Đăng ký PRO tháng này</h4><b>${data.users.pro_this_month}</b></div>
        <div class="stat-card"><h4>Tổng dự án</h4><b>${data.resources.total_projects}</b></div>
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
    const isSelf = USER && u.id === USER.id;
    const deleteBtn = isSelf ? '' : `<button class="btn danger" style="margin-left: 8px;" onclick="deleteUser(${u.id}, '${u.username}')">Xóa</button>`;
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
            <td data-label="Hết hạn PRO"><input id="exp-${u.id}" type="datetime-local" value="${u.pro_expires_at ? new Date(u.pro_expires_at).toISOString().slice(0, 16) : ''}"></td>
            <td data-label="Trạng thái">
                <select id="status-${u.id}">
                    <option value="active" ${!isBanned ? 'selected' : ''}>Active</option>
                    <option value="banned" ${isBanned ? 'selected' : ''}>Banned</option>
                </select>
            </td>
            <td data-label="Admin"><input id="admin-${u.id}" type="checkbox" ${u.is_admin ? 'checked' : ''}></td>
            <td data-label="Hành động">
                <button class="btn primary" onclick="saveUser(${u.id})">Lưu</button>
                ${deleteBtn}
            </td>
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
    showToast('Đã cập nhật người dùng', 'success');
    await loadUsers();
}

async function deleteUser(id, username) {
    if (!await showConfirm(`Bạn có chắc chắn muốn xóa người dùng "${username}"? Hành động này sẽ xóa toàn bộ dữ liệu (dự án, kịch bản, file truyện, lịch sử AI, giao dịch...) của người dùng này và KHÔNG THỂ HOÀN TÁC.`, true)) {
        return;
    }
    try {
        await api(`/users/${id}`, {
            method: 'DELETE'
        });
        showToast('Đã xóa người dùng thành công', 'success');
        await loadUsers();
    } catch (error) {
        console.error('Lỗi khi xóa người dùng:', error);
        showToast(error.message || 'Lỗi khi xóa người dùng', 'error');
    }
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

async function loadAiConfig() {
    try {
        const data = await api('/ai-config');
        const c = data.data || {};
        const configBox = document.getElementById('aiCurrentConfig');
        if (configBox) {
            configBox.innerHTML = `
                <h3 style="margin-bottom:12px;"><i class="fas fa-circle-info"></i> Cấu hình đang dùng</h3>
                <table style="border-collapse:collapse;">
                    <tr><td style="padding:5px 14px 5px 0;color:#5b7694;">Provider</td><td><b>${escapeHtml(c.provider || '—')}</b></td></tr>
                    <tr><td style="padding:5px 14px 5px 0;color:#5b7694;">Model</td><td><b>${escapeHtml(c.model || '—')}</b></td></tr>
                    <tr><td style="padding:5px 14px 5px 0;color:#5b7694;">API Key</td><td><code>${escapeHtml(c.api_key_masked || '(chưa cài)')}</code></td></tr>
                    ${c.updated_at ? `<tr><td style="padding:5px 14px 5px 0;color:#5b7694;">Cập nhật</td><td>${new Date(c.updated_at).toLocaleString('vi-VN')}</td></tr>` : ''}
                </table>`;
        }
        // Pre-fill form
        const selProvider = document.getElementById('aiProvider');
        if (selProvider && c.provider) selProvider.value = c.provider;
        const modelEl = document.getElementById('aiModel');
        if (modelEl && c.model) modelEl.value = c.model;
        onProviderChange();
    } catch (e) {
        console.error('Lỗi tải cấu hình AI:', e);
    }
}

const PROVIDER_MODELS = {
    openrouter: [
        'google/gemini-2.0-flash-001',
        'google/gemini-2.5-pro',
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3-haiku',
        'meta-llama/llama-3.3-70b-instruct',
        'deepseek/deepseek-chat',
    ],
    openai: [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-3.5-turbo',
    ],
    anthropic: [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
    ],
    google: [
        'gemini-2.0-flash-001',
        'gemini-2.5-pro',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
    ],
};

const PROVIDER_HINTS = {
    openrouter: 'OpenRouter.ai — hỗ trợ nhiều model từ OpenAI, Anthropic, Google...',
    openai: 'OpenAI API (api.openai.com)',
    anthropic: 'Anthropic API (api.anthropic.com)',
    google: 'Google AI Studio / Gemini API',
};

function onProviderChange() {
    const provider = document.getElementById('aiProvider')?.value || 'openrouter';
    const dl = document.getElementById('modelSuggestions');
    const hint = document.getElementById('aiModelHint');
    if (dl) {
        dl.innerHTML = (PROVIDER_MODELS[provider] || []).map(m => `<option value="${m}">`).join('');
    }
    if (hint) hint.textContent = PROVIDER_HINTS[provider] || '';
}

async function saveAiConfig() {
    const provider = document.getElementById('aiProvider').value.trim();
    const model = document.getElementById('aiModel').value.trim();
    const key = document.getElementById('aiKeyValue').value.trim();

    if (!provider) return showToast('Vui lòng chọn Provider', 'warning');
    if (!model) return showToast('Vui lòng nhập tên Model', 'warning');

    try {
        await api('/ai-config', {
            method: 'PUT',
            body: JSON.stringify({ provider, model, api_key: key || undefined })
        });
        document.getElementById('aiKeyValue').value = '';
        showToast('Đã lưu cấu hình AI', 'success');
        await loadAiConfig();
    } catch (e) {
        showToast('Lỗi: ' + e.message, 'error');
    }
}

async function testAiApi() {
    const btn = document.getElementById('testAiBtn');
    const result = document.getElementById('testAiResult');
    btn.disabled = true;
    result.textContent = 'Đang kiểm tra...';
    result.style.color = '#5b7694';
    try {
        const data = await api('/test-ai');
        if (data.success) {
            result.textContent = `✅ Kết nối thành công — Model: ${data.model || '?'}`;
            result.style.color = '#22c55e';
        } else {
            result.textContent = `❌ Thất bại: ${data.message || 'Lỗi không xác định'}`;
            result.style.color = '#e55';
        }
    } catch (e) {
        result.textContent = `❌ Lỗi: ${e.message}`;
        result.style.color = '#e55';
    } finally {
        btn.disabled = false;
    }
}

async function loadSettings() {
    await loadAiConfig();
    await loadPaymentSettings();
    await loadPlanPrices();
}


async function loadPaymentSettings() {
    try {
        const data = await api('/payment-settings');
        const s = data.data || {};

        const appUrl = (s.app_url || window.location.origin).replace(/\/$/, '');

        // --- SePay ---
        document.getElementById('psMerchantId').value = s.merchant_id || '';
        document.getElementById('psEnv').value = s.env || 'sandbox';
        document.getElementById('psAppUrl').value = s.app_url || '';
        const ipnEl = document.getElementById('ipnUrlDisplay');
        if (ipnEl) ipnEl.textContent = `${appUrl}/api/payment/ipn`;
        document.getElementById('paymentSettingsInfo').innerHTML = s.secret_key_masked
            ? `<p><b>Secret Key</b>: <code>${s.secret_key_masked}</code></p>`
            : '<p style="color:#5b7694;"><i>Secret Key chưa được cấu hình</i></p>';

        // SePay toggle
        const sepayOn = s.sepay_enabled === '1';
        const sepayEl = document.getElementById('sepayEnabled');
        if (sepayEl) sepayEl.checked = sepayOn;
        _updateToggleUI('sepay', sepayOn);

        // --- VNPAY ---
        const vnpayIpnEl = document.getElementById('vnpayIpnUrlDisplay');
        if (vnpayIpnEl) vnpayIpnEl.textContent = `${appUrl}/api/payment/vnpay/ipn`;
        const tmnEl = document.getElementById('psVnpayTmnCode');
        if (tmnEl) tmnEl.value = s.vnpay_tmn_code || '';
        const vnpUrlEl = document.getElementById('psVnpayUrl');
        if (vnpUrlEl) vnpUrlEl.value = s.vnpay_url || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        const vnpReturnEl = document.getElementById('psVnpayReturnUrl');
        if (vnpReturnEl) vnpReturnEl.value = s.vnpay_return_url || `${appUrl}/api/payment/vnpay/return`;

        // VNPAY toggle
        const vnpayOn = s.vnpay_enabled === '1';
        const vnpayEl = document.getElementById('vnpayEnabled');
        if (vnpayEl) vnpayEl.checked = vnpayOn;
        _updateToggleUI('vnpay', vnpayOn);

    } catch (e) {
        document.getElementById('paymentSettingsInfo').innerHTML = '<p style="color:#dc2626;"><i>Lỗi tải cấu hình thanh toán</i></p>';
    }
}

function _updateToggleUI(gateway, isOn) {
    const label = document.getElementById(`${gateway}ToggleLabel`);
    const badge = document.getElementById(`gwBadge-${gateway}`);
    if (label) {
        label.textContent = isOn ? 'Đang bật' : 'Đang tắt';
        label.classList.toggle('active', isOn);
    }
    if (badge) {
        badge.textContent = isOn ? 'Bật' : 'Tắt';
        badge.className = 'gw-status-badge ' + (isOn ? 'on' : 'off');
    }
}

function switchGatewayTab(gateway) {
    ['sepay', 'vnpay'].forEach(gw => {
        document.getElementById(`gwTab-${gw}`)?.classList.toggle('active', gw === gateway);
        document.getElementById(`gwPanel-${gw}`)?.classList.toggle('active', gw === gateway);
    });
}

async function saveGatewayToggle(gateway) {
    const checkbox = document.getElementById(`${gateway}Enabled`);
    const isOn = checkbox?.checked ?? false;
    const key = gateway === 'sepay' ? 'sepay_enabled' : 'vnpay_enabled';
    try {
        await api('/payment-settings', {
            method: 'PUT',
            body: JSON.stringify({ [key]: isOn ? '1' : '0' })
        });
        _updateToggleUI(gateway, isOn);
    } catch (e) {
        showToast('Lỗi lưu trạng thái cổng: ' + e.message, 'error');
        // revert
        if (checkbox) checkbox.checked = !isOn;
    }
}

async function savePaymentSettings() {
    const merchantId = document.getElementById('psMerchantId').value.trim();
    const secretKey = document.getElementById('psSecretKey').value.trim();
    const env = document.getElementById('psEnv').value.trim();
    const appUrl = document.getElementById('psAppUrl').value.trim();

    if (!merchantId) {
        return showToast('Vui lòng nhập Merchant ID', 'warning');
    }

    const body = { merchant_id: merchantId, env, app_url: appUrl };
    if (secretKey) body.secret_key = secretKey;

    await api('/payment-settings', {
        method: 'PUT',
        body: JSON.stringify(body)
    });

    showToast('Đã lưu cấu hình SePay PG', 'success');
    document.getElementById('psSecretKey').value = '';
    await loadPaymentSettings();
}

async function saveVnpaySettings() {
    const tmnCode = (document.getElementById('psVnpayTmnCode')?.value || '').trim();
    const hashSecret = (document.getElementById('psVnpayHashSecret')?.value || '').trim();
    const vnpUrl = (document.getElementById('psVnpayUrl')?.value || '').trim();
    const returnUrl = (document.getElementById('psVnpayReturnUrl')?.value || '').trim();

    if (!tmnCode) return showToast('Vui lòng nhập TmnCode (Website ID) từ VNPAY', 'warning');

    const body = { vnpay_tmn_code: tmnCode };
    if (hashSecret) body.vnpay_hash_secret = hashSecret;
    if (vnpUrl) body.vnpay_url = vnpUrl;
    if (returnUrl) body.vnpay_return_url = returnUrl;

    try {
        await api('/payment-settings', {
            method: 'PUT',
            body: JSON.stringify(body)
        });
        showToast('Đã lưu cấu hình VNPAY', 'success');
        document.getElementById('psVnpayHashSecret').value = '';
        await loadPaymentSettings();
    } catch (e) {
        showToast('Lỗi lưu VNPAY: ' + e.message, 'error');
    }
}

function formatVnd(n) {
    if (!n && n !== 0) return '0';
    return Number(n).toLocaleString('vi-VN');
}

async function loadPlanPrices() {
    try {
        const [priceData, customData] = await Promise.all([
            api('/plan-prices'),
            api('/custom-plans')
        ]);
        const prices = priceData.data || {};
        const customPlans = customData.data || [];
        renderAllPlans(prices, customPlans);
    } catch (e) {
        console.error('Lỗi tải giá gói:', e);
        const c = document.getElementById('allPlansList');
        if (c) c.innerHTML = '<p style="color:#e55;">Lỗi tải danh sách gói.</p>';
    }
}

function renderAllPlans(prices, customPlans) {
    const container = document.getElementById('allPlansList');
    if (!container) return;

    const defaultPlans = [
        { type: 'default', key: 'pro_1m', name: 'PRO 1 tháng', months: 1, price: prices.pro_1m || 199000, note: '' },
        { type: 'default', key: 'pro_3m', name: 'PRO 3 tháng', months: 3, price: prices.pro_3m || 250000, note: '' },
        { type: 'default', key: 'pro_1y', name: 'PRO 1 năm', months: 12, price: prices.pro_1y || 800000, note: '' }
    ];
    const allPlans = [
        ...defaultPlans,
        ...customPlans.map(p => ({ type: 'custom', key: String(p.id), name: p.name, months: p.months, price: p.price, note: p.note || '' }))
    ];

    if (allPlans.length === 0) {
        container.innerHTML = '<p style="color:#8a9bae;font-style:italic;">Chưa có gói nào.</p>';
        return;
    }

    container.innerHTML = `
        <table style="width:100%;border-collapse:collapse;">
            <thead>
                <tr style="background:var(--bg-secondary,#f4f7fb);text-align:left;">
                    <th style="padding:8px 10px;">Tên gói</th>
                    <th style="padding:8px 10px;">Số tháng</th>
                    <th style="padding:8px 10px;">Giá</th>
                    <th style="padding:8px 10px;">Mô tả</th>
                    <th style="padding:8px 10px;text-align:center;">Hành động</th>
                </tr>
            </thead>
            <tbody>
                ${allPlans.map(pl => planRowHtml(pl)).join('')}
            </tbody>
        </table>`;
}

function planRowHtml(pl) {
    const rowId = `plan-row-${pl.type}-${pl.key}`;
    const isDefault = pl.type === 'default';
    const nameSafe = escapeHtml(pl.name);
    const noteSafe = escapeHtml(pl.note);
    const nameAttr = pl.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const noteAttr = pl.note.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `
    <tr id="${rowId}" style="border-bottom:1px solid var(--border,#dde3ec);">
        <td style="padding:8px 10px;font-weight:600;">${nameSafe}${isDefault ? '&nbsp;<span style="font-size:0.72rem;background:#e8f0fe;color:#4a6fa5;padding:1px 6px;border-radius:4px;font-weight:normal;">Mặc định</span>' : ''}</td>
        <td style="padding:8px 10px;">${pl.months} tháng</td>
        <td style="padding:8px 10px;">${formatVnd(pl.price)}đ</td>
        <td style="padding:8px 10px;color:#5b7694;">${noteSafe || '—'}</td>
        <td style="padding:8px 10px;text-align:center;white-space:nowrap;">
            <button class="btn" style="padding:4px 10px;margin-right:4px;" onclick="editPlan('${pl.type}','${pl.key}',${pl.months},${pl.price},'${nameAttr}','${noteAttr}')">
                <i class="fas fa-edit"></i> Sửa
            </button>
            ${!isDefault ? `<button class="btn" style="color:#e55;border-color:#e55;padding:4px 10px;" onclick="deleteCustomPlan('${pl.key}','${nameAttr}')">
                <i class="fas fa-trash"></i> Xóa
            </button>` : ''}
        </td>
    </tr>`;
}

function editPlan(type, key, months, price, name, note) {
    const rowId = `plan-row-${type}-${key}`;
    const row = document.getElementById(rowId);
    if (!row) return;
    const isDefault = type === 'default';
    const nameSafe = escapeHtml(name);
    const noteSafe = escapeHtml(note);
    row.innerHTML = `
        <td colspan="5" style="padding:10px;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
                <div>
                    <label style="font-size:0.8rem;display:block;margin-bottom:3px;">Tên gói</label>
                    <input id="ep_name_${key}" type="text" value="${nameSafe}" maxlength="100" ${isDefault ? 'disabled' : ''} style="width:140px;">
                </div>
                <div>
                    <label style="font-size:0.8rem;display:block;margin-bottom:3px;">Số tháng</label>
                    <input id="ep_months_${key}" type="number" value="${months}" min="1" max="120" ${isDefault ? 'disabled' : ''} style="width:70px;">
                </div>
                <div>
                    <label style="font-size:0.8rem;display:block;margin-bottom:3px;">Giá (VNĐ)</label>
                    <input id="ep_price_${key}" type="number" value="${price}" min="1000" step="1000" style="width:130px;">
                </div>
                <div>
                    <label style="font-size:0.8rem;display:block;margin-bottom:3px;">Mô tả</label>
                    <input id="ep_note_${key}" type="text" value="${noteSafe}" maxlength="255" ${isDefault ? 'disabled' : ''} style="width:180px;">
                </div>
                <div style="display:flex;gap:6px;padding-bottom:1px;">
                    <button class="btn primary" style="padding:5px 12px;" onclick="savePlanEdit('${type}','${key}')">
                        <i class="fas fa-save"></i> Lưu
                    </button>
                    <button class="btn" style="padding:5px 12px;" onclick="loadPlanPrices()">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                </div>
            </div>
        </td>`;
    document.getElementById(`ep_price_${key}`).focus();
}

async function savePlanEdit(type, key) {
    const price = parseInt(document.getElementById(`ep_price_${key}`).value);
    if (!price || price < 1000) return showToast('Giá gói phải tối thiểu 1.000đ', 'warning');

    try {
        if (type === 'default') {
            const priceData = await api('/plan-prices');
            const current = priceData.data || {};
            const payload = {
                pro_1m: current.pro_1m || 199000,
                pro_3m: current.pro_3m || 250000,
                pro_1y: current.pro_1y || 800000
            };
            payload[key] = price;
            await api('/plan-prices', { method: 'PUT', body: JSON.stringify(payload) });
        } else {
            const name = document.getElementById(`ep_name_${key}`).value.trim();
            const months = parseInt(document.getElementById(`ep_months_${key}`).value);
            const note = document.getElementById(`ep_note_${key}`).value.trim();
            if (!name || name.length < 2) return showToast('Tên gói phải có ít nhất 2 ký tự', 'warning');
            if (!months || months < 1) return showToast('Số tháng không hợp lệ', 'warning');
            await api(`/custom-plans/${key}`, { method: 'PUT', body: JSON.stringify({ name, months, price, note }) });
        }
        await loadPlanPrices();
    } catch (e) {
        showToast('Lỗi: ' + e.message, 'error');
    }
}

async function loadCustomPlans() {
    await loadPlanPrices();
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showAddCustomPlanForm() {
    document.getElementById('addCustomPlanForm').style.display = 'block';
    document.getElementById('cp_name').focus();
}

function hideAddCustomPlanForm() {
    document.getElementById('addCustomPlanForm').style.display = 'none';
    ['cp_name', 'cp_months', 'cp_price', 'cp_note'].forEach(id => { document.getElementById(id).value = ''; });
}

async function saveCustomPlan() {
    const name = document.getElementById('cp_name').value.trim();
    const months = parseInt(document.getElementById('cp_months').value);
    const price = parseInt(document.getElementById('cp_price').value);
    const note = document.getElementById('cp_note').value.trim();

    if (!name || name.length < 2) return showToast('Tên gói phải có ít nhất 2 ký tự', 'warning');
    if (!months || months < 1 || months > 120) return showToast('Số tháng phải từ 1 đến 120', 'warning');
    if (!price || price < 1000) return showToast('Giá gói phải tối thiểu 1.000đ', 'warning');

    try {
        await api('/custom-plans', {
            method: 'POST',
            body: JSON.stringify({ name, months, price, note })
        });
        hideAddCustomPlanForm();
        await loadPlanPrices();
    } catch (e) {
        showToast('Lỗi: ' + e.message, 'error');
    }
}

async function deleteCustomPlan(id, name) {
    if (!await showConfirm(`Xóa gói "${name}"? Hành động này không thể hoàn tác.`, true)) return;
    try {
        await api(`/custom-plans/${id}`, { method: 'DELETE' });
        await loadPlanPrices();
    } catch (e) {
        showToast('Lỗi: ' + e.message, 'error');
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

// ============================================================
// Landing Page Config — default values
// ============================================================
const LP_DEFAULTS = {
    site_name: 'AI Screenplay',
    sections_visible: {
        hero: true,
        features: true,
        workflow: true,
        tools: true,
        testimonials: true,
        cta: true
    },
    hero: {
        badge: 'Powered by AI',
        title_before: 'Biến Ý Tưởng Thành',
        title_gradient: 'Kịch Bản Phim',
        title_after: 'Chuyên Nghiệp',
        subtitle: 'Công cụ AI hỗ trợ viết kịch bản phim theo quy trình Hollywood chuẩn. Từ ý tưởng đến kịch bản hoàn chỉnh chỉ trong vài bước đơn giản.',
        stat_0_count: 9, stat_0_label: 'Công cụ AI',
        stat_1_count: 1000, stat_1_label: 'Kịch bản đã tạo',
        stat_2_count: 500, stat_2_label: 'Người dùng',
        cta_primary: 'Bắt đầu sáng tạo',
        cta_secondary: 'Xem cách hoạt động'
    },
    features: {
        badge: 'Tính năng',
        title: 'Tại sao chọn AI Screenplay?',
        subtitle: 'Công cụ mạnh mẽ giúp bạn viết kịch bản nhanh hơn và chuyên nghiệp hơn',
        cards: [
            { icon: 'fa-brain', title: 'AI Thông Minh', desc: 'Sử dụng mô hình ngôn ngữ tiên tiến để tạo nội dung sáng tạo và phù hợp với ngữ cảnh' },
            { icon: 'fa-route', title: 'Quy Trình Chuẩn', desc: 'Theo quy trình viết kịch bản Hollywood với 9 bước từ Logline đến Kịch bản hoàn chỉnh' },
            { icon: 'fa-clock', title: 'Tiết Kiệm Thời Gian', desc: 'Giảm thời gian viết kịch bản từ vài tháng xuống còn vài ngày với sự hỗ trợ của AI' },
            { icon: 'fa-edit', title: 'Chỉnh Sửa Linh Hoạt', desc: 'Dễ dàng chỉnh sửa và điều chỉnh nội dung theo ý muốn với giao diện trực quan' },
            { icon: 'fa-database', title: 'Lưu Trữ An Toàn', desc: 'Tất cả dự án được lưu trữ an toàn trên cloud, truy cập mọi lúc mọi nơi' },
            { icon: 'fa-language', title: 'Hỗ Trợ Tiếng Việt', desc: 'Giao diện và nội dung hoàn toàn bằng tiếng Việt, phù hợp với nhà biên kịch Việt Nam' }
        ]
    },
    testimonials: {
        badge: 'Đánh giá',
        title: 'Người Dùng Nói Gì?',
        subtitle: 'Phản hồi từ các nhà biên kịch đã sử dụng AI Screenplay',
        items: [
            { text: 'AI Screenplay đã giúp tôi tiết kiệm rất nhiều thời gian trong quá trình phát triển ý tưởng. Từ một ý tưởng mơ hồ, tôi đã có được kịch bản hoàn chỉnh trong 2 tuần!', author: 'Nguyễn Văn A', role: 'Biên kịch phim truyền hình' },
            { text: 'Công cụ tuyệt vời cho cả người mới và chuyên nghiệp. Quy trình 9 bước rất logic và giúp tôi không bỏ sót bất kỳ yếu tố quan trọng nào trong kịch bản.', author: 'Trần Thị B', role: 'Đạo diễn phim ngắn' },
            { text: 'Sinh viên điện ảnh như tôi rất cần một công cụ hỗ trợ như thế này. AI Screenplay không viết thay mình mà hướng dẫn mình viết đúng cách.', author: 'Lê Văn C', role: 'Sinh viên Điện ảnh' }
        ]
    },
    cta: {
        heading: 'Sẵn Sàng Viết Kịch Bản?',
        subtext: 'Bắt đầu hành trình sáng tạo của bạn ngay hôm nay với AI Screenplay'
    },
    workflow: {
        badge: 'Quy trình',
        title: '9 Bước Tạo Kịch Bản Hoàn Hảo',
        subtitle: 'Quy trình viết kịch bản chuyên nghiệp theo chuẩn Hollywood',
        steps: [
            { icon: 'fa-pen-fancy', title: 'Tạo Logline', desc: 'Tóm tắt phim trong 1-2 câu, nêu bật nhân vật, mục tiêu và xung đột' },
            { icon: 'fa-lightbulb', title: 'Xác Định Chủ Đề', desc: 'Tìm ra thông điệp sâu sắc và ý nghĩa của câu chuyện' },
            { icon: 'fa-users', title: 'Mô Tả Nhân Vật', desc: 'Xây dựng hồ sơ chi tiết cho từng nhân vật trong phim' },
            { icon: 'fa-file-alt', title: 'Viết Synopsis', desc: 'Tóm tắt toàn bộ câu chuyện từ đầu đến cuối' },
            { icon: 'fa-sitemap', title: 'Cấu Trúc 4 Hồi', desc: 'Phân chia câu chuyện theo cấu trúc Story Circle' },
            { icon: 'fa-chart-line', title: 'Phát Triển Nhân Vật', desc: 'Mô tả hành trình thay đổi của nhân vật qua các hồi' },
            { icon: 'fa-list-ol', title: 'Tạo Beat Sheet', desc: 'Liệt kê các beat quan trọng theo mô hình Save the Cat' },
            { icon: 'fa-th-list', title: 'Danh Sách Cảnh', desc: 'Chia kịch bản thành 30-40 cảnh rõ ràng' },
            { icon: 'fa-scroll', title: 'Viết Kịch Bản', desc: 'Viết kịch bản chi tiết theo format Hollywood chuẩn' }
        ]
    },
    footer: {
        brand_desc: 'Công cụ viết kịch bản phim với AI - Biến ý tưởng thành câu chuyện.',
        copyright: '© 2026 AI Screenplay. Tất cả quyền được bảo lưu.'
    }
};

function renderFeatureCardInputs(cards) {
    const container = document.getElementById('lp_feature_cards');
    if (!container) return;
    container.innerHTML = cards.map((card, i) => `
        <div class="lp-card-box">
            <p class="lp-card-label">Thẻ ${i + 1}</p>
            <label>Icon (FA class)</label>
            <input id="lp_fc_icon_${i}" type="text" value="${escapeHtml(card.icon || '')}" placeholder="fa-brain" style="margin-bottom:6px;">
            <label>Tiêu đề</label>
            <input id="lp_fc_title_${i}" type="text" value="${escapeHtml(card.title || '')}" placeholder="..." style="margin-bottom:6px;">
            <label>Mô tả</label>
            <textarea id="lp_fc_desc_${i}" rows="2" style="width:100%;box-sizing:border-box;resize:vertical;">${escapeHtml(card.desc || '')}</textarea>
        </div>
    `).join('');
}

function renderTestimonialInputs(items) {
    const container = document.getElementById('lp_testimonial_items');
    if (!container) return;
    container.innerHTML = items.map((item, i) => `
        <div class="lp-card-box">
            <p class="lp-card-label">Đánh giá ${i + 1}</p>
            <label>Nội dung</label>
            <textarea id="lp_t_text_${i}" rows="3" style="width:100%;box-sizing:border-box;resize:vertical;margin-bottom:8px;">${escapeHtml(item.text || '')}</textarea>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div>
                    <label>Tên tác giả</label>
                    <input id="lp_t_author_${i}" type="text" value="${escapeHtml(item.author || '')}" placeholder="Nguyễn Văn A">
                </div>
                <div>
                    <label>Chức danh</label>
                    <input id="lp_t_role_${i}" type="text" value="${escapeHtml(item.role || '')}" placeholder="Biên kịch...">
                </div>
            </div>
        </div>
    `).join('');
}

function renderWorkflowStepInputs(steps) {
    const container = document.getElementById('lp_workflow_steps');
    if (!container) return;
    container.innerHTML = steps.map((step, i) => `
        <div class="lp-card-box lp-ws-row" data-ws-idx="${i}">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
                <span style="font-weight:700;font-size:0.9rem;color:#1f6ed4;">Bước ${i + 1}</span>
                <button type="button" onclick="removeWorkflowStep(${i})" style="margin-left:auto;background:#fee2e2;color:#dc2626;border:none;border-radius:6px;padding:3px 10px;cursor:pointer;font-size:12px;"><i class="fas fa-trash-alt"></i> Xóa</button>
            </div>
            <div style="display:grid;grid-template-columns:160px 1fr 1fr;gap:8px;">
                <div>
                    <label style="font-size:0.78rem;">Icon <small style="color:#888">(fa-...)</small></label>
                    <div style="display:flex;gap:4px;align-items:center;">
                        <i id="lp_ws_icon_preview_${i}" class="fas ${escapeHtml(step.icon || 'fa-circle')}" style="width:18px;text-align:center;color:#7c3aed;"></i>
                        <input id="lp_ws_icon_${i}" type="text" value="${escapeHtml(step.icon || 'fa-circle')}" placeholder="fa-pen-fancy"
                            oninput="document.getElementById('lp_ws_icon_preview_${i}').className='fas '+this.value.trim()" style="flex:1;">
                    </div>
                </div>
                <div>
                    <label style="font-size:0.78rem;">Tiêu đề</label>
                    <input id="lp_ws_title_${i}" type="text" value="${escapeHtml(step.title || '')}" placeholder="Bước ${i + 1}">
                </div>
                <div>
                    <label style="font-size:0.78rem;">Mô tả</label>
                    <input id="lp_ws_desc_${i}" type="text" value="${escapeHtml(step.desc || '')}" placeholder="Mô tả bước ${i + 1}">
                </div>
            </div>
        </div>
    `).join('') + `
        <button type="button" onclick="addWorkflowStep()" style="width:100%;padding:10px;border:2px dashed #a78bfa;background:transparent;color:#7c3aed;border-radius:8px;cursor:pointer;font-size:14px;margin-top:4px;">
            <i class="fas fa-plus"></i> Thêm bước mới
        </button>
    `;
}

function _collectWorkflowSteps() {
    const steps = [];
    document.querySelectorAll('#lp_workflow_steps .lp-ws-row').forEach((row, i) => {
        steps.push({
            icon: (document.getElementById(`lp_ws_icon_${i}`)?.value || 'fa-circle').trim(),
            title: (document.getElementById(`lp_ws_title_${i}`)?.value || '').trim(),
            desc: (document.getElementById(`lp_ws_desc_${i}`)?.value || '').trim()
        });
    });
    return steps;
}

function removeWorkflowStep(idx) {
    const steps = _collectWorkflowSteps();
    steps.splice(idx, 1);
    renderWorkflowStepInputs(steps);
}

function addWorkflowStep() {
    const steps = _collectWorkflowSteps();
    steps.push({ icon: 'fa-circle', title: '', desc: '' });
    renderWorkflowStepInputs(steps);
}
window.removeWorkflowStep = removeWorkflowStep;
window.addWorkflowStep = addWorkflowStep;

function _lpVal(obj, key, def) {
    return (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') ? obj[key] : def;
}

async function loadLandingConfig() {
    try {
        const data = await api('/landing-config');
        const db = data.data || {};
        const h = db.hero || {};
        const f = db.features || {};
        const t = db.testimonials || {};
        const ct = db.cta || {};
        const ft = db.footer || {};
        const dh = LP_DEFAULTS.hero;
        const df = LP_DEFAULTS.features;
        const dt = LP_DEFAULTS.testimonials;

        // General
        document.getElementById('lp_site_name').value = _lpVal(db, 'site_name', LP_DEFAULTS.site_name);

        // Section visibility
        const sv = db.sections_visible || LP_DEFAULTS.sections_visible;
        ['hero', 'features', 'workflow', 'tools', 'testimonials', 'cta'].forEach(key => {
            const el = document.getElementById(`lp_vis_${key}`);
            if (el) el.checked = sv[key] !== false;
        });

        // Hero
        document.getElementById('lp_hero_badge').value = _lpVal(h, 'badge', dh.badge);
        document.getElementById('lp_hero_title_before').value = _lpVal(h, 'title_before', dh.title_before);
        document.getElementById('lp_hero_title_gradient').value = _lpVal(h, 'title_gradient', dh.title_gradient);
        document.getElementById('lp_hero_title_after').value = _lpVal(h, 'title_after', dh.title_after);
        document.getElementById('lp_hero_subtitle').value = _lpVal(h, 'subtitle', dh.subtitle);
        document.getElementById('lp_hero_cta_primary').value = _lpVal(h, 'cta_primary', dh.cta_primary);
        document.getElementById('lp_hero_cta_secondary').value = _lpVal(h, 'cta_secondary', dh.cta_secondary);
        for (let i = 0; i < 3; i++) {
            const ce = document.getElementById(`lp_hero_stat${i}_count`);
            const le = document.getElementById(`lp_hero_stat${i}_label`);
            if (ce) ce.value = _lpVal(h, `stat_${i}_count`, dh[`stat_${i}_count`]);
            if (le) le.value = _lpVal(h, `stat_${i}_label`, dh[`stat_${i}_label`]);
        }

        // Features
        document.getElementById('lp_features_badge').value = _lpVal(f, 'badge', df.badge);
        document.getElementById('lp_features_title').value = _lpVal(f, 'title', df.title);
        document.getElementById('lp_features_subtitle').value = _lpVal(f, 'subtitle', df.subtitle);
        renderFeatureCardInputs((f.cards && f.cards.length === 6) ? f.cards : df.cards);

        // Testimonials
        document.getElementById('lp_testimonials_badge').value = _lpVal(t, 'badge', dt.badge);
        document.getElementById('lp_testimonials_title').value = _lpVal(t, 'title', dt.title);
        document.getElementById('lp_testimonials_subtitle').value = _lpVal(t, 'subtitle', dt.subtitle);
        renderTestimonialInputs((t.items && t.items.length === 3) ? t.items : dt.items);

        // CTA & Footer
        document.getElementById('lp_cta_heading').value = _lpVal(ct, 'heading', LP_DEFAULTS.cta.heading);
        document.getElementById('lp_cta_subtext').value = _lpVal(ct, 'subtext', LP_DEFAULTS.cta.subtext);

        // Workflow
        const wf = db.workflow || {};
        const dwf = LP_DEFAULTS.workflow;
        document.getElementById('lp_workflow_badge').value = _lpVal(wf, 'badge', dwf.badge);
        document.getElementById('lp_workflow_title').value = _lpVal(wf, 'title', dwf.title);
        document.getElementById('lp_workflow_subtitle').value = _lpVal(wf, 'subtitle', dwf.subtitle);
        renderWorkflowStepInputs((wf.steps && wf.steps.length > 0) ? wf.steps : dwf.steps);

        document.getElementById('lp_footer_brand_desc').value = _lpVal(ft, 'brand_desc', LP_DEFAULTS.footer.brand_desc);
        document.getElementById('lp_footer_copyright').value = _lpVal(ft, 'copyright', LP_DEFAULTS.footer.copyright);

    } catch (e) {
        console.error('Error loading landing config:', e);
        renderFeatureCardInputs(LP_DEFAULTS.features.cards);
        renderTestimonialInputs(LP_DEFAULTS.testimonials.items);
        renderWorkflowStepInputs(LP_DEFAULTS.workflow.steps);
    }
}

async function saveLandingConfig() {
    const cards = [];
    for (let i = 0; i < 6; i++) {
        cards.push({
            icon: (document.getElementById(`lp_fc_icon_${i}`)?.value || '').trim(),
            title: (document.getElementById(`lp_fc_title_${i}`)?.value || '').trim(),
            desc: (document.getElementById(`lp_fc_desc_${i}`)?.value || '').trim()
        });
    }
    const testimonials = [];
    for (let i = 0; i < 3; i++) {
        testimonials.push({
            text: (document.getElementById(`lp_t_text_${i}`)?.value || '').trim(),
            author: (document.getElementById(`lp_t_author_${i}`)?.value || '').trim(),
            role: (document.getElementById(`lp_t_role_${i}`)?.value || '').trim()
        });
    }
    const g = id => (document.getElementById(id)?.value || '').trim();
    const workflowSteps = _collectWorkflowSteps();
    const sections_visible = {};
    ['hero', 'features', 'workflow', 'tools', 'testimonials', 'cta'].forEach(key => {
        sections_visible[key] = document.getElementById(`lp_vis_${key}`)?.checked !== false;
    });
    const config = {
        site_name: g('lp_site_name'),
        sections_visible,
        hero: {
            badge: g('lp_hero_badge'),
            title_before: g('lp_hero_title_before'),
            title_gradient: g('lp_hero_title_gradient'),
            title_after: g('lp_hero_title_after'),
            subtitle: g('lp_hero_subtitle'),
            cta_primary: g('lp_hero_cta_primary'),
            cta_secondary: g('lp_hero_cta_secondary'),
            stat_0_count: parseInt(g('lp_hero_stat0_count')) || 9,
            stat_0_label: g('lp_hero_stat0_label'),
            stat_1_count: parseInt(g('lp_hero_stat1_count')) || 1000,
            stat_1_label: g('lp_hero_stat1_label'),
            stat_2_count: parseInt(g('lp_hero_stat2_count')) || 500,
            stat_2_label: g('lp_hero_stat2_label')
        },
        features: { badge: g('lp_features_badge'), title: g('lp_features_title'), subtitle: g('lp_features_subtitle'), cards },
        testimonials: { badge: g('lp_testimonials_badge'), title: g('lp_testimonials_title'), subtitle: g('lp_testimonials_subtitle'), items: testimonials },
        workflow: { badge: g('lp_workflow_badge'), title: g('lp_workflow_title'), subtitle: g('lp_workflow_subtitle'), steps: workflowSteps },
        cta: { heading: g('lp_cta_heading'), subtext: g('lp_cta_subtext') },
        footer: { brand_desc: g('lp_footer_brand_desc'), copyright: g('lp_footer_copyright') }
    };
    try {
        await api('/landing-config', { method: 'PUT', body: JSON.stringify(config) });
        showToast('Đã lưu cấu hình landing page', 'success');
    } catch (e) {
        showToast('Lỗi: ' + e.message, 'error');
    }
}

window.saveUser = saveUser;
window.savePrompt = () => { }; // legacy stub
window.saveApiKey = () => { }; // legacy stub
window.saveAiConfig = saveAiConfig;
window.testAiApi = testAiApi;
window.onProviderChange = onProviderChange;
window.savePaymentSettings = savePaymentSettings;
window.saveVnpaySettings = saveVnpaySettings;
window.showAddCustomPlanForm = showAddCustomPlanForm;
window.hideAddCustomPlanForm = hideAddCustomPlanForm;
window.saveCustomPlan = saveCustomPlan;
window.editPlan = editPlan;
window.savePlanEdit = savePlanEdit;
window.deleteCustomPlan = deleteCustomPlan;
window.loadPlanPrices = loadPlanPrices;
window.switchGatewayTab = switchGatewayTab;
window.saveGatewayToggle = saveGatewayToggle;
window.saveLandingConfig = saveLandingConfig;
window.logout = logout;
window.goDashboard = goDashboard;

// ============================================================
// TOKEN & BILLING functions
// ============================================================
async function loadTokenBilling() {
    await Promise.all([loadTokenPricing(), loadTokenStats()]);
}

async function loadTokenPricing() {
    try {
        const data = await api('/token-pricing');
        if (data.success) {
            document.getElementById('tb_input_price').value = data.data.input_per_1k;
            document.getElementById('tb_output_price').value = data.data.output_per_1k;
        }
    } catch (e) { showToast('Lỗi tải giá token: ' + e.message, 'error'); }
}

async function saveTokenPricing() {
    const input_per_1k = parseFloat(document.getElementById('tb_input_price').value);
    const output_per_1k = parseFloat(document.getElementById('tb_output_price').value);
    if (isNaN(input_per_1k) || isNaN(output_per_1k)) {
        showToast('Vui lòng nhập giá hợp lệ', 'error'); return;
    }
    try {
        await api('/token-pricing', { method: 'PUT', body: JSON.stringify({ input_per_1k, output_per_1k }) });
        showToast('Đã lưu giá token', 'success');
    } catch (e) { showToast('Lỗi: ' + e.message, 'error'); }
}

async function loadTokenStats() {
    const days = document.getElementById('tb_days')?.value || 7;
    try {
        const data = await api(`/token-stats?days=${days}`);
        if (!data.success) return;
        const fmtN = (n) => Number(n || 0).toLocaleString('vi-VN');
        const fmtVnd = (n) => Number(n || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' ₫';

        // Daily table
        const dTbody = document.querySelector('#tb_daily_table tbody');
        dTbody.innerHTML = data.data.daily.length === 0
            ? '<tr><td colspan="5" style="text-align:center;color:#888;">Không có dữ liệu</td></tr>'
            : data.data.daily.map(r => `<tr>
                <td>${r.day}</td>
                <td>${fmtN(r.calls)}</td>
                <td>${fmtN(r.tokens_in)}</td>
                <td>${fmtN(r.tokens_out)}</td>
                <td>${fmtVnd(r.cost_vnd)}</td>
            </tr>`).join('');

        // By-user table
        const uTbody = document.querySelector('#tb_user_table tbody');
        uTbody.innerHTML = data.data.byUser.length === 0
            ? '<tr><td colspan="7" style="text-align:center;color:#888;">Không có dữ liệu</td></tr>'
            : data.data.byUser.map(r => `<tr>
                <td>${r.username || '—'}</td>
                <td>${r.email || '—'}</td>
                <td>${fmtN(r.calls)}</td>
                <td>${fmtN(r.tokens_in)}</td>
                <td>${fmtN(r.tokens_out)}</td>
                <td>${fmtVnd(r.cost_vnd)}</td>
                <td>${fmtVnd(r.ai_balance_vnd)}</td>
            </tr>`).join('');
    } catch (e) { showToast('Lỗi tải thống kê: ' + e.message, 'error'); }
}

async function adjustUserBalance() {
    const userId = parseInt(document.getElementById('tb_user_id').value);
    const amount = parseFloat(document.getElementById('tb_amount').value);
    const action = document.getElementById('tb_action').value;
    const result = document.getElementById('tb_balance_result');

    if (!userId || isNaN(amount)) {
        result.style.color = 'var(--error,#ef4444)';
        result.textContent = 'Vui lòng nhập User ID và số tiền hợp lệ';
        return;
    }

    // For "deduct" action, send negative amount as "add"
    const payload = action === 'deduct'
        ? { amount: -Math.abs(amount), action: 'add' }
        : { amount, action };

    try {
        const data = await api(`/users/${userId}/balance`, { method: 'PUT', body: JSON.stringify(payload) });
        if (data.success) {
            result.style.color = 'var(--success,#22c55e)';
            result.textContent = `✓ Thành công! Số dư mới: ${Number(data.balance).toLocaleString('vi-VN')} ₫`;
            loadTokenStats();
        } else {
            result.style.color = 'var(--error,#ef4444)';
            result.textContent = data.message || 'Lỗi không xác định';
        }
    } catch (e) {
        result.style.color = 'var(--error,#ef4444)';
        result.textContent = 'Lỗi: ' + e.message;
    }
}

window.loadTokenBilling = loadTokenBilling;
window.saveTokenPricing = saveTokenPricing;
window.loadTokenStats = loadTokenStats;
window.adjustUserBalance = adjustUserBalance;

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (window.lastOverviewData) {
            drawAccountPieChart(window.lastOverviewData.users.total, window.lastOverviewData.users.pro_total);
        }
    }, 150);
});

// ============================================================
// SEO CONFIGURATION
// ============================================================
let seoLogoFileObj = null;
let seoFaviconFileObj = null;
let currentSeoLogoUrl = '';
let currentSeoFaviconUrl = '';

async function loadSeoConfig() {
    try {
        const data = await api('/seo-settings');
        if (data.success) {
            const config = data.data;
            document.getElementById('seo_site_name').value = config.seo_site_name || '';
            document.getElementById('seo_title').value = config.seo_title || '';
            document.getElementById('seo_description').value = config.seo_description || '';

            currentSeoLogoUrl = config.seo_logo || '';
            currentSeoFaviconUrl = config.seo_favicon || '';

            updateSeoPreview('seoLogoPreview', currentSeoLogoUrl);
            updateSeoPreview('seoFaviconPreview', currentSeoFaviconUrl);

            // Reset file objects
            seoLogoFileObj = null;
            seoFaviconFileObj = null;
            document.getElementById('seoLogoFile').value = '';
            document.getElementById('seoFaviconFile').value = '';
        }
    } catch (e) {
        showToast('Lỗi tải cấu hình SEO: ' + e.message, 'error');
    }
}

function updateSeoPreview(previewId, url) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    if (url) {
        preview.innerHTML = `<img src="${url}?t=${Date.now()}" style="width:100%; height:100%; object-fit:contain;">`;
    } else {
        preview.innerHTML = `<i class="fas fa-image" style="font-size:24px; color:#94a3b8;"></i>`;
    }
}

function handleSeoLogoSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showToast('Logo không được vượt quá 2MB', 'warning');
        event.target.value = '';
        return;
    }

    seoLogoFileObj = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('seoLogoPreview');
        preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:contain;">`;
    };
    reader.readAsDataURL(file);
}

function handleSeoFaviconSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
        showToast('Favicon không được vượt quá 1MB', 'warning');
        event.target.value = '';
        return;
    }

    seoFaviconFileObj = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('seoFaviconPreview');
        preview.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:contain;">`;
    };
    reader.readAsDataURL(file);
}

async function uploadSeoFile(file, type) {
    const formData = new FormData();
    formData.append(type, file);

    const res = await fetch(`${API_BASE}/seo-settings/upload-${type}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${TOKEN}`
        },
        body: formData
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || `Lỗi upload ${type}`);
    }
    return data.url;
}

async function saveSeoConfig() {
    const siteName = document.getElementById('seo_site_name').value.trim();
    const title = document.getElementById('seo_title').value.trim();
    const description = document.getElementById('seo_description').value.trim();

    if (!siteName) return showToast('Vui lòng nhập Tên trang web', 'warning');
    if (!title) return showToast('Vui lòng nhập Tiêu đề trang SEO', 'warning');

    try {
        showToast('Đang lưu cấu hình...', 'info');

        let logoUrl = currentSeoLogoUrl;
        let faviconUrl = currentSeoFaviconUrl;

        // Upload logo if new one selected
        if (seoLogoFileObj) {
            logoUrl = await uploadSeoFile(seoLogoFileObj, 'logo');
        }

        // Upload favicon if new one selected
        if (seoFaviconFileObj) {
            faviconUrl = await uploadSeoFile(seoFaviconFileObj, 'favicon');
        }

        // Save text config properties
        const payload = {
            seo_site_name: siteName,
            seo_title: title,
            seo_description: description,
            seo_logo: logoUrl,
            seo_favicon: faviconUrl
        };

        const res = await api('/seo-settings', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (res.success) {
            showToast('Đã lưu cấu hình SEO thành công!', 'success');
            await loadSeoConfig();
        } else {
            showToast(res.message || 'Lỗi lưu cấu hình SEO', 'error');
        }
    } catch (error) {
        showToast('Lỗi: ' + error.message, 'error');
    }
}

// Expose functions to global window scope
window.loadSeoConfig = loadSeoConfig;
window.handleSeoLogoSelect = handleSeoLogoSelect;
window.handleSeoFaviconSelect = handleSeoFaviconSelect;
window.saveSeoConfig = saveSeoConfig;

init().catch((err) => {
    console.error(err);
    showToast(err.message || 'Không thể tải trang admin', 'error');
});
