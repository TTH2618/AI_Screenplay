const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');

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

// Export middleware để sử dụng ở các route khác
router.authenticateToken = authenticateToken;

module.exports = router;
