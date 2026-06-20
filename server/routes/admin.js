const express = require('express');
const fs = require('fs');
const path = require('path');
const { saveToEnv, readEnvFile } = require('../config/envWriter');
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
        const [proThisMonth] = await pool.execute(
            `SELECT COUNT(*) AS total 
             FROM users 
             WHERE plan_type = 'pro' 
               AND YEAR(updated_at) = YEAR(CURDATE()) 
               AND MONTH(updated_at) = MONTH(CURDATE())`
        );
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
                    pro_this_month: proThisMonth[0].total,
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

router.delete('/users/:id', async (req, res) => {
    try {
        const userId = Number(req.params.id);
        if (!userId) {
            return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
        }

        // Ngăn chặn tự xóa tài khoản
        if (userId === req.user.id) {
            return res.status(400).json({ success: false, message: 'Bạn không thể tự xóa tài khoản của chính mình' });
        }

        // 1. Lấy đường dẫn avatar và các file truyện đã tải lên
        const [userRows] = await pool.execute(
            'SELECT avatar FROM users WHERE id = ?',
            [userId]
        );
        if (!userRows || userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }
        const user = userRows[0];

        const [storyRows] = await pool.execute(
            'SELECT storage_path FROM uploaded_story_files WHERE user_id = ?',
            [userId]
        );

        const [projectRows] = await pool.execute(
            'SELECT id FROM projects WHERE user_id = ?',
            [userId]
        );

        // 2. Dọn dẹp dữ liệu trong database không tự động cascade
        // Cập nhật updated_by trong bảng system_prompts về NULL
        await pool.execute(
            'UPDATE system_prompts SET updated_by = NULL WHERE updated_by = ?',
            [userId]
        );

        // Xóa các bản ghi file truyện đã upload
        await pool.execute(
            'DELETE FROM uploaded_story_files WHERE user_id = ?',
            [userId]
        );

        // Xóa nhật ký tạo AI
        await pool.execute(
            'DELETE FROM ai_generation_logs WHERE user_id = ?',
            [userId]
        );

        // Xóa đơn hàng thanh toán
        await pool.execute(
            'DELETE FROM payment_orders WHERE user_id = ?',
            [userId]
        );

        // 3. Xóa người dùng (Tự động cascade xóa các dự án và các bảng liên quan đến dự án)
        await pool.execute(
            'DELETE FROM users WHERE id = ?',
            [userId]
        );

        // 4. Dọn dẹp các tệp vật lý trên đĩa
        // Xóa file avatar
        if (user.avatar) {
            const relativeAvatar = user.avatar.replace(/^\//, '');
            const absoluteAvatar = path.resolve(path.join(__dirname, '..', '..', relativeAvatar));
            if (fs.existsSync(absoluteAvatar)) {
                try {
                    fs.unlinkSync(absoluteAvatar);
                } catch (err) {
                    console.error(`⚠️ Không thể xóa file avatar tại ${absoluteAvatar}:`, err.message);
                }
            }
        }

        // Xóa các file truyện đã upload
        if (storyRows && storyRows.length > 0) {
            for (const story of storyRows) {
                if (story.storage_path) {
                    const absoluteStory = path.resolve(path.join(__dirname, '..', '..', story.storage_path));
                    if (fs.existsSync(absoluteStory)) {
                        try {
                            fs.unlinkSync(absoluteStory);
                        } catch (err) {
                            console.error(`⚠️ Không thể xóa file truyện tại ${absoluteStory}:`, err.message);
                        }
                    }
                }
            }
        }

        // Xóa thư mục chứa nhân vật của các dự án
        if (projectRows && projectRows.length > 0) {
            for (const proj of projectRows) {
                const projectCharsDir = path.resolve(path.join(__dirname, '..', '..', 'uploads', 'characters', String(proj.id)));
                if (fs.existsSync(projectCharsDir)) {
                    try {
                        fs.rmSync(projectCharsDir, { recursive: true, force: true });
                    } catch (err) {
                        console.error(`⚠️ Không thể xóa thư mục nhân vật dự án tại ${projectCharsDir}:`, err.message);
                    }
                }
            }
        }

        return res.json({ success: true, message: 'Đã xóa toàn bộ dữ liệu người dùng khỏi hệ thống' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi khi xóa người dùng', error: error.message });
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

// ============================================================
// GET /api/admin/ai-config — Lấy cấu hình provider/model/key từ .env
// ============================================================
router.get('/ai-config', async (req, res) => {
    try {
        const provider = process.env.AI_PROVIDER || 'openrouter';
        const model = process.env.OPENROUTER_MODEL || '';
        const apiKey = process.env.OPENROUTER_API_KEY || '';

        return res.json({
            success: true,
            data: {
                provider,
                model,
                api_key_masked: apiKey ? maskApiKey(apiKey) : null,
                updated_at: null
            }
        });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy cấu hình AI', error: e.message });
    }
});

// ============================================================
// PUT /api/admin/ai-config — Cập nhật provider, model, api_key vào .env
// ============================================================
router.put('/ai-config', async (req, res) => {
    try {
        const provider = String(req.body.provider || '').trim();
        const model = String(req.body.model || '').trim();
        const apiKey = req.body.api_key ? String(req.body.api_key).trim() : null;

        if (!provider) return res.status(400).json({ success: false, message: 'provider không được trống' });
        if (!model) return res.status(400).json({ success: false, message: 'model không được trống' });

        // Ghi vào .env + cập nhật process.env runtime
        const updates = {
            AI_PROVIDER: provider,
            OPENROUTER_MODEL: model
        };
        if (apiKey) {
            updates.OPENROUTER_API_KEY = apiKey;
        }
        saveToEnv(updates);

        // Thông báo Python API reload config (non-fatal)
        try {
            const pythonPort = process.env.PYTHON_API_PORT || 5000;
            await fetch(`http://localhost:${pythonPort}/api/reload-config`, {
                method: 'POST',
                signal: AbortSignal.timeout(3000)
            });
        } catch (_) { /* Python API chưa chạy hoặc lỗi — bỏ qua */ }

        return res.json({ success: true, message: 'Đã lưu cấu hình AI vào .env' });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật cấu hình AI', error: e.message });
    }
});

// ============================================================
// GET /api/admin/test-ai — Test kết nối tới Python AI service
// ============================================================
router.get('/test-ai', async (req, res) => {
    try {
        const pythonPort = process.env.PYTHON_API_PORT || process.env.PYTHON_PORT || 5000;
        let result;
        try {
            const resp = await fetch(
                `http://localhost:${pythonPort}/api/health`,
                { signal: AbortSignal.timeout(15000) }
            );
            result = await resp.json();
        } catch (fetchErr) {
            return res.status(502).json({ success: false, message: 'Python AI service không khả dụng: ' + fetchErr.message });
        }
        return res.json(result);
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi test AI', error: e.message });
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
        // Đọc API keys từ process.env
        const envKeyMap = {
            openrouter: 'OPENROUTER_API_KEY',
            payos_client: 'PAYOS_CLIENT_ID',
            payos_api: 'PAYOS_API_KEY',
            payos_checksum: 'PAYOS_CHECKSUM_KEY'
        };

        const masked = Object.entries(envKeyMap)
            .filter(([, envKey]) => process.env[envKey])
            .map(([provider, envKey]) => ({
                provider,
                api_key_masked: maskApiKey(process.env[envKey]),
                updated_at: null
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

        // Map provider → tên biến .env
        const envKeyMap = {
            openrouter: 'OPENROUTER_API_KEY',
            payos_client: 'PAYOS_CLIENT_ID',
            payos_api: 'PAYOS_API_KEY',
            payos_checksum: 'PAYOS_CHECKSUM_KEY'
        };

        const envKey = envKeyMap[provider];
        if (!envKey) {
            return res.status(400).json({ success: false, message: `Provider "${provider}" không được hỗ trợ` });
        }

        saveToEnv({ [envKey]: apiKey });

        return res.json({ success: true, message: 'Đã cập nhật API key vào .env' });
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
// GET /api/admin/payment-settings — Lấy cấu hình cổng thanh toán từ .env + DB
// ============================================================
router.get('/payment-settings', async (req, res) => {
    try {
        // Đọc cấu hình SePay/PayOS từ .env
        const settings = {
            merchant_id: process.env.PAYOS_CLIENT_ID || '',
            env: process.env.PAYOS_ENV || 'sandbox',
            app_url: process.env.APP_URL || ''
        };

        // Ẩn secret_key thật (PAYOS_CHECKSUM_KEY)
        const secretKey = process.env.PAYOS_CHECKSUM_KEY || '';
        if (secretKey) {
            settings.secret_key_masked = maskApiKey(secretKey);
        }

        // Đọc cấu hình VNPAY từ .env
        settings.vnpay_tmn_code = process.env.VNPAY_TMN_CODE || '';
        settings.vnpay_url = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        settings.vnpay_return_url = process.env.VNPAY_RETURN_URL || '';
        // Ẩn vnpay_hash_secret
        const vnpaySecret = process.env.VNPAY_HASH_SECRET || '';
        if (vnpaySecret) {
            settings.vnpay_hash_secret_masked = maskApiKey(vnpaySecret);
        }

        // Đọc trạng thái bật/tắt cổng từ DB (business logic)
        try {
            const [rows] = await pool.execute(
                "SELECT setting_key, setting_value FROM payment_settings WHERE setting_key IN ('sepay_enabled','vnpay_enabled')"
            );
            rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
        } catch (_) { /* bảng chưa tồn tại — mặc định tắt */ }

        return res.json({ success: true, data: settings });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy cấu hình thanh toán', error: e.message });
    }
});

// ============================================================
// PUT /api/admin/payment-settings — Cập nhật cấu hình cổng thanh toán vào .env + DB
// ============================================================
router.put('/payment-settings', async (req, res) => {
    try {
        const envUpdates = {};

        // SePay/PayOS → ghi vào .env
        if (req.body.merchant_id !== undefined && req.body.merchant_id !== null) {
            envUpdates.PAYOS_CLIENT_ID = String(req.body.merchant_id).trim();
        }
        if (req.body.secret_key !== undefined && req.body.secret_key !== null) {
            envUpdates.PAYOS_CHECKSUM_KEY = String(req.body.secret_key).trim();
        }
        if (req.body.env !== undefined && req.body.env !== null) {
            envUpdates.PAYOS_ENV = String(req.body.env).trim();
        }
        if (req.body.app_url !== undefined && req.body.app_url !== null) {
            envUpdates.APP_URL = String(req.body.url || req.body.app_url).trim();
        }

        // VNPAY → ghi vào .env
        if (req.body.vnpay_tmn_code !== undefined && req.body.vnpay_tmn_code !== null) {
            envUpdates.VNPAY_TMN_CODE = String(req.body.vnpay_tmn_code).trim();
        }
        if (req.body.vnpay_hash_secret !== undefined && req.body.vnpay_hash_secret !== null) {
            envUpdates.VNPAY_HASH_SECRET = String(req.body.vnpay_hash_secret).trim();
        }
        if (req.body.vnpay_url !== undefined && req.body.vnpay_url !== null) {
            envUpdates.VNPAY_URL = String(req.body.vnpay_url).trim();
        }
        if (req.body.vnpay_return_url !== undefined && req.body.vnpay_return_url !== null) {
            envUpdates.VNPAY_RETURN_URL = String(req.body.vnpay_return_url).trim();
        }

        // Ghi vào .env + cập nhật process.env
        if (Object.keys(envUpdates).length > 0) {
            saveToEnv(envUpdates);
        }

        // Toggle bật/tắt cổng → vẫn lưu DB
        const dbKeys = ['sepay_enabled', 'vnpay_enabled'];
        for (const key of dbKeys) {
            if (req.body[key] !== undefined && req.body[key] !== null) {
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
// GET /api/admin/custom-plans — Lấy danh sách gói tùy chỉnh
// ============================================================
router.get('/custom-plans', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, name, months, price, note, created_at FROM custom_plans ORDER BY id ASC');
        return res.json({ success: true, data: rows });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy gói tùy chỉnh', error: e.message });
    }
});

// ============================================================
// POST /api/admin/custom-plans — Tạo gói tùy chỉnh mới
// ============================================================
router.post('/custom-plans', async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const months = parseInt(req.body.months);
        const price = parseInt(req.body.price);
        const note = String(req.body.note || '').trim().slice(0, 255);

        if (!name || name.length < 2) return res.status(400).json({ success: false, message: 'Tên gói không hợp lệ (tối thiểu 2 ký tự)' });
        if (isNaN(months) || months < 1 || months > 120) return res.status(400).json({ success: false, message: 'Số tháng không hợp lệ (1–120)' });
        if (isNaN(price) || price < 1000) return res.status(400).json({ success: false, message: 'Giá gói phải tối thiểu 1.000đ' });

        const [result] = await pool.execute(
            'INSERT INTO custom_plans (name, months, price, note) VALUES (?, ?, ?, ?)',
            [name, months, price, note]
        );
        return res.json({ success: true, message: 'Đã tạo gói mới', id: result.insertId });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi tạo gói', error: e.message });
    }
});

// ============================================================
// DELETE /api/admin/custom-plans/:id — Xóa gói tùy chỉnh
// ============================================================
router.delete('/custom-plans/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
        await pool.execute('DELETE FROM custom_plans WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Đã xóa gói' });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi xóa gói', error: e.message });
    }
});

// ============================================================
// PUT /api/admin/custom-plans/:id — Sửa gói tùy chỉnh
// ============================================================
router.put('/custom-plans/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (!id) return res.status(400).json({ success: false, message: 'ID không hợp lệ' });

        const name = String(req.body.name || '').trim();
        const months = parseInt(req.body.months);
        const price = parseInt(req.body.price);
        const note = String(req.body.note || '').trim().slice(0, 255);

        if (!name || name.length < 2) return res.status(400).json({ success: false, message: 'Tên gói không hợp lệ' });
        if (isNaN(months) || months < 1 || months > 120) return res.status(400).json({ success: false, message: 'Số tháng không hợp lệ (1–120)' });
        if (isNaN(price) || price < 1000) return res.status(400).json({ success: false, message: 'Giá gói phải tối thiểu 1.000đ' });

        await pool.execute(
            'UPDATE custom_plans SET name = ?, months = ?, price = ?, note = ? WHERE id = ?',
            [name, months, price, note, id]
        );
        return res.json({ success: true, message: 'Đã cập nhật gói' });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật gói', error: e.message });
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

// ============================================================
// GET /api/admin/landing-config — Lấy cấu hình landing page
// ============================================================
router.get('/landing-config', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT setting_value FROM payment_settings WHERE setting_key = 'landing_page_config' LIMIT 1"
        );
        const raw = rows[0]?.setting_value;
        const config = raw ? JSON.parse(raw) : null;
        return res.json({ success: true, data: config });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy cấu hình landing page', error: e.message });
    }
});

// ============================================================
// PUT /api/admin/landing-config — Cập nhật cấu hình landing page
// ============================================================
router.put('/landing-config', async (req, res) => {
    try {
        const config = req.body;
        if (!config || typeof config !== 'object' || Array.isArray(config)) {
            return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
        }
        const jsonStr = JSON.stringify(config);
        await pool.execute(
            `INSERT INTO payment_settings (setting_key, setting_value)
             VALUES ('landing_page_config', ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
            [jsonStr]
        );
        return res.json({ success: true, message: 'Đã lưu cấu hình landing page' });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Lỗi lưu cấu hình landing page', error: e.message });
    }
});

// ============================================================
// GET /api/admin/token-pricing — Lấy giá token
// ============================================================
router.get('/token-pricing', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT setting_key, setting_value FROM payment_settings WHERE setting_key IN ('token_price_input_per_1k_vnd','token_price_output_per_1k_vnd')"
        );
        const map = Object.fromEntries(rows.map(r => [r.setting_key, parseFloat(r.setting_value)]));
        return res.json({
            success: true,
            data: {
                input_per_1k:  map['token_price_input_per_1k_vnd']  ?? 5,
                output_per_1k: map['token_price_output_per_1k_vnd'] ?? 15,
            }
        });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

// ============================================================
// PUT /api/admin/token-pricing — Cập nhật giá token
// ============================================================
router.put('/token-pricing', async (req, res) => {
    try {
        const { input_per_1k, output_per_1k } = req.body;
        if (input_per_1k == null || output_per_1k == null) {
            return res.status(400).json({ success: false, message: 'Thiếu trường input_per_1k hoặc output_per_1k' });
        }
        const pairs = [
            ['token_price_input_per_1k_vnd',  String(parseFloat(input_per_1k))],
            ['token_price_output_per_1k_vnd', String(parseFloat(output_per_1k))],
        ];
        for (const [key, val] of pairs) {
            await pool.execute(
                `INSERT INTO payment_settings (setting_key, setting_value) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
                [key, val]
            );
        }
        return res.json({ success: true, message: 'Đã cập nhật giá token' });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

// ============================================================
// GET /api/admin/token-stats — Thống kê token theo user/ngày
// ============================================================
router.get('/token-stats', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const d = Math.min(Math.max(parseInt(days) || 7, 1), 90);

        const [daily] = await pool.execute(
            `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day,
                    SUM(tokens_in)   AS tokens_in,
                    SUM(tokens_out)  AS tokens_out,
                    SUM(cost_vnd)    AS cost_vnd,
                    COUNT(*)         AS calls
             FROM ai_generation_logs
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
             ORDER BY DATE_FORMAT(created_at, '%Y-%m-%d') DESC`,
            [d]
        );
        const [byUser] = await pool.execute(
            `SELECT l.user_id,
                    u.username,
                    u.email,
                    u.ai_balance_vnd,
                    SUM(l.tokens_in)   AS tokens_in,
                    SUM(l.tokens_out)  AS tokens_out,
                    SUM(l.cost_vnd)    AS cost_vnd,
                    COUNT(*)           AS calls
             FROM ai_generation_logs l
             LEFT JOIN users u ON u.id = l.user_id
             WHERE l.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY l.user_id, u.username, u.email, u.ai_balance_vnd
             ORDER BY cost_vnd DESC
             LIMIT 50`,
            [d]
        );
        return res.json({ success: true, data: { daily, byUser } });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

// ============================================================
// PUT /api/admin/users/:id/balance — Nạp/trừ credits cho user
// ============================================================
router.put('/users/:id/balance', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { amount, action } = req.body; // action: 'add' | 'set'
        if (!userId || amount == null) {
            return res.status(400).json({ success: false, message: 'Thiếu userId hoặc amount' });
        }
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt < 0) {
            return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ' });
        }
        let sql, params;
        if (action === 'set') {
            sql    = 'UPDATE users SET ai_balance_vnd = ? WHERE id = ?';
            params = [amt, userId];
        } else {
            // default: add (positive = add, negative = deduct)
            sql    = 'UPDATE users SET ai_balance_vnd = ai_balance_vnd + ? WHERE id = ?';
            params = [amt, userId];
        }
        const [result] = await pool.execute(sql, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
        }
        const [[user]] = await pool.execute('SELECT ai_balance_vnd FROM users WHERE id = ?', [userId]);
        return res.json({ success: true, message: 'Đã cập nhật số dư', balance: user.ai_balance_vnd });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

// ============================================================
// SEO CONFIGURATION
// ============================================================
const multer = require('multer');
const seoUploadsDir = path.join(__dirname, '..', '..', 'uploads', 'seo');
if (!fs.existsSync(seoUploadsDir)) {
    fs.mkdirSync(seoUploadsDir, { recursive: true });
}

const seoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, seoUploadsDir),
    filename: (req, file, cb) => {
        const type = file.fieldname; // 'logo' or 'favicon'
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${type}_${Date.now()}${ext}`);
    }
});

const seoUpload = multer({
    storage: seoStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp, ico)'));
        }
    }
});

// GET /api/admin/seo-settings — Lấy cấu hình SEO hiện tại
router.get('/seo-settings', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT setting_key, setting_value FROM payment_settings WHERE setting_key IN ('seo_site_name', 'seo_title', 'seo_description', 'seo_logo', 'seo_favicon')"
        );
        const config = {};
        rows.forEach(r => {
            config[r.setting_key] = r.setting_value;
        });

        return res.json({
            success: true,
            data: {
                seo_site_name: config['seo_site_name'] || 'AI Screenplay',
                seo_title: config['seo_title'] || 'AI Screenplay - Hệ thống tạo kịch bản phim tự động',
                seo_description: config['seo_description'] || 'Hệ thống tạo kịch bản phim tự động bằng trí tuệ nhân tạo',
                seo_logo: config['seo_logo'] || '',
                seo_favicon: config['seo_favicon'] || ''
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy cấu hình SEO', error: error.message });
    }
});

// POST /api/admin/seo-settings/upload-logo — Upload logo mới
router.post('/seo-settings/upload-logo', (req, res) => {
    seoUpload.single('logo')(req, res, async (err) => {
        if (err) {
            const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
                ? 'File logo không được vượt quá 2MB'
                : err.message || 'Lỗi upload logo';
            return res.status(400).json({ success: false, message });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn file logo' });
        }
        try {
            const logoPath = `/uploads/seo/${req.file.filename}`;
            return res.json({ success: true, url: logoPath });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Lỗi upload logo', error: error.message });
        }
    });
});

// POST /api/admin/seo-settings/upload-favicon — Upload favicon mới
router.post('/seo-settings/upload-favicon', (req, res) => {
    seoUpload.single('favicon')(req, res, async (err) => {
        if (err) {
            const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
                ? 'File favicon không được vượt quá 1MB'
                : err.message || 'Lỗi upload favicon';
            return res.status(400).json({ success: false, message });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn file favicon' });
        }
        try {
            const faviconPath = `/uploads/seo/${req.file.filename}`;
            return res.json({ success: true, url: faviconPath });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Lỗi upload favicon', error: error.message });
        }
    });
});

// PUT /api/admin/seo-settings — Cập nhật cấu hình SEO text/paths
router.put('/seo-settings', async (req, res) => {
    try {
        const { seo_site_name, seo_title, seo_description, seo_logo, seo_favicon } = req.body;
        
        const settings = {
            seo_site_name: seo_site_name !== undefined ? String(seo_site_name).trim() : null,
            seo_title: seo_title !== undefined ? String(seo_title).trim() : null,
            seo_description: seo_description !== undefined ? String(seo_description).trim() : null,
            seo_logo: seo_logo !== undefined ? String(seo_logo).trim() : null,
            seo_favicon: seo_favicon !== undefined ? String(seo_favicon).trim() : null
        };

        for (const [key, val] of Object.entries(settings)) {
            if (val !== null) {
                await pool.execute(
                    `INSERT INTO payment_settings (setting_key, setting_value)
                     VALUES (?, ?)
                     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
                    [key, val]
                );
            }
        }

        return res.json({ success: true, message: 'Đã cập nhật cấu hình SEO thành công' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật cấu hình SEO', error: error.message });
    }
});

// ============================================================
// POLICY PAGES CONFIGURATION (HTML direct editing)
// ============================================================

// GET /api/admin/policy-pages — Lấy danh sách các trang chính sách
router.get('/policy-pages', (req, res) => {
    return res.json({
        success: true,
        data: [
            { id: 'privacy-policy', name: 'Chính sách bảo mật (privacy-policy.html)', path: 'privacy-policy.html' },
            { id: 'terms-of-service', name: 'Điều khoản dịch vụ (terms-of-service.html)', path: 'terms-of-service.html' },
            { id: 'data-deletion', name: 'Yêu cầu xóa dữ liệu (data-deletion.html)', path: 'data-deletion.html' },
            { id: 'support', name: 'Trang hỗ trợ (support.html)', path: 'support.html' }
        ]
    });
});

// GET /api/admin/policy-pages/:id — Lấy nội dung HTML của trang chính sách
router.get('/policy-pages/:id', (req, res) => {
    const id = req.params.id;
    const allowed = {
        'privacy-policy': 'privacy-policy.html',
        'terms-of-service': 'terms-of-service.html',
        'data-deletion': 'data-deletion.html',
        'support': 'support.html'
    };
    const file = allowed[id];
    if (!file) {
        return res.status(400).json({ success: false, message: 'ID trang không hợp lệ' });
    }

    const filePath = path.join(__dirname, '..', '..', file);
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy file chính sách' });
        }
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // Trích xuất nội dung bên trong <main class="legal-article">...</main> dùng Regex (giữ làm content cũ)
        const match = fileContent.match(/<main\s+class=["']legal-article["']\s*>/i);
        let content = fileContent;
        if (match) {
            const startIdx = match.index + match[0].length;
            const endTag = '</main>';
            const endIdx = fileContent.indexOf(endTag, startIdx);
            if (endIdx !== -1) {
                content = fileContent.substring(startIdx, endIdx).trim();
            }
        }
        
        return res.json({ success: true, html: fileContent, content });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi đọc file chính sách', error: err.message });
    }
});

// PUT /api/admin/policy-pages/:id — Cập nhật nội dung HTML của trang chính sách
router.put('/policy-pages/:id', (req, res) => {
    const id = req.params.id;
    const { html, content } = req.body;
    const allowed = {
        'privacy-policy': 'privacy-policy.html',
        'terms-of-service': 'terms-of-service.html',
        'data-deletion': 'data-deletion.html',
        'support': 'support.html'
    };
    const file = allowed[id];
    if (!file) {
        return res.status(400).json({ success: false, message: 'ID trang không hợp lệ' });
    }

    const filePath = path.join(__dirname, '..', '..', file);
    try {
        // Nếu client gửi toàn bộ HTML mới
        if (html !== undefined && html !== null) {
            fs.writeFileSync(filePath, html, 'utf8');
            return res.json({ success: true, message: 'Đã lưu thay đổi vào file HTML thành công' });
        }

        // Trường hợp cũ: chỉ gửi nội dung
        if (content === undefined || content === null) {
            return res.status(400).json({ success: false, message: 'Nội dung không được bỏ trống' });
        }

        let fileContent = '';
        if (fs.existsSync(filePath)) {
            fileContent = fs.readFileSync(filePath, 'utf8');
        }
        
        // Thay thế phần nội dung bên trong <main class="legal-article">...</main> dùng Regex
        const match = fileContent.match(/<main\s+class=["']legal-article["']\s*>/i);
        let finalHtml = content;
        
        if (match) {
            const startIdx = match.index + match[0].length;
            const endTag = '</main>';
            const endIdx = fileContent.indexOf(endTag, startIdx);
            if (endIdx !== -1) {
                const prefix = fileContent.substring(0, startIdx);
                const suffix = fileContent.substring(endIdx);
                finalHtml = `${prefix}\n            ${content}\n        ${suffix}`;
            }
        }
        
        fs.writeFileSync(filePath, finalHtml, 'utf8');
        return res.json({ success: true, message: 'Đã lưu thay đổi vào file HTML thành công' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi ghi file chính sách', error: err.message });
    }
});

// GET /api/admin/deletion-email — Lấy cấu hình email nhận yêu cầu xóa tài khoản
router.get('/deletion-email', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            "SELECT setting_value FROM payment_settings WHERE setting_key = 'data_deletion_recipient_email' LIMIT 1"
        );
        const email = rows[0]?.setting_value || 'support@aiscreenplay.com';
        return res.json({ success: true, email });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi lấy cấu hình email xóa tài khoản', error: error.message });
    }
});

// PUT /api/admin/deletion-email — Cập nhật cấu hình email nhận yêu cầu xóa tài khoản
router.put('/deletion-email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email nhận yêu cầu không được để trống' });
        }
        
        await pool.execute(
            `INSERT INTO payment_settings (setting_key, setting_value)
             VALUES ('data_deletion_recipient_email', ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
            [String(email).trim()]
        );
        return res.json({ success: true, message: 'Cập nhật cấu hình email thành công' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi cập nhật cấu hình email', error: error.message });
    }
});

module.exports = router;
