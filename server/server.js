const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
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
const PYTHON_PORT = process.env.PYTHON_API_PORT || process.env.PYTHON_PORT || 5000;

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

// Serve legal & support pages with clean URLs
app.get('/privacy-policy', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'privacy-policy.html'));
});
app.get('/terms-of-service', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'terms-of-service.html'));
});
app.get('/data-deletion', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'data-deletion.html'));
});
app.get('/support', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'support.html'));
});
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'support.html'));
});

// ============================================================
// PUBLIC SEO CONFIG & HTML INTERCEPTOR MIDDLEWARE
// ============================================================
const { pool: _pool } = require('./config/database');

// Public route to get SEO configuration
app.get('/api/seo-config', async (req, res) => {
    try {
        const [rows] = await _pool.execute(
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
    } catch (e) {
        return res.json({
            success: true,
            data: {
                seo_site_name: 'AI Screenplay',
                seo_title: 'AI Screenplay - Hệ thống tạo kịch bản phim tự động',
                seo_description: 'Hệ thống tạo kịch bản phim tự động bằng trí tuệ nhân tạo',
                seo_logo: '',
                seo_favicon: ''
            }
        });
    }
});

// Interceptor middleware for HTML file requests
app.use(async (req, res, next) => {
    if (req.method !== 'GET') return next();
    
    let filePath = '';
    const cleanPath = req.path;
    
    // Determine target file
    if (cleanPath === '/' || cleanPath === '') {
        filePath = path.join(__dirname, '..', 'dashboard.html');
    } else if (cleanPath.endsWith('.html')) {
        filePath = path.join(__dirname, '..', cleanPath);
    } else {
        const potentialPath = path.join(__dirname, '..', cleanPath + '.html');
        if (fs.existsSync(potentialPath) && fs.statSync(potentialPath).isFile()) {
            filePath = potentialPath;
        } else {
            const specialRoutes = ['/privacy-policy', '/terms-of-service', '/data-deletion', '/support', '/contact'];
            if (specialRoutes.includes(cleanPath)) {
                let fileName = cleanPath.substring(1);
                if (cleanPath === '/contact') fileName = 'support';
                filePath = path.join(__dirname, '..', fileName + '.html');
            }
        }
    }

    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        try {
            let html = fs.readFileSync(filePath, 'utf8');
            
            const [rows] = await _pool.execute(
                "SELECT setting_key, setting_value FROM payment_settings WHERE setting_key IN ('seo_site_name', 'seo_title', 'seo_description', 'seo_logo', 'seo_favicon')"
            );
            
            const config = {};
            rows.forEach(r => {
                config[r.setting_key] = r.setting_value;
            });
            
            const siteName = config['seo_site_name'] || 'AI Screenplay';
            const seoTitle = config['seo_title'] || 'AI Screenplay - Hệ thống tạo kịch bản phim tự động';
            const seoDescription = config['seo_description'] || 'Hệ thống tạo kịch bản phim tự động bằng trí tuệ nhân tạo';
            const seoLogo = config['seo_logo'] || '';
            const seoFavicon = config['seo_favicon'] || '';
            
            let pageTitle = seoTitle;
            
            const titleMatch = html.match(/<title>(.*?)<\/title>/i);
            if (titleMatch && titleMatch[1]) {
                const currentTitle = titleMatch[1].trim();
                // Append site/brand name to secondary pages only
                if (cleanPath !== '/' && cleanPath !== '/dashboard.html' && cleanPath !== '/dashboard' && cleanPath !== '/index.html' && cleanPath !== '/index') {
                    if (!currentTitle.toLowerCase().includes(siteName.toLowerCase())) {
                        pageTitle = `${currentTitle} - ${siteName}`;
                    } else {
                        pageTitle = currentTitle;
                    }
                }
            }
            
            // Inject dynamically generated page title
            html = html.replace(/<title>.*?<\/title>/gi, `<title>${pageTitle}</title>`);
            
            // Inject dynamic Meta Description
            const metaDescTag = `<meta name="description" content="${seoDescription.replace(/"/g, '&quot;')}">`;
            const metaDescMatch = html.match(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i);
            if (metaDescMatch) {
                html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/gi, metaDescTag);
            } else {
                html = html.replace(/<head>/i, `<head>\n    ${metaDescTag}`);
            }
            
            // Inject dynamic Favicon links
            if (seoFavicon) {
                const faviconTag = `<link rel="shortcut icon" href="${seoFavicon}">\n    <link rel="icon" type="image/x-icon" href="${seoFavicon}">`;
                html = html.replace(/<link\s+rel="(shortcut\s+)?icon"\s+href=".*?"\s*\/?>/gi, '');
                html = html.replace(/<head>/i, `<head>\n    ${faviconTag}`);
            }
            
            // Inject dynamic script to substitute logos and brand titles in browser body
            const injectionScript = `
            <script>
                (function() {
                    const siteName = "${siteName.replace(/"/g, '\\"')}";
                    const seoLogo = "${seoLogo.replace(/"/g, '\\"')}";
                    
                    document.addEventListener('DOMContentLoaded', () => {
                        // Replace Brand Title texts
                        document.querySelectorAll('.logo span, .nav-logo span, .sidebar-header .logo span, .brand div p').forEach(el => {
                            if (el.tagName === 'P' && el.textContent.trim() === 'AI Screenplay') {
                                el.textContent = siteName;
                            } else if (el.tagName === 'SPAN') {
                                el.innerText = siteName;
                            }
                        });
                        
                        // Replace Brand Logo icon with image
                        if (seoLogo) {
                            document.querySelectorAll('.logo, .nav-logo, .sidebar-header .logo').forEach(el => {
                                let img = el.querySelector('.custom-logo');
                                if (!img) {
                                    img = document.createElement('img');
                                    img.className = 'custom-logo';
                                    img.style.height = '36px';
                                    img.style.objectFit = 'contain';
                                    img.style.marginRight = '8px';
                                    const icon = el.querySelector('i.fa-film');
                                    if (icon) {
                                        icon.replaceWith(img);
                                    } else {
                                        el.prepend(img);
                                    }
                                }
                                img.src = seoLogo;
                            });
                        }
                    });
                })();
            </script>
            `;
            html = html.replace(/<\/body>/i, `${injectionScript}\n</body>`);

            res.send(html);
        } catch (err) {
            console.error('Error in SEO template injection:', err);
            res.sendFile(filePath);
        }
    } else {
        next();
    }
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
