const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { pool } = require('../config/database');

// ── Nodemailer transporter ────────────────────────────────
const emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: { rejectUnauthorized: false }
});

// ── OTP store (in-memory, 10 phút hết hạn) ──────────────
// Map: email -> { otp, expiresAt, attempts }
const otpStore = new Map();

const OTP_EXPIRY_MS  = 10 * 60 * 1000; // 10 phút
const MAX_OTP_ATTEMPTS = 5;

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(to, otp) {
    const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#1a1a2e;font-family:'Segoe UI',sans-serif;">
      <div style="max-width:500px;margin:40px auto;background:#242444;border-radius:20px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.5);">
        <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:40px 30px;text-align:center;">
          <div style="font-size:2.5rem;margin-bottom:10px;">🎬</div>
          <h1 style="color:#fff;margin:0;font-size:1.6rem;">AI Screenplay</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">Đặt lại mật khẩu</p>
        </div>
        <div style="padding:40px 30px;text-align:center;">
          <p style="color:#9ca3af;font-size:1rem;margin-bottom:30px;">Mã xác nhận của bạn là:</p>
          <div style="background:#1a1a2e;border:2px solid #667eea;border-radius:16px;padding:24px 40px;display:inline-block;margin-bottom:30px;">
            <span style="font-size:2.8rem;font-weight:700;letter-spacing:12px;color:#818cf8;">${otp}</span>
          </div>
          <p style="color:#6b7280;font-size:0.9rem;">Mã có hiệu lực trong <strong style="color:#f59e0b;">10 phút</strong>.</p>
          <p style="color:#6b7280;font-size:0.85rem;margin-top:20px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
        </div>
        <div style="border-top:1px solid #3a3a5c;padding:20px 30px;text-align:center;">
          <p style="color:#4b5563;font-size:0.8rem;margin:0;">&copy; 2024 AI Screenplay. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
    await emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || '"AI Screenplay" <noreply@aiscreenplay.app>',
        to,
        subject: `[AI Screenplay] Mã xác nhận đặt lại mật khẩu: ${otp}`,
        html
    });
}

// Cấu hình multer cho upload avatar
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
    }
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp)'));
        }
    }
});

// Secret key for JWT (nên lưu trong .env)
const JWT_SECRET = process.env.JWT_SECRET || 'ai_screenplay_secret_key_2024';
const JWT_EXPIRES_IN = '7d';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const PLAN_PACKAGES = {
    pro_1m: { id: 'pro_1m', name: 'PRO 1 tháng', months: 1, price_vnd: 199000 },
    pro_3m: { id: 'pro_3m', name: 'PRO 3 tháng', months: 3, price_vnd: 250000 },
    pro_1y: { id: 'pro_1y', name: 'PRO 1 năm', months: 12, price_vnd: 800000 }
};

function addMonths(baseDate, months) {
    const result = new Date(baseDate);
    result.setMonth(result.getMonth() + months);
    return result;
}

// Kiểm tra PRO hết hạn → tự động downgrade về Free và xóa pro_expires_at
async function checkAndDowngradePlan(user) {
    if (!user || user.plan_type !== 'pro' || !user.pro_expires_at) return user;
    if (new Date(user.pro_expires_at) > new Date()) return user; // Chưa hết hạn
    await pool.execute(
        `UPDATE users SET plan_type = 'free', pro_expires_at = NULL, updated_at = NOW() WHERE id = ?`,
        [user.id]
    );
    console.log(`🔄 User ${user.id} (${user.username}) PRO hết hạn → chuyển về Free`);
    return { ...user, plan_type: 'free', pro_expires_at: null };
}

// Batch downgrade tất cả tài khoản PRO hết hạn mỗi 1 giờ
setInterval(async () => {
    try {
        const [result] = await pool.execute(
            `UPDATE users SET plan_type = 'free', pro_expires_at = NULL, updated_at = NOW()
             WHERE plan_type = 'pro' AND pro_expires_at IS NOT NULL AND pro_expires_at < NOW()`
        );
        if (result.affectedRows > 0) {
            console.log(`♻️ Batch downgrade: ${result.affectedRows} tài khoản PRO hết hạn → Free`);
        }
    } catch (e) {
        console.error('Lỗi batch downgrade PRO:', e.message);
    }
}, 60 * 60 * 1000);

