const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');
const { SePayPgClient } = require('sepay-pg-node');
const crypto = require('crypto');
const qs = require('qs');

const JWT_SECRET = process.env.JWT_SECRET || 'ai_screenplay_secret_key_2024';

// ============================================================
// In-memory store cho đơn đang chờ thanh toán (xóa khi paid/hủy/timeout)
// Không lưu DB ở bước tạo đơn — chỉ INSERT vào DB khi thanh toán THÀNH CÔNG
// ============================================================
const pendingOrders = new Map();
// orderCodeStr → { userId, packageId, amount, description, createdAt }

// Tự dọn dẹp các đơn cũ hơn 2 tiếng
setInterval(() => {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    for (const [code, info] of pendingOrders.entries()) {
        if (info.createdAt < cutoff) pendingOrders.delete(code);
    }
}, 30 * 60 * 1000);

// Định nghĩa các gói thanh toán
const PLAN_PACKAGES = {
    pro_1m: { id: 'pro_1m', name: 'PRO 1 tháng', months: 1, price: 199000 },
    pro_3m: { id: 'pro_3m', name: 'PRO 3 tháng', months: 3, price: 250000 },
    pro_1y: { id: 'pro_1y', name: 'PRO 1 năm', months: 12, price: 800000 }
};

// Lấy gói kèm giá từ DB (fallback sang mặc định) và gói tùy chỉnh
async function getPlanPackages() {
    const packages = {
        pro_1m: { ...PLAN_PACKAGES.pro_1m },
        pro_3m: { ...PLAN_PACKAGES.pro_3m },
        pro_1y: { ...PLAN_PACKAGES.pro_1y }
    };
    try {
        const [rows] = await pool.execute(
            "SELECT setting_key, setting_value FROM payment_settings WHERE setting_key IN ('price_pro_1m','price_pro_3m','price_pro_1y')"
        );
        rows.forEach(r => {
            const key = r.setting_key.replace('price_', '');
            if (packages[key]) packages[key].price = parseInt(r.setting_value) || packages[key].price;
        });
    } catch (e) { /* dùng giá mặc định */ }
    try {
        const [customRows] = await pool.execute('SELECT id, name, months, price, note FROM custom_plans ORDER BY id ASC');
        customRows.forEach(r => {
            const key = `custom_${r.id}`;
            packages[key] = { id: key, name: r.name, months: r.months, price: r.price, note: r.note || '' };
        });
    } catch (e) { /* bảng chưa tồn tại hoặc lỗi */ }
    return packages;
}

// Tự động tạo bảng payment_settings nếu chưa có
(async () => {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS payment_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS payment_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                order_code BIGINT UNIQUE NOT NULL,
                package_id VARCHAR(50) NOT NULL,
                amount INT NOT NULL,
                description VARCHAR(255),
                status ENUM('pending','paid','cancelled','expired') DEFAULT 'pending',
                checkout_url TEXT,
                payment_link_id VARCHAR(100),
                paid_at DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_order_code (order_code),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS custom_plans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                months INT NOT NULL DEFAULT 1,
                price INT NOT NULL,
                note VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    } catch (e) {
        console.error('Lỗi tạo bảng payment:', e.message);
    }
})();

// Đọc cấu hình thanh toán từ DB
async function getPaymentConfig() {
    try {
        const [rows] = await pool.execute('SELECT setting_key, setting_value FROM payment_settings');
        const config = {};
        rows.forEach(r => { config[r.setting_key] = r.setting_value; });
        return config;
    } catch (e) {
        return {};
    }
}

// ============================================================
// Helper: lấy SePayPgClient từ cấu hình DB
// ============================================================
async function getSePayClient() {
    const config = await getPaymentConfig();
    if (!config.merchant_id || !config.secret_key) {
        throw new Error('Chưa cấu hình Merchant ID và Secret Key. Vào Admin → Cài đặt → Cổng thanh toán để cấu hình.');
    }
    const client = new SePayPgClient({
        env: config.env || 'sandbox',
        merchant_id: config.merchant_id,
        secret_key: config.secret_key
    });
    return { client, config };
}

function addMonths(baseDate, months) {
    const result = new Date(baseDate);
    result.setMonth(result.getMonth() + months);
    return result;
}

// Middleware xác thực token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Không tìm thấy token xác thực'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Token không hợp lệ hoặc đã hết hạn'
            });
        }
        req.user = user;
        next();
    });
};

