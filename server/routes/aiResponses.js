const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// Mapping tool_type -> { table, type }
// Similar tools (e.g. theme/story_theme) share the same table, differentiated by `type` column
const toolTableMap = {
    logline:           { table: 'loglines',     type: null },
    story_upload:      { table: 'stories',      type: null },
    theme:             { table: 'themes',       type: 'screenplay' },
    character:         { table: 'characters',   type: 'screenplay' },
    synopsis:          { table: 'synopses',     type: 'screenplay' },
    structure:         { table: 'structures',   type: 'screenplay' },
    development:       { table: 'developments', type: 'screenplay' },
    beatsheet:         { table: 'beatsheets',   type: 'screenplay' },
    scenelist:         { table: 'scenelists',   type: 'screenplay' },
    script:            { table: 'scripts',      type: 'screenplay' },
    // Story analysis tools (same tables, type = 'story')
    story_theme:       { table: 'themes',       type: 'story' },
    story_character:   { table: 'characters',   type: 'story' },
    story_synopsis:    { table: 'synopses',     type: 'story' },
    story_structure:   { table: 'structures',   type: 'story' },
    story_development: { table: 'developments', type: 'story' },
    story_beatsheet:   { table: 'beatsheets',   type: 'story' },
    story_scenelist:   { table: 'scenelists',   type: 'story' },
    story_script:      { table: 'scripts',      type: 'story' }
};

// All valid tool types
const validToolTypes = Object.keys(toolTableMap);

// Get table info from tool_type
function getTableInfo(toolType) {
    return toolTableMap[toolType] || null;
}

// Lấy tất cả kết quả AI của một dự án (from all tables)
router.get('/project/:projectId', async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const allResponses = [];

        // Query each tool type from its specific table + type
        for (const [toolType, info] of Object.entries(toolTableMap)) {
            try {
                const typeCondition = info.type ? ` AND type = ?` : '';
                const params = info.type ? [projectId, info.type] : [projectId];
                const rows = await query(
                    `SELECT *, '${toolType}' as tool_type FROM \`${info.table}\` WHERE project_id = ?${typeCondition} ORDER BY created_at DESC`,
                    params
                );
                allResponses.push(...rows);
            } catch (e) {
                // Table might not exist yet, skip it
            }
        }

        // Sort all by created_at DESC
        allResponses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json({
            success: true,
            data: allResponses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách kết quả AI',
            error: error.message
        });
    }
});

// Lấy kết quả AI theo loại công cụ
router.get('/project/:projectId/:toolType', async (req, res) => {
    try {
        const info = getTableInfo(req.params.toolType);
        if (!info) {
            return res.status(400).json({
                success: false,
                message: `tool_type không hợp lệ: ${req.params.toolType}`
            });
        }

        const typeCondition = info.type ? ` AND type = ?` : '';
        const params = info.type ? [req.params.projectId, info.type] : [req.params.projectId];
        const responses = await query(
            `SELECT *, '${req.params.toolType}' as tool_type FROM \`${info.table}\` WHERE project_id = ?${typeCondition} ORDER BY created_at DESC`,
            params
        );
        res.json({
            success: true,
            data: responses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy kết quả AI',
            error: error.message
        });
    }
});