// Tạo username từ email và đảm bảo duy nhất
async function buildUniqueUsername(email) {
    const base = (email?.split('@')[0] || 'google_user')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, 30) || `google_user_${Date.now()}`;
    let candidate = base;
    let suffix = 1;
    // Lặp cho đến khi tìm được username chưa tồn tại
    // Giới hạn số vòng lặp để tránh loop vô hạn
    while (suffix < 50) {
        const [rows] = await pool.execute('SELECT id FROM users WHERE username = ?', [candidate]);
        if (rows.length === 0) return candidate;
        candidate = `${base}${suffix++}`;
    }
    return `${base}_${Date.now()}`;
}

// Lấy user theo email hoặc tạo mới từ thông tin Google
async function getOrCreateGoogleUser(profile) {
    const { email, name, sub } = profile;
    const [existing] = await pool.execute(
        `SELECT id, username, email, full_name, created_at,
                is_admin, account_status, plan_type, pro_expires_at
         FROM users WHERE email = ?`,
        [email]
    );

    if (existing.length > 0) {
        return existing[0];
    }

    const username = await buildUniqueUsername(email);
    const placeholderPassword = await bcrypt.hash(`google-${sub}-${Date.now()}`, 10);

    const [result] = await pool.execute(
        'INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)',
        [username, email, placeholderPassword, name || username]
    );

    const [created] = await pool.execute(
        `SELECT id, username, email, full_name, created_at,
                is_admin, account_status, plan_type, pro_expires_at
         FROM users WHERE id = ?`,
        [result.insertId]
    );

    return created[0];
}

// Đăng ký
router.post('/register', async (req, res) => {
    const { username, email, password, full_name } = req.body;
    
    try {
        // Kiểm tra các trường bắt buộc
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin'
            });
        }
        
        // Kiểm tra độ dài username
        if (username.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập phải có ít nhất 3 ký tự'
            });
        }
        
        // Kiểm tra độ dài password
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu phải có ít nhất 6 ký tự'
            });
        }
        
        // Kiểm tra email đã tồn tại
        const [existingEmail] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existingEmail.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }
        
        // Kiểm tra username đã tồn tại
        const [existingUsername] = await pool.execute(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        if (existingUsername.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Tên đăng nhập đã được sử dụng'
            });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Tạo user mới
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, full_name || username]
        );
        
        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            userId: result.insertId
        });
        
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng ký'
        });
    }
});

// Đăng nhập
router.post('/login', async (req, res) => {
    const { email, password, remember } = req.body;
    
    try {
        // Kiểm tra các trường bắt buộc
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập email và mật khẩu'
            });
        }
        
        // Tìm user theo email
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }
        
        const user = users[0];

        if (user.account_status === 'banned') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.'
            });
        }
        
        // Kiểm tra password
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }
        
        // Tạo JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email,
                username: user.username,
                is_admin: !!user.is_admin
            },
            JWT_SECRET,
            { expiresIn: remember ? '30d' : JWT_EXPIRES_IN }
        );

        await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

        // Kiểm tra PRO hết hạn khi đăng nhập
        const checkedUser = await checkAndDowngradePlan(user);

        // Trả về thông tin user (không bao gồm password)
        const userResponse = {
            id: checkedUser.id,
            username: checkedUser.username,
            email: checkedUser.email,
            full_name: checkedUser.full_name,
            gender: checkedUser.gender,
            date_of_birth: checkedUser.date_of_birth,
            phone: checkedUser.phone,
            avatar: checkedUser.avatar,
            created_at: checkedUser.created_at,
            is_admin: !!checkedUser.is_admin,
            account_status: checkedUser.account_status || 'active',
            plan_type: checkedUser.plan_type || 'free',
            pro_expires_at: checkedUser.pro_expires_at
        };
        
        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            user: userResponse,
            token
        });
        
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng nhập'
        });
    }
});

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