// ============================================================
// Helper: nâng cấp plan user lên PRO trong DB
// ============================================================
async function upgradePlan(userId, packageId) {
    const selectedPackage = PLAN_PACKAGES[packageId];
    if (!selectedPackage) return;

    const [users] = await pool.execute(
        'SELECT id, plan_type, pro_expires_at FROM users WHERE id = ? LIMIT 1',
        [userId]
    );

    if (users.length > 0) {
        const user = users[0];
        const now = new Date();
        const currentExpiry = user.pro_expires_at ? new Date(user.pro_expires_at) : null;
        const startDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
        const newExpiry = addMonths(startDate, selectedPackage.months);

        await pool.execute(
            `UPDATE users SET plan_type = 'pro', pro_expires_at = ?, updated_at = NOW() WHERE id = ?`,
            [newExpiry, userId]
        );

        console.log(`✅ Nâng cấp PRO thành công cho user ${userId}, hết hạn: ${newExpiry}`);
    }
}

// ============================================================
// POST /api/payment/create
// Tạo checkout form qua SePay PG SDK, trả về formFields + checkoutUrl
// ============================================================
// GET /api/payment/prices — Giá các gói (public, không cần auth)
router.get('/prices', async (req, res) => {
    try {
        const packages = await getPlanPackages();
        const prices = {};
        Object.entries(packages).forEach(([k, v]) => { prices[k] = v.price; });
        return res.json({ success: true, data: prices, packages });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy giá gói', error: e.message });
    }
});

// ============================================================
// GET /api/payment/gateways — Trạng thái bật/tắt cổng thanh toán (public)
router.get('/gateways', async (req, res) => {
    try {
        const config = await getPaymentConfig();
        return res.json({
            success: true,
            sepay_enabled: config.sepay_enabled === '1',
            vnpay_enabled: config.vnpay_enabled === '1'
        });
    } catch (e) {
        return res.json({ success: true, sepay_enabled: true, vnpay_enabled: true });
    }
});

router.post('/create', authenticateToken, async (req, res) => {
    try {
        const packageId = String(req.body?.package_id || '').trim();
        const packages = await getPlanPackages();
        const selectedPackage = packages[packageId];

        if (!selectedPackage) {
            return res.status(400).json({ success: false, message: 'Gói nâng cấp không hợp lệ' });
        }

        const { client, config } = await getSePayClient();

        // orderCode: 12 chữ số, phù hợp BIGINT
        const orderCode = Number(
            String(Date.now()).slice(-10) +
            String(Math.floor(Math.random() * 100)).padStart(2, '0')
        );
        const orderCodeStr = String(orderCode);

        const APP_URL = getBaseUrl(req);

        const formFields = client.checkout.initOneTimePaymentFields({
            operation: 'PURCHASE',
            payment_method: 'BANK_TRANSFER',
            order_invoice_number: orderCodeStr,
            order_amount: selectedPackage.price,
            currency: 'VND',
            order_description: `AI Screenplay - ${selectedPackage.name}`,
            customer_id: String(req.user.id),
            success_url: `${APP_URL}/dashboard.html?payment=success&orderCode=${orderCodeStr}`,
            error_url:   `${APP_URL}/dashboard.html?payment=error&orderCode=${orderCodeStr}`,
            cancel_url:  `${APP_URL}/dashboard.html?payment=cancel&orderCode=${orderCodeStr}`
        });

        const checkoutUrl = client.checkout.initCheckoutUrl();

        // Lưu vào Map (KHÔNG lưu DB — chỉ INSERT vào DB khi thanh toán thành công)
        pendingOrders.set(orderCodeStr, {
            userId: req.user.id,
            packageId,
            amount: selectedPackage.price,
            description: formFields.order_description,
            createdAt: Date.now()
        });

        console.log(`🛒 Tạo đơn SePay PG ${orderCodeStr} (${selectedPackage.name}) cho user ${req.user.id}`);

        return res.json({
            success: true,
            data: {
                checkoutUrl,
                formFields,
                orderCode: orderCodeStr,
                package: selectedPackage
            }
        });

    } catch (error) {
        console.error('Lỗi tạo thanh toán SePay PG:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Không thể tạo đơn thanh toán. Vui lòng thử lại.'
        });
    }
});

// ============================================================
// GET /api/payment/ipn — health check / SePay verification ping
// ============================================================
router.get('/ipn', (req, res) => {
    return res.status(200).json({ success: true, message: 'SePay IPN endpoint is active' });
});

