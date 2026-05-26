const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');
const { SePayPgClient } = require('sepay-pg-node');

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

// Lấy gói kèm giá từ DB (fallback sang mặc định)
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
                package_id VARCHAR(20) NOT NULL,
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
        return res.json({ success: true, data: prices });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy giá gói', error: e.message });
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

        const APP_URL = (config.app_url || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

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

module.exports = router;
