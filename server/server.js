const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { createProxyMiddleware } = require('http-proxy-middleware');

const { testConnection } = require('./config/database');

// Import routes
const projectRoutes = require('./routes/projects');
const aiResponseRoutes = require('./routes/aiResponses');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 3000;
const PYTHON_PORT = process.env.PYTHON_PORT || 5000;

// ===================== Middleware =====================
app.use(cors());

// ─── Proxy: /python-api/* → Python Flask :5000/api/* ─────────────────────────
// Phải đặt TRƯỚC express.json() để proxy không bị chặn bởi body-parser
app.use(
    '/python-api',
    createProxyMiddleware({
        target: `http://localhost:${PYTHON_PORT}`,
        changeOrigin: true,
        // Rewrite: /python-api/generate → /api/generate
        // Hỗ trợ cả trường hợp Express đã strip hoặc giữ nguyên prefix
        pathRewrite: {
            '^/python-api': '/api',
            '^/': '/api/'
        },
        on: {
            error: (err, req, res) => {
                console.error('❌ Python proxy error:', err.message);
                res.status(502).json({
                    success: false,
                    message: 'Python AI service không khả dụng. Vui lòng thử lại sau.',
                    error: err.message,
                });
            },
        },
    })
);
// ─────────────────────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redirect / to /dashboard.html (landing page)
app.get('/', (req, res) => {
    res.redirect('/dashboard.html');
});

// Serve static files (HTML, CSS, JS) từ thư mục gốc
app.use(express.static(path.join(__dirname, '..')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Public: landing page config (no auth required)
const { pool: _pool } = require('./config/database');
app.get('/api/landing-config', async (req, res) => {
    try {
        const [rows] = await _pool.execute(
            "SELECT setting_value FROM payment_settings WHERE setting_key = 'landing_page_config' LIMIT 1"
        );
        const raw = rows[0]?.setting_value;
        const config = raw ? JSON.parse(raw) : {};
        return res.json({ success: true, data: config });
    } catch (e) {
        return res.json({ success: true, data: {} });
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/ai-responses', aiResponseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

// Route kiểm tra kết nối database
app.get('/api/health', async (req, res) => {
    const dbConnected = await testConnection();
    res.json({
        status: dbConnected ? 'healthy' : 'unhealthy',
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Lỗi server:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Lỗi server nội bộ',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Không tìm thấy endpoint'
    });
});

// Khởi động server
async function startServer() {
    // Kiểm tra kết nối database trước khi khởi động
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        console.log('⚠️  Server sẽ khởi động nhưng database chưa được kết nối.');
        console.log('📝 Vui lòng kiểm tra cấu hình trong file .env');
    }

    app.listen(PORT, () => {
        console.log(`\n🚀 Server đang chạy tại http://localhost:${PORT}`);
        console.log(`📚 API Documentation: http://localhost:${PORT}/`);
        console.log(`❤️  Health check: http://localhost:${PORT}/api/health\n`);
    });
}

startServer();
