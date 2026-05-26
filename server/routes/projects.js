const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const authRouter = require('./auth');
const authenticateToken = authRouter.authenticateToken;

// Lấy tất cả dự án của user hiện tại
router.get('/', authenticateToken, async (req, res) => {
    try {
        const projects = await query(
            'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({
            success: true,
            data: projects
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách dự án',
            error: error.message
        });
    }
});

// Lấy dự án theo ID (thuộc về user hiện tại)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const projects = await query(
            'SELECT * FROM projects WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        
        if (projects.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy dự án'
            });
        }
        
        res.json({
            success: true,
            data: projects[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thông tin dự án',
            error: error.message
        });
    }
});

// Tạo dự án mới cho user hiện tại
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, description, status } = req.body;
        
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'title là bắt buộc'
            });
        }
        
        const result = await query(
            'INSERT INTO projects (user_id, title, description, status) VALUES (?, ?, ?, ?)',
            [req.user.id, title, description || null, status || 'draft']
        );
        
        res.status(201).json({
            success: true,
            message: 'Tạo dự án thành công',
            data: {
                id: result.insertId,
                user_id: req.user.id,
                title,
                description,
                status: status || 'draft'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo dự án',
            error: error.message
        });
    }
});

// Cập nhật dự án (chỉ cho chủ sở hữu)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { title, description, status } = req.body;
        // Đảm bảo dự án thuộc về user
        const owned = await query(
            'SELECT id FROM projects WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (owned.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy dự án'
            });
        }

        const result = await query(
            'UPDATE projects SET title = ?, description = ?, status = ? WHERE id = ? AND user_id = ?',
            [title, description, status, req.params.id, req.user.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy dự án'
            });
        }
        
        res.json({
            success: true,
            message: 'Cập nhật dự án thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật dự án',
            error: error.message
        });
    }
});

// Xóa dự án (chỉ cho chủ sở hữu)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await query(
            'DELETE FROM projects WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy dự án'
            });
        }
        
        res.json({
            success: true,
            message: 'Xóa dự án thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa dự án',
            error: error.message
        });
    }
});

module.exports = router;