// Lấy thông tin user hiện tại
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            `SELECT id, username, email, full_name, gender, date_of_birth, phone, avatar,
                    created_at, updated_at, is_admin, account_status, plan_type, pro_expires_at,
                    last_login_at
             FROM users WHERE id = ?`,
            [req.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy user'
            });
        }

        const user = await checkAndDowngradePlan(users[0]);

        res.json({
            success: true,
            user
        });
        
    } catch (error) {
        console.error('Lỗi lấy thông tin user:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// Cập nhật thông tin user
router.put('/update', authenticateToken, async (req, res) => {
    const { full_name, username, gender, date_of_birth, phone } = req.body;
    
    try {
        // Kiểm tra username mới có bị trùng không
        if (username) {
            const [existing] = await pool.execute(
                'SELECT id FROM users WHERE username = ? AND id != ?',
                [username, req.user.id]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Tên đăng nhập đã được sử dụng'
                });
            }
        }

        // Validate gender
        if (gender && !['male', 'female', 'other'].includes(gender)) {
            return res.status(400).json({
                success: false,
                message: 'Giới tính không hợp lệ'
            });
        }

        // Validate phone
        if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại không hợp lệ'
            });
        }
        
        // Cập nhật thông tin
        await pool.execute(
            `UPDATE users SET 
                full_name = COALESCE(?, full_name), 
                username = COALESCE(?, username),
                gender = COALESCE(?, gender),
                date_of_birth = COALESCE(?, date_of_birth),
                phone = COALESCE(?, phone)
            WHERE id = ?`,
            [full_name || null, username || null, gender || null, date_of_birth || null, phone || null, req.user.id]
        );
        
        // Lấy thông tin user đã cập nhật
        const [users] = await pool.execute(
            'SELECT id, username, email, full_name, gender, date_of_birth, phone, avatar, created_at, updated_at FROM users WHERE id = ?',
            [req.user.id]
        );
        
        res.json({
            success: true,
            message: 'Cập nhật thành công',
            user: users[0]
        });
        
    } catch (error) {
        console.error('Lỗi cập nhật user:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật'
        });
    }
});

// Upload avatar
router.post('/avatar', authenticateToken, (req, res) => {
    avatarUpload.single('avatar')(req, res, async (err) => {
        if (err) {
            const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
                ? 'File ảnh không được vượt quá 2MB'
                : err.message || 'Lỗi upload ảnh';
            return res.status(400).json({ success: false, message });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
        }

        try {
            const avatarPath = `/uploads/avatars/${req.file.filename}`;

            // Xóa avatar cũ nếu có
            const [oldUser] = await pool.execute('SELECT avatar FROM users WHERE id = ?', [req.user.id]);
            if (oldUser[0]?.avatar) {
                const oldPath = path.join(__dirname, '..', '..', oldUser[0].avatar);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }

            await pool.execute('UPDATE users SET avatar = ? WHERE id = ?', [avatarPath, req.user.id]);

            const [users] = await pool.execute(
                'SELECT id, username, email, full_name, gender, date_of_birth, phone, avatar, created_at, updated_at FROM users WHERE id = ?',
                [req.user.id]
            );

            res.json({
                success: true,
                message: 'Cập nhật ảnh đại diện thành công',
                user: users[0]
            });
        } catch (error) {
            console.error('Lỗi cập nhật avatar:', error);
            res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật ảnh' });
        }
    });
});

// Đổi mật khẩu
router.put('/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập đầy đủ thông tin'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
            });
        }
        
        // Lấy user hiện tại
        const [users] = await pool.execute(
            'SELECT password FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy user'
            });
        }
        
        // Kiểm tra mật khẩu hiện tại
        const isMatch = await bcrypt.compare(currentPassword, users[0].password);
        
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu hiện tại không đúng'
            });
        }
        
        // Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Cập nhật mật khẩu
        await pool.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.user.id]
        );
        
        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công'
        });
        
    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đổi mật khẩu'
        });
    }
});

