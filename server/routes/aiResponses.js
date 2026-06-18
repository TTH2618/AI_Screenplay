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

// Script tool types that use per-scene storage
const sceneTools = ['script', 'story_script'];

// All valid tool types
const validToolTypes = Object.keys(toolTableMap);

// Get table info from tool_type
function getTableInfo(toolType) {
    return toolTableMap[toolType] || null;
}

// Lấy tất cả kết quả AI của một dự án (from all tables)
// Excludes per-scene script rows — those are loaded separately via /project/:id/scenes
router.get('/project/:projectId', async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const allResponses = [];

        // Query each tool type from its specific table + type
        for (const [toolType, info] of Object.entries(toolTableMap)) {
            // Skip script tools — scenes are loaded separately
            if (sceneTools.includes(toolType)) continue;
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

// Lấy tất cả cảnh kịch bản của 1 project
router.get('/project/:projectId/scenes', async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const scenes = await query(
            `SELECT *, 'script' as tool_type FROM scripts WHERE project_id = ? AND scene_number IS NOT NULL ORDER BY scene_number ASC`,
            [projectId]
        );
        res.json({
            success: true,
            data: scenes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách cảnh',
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

        // For script tools, only return per-scene records
        let extraCondition = '';
        if (sceneTools.includes(req.params.toolType)) {
            extraCondition = ' AND scene_number IS NOT NULL';
        }

        const responses = await query(
            `SELECT *, '${req.params.toolType}' as tool_type FROM \`${info.table}\` WHERE project_id = ?${typeCondition}${extraCondition} ORDER BY created_at DESC`,
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

// Lưu 1 cảnh kịch bản riêng biệt (upsert by project_id + type + scene_number)
router.post('/scenes', async (req, res) => {
    try {
        const { project_id, type, scene_number, scene_label, input_data, output_data } = req.body;

        if (!project_id || scene_number == null || !output_data) {
            return res.status(400).json({
                success: false,
                message: 'project_id, scene_number và output_data là bắt buộc'
            });
        }

        const sceneType = type || 'screenplay';
        const inputJson = input_data ? JSON.stringify(input_data) : null;

        // Upsert: INSERT ... ON DUPLICATE KEY UPDATE
        const result = await query(
            `INSERT INTO scripts (project_id, type, scene_number, scene_label, input_data, output_data)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                scene_label = VALUES(scene_label),
                input_data = VALUES(input_data),
                output_data = VALUES(output_data),
                updated_at = NOW()`,
            [project_id, sceneType, scene_number, scene_label || null, inputJson, output_data]
        );

        // For upsert, insertId is 0 when it updates. Get the actual id.
        let sceneId = result.insertId;
        if (!sceneId) {
            const rows = await query(
                `SELECT id FROM scripts WHERE project_id = ? AND type = ? AND scene_number = ?`,
                [project_id, sceneType, scene_number]
            );
            if (rows.length > 0) sceneId = rows[0].id;
        }

        res.status(201).json({
            success: true,
            message: 'Lưu cảnh thành công',
            data: {
                id: sceneId,
                project_id,
                type: sceneType,
                scene_number,
                scene_label,
                output_data
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lưu cảnh',
            error: error.message
        });
    }
});

// Cập nhật nội dung 1 cảnh (khi user chỉnh sửa)
router.put('/scenes/:id', async (req, res) => {
    try {
        const { output_data, scene_label } = req.body;

        if (!output_data) {
            return res.status(400).json({
                success: false,
                message: 'output_data là bắt buộc'
            });
        }

        const updates = ['output_data = ?', 'updated_at = NOW()'];
        const params = [output_data];

        if (scene_label !== undefined) {
            updates.push('scene_label = ?');
            params.push(scene_label);
        }

        params.push(req.params.id);

        const result = await query(
            `UPDATE scripts SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy cảnh'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật cảnh thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi cập nhật cảnh',
            error: error.message
        });
    }
});

// Xóa 1 cảnh
router.delete('/scenes/:id', async (req, res) => {
    try {
        const result = await query(
            `DELETE FROM scripts WHERE id = ? AND scene_number IS NOT NULL`,
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy cảnh'
            });
        }

        res.json({
            success: true,
            message: 'Xóa cảnh thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa cảnh',
            error: error.message
        });
    }
});

// Xóa tất cả cảnh của 1 project (khi tạo lại toàn bộ)
router.delete('/project/:projectId/scenes', async (req, res) => {
    try {
        const result = await query(
            `DELETE FROM scripts WHERE project_id = ? AND scene_number IS NOT NULL`,
            [req.params.projectId]
        );

        res.json({
            success: true,
            message: `Đã xóa ${result.affectedRows} cảnh`,
            deletedCount: result.affectedRows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa cảnh',
            error: error.message
        });
    }
});

// Lưu kết quả AI mới (cho các tool KHÔNG phải script)
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

        // Script tools: redirect to per-scene endpoint
        if (sceneTools.includes(tool_type)) {
            // Extract scene_number from input_data
            const inputObj = typeof input_data === 'string' ? JSON.parse(input_data) : (input_data || {});
            const sceneNumMatch = (inputObj.scene_number || '').match(/(\d+)/);
            const sceneNumber = sceneNumMatch ? parseInt(sceneNumMatch[1]) : null;

            if (sceneNumber) {
                // Save as individual scene
                const sceneType = info.type || 'screenplay';
                const inputJson = JSON.stringify(input_data);
                const sceneLabel = inputObj.scene_number || `Cảnh ${sceneNumber}`;

                const result = await query(
                    `INSERT INTO scripts (project_id, type, scene_number, scene_label, input_data, output_data)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        scene_label = VALUES(scene_label),
                        input_data = VALUES(input_data),
                        output_data = VALUES(output_data),
                        updated_at = NOW()`,
                    [project_id, sceneType, sceneNumber, sceneLabel, inputJson, output_data]
                );

                let sceneId = result.insertId;
                if (!sceneId) {
                    const rows = await query(
                        `SELECT id FROM scripts WHERE project_id = ? AND type = ? AND scene_number = ?`,
                        [project_id, sceneType, sceneNumber]
                    );
                    if (rows.length > 0) sceneId = rows[0].id;
                }

                return res.status(201).json({
                    success: true,
                    message: 'Lưu cảnh thành công',
                    data: {
                        id: sceneId,
                        project_id,
                        tool_type,
                        scene_number: sceneNumber,
                        input_data,
                        output_data
                    }
                });
            }
            // If no scene_number found, fall through to legacy behavior
        }
        
        // Non-script tools: standard upsert logic
        const typeCondition = info.type ? ` AND type = ?` : '';
        const checkParams = info.type ? [project_id, info.type] : [project_id];
        const existing = await query(
            `SELECT id FROM \`${info.table}\` WHERE project_id = ?${typeCondition}`,
            checkParams
        );
        
        let result;

        if (existing.length > 0) {
            // Update existing record
            const updateParams = info.type
                ? [JSON.stringify(input_data), output_data, project_id, info.type]
                : [JSON.stringify(input_data), output_data, project_id];
            result = await query(
                `UPDATE \`${info.table}\` SET input_data = ?, output_data = ?, created_at = NOW() WHERE project_id = ?${typeCondition}`,
                updateParams
            );
            result.insertId = existing[0].id;
        } else {
            // Create new
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
