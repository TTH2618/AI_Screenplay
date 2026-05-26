const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const { pool } = require('../config/database');
const authRouter = require('./auth');
const authenticateToken = authRouter.authenticateToken;

async function ensureAdmin(req, res, next) {
    try {
        const [rows] = await pool.execute(
            'SELECT id, is_admin, account_status FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Không tìm thấy tài khoản' });
        }

        const account = rows[0];
        if (account.account_status === 'banned') {
            return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
        }
        if (!account.is_admin) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền quản trị' });
        }

        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi xác thực quyền admin', error: error.message });
    }
}

function maskApiKey(key) {
    if (!key) return '';
    if (key.length <= 8) return '****';
    return `${key.slice(0, 4)}${'*'.repeat(Math.max(4, key.length - 8))}${key.slice(-4)}`;
}

async function tableCount(tableName, whereClause = '', params = []) {
    const sql = `SELECT COUNT(*) AS total FROM \`${tableName}\`${whereClause ? ` WHERE ${whereClause}` : ''}`;
    const [rows] = await pool.execute(sql, params);
    return rows[0]?.total || 0;
}

router.use(authenticateToken, ensureAdmin);

router.get('/dashboard', async (req, res) => {
    try {
        const [usersTotal] = await pool.execute('SELECT COUNT(*) AS total FROM users');
        const [usersToday] = await pool.execute('SELECT COUNT(*) AS total FROM users WHERE DATE(created_at) = CURDATE()');
        const [usersWeek] = await pool.execute('SELECT COUNT(*) AS total FROM users WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)');
        const [usersMonth] = await pool.execute('SELECT COUNT(*) AS total FROM users WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())');
                const [proTotal] = await pool.execute(
                        `SELECT COUNT(*) AS total
                         FROM users
                         WHERE plan_type = 'pro' AND (pro_expires_at IS NULL OR pro_expires_at >= NOW())`
                );
                const [proGrowthSeries] = await pool.execute(
                        `SELECT DATE(updated_at) AS d, COUNT(*) AS total
                         FROM users
                         WHERE plan_type = 'pro'
                             AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
                         GROUP BY DATE(updated_at)
                         ORDER BY DATE(updated_at)`
                );

        const projectTotal = await tableCount('projects');

        const aiTables = ['loglines', 'stories', 'themes', 'characters', 'synopses', 'structures', 'developments', 'beatsheets', 'scenelists', 'scripts'];
        let aiContentTotal = 0;
        for (const tableName of aiTables) {
            try {
                aiContentTotal += await tableCount(tableName);
            } catch (e) {
                // Skip optional tables.
            }
        }

        const [callsTodayRows] = await pool.execute(
            'SELECT COUNT(*) AS total FROM ai_generation_logs WHERE DATE(created_at) = CURDATE()'
        );
        const [latencyRows] = await pool.execute(
            'SELECT AVG(latency_ms) AS avg_latency FROM ai_generation_logs WHERE DATE(created_at) = CURDATE() AND status = ? ',
            ['success']
        );
        const [errorsTodayRows] = await pool.execute(
            'SELECT COUNT(*) AS total FROM ai_generation_logs WHERE DATE(created_at) = CURDATE() AND status != ? ',
            ['success']
        );

        const [dailySeries] = await pool.execute(
            `SELECT DATE(created_at) AS d, COUNT(*) AS total
             FROM ai_generation_logs
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
             GROUP BY DATE(created_at)
             ORDER BY DATE(created_at)`
        );

        return res.json({
            success: true,
            data: {
                users: {
                    total: usersTotal[0].total,
                    new_today: usersToday[0].total,
                    new_week: usersWeek[0].total,
                    new_month: usersMonth[0].total,
                    pro_total: proTotal[0].total,
                    pro_growth_last_14_days: proGrowthSeries
                },
                resources: {
                    total_projects: projectTotal,
                    total_ai_contents: aiContentTotal
                },
                ai_flow: {
                    provider_calls_today: callsTodayRows[0].total,
                    python_avg_latency_ms: Number(latencyRows[0].avg_latency || 0).toFixed(0),
                    failed_calls_today: errorsTodayRows[0].total,
                    calls_last_14_days: dailySeries
                }
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi tải dashboard admin', error: error.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        const params = [];
        let where = '';

        if (q) {
            where = 'WHERE username LIKE ? OR email LIKE ?';
            params.push(`%${q}%`, `%${q}%`);
        }

        const [rows] = await pool.execute(
            `SELECT id, username, email, full_name, is_admin, account_status, plan_type, pro_expires_at, created_at, last_login_at
             FROM users
             ${where}
             ORDER BY created_at DESC
             LIMIT 300`,
            params
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách người dùng', error: error.message });
    }
});

router.put('/users/:id', async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { is_admin, account_status, plan_type, pro_expires_at } = req.body;

        // Nếu hạ xuống free thì xóa hạn PRO
        const resolvedProExpiresAt = plan_type === 'free' ? null : (pro_expires_at || null);

        await pool.execute(
            `UPDATE users
             SET is_admin = COALESCE(?, is_admin),
                 account_status = COALESCE(?, account_status),
                 plan_type = COALESCE(?, plan_type),
                 pro_expires_at = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [
                typeof is_admin === 'boolean' ? (is_admin ? 1 : 0) : null,
                account_status || null,
                plan_type || null,
                resolvedProExpiresAt,
                userId
            ]
        );

        return res.json({ success: true, message: 'Đã cập nhật người dùng' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật người dùng', error: error.message });
    }
});

router.get('/generation-logs', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT id, user_id, project_id, tool_id, provider, model_name, status, latency_ms, error_type, error_message, created_at
             FROM ai_generation_logs
             ORDER BY created_at DESC
             LIMIT 500`
        );

        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy lịch sử AI', error: error.message });
    }
});

router.get('/system-prompts', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT tool_id, prompt_text, updated_at, updated_by FROM system_prompts WHERE is_active = 1 ORDER BY tool_id ASC'
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy prompt hệ thống', error: error.message });
    }
});