// ============================================================
// POST /api/payment/ipn
// Nhận IPN từ SePay Cổng Thanh Toán
// Header: X-Secret-Key: <secret_key>
// Body: { timestamp, notification_type: "ORDER_PAID", order: { order_invoice_number, ... }, transaction }
// ============================================================
router.post('/ipn', async (req, res) => {
    try {
        const body = req.body;
        console.log('📨 SePay IPN received:', JSON.stringify(body));

        // Xác thực X-Secret-Key
        const config = await getPaymentConfig();
        const secretKey = config.secret_key || process.env.SEPAY_SECRET_KEY || '';
        if (secretKey) {
            const xSecretKey = req.headers['x-secret-key'] || '';
            if (xSecretKey !== secretKey) {
                console.warn('⚠️ IPN: X-Secret-Key không hợp lệ');
                return res.status(401).json({ error: 'Unauthorized' });
            }
        }

        const { notification_type, order } = body;

        if (notification_type !== 'ORDER_PAID') {
            console.log(`IPN notification_type=${notification_type}, bỏ qua`);
            return res.status(200).json({ success: true });
        }

        const orderCode = order?.order_invoice_number;
        if (!orderCode) {
            console.warn('⚠️ IPN: Không có order_invoice_number');
            return res.status(200).json({ success: true });
        }

        // Kiểm tra đã xử lý trong DB chưa (tránh duplicate)
        const [existing] = await pool.execute(
            'SELECT id FROM payment_orders WHERE order_code = ? AND status = ? LIMIT 1',
            [orderCode, 'paid']
        );
        if (existing.length) {
            console.log(`IPN: Đơn ${orderCode} đã được xử lý trước đó`);
            return res.status(200).json({ success: true });
        }

        // Lấy thông tin từ pendingOrders Map (ưu tiên) hoặc từ IPN payload (fallback sau restart)
        const pending = pendingOrders.get(orderCode);
        const userId   = pending?.userId   ?? parseInt(order?.customer_id);
        const packageId = pending?.packageId ?? null;
        const amount   = pending?.amount   ?? parseInt(order?.order_amount);
        const description = pending?.description ?? (order?.order_description || '');

        if (!userId) {
            console.warn(`⚠️ IPN: Không xác định được user cho đơn ${orderCode}`);
            return res.status(200).json({ success: true });
        }

        // INSERT vào DB lần đầu tiên khi thành công
        await pool.execute(
            `INSERT INTO payment_orders (user_id, order_code, package_id, amount, description, status, paid_at)
             VALUES (?, ?, ?, ?, ?, 'paid', NOW())
             ON DUPLICATE KEY UPDATE status='paid', paid_at=NOW()`,
            [userId, orderCode, packageId || '', amount || 0, description]
        );

        if (packageId) await upgradePlan(userId, packageId);
        pendingOrders.delete(orderCode);

        console.log(`✅ IPN: Đã xác nhận đơn ${orderCode}, nâng cấp user ${userId}`);
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Lỗi xử lý SePay IPN:', error);
        return res.status(200).json({ success: true }); // Luôn trả 200
    }
});