// Lưu kết quả AI mới
router.post('/', async (req, res) => {
    try {
        const { project_id, tool_type, input_data, output_data, save_mode } = req.body;
        
        if (!project_id || !tool_type || !output_data) {
            return res.status(400).json({
                success: false,
                message: 'project_id, tool_type và output_data là bắt buộc'
            });
        }
        
        // Validate tool_type
        const info = getTableInfo(tool_type);
        if (!info) {
            return res.status(400).json({
                success: false,
                message: `tool_type không hợp lệ. Các giá trị hợp lệ: ${validToolTypes.join(', ')}`
            });
        }
        
        // Kiểm tra xem đã có response cho tool_type này trong project chưa
        const typeCondition = info.type ? ` AND type = ?` : '';
        const checkParams = info.type ? [project_id, info.type] : [project_id];
        const existing = await query(
            `SELECT id FROM \`${info.table}\` WHERE project_id = ?${typeCondition}`,
            checkParams
        );
        
        let result;
        // Các tool script cần nối tiếp nội dung thay vì ghi đè (trừ khi save_mode = 'overwrite')
        const appendTools = ['script', 'story_script'];
        const shouldAppend = appendTools.includes(tool_type) && save_mode !== 'overwrite';

        if (existing.length > 0) {
            if (shouldAppend) {
                // Lấy nội dung cũ để nối thêm
                const typeCondGet = info.type ? ` AND type = ?` : '';
                const getParams = info.type ? [project_id, info.type] : [project_id];
                const existingRows = await query(
                    `SELECT output_data FROM \`${info.table}\` WHERE project_id = ?${typeCondGet}`,
                    getParams
                );
                const oldOutput = existingRows.length > 0 ? existingRows[0].output_data : '';
                const separator = '\n\n<hr/>\n\n';
                const mergedOutput = oldOutput ? oldOutput + separator + output_data : output_data;
                const updateParams = info.type
                    ? [JSON.stringify(input_data), mergedOutput, project_id, info.type]
                    : [JSON.stringify(input_data), mergedOutput, project_id];
                result = await query(
                    `UPDATE \`${info.table}\` SET input_data = ?, output_data = ?, created_at = NOW() WHERE project_id = ?${typeCondition}`,
                    updateParams
                );
                result.insertId = existing[0].id;
            } else {
                // Các tool khác: ghi đè như cũ
                const updateParams = info.type
                    ? [JSON.stringify(input_data), output_data, project_id, info.type]
                    : [JSON.stringify(input_data), output_data, project_id];
                result = await query(
                    `UPDATE \`${info.table}\` SET input_data = ?, output_data = ?, created_at = NOW() WHERE project_id = ?${typeCondition}`,
                    updateParams
                );
                result.insertId = existing[0].id;
            }
        } else {
            // Tạo mới
            if (info.type) {
                result = await query(
                    `INSERT INTO \`${info.table}\` (project_id, type, input_data, output_data) VALUES (?, ?, ?, ?)`,
                    [project_id, info.type, JSON.stringify(input_data), output_data]
                );
            } else {
                result = await query(
                    `INSERT INTO \`${info.table}\` (project_id, input_data, output_data) VALUES (?, ?, ?)`,
                    [project_id, JSON.stringify(input_data), output_data]
                );
            }
        }
        
        res.status(201).json({
            success: true,
            message: 'Lưu kết quả AI thành công',
            data: {
                id: result.insertId,
                project_id,
                tool_type,
                input_data,
                output_data
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lưu kết quả AI',
            error: error.message
        });
    }
});

// Xóa kết quả AI
router.delete('/:toolType/:id', async (req, res) => {
    try {
        const info = getTableInfo(req.params.toolType);
        if (!info) {
            return res.status(400).json({
                success: false,
                message: `tool_type không hợp lệ: ${req.params.toolType}`
            });
        }

        const result = await query(
            `DELETE FROM \`${info.table}\` WHERE id = ?`,
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy kết quả AI'
            });
        }
        
        res.json({
            success: true,
            message: 'Xóa kết quả AI thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa kết quả AI',
            error: error.message
        });
    }
});

// Xóa kết quả AI (backward compatible - by id only, searches all tables)
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        // Get unique table names only
        const uniqueTables = [...new Set(Object.values(toolTableMap).map(info => info.table))];

        for (const tableName of uniqueTables) {
            try {
                const result = await query(
                    `DELETE FROM \`${tableName}\` WHERE id = ?`,
                    [id]
                );
                if (result.affectedRows > 0) {
                    return res.json({
                        success: true,
                        message: 'Xóa kết quả AI thành công'
                    });
                }
            } catch (e) {
                // Table might not exist, skip
            }
        }
        
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy kết quả AI'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa kết quả AI',
            error: error.message
        });
    }
});

module.exports = router;