router.put('/system-prompts/:toolId', async (req, res) => {
    try {
        const toolId = req.params.toolId;
        const promptText = (req.body.prompt_text || '').trim();
        if (!promptText) {
            return res.status(400).json({ success: false, message: 'prompt_text không được trống' });
        }

        await pool.execute(
            `INSERT INTO system_prompts (tool_id, prompt_text, is_active, updated_by)
             VALUES (?, ?, 1, ?)
             ON DUPLICATE KEY UPDATE
               prompt_text = VALUES(prompt_text),
               is_active = 1,
               updated_by = VALUES(updated_by),
               updated_at = CURRENT_TIMESTAMP`,
            [toolId, promptText, req.user.id]
        );

        return res.json({ success: true, message: 'Đã cập nhật system prompt' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật prompt', error: error.message });
    }
});

router.get('/api-keys', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT provider, api_key, updated_at FROM api_credentials WHERE is_active = 1 ORDER BY provider ASC'
        );

        const masked = rows.map((row) => ({
            provider: row.provider,
            api_key_masked: maskApiKey(row.api_key),
            updated_at: row.updated_at
        }));

        return res.json({ success: true, data: masked });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy API keys', error: error.message });
    }
});

router.put('/api-keys/:provider', async (req, res) => {
    try {
        const provider = req.params.provider;
        const apiKey = (req.body.api_key || '').trim();
        if (!apiKey) {
            return res.status(400).json({ success: false, message: 'api_key không được trống' });
        }

        await pool.execute(
            `INSERT INTO api_credentials (provider, api_key, is_active, updated_by)
             VALUES (?, ?, 1, ?)
             ON DUPLICATE KEY UPDATE
               api_key = VALUES(api_key),
               is_active = 1,
               updated_by = VALUES(updated_by),
               updated_at = CURRENT_TIMESTAMP`,
            [provider, apiKey, req.user.id]
        );

        return res.json({ success: true, message: 'Đã cập nhật API key' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật API key', error: error.message });
    }
});

router.get('/projects', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT id, user_id, title, created_at
             FROM projects
             ORDER BY created_at DESC
             LIMIT 500`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách dự án', error: error.message });
    }
});

router.get('/story-files', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT id, user_id, original_name, stored_name, file_type, size_bytes, storage_path, extracted_chars, created_at
             FROM uploaded_story_files
             ORDER BY created_at DESC
             LIMIT 500`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách file truyện', error: error.message });
    }
});