// ============================================================
// POST /api/payment/verify-return
// Gọi từ frontend khi user redirect về success_url
// Dùng SePay API để xác nhận trạng thái thật sự của đơn
// ============================================================
router.post('/verify-return', authenticateToken, async (req, res) => {
    try {
        const orderCode = String(req.body?.orderCode || '').trim();
        if (!orderCode) {
            return res.status(400).json({ success: false, message: 'Thiếu orderCode' });
        }

        // 1. Đã paid trong DB (IPN xử lý trước) → trả về ngay
        const [existing] = await pool.execute(
            'SELECT * FROM payment_orders WHERE order_code = ? AND user_id = ? AND status = ? LIMIT 1',
            [orderCode, req.user.id, 'paid']
        );
        if (existing.length) {
            const [users] = await pool.execute(
                `SELECT id, username, email, full_name, avatar, created_at, updated_at,
                        is_admin, account_status, plan_type, pro_expires_at
                 FROM users WHERE id = ?`, [req.user.id]
            );
            return res.json({ success: true, data: { status: 'paid', order: existing[0], user: users[0] || null } });
        }

        // 2. Lấy thông tin đơn từ pendingOrders Map
        const pending = pendingOrders.get(orderCode);
        if (!pending || pending.userId !== req.user.id) {
            // Không có trong Map (server restart?) → báo pending, frontend sẽ retry
            return res.json({ success: true, data: { status: 'pending' } });
        }

        // 3. Query SePay API để xác nhận trạng thái
        try {
            const { client } = await getSePayClient();
            const sePayOrder = await client.order.retrieve(orderCode);
            console.log(`🔍 SePay order.retrieve(${orderCode}):`, JSON.stringify(sePayOrder));

            // Tìm status trong nhiều nơi có thể của response
            const rawStatus = String(
                sePayOrder?.order_status ||
                sePayOrder?.data?.order_status ||
                sePayOrder?.order?.order_status ||
                sePayOrder?.status ||
                sePayOrder?.data?.status ||
                ''
            ).toUpperCase();

            console.log(`🔍 SePay rawStatus for ${orderCode}: "${rawStatus}"`);

            const isPaid = ['CAPTURED', 'PAID', 'COMPLETED', 'SUCCESS', 'AUTHORIZED'].includes(rawStatus);

            if (isPaid || rawStatus === '') {
                // isPaid: SePay xác nhận đã thanh toán
                // rawStatus === '': API không trả status → trust redirect
                await pool.execute(
                    `INSERT INTO payment_orders (user_id, order_code, package_id, amount, description, status, paid_at)
                     VALUES (?, ?, ?, ?, ?, 'paid', NOW())
                     ON DUPLICATE KEY UPDATE status='paid', paid_at=NOW()`,
                    [pending.userId, orderCode, pending.packageId, pending.amount, pending.description]
                );
                await upgradePlan(pending.userId, pending.packageId);
                pendingOrders.delete(orderCode);

                const [users] = await pool.execute(
                    `SELECT id, username, email, full_name, avatar, created_at, updated_at,
                            is_admin, account_status, plan_type, pro_expires_at
                     FROM users WHERE id = ?`,
                    [req.user.id]
                );

                console.log(`✅ verify-return: Đơn ${orderCode} PAID (status="${rawStatus}"), nâng cấp user ${req.user.id}`);
                return res.json({ success: true, data: { status: 'paid', user: users[0] || null, order: { order_code: orderCode, package_id: pending.packageId, amount: pending.amount, description: pending.description, status: 'paid' } } });
            }

            // SePay trả status khác (vd: INITIATED, PENDING...) → retry
            return res.json({ success: true, data: { status: rawStatus || 'pending' } });

        } catch (apiErr) {
            console.error('Lỗi gọi SePay order.retrieve:', apiErr.message);

            // Fallback: SePay API không trả lời được, nhưng user đã redirect đến success_url
            // → SePay chỉ redirect khi đã thanh toán thật sự.
            // An toàn: đơn phải được tạo trong vòng 2 giờ
            const orderAgeMs = Date.now() - pending.createdAt;
            const twoHours = 2 * 60 * 60 * 1000;

            if (orderAgeMs <= twoHours) {
                console.warn(`⚠️ SePay API lỗi, trust success_url redirect cho đơn ${orderCode} (age: ${Math.round(orderAgeMs / 60000)} phút)`);

                await pool.execute(
                    `INSERT INTO payment_orders (user_id, order_code, package_id, amount, description, status, paid_at)
                     VALUES (?, ?, ?, ?, ?, 'paid', NOW())
                     ON DUPLICATE KEY UPDATE status='paid', paid_at=NOW()`,
                    [pending.userId, orderCode, pending.packageId, pending.amount, pending.description]
                );
                await upgradePlan(pending.userId, pending.packageId);
                pendingOrders.delete(orderCode);

                const [users] = await pool.execute(
                    `SELECT id, username, email, full_name, avatar, created_at, updated_at,
                            is_admin, account_status, plan_type, pro_expires_at
                     FROM users WHERE id = ?`,
                    [req.user.id]
                );

                return res.json({ success: true, data: { status: 'paid', user: users[0] || null, order: { order_code: orderCode, package_id: pending.packageId, amount: pending.amount, description: pending.description, status: 'paid' } } });
            }

            return res.json({ success: true, data: { status: 'pending', error: apiErr.message } });
        }

    } catch (error) {
        console.error('Lỗi verify-return:', error);
        return res.status(500).json({ success: false, message: 'Lỗi xác nhận thanh toán' });
    }
});

// ============================================================
// GET /api/payment/check/:orderCode - Kiểm tra trạng thái thanh toán
// ============================================================
router.get('/check/:orderCode', authenticateToken, async (req, res) => {
    try {
        const orderCode = String(req.params.orderCode);

        // Kiểm tra trong DB (chỉ đơn đã paid)
        const [orders] = await pool.execute(
            'SELECT * FROM payment_orders WHERE order_code = ? AND user_id = ? AND status = ? LIMIT 1',
            [orderCode, req.user.id, 'paid']
        );

        if (orders.length > 0) {
            const [users] = await pool.execute(
                `SELECT id, username, email, full_name, avatar, created_at, updated_at,
                        is_admin, account_status, plan_type, pro_expires_at
                 FROM users WHERE id = ?`,
                [req.user.id]
            );
            return res.json({
                success: true,
                data: { status: 'paid', order: orders[0], user: users[0] || null }
            });
        }

        // Kiểm tra trong Map (chưa thanh toán)
        const pending = pendingOrders.get(orderCode);
        if (pending && pending.userId === req.user.id) {
            return res.json({
                success: true,
                data: { status: 'pending', order: { order_code: orderCode, package_id: pending.packageId, amount: pending.amount } }
            });
        }

        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

    } catch (error) {
        console.error('Lỗi kiểm tra thanh toán:', error);
        return res.status(500).json({ success: false, message: 'Lỗi kiểm tra trạng thái thanh toán' });
    }
});