router.post('/upgrade-plan', authenticateToken, async (req, res) => {
    try {
        const packageId = String(req.body?.package_id || '').trim();
        const selectedPackage = PLAN_PACKAGES[packageId];

        if (!selectedPackage) {
            return res.status(400).json({
                success: false,
                message: 'Gói nâng cấp không hợp lệ'
            });
        }

        const [users] = await pool.execute(
            'SELECT id, plan_type, pro_expires_at FROM users WHERE id = ? LIMIT 1',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        const current = users[0];
        const now = new Date();
        const currentExpiry = current.pro_expires_at ? new Date(current.pro_expires_at) : null;
        const startDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
        const newExpiry = addMonths(startDate, selectedPackage.months);

        await pool.execute(
            `UPDATE users
             SET plan_type = 'pro',
                 pro_expires_at = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [newExpiry, req.user.id]
        );

        const [updatedRows] = await pool.execute(
            `SELECT id, username, email, full_name, avatar, created_at, updated_at,
                    is_admin, account_status, plan_type, pro_expires_at
             FROM users
             WHERE id = ?`,
            [req.user.id]
        );

        return res.json({
            success: true,
            message: `Nâng cấp thành công gói ${selectedPackage.name}`,
            package: selectedPackage,
            user: updatedRows[0]
        });
    } catch (error) {
        console.error('Lỗi nâng cấp gói PRO:', error);
        return res.status(500).json({
            success: false,
            message: 'Không thể nâng cấp gói PRO',
            error: error.message
        });
    }
});

// Lấy Google Client ID để frontend khởi tạo SDK
router.get('/google-config', (req, res) => {
    if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({
            success: false,
            message: 'Server chưa cấu hình GOOGLE_CLIENT_ID'
        });
    }

    res.json({
        success: true,
        clientId: GOOGLE_CLIENT_ID
    });
});

// Đăng nhập / đăng ký qua Google
router.post('/google', async (req, res) => {
    const { id_token } = req.body;

    if (!GOOGLE_CLIENT_ID || !googleClient) {
        return res.status(500).json({
            success: false,
            message: 'Server chưa cấu hình GOOGLE_CLIENT_ID'
        });
    }

    if (!id_token) {
        return res.status(400).json({
            success: false,
            message: 'Thiếu mã xác thực Google'
        });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: id_token,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return res.status(401).json({
                success: false,
                message: 'Không thể xác minh tài khoản Google'
            });
        }

        if (!payload.email_verified) {
            return res.status(401).json({
                success: false,
                message: 'Email Google chưa được xác minh'
            });
        }

        const user = await getOrCreateGoogleUser(payload);

        if (user.account_status === 'banned') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.'
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                username: user.username,
                is_admin: !!user.is_admin
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

        res.json({
            success: true,
            message: 'Đăng nhập Google thành công',
            user: {
                ...user,
                is_admin: !!user.is_admin,
                account_status: user.account_status || 'active',
                plan_type: user.plan_type || 'free'
            },
            token
        });
    } catch (error) {
        console.error('Lỗi đăng nhập Google:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xử lý đăng nhập Google'
        });
    }
});

// ── Quên mật khẩu: Gửi OTP ─────────────────────────────
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập email' });
    }

    try {
        // Kiểm tra email tồn tại
        const [users] = await pool.execute(
            'SELECT id, full_name FROM users WHERE email = ?', [email]
        );

        // Trả success dù email không tồn tại để tránh lộ thông tin
        if (users.length === 0) {
            return res.json({
                success: true,
                message: 'Nếu email tồn tại, mã xác nhận đã được gửi'
            });
        }

        // Rate-limit: nếu OTP còn hiệu lực và mới gửi < 60s trước thì từ chối
        const existing = otpStore.get(email);
        if (existing && (Date.now() - (existing.expiresAt - OTP_EXPIRY_MS)) < 60000) {
            return res.status(429).json({
                success: false,
                message: 'Vui lòng chờ 60 giây trước khi gửi lại mã'
            });
        }

        const otp = generateOTP();
        otpStore.set(email, {
            otp,
            expiresAt: Date.now() + OTP_EXPIRY_MS,
            attempts: 0
        });

        await sendOTPEmail(email, otp);

        console.log(`📧 OTP sent to ${email}`);
        res.json({ success: true, message: 'Mã xác nhận đã được gửi về email của bạn' });
    } catch (error) {
        console.error('Lỗi gửi OTP:', error);
        res.status(500).json({ success: false, message: 'Không thể gửi email. Vui lòng thử lại sau.' });
    }
});

// ── Quên mật khẩu: Xác minh OTP ────────────────────────
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
    }

    const record = otpStore.get(email);
    if (!record) {
        return res.status(400).json({ success: false, message: 'Mã xác nhận không hợp lệ hoặc đã hết hạn' });
    }

    if (Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ success: false, message: 'Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới.' });
    }

    record.attempts += 1;
    if (record.attempts > MAX_OTP_ATTEMPTS) {
        otpStore.delete(email);
        return res.status(429).json({ success: false, message: 'Quá nhiều lần thử sai. Vui lòng yêu cầu mã mới.' });
    }

    if (record.otp !== otp.trim()) {
        const remaining = MAX_OTP_ATTEMPTS - record.attempts;
        return res.status(400).json({
            success: false,
            message: `Mã xác nhận không đúng. Còn ${remaining} lần thử.`
        });
    }

    // Đánh dấu OTP đã xác minh (dùng 1 lần)
    record.verified = true;
    res.json({ success: true, message: 'Xác minh thành công' });
});

// ── Quên mật khẩu: Đặt lại mật khẩu mới ───────────────
router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const record = otpStore.get(email);
    if (!record || !record.verified || record.otp !== otp.trim() || Date.now() > record.expiresAt) {
        return res.status(400).json({ success: false, message: 'Phiên đặt lại mật khẩu không hợp lệ. Vui lòng thử lại.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const [result] = await pool.execute(
            'UPDATE users SET password = ?, updated_at = NOW() WHERE email = ?',
            [hashedPassword, email]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
        }

        otpStore.delete(email);
        console.log(`🔐 Password reset for ${email}`);
        res.json({ success: true, message: 'Mật khẩu đã được đặt lại thành công' });
    } catch (error) {
        console.error('Lỗi reset password:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi đặt lại mật khẩu' });
    }
});

function getBaseUrl(req) {
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http')
        .split(',')[0].trim();
    const host = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000')
        .split(',')[0].trim();
    return `${proto}://${host}`;
}

// ── Gửi yêu cầu xóa tài khoản (Gửi link xác nhận về mail user) ─────────────────────────
router.post('/data-deletion-request', async (req, res) => {
    const { email, reason, notes } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email đăng ký không được để trống' });
    }

    try {
        // Tạo JWT token chứa thông tin yêu cầu xóa, hết hạn trong 24 giờ
        const token = jwt.sign(
            { email, reason, notes, type: 'data-deletion-confirm' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const APP_URL = getBaseUrl(req);
        const confirmLink = `${APP_URL}/api/auth/data-deletion-confirm?token=${token}`;

        // Gửi email xác nhận đến email của người dùng
        const html = `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',sans-serif;color:#1f2937;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);border:1px solid #e5e7eb;">
            <div style="background:linear-gradient(135deg,#6366f1,#4f46e5);padding:30px;text-align:center;color:#ffffff;">
              <div style="font-size:2.5rem;margin-bottom:10px;">🎬</div>
              <h1 style="margin:0;font-size:1.5rem;font-weight:700;">Xác Nhận Yêu Cầu Xóa Tài Khoản</h1>
              <p style="margin:8px 0 0;opacity:0.9;">AI Screenplay</p>
            </div>
            <div style="padding:30px;text-align:center;">
              <p style="font-size:1.05rem;line-height:1.6;color:#374151;margin-bottom:24px;">
                Chúng tôi đã nhận được yêu cầu xóa tài khoản liên kết với địa chỉ email này. Để tiếp tục, vui lòng nhấp vào nút bên dưới để xác nhận quyền sở hữu của bạn:
              </p>
              <a href="${confirmLink}" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#dc2626);color:#ffffff;padding:14px 28px;border-radius:8px;font-weight:600;text-decoration:none;box-shadow:0 4px 6px rgba(239,68,68,0.2);margin-bottom:24px;transition:transform 0.2s;">
                Xác Nhận Xóa Tài Khoản
              </a>
              <p style="font-size:0.9rem;color:#6b7280;line-height:1.6;">
                Đường dẫn xác nhận này chỉ có hiệu lực trong vòng <strong style="color:#ef4444;">24 giờ</strong>.<br>
                Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. Tài khoản của bạn sẽ không bị ảnh hưởng.
              </p>
            </div>
            <div style="border-top:1px solid #e5e7eb;padding:20px;text-align:center;background:#f9fafb;">
              <p style="color:#9ca3af;font-size:0.8rem;margin:0;">&copy; 2026 AI Screenplay. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
        `;

        await emailTransporter.sendMail({
            from: process.env.EMAIL_FROM || '"AI Screenplay" <noreply@aiscreenplay.app>',
            to: email,
            subject: `[AI Screenplay] Xác nhận yêu cầu xóa tài khoản của bạn`,
            html
        });

        console.log(`📧 Sent deletion verification email to ${email}`);
        res.json({ success: true, message: 'Link xác nhận xóa tài khoản đã được gửi đến email của bạn. Vui lòng xác nhận trong vòng 24 giờ.' });
    } catch (error) {
        console.error('Lỗi gửi email xác nhận xóa tài khoản:', error);
        res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi gửi email xác nhận. Vui lòng thử lại sau.' });
    }
});

// ── Xác nhận yêu cầu xóa (Khi người dùng click vào link trong email) ───────────────────
router.get('/data-deletion-confirm', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Xác nhận thất bại - AI Screenplay</title>
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
              <style>
                body { font-family: 'Inter', sans-serif; background: #f9fafb; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1f2937; }
                .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); max-width: 480px; text-align: center; border: 1px solid #e5e7eb; }
                .icon { font-size: 3rem; color: #ef4444; margin-bottom: 20px; }
                h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 12px 0; color: #111827; }
                p { font-size: 0.95rem; line-height: 1.6; color: #4b5563; margin: 0 0 24px 0; }
                .btn { display: inline-block; background: #374151; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="icon">❌</div>
                <h1>Xác nhận thất bại</h1>
                <p>Thiếu mã token xác nhận hợp lệ. Vui lòng gửi lại yêu cầu xóa tài khoản.</p>
                <a href="/data-deletion" class="btn">Thực hiện lại</a>
              </div>
            </body>
            </html>
        `);
    }

    try {
        // Giải mã và kiểm tra tính hợp lệ của token
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== 'data-deletion-confirm') {
            throw new Error('Invalid token type');
        }

        const { email, reason, notes } = decoded;

        // Lấy cấu hình email nhận yêu cầu xóa tài khoản từ payment_settings
        const [settingsRows] = await pool.execute(
            "SELECT setting_value FROM payment_settings WHERE setting_key = 'data_deletion_recipient_email' LIMIT 1"
        );
        const recipientEmail = settingsRows[0]?.setting_value || 'support@aiscreenplay.com';

        // Gửi email báo cáo yêu cầu xóa tài khoản đến Admin
        const adminHtml = `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',sans-serif;color:#1f2937;">
          <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);border:1px solid #e5e7eb;">
            <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:30px;text-align:center;color:#ffffff;">
              <div style="font-size:2.5rem;margin-bottom:10px;">⚠️</div>
              <h1 style="margin:0;font-size:1.5rem;font-weight:700;">Yêu Cầu Xóa Tài Khoản</h1>
              <p style="margin:8px 0 0;opacity:0.9;">AI Screenplay (Đã xác minh qua email)</p>
            </div>
            <div style="padding:30px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:8px 0;font-weight:600;width:180px;color:#4b5563;">Email đăng ký:</td>
                  <td style="padding:8px 0;">${email}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;color:#4b5563;">Lý do xóa:</td>
                  <td style="padding:8px 0;">${reason || 'Không cung cấp'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;vertical-align:top;color:#4b5563;">Ghi chú thêm:</td>
                  <td style="padding:8px 0;white-space:pre-wrap;">${notes || 'Không có ghi chú'}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-weight:600;color:#4b5563;">Thời gian yêu cầu:</td>
                  <td style="padding:8px 0;">${new Date().toLocaleString('vi-VN')}</td>
                </tr>
              </table>
              <div style="margin-top:30px;padding:15px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;">
                <p style="margin:0;font-size:0.9rem;color:#991b1b;font-weight:500;">
                  Người dùng đã xác nhận yêu cầu xóa tài khoản thành công qua hòm thư cá nhân của họ. Vui lòng tiến hành thực hiện quy trình xóa dữ liệu theo quy định.
                </p>
              </div>
            </div>
            <div style="border-top:1px solid #e5e7eb;padding:20px;text-align:center;background:#f9fafb;">
              <p style="color:#9ca3af;font-size:0.8rem;margin:0;">&copy; 2026 AI Screenplay. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
        `;

        await emailTransporter.sendMail({
            from: process.env.EMAIL_FROM || '"AI Screenplay" <noreply@aiscreenplay.app>',
            to: recipientEmail,
            subject: `[AI Screenplay] Yêu cầu xóa tài khoản từ ${email} (Đã xác nhận)`,
            html: adminHtml
        });

        console.log(`📧 Account deletion request for ${email} confirmed and forwarded to ${recipientEmail}`);

        // Trả về trang thông báo xác nhận thành công
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Xác nhận thành công - AI Screenplay</title>
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
              <style>
                body { font-family: 'Inter', sans-serif; background: #f9fafb; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1f2937; }
                .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); max-width: 480px; text-align: center; border: 1px solid #e5e7eb; }
                .icon { font-size: 3rem; color: #10b981; margin-bottom: 20px; }
                h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 12px 0; color: #111827; }
                p { font-size: 0.95rem; line-height: 1.6; color: #4b5563; margin: 0 0 24px 0; }
                .btn { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="icon">✅</div>
                <h1>Xác nhận thành công!</h1>
                <p>Yêu cầu xóa tài khoản của bạn (${email}) đã được gửi thành công đến bộ phận hỗ trợ của chúng tôi. Chúng tôi sẽ tiến hành xử lý trong vòng 30 ngày.</p>
                <a href="/" class="btn">Về Trang Chủ</a>
              </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Lỗi xác nhận xóa tài khoản:', error);
        return res.status(400).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Xác nhận thất bại - AI Screenplay</title>
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
              <style>
                body { font-family: 'Inter', sans-serif; background: #f9fafb; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1f2937; }
                .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); max-width: 480px; text-align: center; border: 1px solid #e5e7eb; }
                .icon { font-size: 3rem; color: #ef4444; margin-bottom: 20px; }
                h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 12px 0; color: #111827; }
                p { font-size: 0.95rem; line-height: 1.6; color: #4b5563; margin: 0 0 24px 0; }
                .btn { display: inline-block; background: #374151; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="icon">❌</div>
                <h1>Xác nhận thất bại</h1>
                <p>Đường dẫn xác nhận không hợp lệ hoặc đã hết hạn (quá 24 giờ). Vui lòng gửi lại yêu cầu xóa tài khoản.</p>
                <a href="/data-deletion" class="btn">Thực hiện lại</a>
              </div>
            </body>
            </html>
        `);
    }
});

// Export middleware để sử dụng ở các route khác
router.authenticateToken = authenticateToken;

module.exports = router;