router.delete('/story-files/:id', async (req, res) => {
    try {
        const fileId = Number(req.params.id);
        const [rows] = await pool.execute('SELECT id, storage_path FROM uploaded_story_files WHERE id = ?', [fileId]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy file' });
        }

        const absolutePath = path.resolve(path.join(__dirname, '..', '..', rows[0].storage_path));
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }

        await pool.execute('DELETE FROM uploaded_story_files WHERE id = ?', [fileId]);
        return res.json({ success: true, message: 'Đã xóa file truyện' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi xóa file truyện', error: error.message });
    }
});

// ============================================================
// GET /api/admin/payment-settings — Lấy cấu hình cổng thanh toán
// ============================================================
router.get('/payment-settings', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT setting_key, setting_value FROM payment_settings');
        const settings = {};
        rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
        // Ẩn secret_key thật
        if (settings.secret_key) {
            settings.secret_key_masked = maskApiKey(settings.secret_key);
            delete settings.secret_key;
        }
        return res.json({ success: true, data: settings });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy cấu hình thanh toán', error: e.message });
    }
});

// ============================================================
// PUT /api/admin/payment-settings — Cập nhật cấu hình cổng thanh toán
// ============================================================
router.put('/payment-settings', async (req, res) => {
    try {
        const allowed = ['merchant_id', 'secret_key', 'env', 'app_url'];
        for (const key of allowed) {
            if (req.body[key] !== undefined && String(req.body[key]).trim() !== '') {
                const val = String(req.body[key]).trim();
                await pool.execute(
                    `INSERT INTO payment_settings (setting_key, setting_value)
                     VALUES (?, ?)
                     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
                    [key, val]
                );
            }
        }
        return res.json({ success: true, message: 'Đã cập nhật cấu hình thanh toán' });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật cấu hình thanh toán', error: e.message });
    }
});

// ============================================================
// GET /api/admin/plan-prices — Lấy giá các gói nâng cấp
// ============================================================
router.get('/plan-prices', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT setting_key, setting_value FROM payment_settings WHERE setting_key IN ('price_pro_1m','price_pro_3m','price_pro_1y')"
        );
        const prices = { pro_1m: 199000, pro_3m: 250000, pro_1y: 800000 };
        rows.forEach(r => {
            const key = r.setting_key.replace('price_', '');
            prices[key] = parseInt(r.setting_value) || prices[key];
        });
        return res.json({ success: true, data: prices });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy giá gói', error: e.message });
    }
});

// ============================================================
// PUT /api/admin/plan-prices — Cập nhật giá các gói nâng cấp
// ============================================================
router.put('/plan-prices', async (req, res) => {
    try {
        const keys = ['pro_1m', 'pro_3m', 'pro_1y'];
        for (const key of keys) {
            const price = parseInt(req.body[key]);
            if (isNaN(price) || price < 1000) {
                return res.status(400).json({ success: false, message: `Giá gói ${key} không hợp lệ (tối thiểu 1.000đ)` });
            }
            await pool.execute(
                `INSERT INTO payment_settings (setting_key, setting_value)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
                [`price_${key}`, String(price)]
            );
        }
        return res.json({ success: true, message: 'Đã cập nhật giá gói thành công' });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật giá gói', error: e.message });
    }
});

// ============================================================
// GET /api/admin/payment-orders — Lịch sử giao dịch toàn hệ thống
// ============================================================
router.get('/payment-orders', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        const status = (req.query.status || '').trim();
        const conditions = [];
        const params = [];

        if (q) {
            conditions.push('(u.username LIKE ? OR u.email LIKE ? OR CAST(po.order_code AS CHAR) LIKE ?)');
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }
        if (status && ['pending', 'paid', 'cancelled', 'expired'].includes(status)) {
            conditions.push('po.status = ?');
            params.push(status);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [rows] = await pool.execute(
            `SELECT po.id, po.order_code, po.package_id, po.amount, po.description,
                    po.status, po.paid_at, po.created_at, po.user_id,
                    u.username, u.email
             FROM payment_orders po
             LEFT JOIN users u ON po.user_id = u.id
             ${whereClause}
             ORDER BY po.created_at DESC
             LIMIT 500`,
            params
        );

        // Tổng kết
        const [summaryRows] = await pool.execute(
            `SELECT
                COUNT(*) AS total_orders,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_orders,
                SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS total_revenue,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_orders,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders
             FROM payment_orders`
        );

        return res.json({
            success: true,
            data: rows,
            summary: summaryRows[0] || {}
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy lịch sử giao dịch', error: error.message });
    }
});

module.exports = router;