// ============================================================
// GET /api/payment/history - Lịch sử thanh toán (chỉ đơn đã thanh toán thành công)
// ============================================================
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const [orders] = await pool.execute(
            `SELECT id, order_code, package_id, amount, description, status, paid_at, created_at
             FROM payment_orders
             WHERE user_id = ? AND status = 'paid'
             ORDER BY paid_at DESC
             LIMIT 50`,
            [req.user.id]
        );

        return res.json({
            success: true,
            data: orders
        });

    } catch (error) {
        console.error('Lỗi lấy lịch sử thanh toán:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi lấy lịch sử thanh toán'
        });
    }
});

// ============================================================
// POST /api/payment/cancel/:orderCode - Hủy đơn thanh toán
// ============================================================
router.post('/cancel/:orderCode', authenticateToken, async (req, res) => {
    try {
        const orderCode = String(req.params.orderCode);

        // Kiểm tra đơn có trong Map không
        const pending = pendingOrders.get(orderCode);
        if (!pending || pending.userId !== req.user.id) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng đang chờ' });
        }

        // Xóa khỏi Map
        pendingOrders.delete(orderCode);

        // Thử hủy trên SePay PG (non-fatal nếu lỗi)
        try {
            const { client } = await getSePayClient();
            await client.order.cancel(orderCode);
        } catch (e) {
            console.warn('SePay cancel error (non-fatal):', e.message);
        }

        console.log(`🚫 Đơn hàng ${orderCode} đã bị hủy (xóa khỏi Map, không ghi vào DB)`);
        return res.json({ success: true, message: 'Đã hủy đơn thanh toán' });

    } catch (error) {
        console.error('Lỗi hủy thanh toán:', error);
        return res.status(500).json({ success: false, message: 'Lỗi hủy thanh toán' });
    }
});

// ============================================================
// VNPAY PAYMENT INTEGRATION
// Dựa trên mẫu chính thức CTT VNPAY (vnpay_nodejs)
// ============================================================

/**
 * sortObject - Lấy nguyên từ code demo VNPAY:
 * - Sắp xếp key theo alphabet
 * - encodeURIComponent từng giá trị và replace %20 → +
 *   (không encode: space trở thành + thay vì %20)
 * OUTPUT: object đã encode → stringify với encode:false để ký
 */
// sortObject dựa nguyên mẫu chính thức Node.js của VNPAY:
// - Không bỏ qua giá trị rỗng (để checksum khớp khi VNPAY trả về tham số tùy chọn có giá trị rỗng)
// - encodeURIComponent key và value, replace %20 → +
function vnpaySortObject(obj) {
    const sorted = {};
    const str = [];
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (let i = 0; i < str.length; i++) {
        const originalKey = decodeURIComponent(str[i]);
        sorted[str[i]] = encodeURIComponent(obj[originalKey]).replace(/%20/g, '+');
    }
    return sorted;
}

/**
 * Lấy cấu hình VNPAY từ DB hoặc fallback về .env
 */
async function getVnpayConfig() {
    const config = await getPaymentConfig();
    const cfg = {
        tmnCode:    (config.vnpay_tmn_code    || process.env.VNPAY_TMN_CODE    || '').trim(),
        hashSecret: (config.vnpay_hash_secret || process.env.VNPAY_HASH_SECRET || '').trim(),
        vnpUrl:     (config.vnpay_url         || process.env.VNPAY_URL         || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html').trim(),
        returnUrl:  (config.vnpay_return_url  || process.env.VNPAY_RETURN_URL  || '').trim()
    };
    console.log(`[VNPAY Config] tmnCode=${cfg.tmnCode ? cfg.tmnCode : '(chưa có)'} hashSecret=${cfg.hashSecret ? cfg.hashSecret.slice(0,4)+'...' : '(chưa có)'} returnUrl=${cfg.returnUrl}`);
    return cfg;
}

/**
 * Tạo chữ ký HMAC-SHA512 đúng chuẩn VNPAY:
 * - sortObject đã encodeURIComponent các giá trị
 * - qs.stringify với encode:false (đã encode rồi, không encode lần nữa)
 */
function vnpaySign(params, hashSecret) {
    const sorted = vnpaySortObject(params);
    const signData = qs.stringify(sorted, { encode: false });
    console.log('[VNPAY Sign] signData:', signData.slice(0, 120) + '...');
    const hmac = crypto.createHmac('sha512', hashSecret);
    return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
}

/**
 * Tự động phát hiện base URL từ request headers.
 * Hoạt động đúng trên: localhost, ngrok, bất kỳ domain/reverse-proxy nào.
 *  - http://localhost:3000       khi chạy local
 *  - https://xxx.ngrok-free.app  khi qua ngrok
 *  - https://yourdomain.com      khi deploy thật
 * Không cần cấu hình thủ công.
 */
function getBaseUrl(req) {
    // x-forwarded-proto: ngrok/proxy đặt header này (có thể là 'https,http' nếu nhiều proxy)
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http')
        .split(',')[0].trim();
    // x-forwarded-host: ngrok đặt host gốc; fallback về Host header
    const host = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000')
        .split(',')[0].trim();
    return `${proto}://${host}`;
}

/**
 * Chuyển IP về dạng IPv4 thuần (bỏ prefix ::ffff: nếu có)
 */
function normalizeIp(ip) {
    if (!ip) return '127.0.0.1';
    // Bỏ ::ffff: prefix (IPv4-mapped IPv6)
    const cleaned = ip.replace(/^::ffff:/, '').trim();
    // Lấy địa chỉ đầu tiên nếu có nhiều IP (x-forwarded-for)
    const first = cleaned.split(',')[0].trim();
    // Nếu vẫn là IPv6 hoặc không xác định → fallback
    if (first === '::1' || first.includes(':')) return '127.0.0.1';
    return first;
}

function vnpayCreateUrl(orderCode, amountVnd, orderInfo, ipAddr, vnpConfig) {
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    const now = new Date();

    const pad2 = n => String(n).padStart(2, '0');
    const createDate = `${now.getFullYear()}${pad2(now.getMonth()+1)}${pad2(now.getDate())}${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;

    const safeIp = normalizeIp(ipAddr);

    // Thời gian hết hạn thanh toán: 15 phút sau thời điểm tạo (theo yêu cầu VNPAY)
    const expire = new Date(now.getTime() + 15 * 60 * 1000);
    const expireDate = `${expire.getFullYear()}${pad2(expire.getMonth()+1)}${pad2(expire.getDate())}${pad2(expire.getHours())}${pad2(expire.getMinutes())}${pad2(expire.getSeconds())}`;

    // Params trước ký — GIỮ NGUYÊN GIÁ TRỊ gốc (không chứa vnp_SecureHash)
    const params = {
        vnp_Version:    '2.1.0',
        vnp_Command:    'pay',
        vnp_TmnCode:    vnpConfig.tmnCode,
        vnp_Locale:     'vn',
        vnp_CurrCode:   'VND',
        vnp_TxnRef:     String(orderCode),
        vnp_OrderInfo:  orderInfo,
        vnp_OrderType:  'other',
        vnp_Amount:     String(amountVnd * 100),
        vnp_ReturnUrl:  vnpConfig.returnUrl,
        vnp_IpAddr:     safeIp,
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate
    };

    console.log('[VNPAY] params trước ký:', JSON.stringify(params));

    // 1. Sắp xếp và mã hoá các tham số theo chuẩn Alphabet
    const finalSorted = vnpaySortObject(params);

    // 2. Tạo chuỗi ký và ký HMAC-SHA512
    const signData = qs.stringify(finalSorted, { encode: false });
    console.log('[VNPAY Sign] signData:', signData);

    const hmac = crypto.createHmac('sha512', vnpConfig.hashSecret);
    const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // 3. Gắn chữ ký bảo mật ở CUỐI CÙNG của đối tượng tham số đã sắp xếp (không chạy sort lại)
    finalSorted['vnp_SecureHash'] = secureHash;

    // 4. Tạo URL hoàn chỉnh với query string
    const queryStr = qs.stringify(finalSorted, { encode: false });
    const finalUrl = vnpConfig.vnpUrl + '?' + queryStr;
    console.log('[VNPAY] Final URL (80 chars):', finalUrl.slice(0, 80) + '...');
    return finalUrl;
}

function vnpayVerify(vnpParams, hashSecret) {
    const secureHash = vnpParams['vnp_SecureHash'];
    
    // Chỉ lọc các tham số bắt đầu bằng "vnp_" theo quy định của VNPAY
    const params = {};
    for (const key in vnpParams) {
        if (vnpParams.hasOwnProperty(key) && key.startsWith('vnp_')) {
            params[key] = vnpParams[key];
        }
    }
    
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];
    
    // params từ req.query đã là plain text → sortObject sẽ encode lại đúng chuẩn
    const signed = vnpaySign(params, hashSecret);
    console.log('[VNPAY Verify] raw secureHash:', secureHash);
    console.log('[VNPAY Verify] calculated signed:', signed);
    return String(secureHash || '').toLowerCase() === String(signed || '').toLowerCase();
}

// ============================================================
// POST /api/payment/vnpay/create
// Tạo URL VNPAY và redirect người dùng
// ============================================================
router.post('/vnpay/create', authenticateToken, async (req, res) => {
    try {
        const packageId = String(req.body?.package_id || '').trim();
        const packages = await getPlanPackages();
        const selectedPackage = packages[packageId];

        if (!selectedPackage) {
            return res.status(400).json({ success: false, message: 'Gói nâng cấp không hợp lệ' });
        }

        const vnpConfig = await getVnpayConfig();
        if (!vnpConfig.tmnCode || !vnpConfig.hashSecret) {
            return res.status(500).json({ success: false, message: 'Cổng VNPAY chưa được cấu hình. Liên hệ admin để kích hoạt.' });
        }

        // Tạo mã đơn hàng duy nhất (≤ 8 ký tự số, theo mẫu VNPAY)
        const now = new Date();
        const pad2 = n => String(n).padStart(2, '0');
        const orderCode = `${pad2(now.getDate())}${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
        // orderInfo: chỉ chữ, số, khoảng trắng — không ký tự đặc biệt
        const orderInfo = `Thanh toan goi ${selectedPackage.name}`;

        // Lấy IP và chuẩn hoá về IPv4
        const rawIp = req.headers['x-forwarded-for'] ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            '127.0.0.1';
        const ipAddr = normalizeIp(rawIp);
        console.log(`[VNPAY] IP: raw=${rawIp} → normalized=${ipAddr}`);

        // Lưu vào pendingOrders Map (tái sử dụng cùng Map với SePay)
        pendingOrders.set(orderCode, {
            userId: req.user.id,
            packageId,
            amount: selectedPackage.price,
            description: orderInfo,
            gateway: 'vnpay',
            createdAt: Date.now()
        });

        // returnUrl: tự động lấy từ request — hoạt động đúng với localhost, ngrok, bất kỳ domain nào
        const dynamicReturnUrl = `${getBaseUrl(req)}/api/payment/vnpay/return`;
        const effectiveVnpConfig = { ...vnpConfig, returnUrl: dynamicReturnUrl };
        console.log(`[VNPAY] returnUrl (auto): ${dynamicReturnUrl}`);

        const payUrl = vnpayCreateUrl(orderCode, selectedPackage.price, orderInfo, ipAddr, effectiveVnpConfig);

        console.log(`🏧 VNPAY: Tạo đơn ${orderCode} (${selectedPackage.name}) cho user ${req.user.id}`);

        return res.json({
            success: true,
            data: { payUrl, orderCode, package: selectedPackage }
        });

    } catch (error) {
        console.error('Lỗi tạo thanh toán VNPAY:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Không thể tạo đơn thanh toán VNPAY. Vui lòng thử lại.'
        });
    }
});

// ============================================================
// GET /api/payment/vnpay/return
// VNPAY redirect người dùng về sau khi thanh toán
// ============================================================
router.get('/vnpay/return', async (req, res) => {
    try {
        const vnpParams = { ...req.query };
        const orderCode   = vnpParams['vnp_TxnRef'] || '';
        const responseCode = vnpParams['vnp_ResponseCode'] || '';

        // Tự động phát hiện base URL từ request (localhost / ngrok / bất kỳ domain)
        const APP_URL = getBaseUrl(req);

        // Xác thực chữ ký số từ VNPAY
        const vnpConfig = await getVnpayConfig();
        if (!vnpConfig.hashSecret) {
            return res.redirect(`${APP_URL}/dashboard.html?payment=error&orderCode=${orderCode}&gateway=vnpay`);
        }

        const isValid = vnpayVerify(vnpParams, vnpConfig.hashSecret);
        if (!isValid) {
            console.warn(`⚠️ VNPAY return: Chữ ký không hợp lệ cho đơn ${orderCode}`);
            return res.redirect(`${APP_URL}/dashboard.html?payment=error&orderCode=${orderCode}&gateway=vnpay`);
        }

        if (responseCode === '00') {
            // Thanh toán thành công — lưu DB và nâng cấp plan
            const [existing] = await pool.execute(
                'SELECT id FROM payment_orders WHERE order_code = ? AND status = ? LIMIT 1',
                [orderCode, 'paid']
            );

            if (!existing.length) {
                const pending = pendingOrders.get(orderCode);
                const userId    = pending?.userId;
                const packageId = pending?.packageId;
                const amount    = pending?.amount;
                const description = pending?.description || vnpParams['vnp_OrderInfo'] || '';

                if (userId) {
                    await pool.execute(
                        `INSERT INTO payment_orders (user_id, order_code, package_id, amount, description, status, paid_at)
                         VALUES (?, ?, ?, ?, ?, 'paid', NOW())
                         ON DUPLICATE KEY UPDATE status='paid', paid_at=NOW()`,
                        [userId, orderCode, packageId || '', amount || 0, description || '']
                    );
                    if (packageId) await upgradePlan(userId, packageId);
                    pendingOrders.delete(orderCode);
                    console.log(`✅ VNPAY return: Đơn ${orderCode} PAID, nâng cấp user ${userId}`);
                }
            }

            return res.redirect(`${APP_URL}/dashboard.html?payment=success&orderCode=${orderCode}&gateway=vnpay`);
        } else {
            console.log(`❌ VNPAY return: Đơn ${orderCode} thất bại, ResponseCode=${responseCode}`);
            return res.redirect(`${APP_URL}/dashboard.html?payment=error&orderCode=${orderCode}&gateway=vnpay&vnp_code=${responseCode}`);
        }

    } catch (error) {
        console.error('Lỗi xử lý VNPAY return:', error);
        const fallbackUrl = getBaseUrl(req);
        return res.redirect(`${fallbackUrl}/dashboard.html?payment=error&gateway=vnpay`);
    }
});

// ============================================================
// GET /api/payment/vnpay/ipn
// VNPAY gọi server-to-server để xác nhận giao dịch (IPN)
// ============================================================
router.get('/vnpay/ipn', async (req, res) => {
    try {
        console.log('📨 VNPAY IPN Request query:', JSON.stringify(req.query));
        const vnpParams    = { ...req.query };
        const orderCode    = vnpParams['vnp_TxnRef'] || '';
        const rspCode      = vnpParams['vnp_ResponseCode'] || '';
        const vnpAmount    = parseInt(vnpParams['vnp_Amount'] || '0') / 100; // VNPAY gửi số * 100

        const vnpConfig = await getVnpayConfig();
        if (!vnpConfig.hashSecret) {
            return res.status(200).json({ RspCode: '99', Message: 'VNPAY not configured' });
        }

        // Bước 1: Xác thực checksum
        const isValid = vnpayVerify(vnpParams, vnpConfig.hashSecret);
        if (!isValid) {
            console.warn(`⚠️ VNPAY IPN: Checksum failed cho đơn ${orderCode}`);
            return res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
        }

        // Bước 2: Kiểm tra orderCode tồn tại
        const pending = pendingOrders.get(orderCode);
        const [dbOrders] = await pool.execute(
            'SELECT id, status FROM payment_orders WHERE order_code = ? LIMIT 1',
            [orderCode]
        );

        if (!pending && !dbOrders.length) {
            console.warn(`⚠️ VNPAY IPN: Không tìm thấy đơn ${orderCode}`);
            return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
        }

        // Bước 3: Kiểm tra đã xử lý chưa (tránh duplicate)
        if (dbOrders.length && dbOrders[0].status === 'paid') {
            console.log(`VNPAY IPN: Đơn ${orderCode} đã xử lý trước đó`);
            return res.status(200).json({ RspCode: '02', Message: 'This order has been updated to the payment status' });
        }

        // Bước 4: Kiểm tra số tiền khớp (nếu còn trong pendingOrders)
        if (pending && Math.abs(vnpAmount - pending.amount) > 0) {
            console.warn(`⚠️ VNPAY IPN: Số tiền không khớp cho đơn ${orderCode}: expected ${pending.amount}, got ${vnpAmount}`);
            return res.status(200).json({ RspCode: '04', Message: 'Amount invalid' });
        }

        // Bước 5: Xử lý kết quả
        // Theo tài liệu VNPAY: kiểm tra cả vnp_ResponseCode VÀ vnp_TransactionStatus
        const transactionStatus = vnpParams['vnp_TransactionStatus'] || '';
        if (rspCode === '00' && transactionStatus === '00') {
            // Thanh toán thành công
            const userId    = pending?.userId    ?? null;
            const packageId = pending?.packageId ?? null;
            const amount    = pending?.amount    ?? vnpAmount;
            const description = pending?.description ?? `VNPAY Order ${orderCode}`;

            if (userId) {
                await pool.execute(
                    `INSERT INTO payment_orders (user_id, order_code, package_id, amount, description, status, paid_at)
                     VALUES (?, ?, ?, ?, ?, 'paid', NOW())
                     ON DUPLICATE KEY UPDATE status='paid', paid_at=NOW()`,
                    [userId, orderCode, packageId || '', amount, description]
                );
                if (packageId) await upgradePlan(userId, packageId);
                pendingOrders.delete(orderCode);
                console.log(`✅ VNPAY IPN: Đơn ${orderCode} PAID, nâng cấp user ${userId}`);
            }

            return res.status(200).json({ RspCode: '00', Message: 'Confirm success' });
        } else {
            // Thanh toán thất bại
            pendingOrders.delete(orderCode);
            console.log(`❌ VNPAY IPN: Đơn ${orderCode} thất bại, RspCode=${rspCode}`);
            return res.status(200).json({ RspCode: '00', Message: 'Confirm success' });
        }

    } catch (error) {
        console.error('Lỗi xử lý VNPAY IPN:', error);
        return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
    }
});

module.exports = router;
