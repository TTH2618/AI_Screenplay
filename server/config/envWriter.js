/**
 * envWriter.js — Tiện ích đọc/ghi file .env
 * - Giữ nguyên comments, thứ tự dòng, dòng trống
 * - Merge giá trị mới vào file hiện tại
 * - Cập nhật process.env runtime (hot-reload)
 */
const fs = require('fs');
const path = require('path');

// Đường dẫn tới file .env ở root project
const ENV_PATH = path.resolve(__dirname, '..', '..', '.env');

/**
 * Đọc file .env, parse thành object { KEY: value }
 * Bỏ qua comments (#) và dòng trống
 */
function readEnvFile() {
    if (!fs.existsSync(ENV_PATH)) return {};

    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    const result = {};

    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        // Bỏ qua dòng trống và comment
        if (!trimmed || trimmed.startsWith('#')) continue;

        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;

        const key = trimmed.substring(0, eqIdx).trim();
        const value = trimmed.substring(eqIdx + 1).trim();
        if (key) result[key] = value;
    }

    return result;
}

/**
 * Ghi cập nhật vào file .env
 * - Nếu key đã tồn tại → thay giá trị, giữ nguyên vị trí dòng
 * - Nếu key chưa tồn tại → thêm vào cuối file
 * - Giữ nguyên comments và dòng trống
 * 
 * @param {Object} updates - Object { KEY: 'value' } cần cập nhật
 */
function writeEnvFile(updates) {
    if (!updates || Object.keys(updates).length === 0) return;

    let content = '';
    if (fs.existsSync(ENV_PATH)) {
        content = fs.readFileSync(ENV_PATH, 'utf-8');
    }

    const lines = content.split(/\r?\n/);
    const updatedKeys = new Set();

    // Duyệt từng dòng, thay thế giá trị nếu key khớp
    const newLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;

        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) return line;

        const key = trimmed.substring(0, eqIdx).trim();

        if (key && updates.hasOwnProperty(key)) {
            updatedKeys.add(key);
            return `${key}=${updates[key]}`;
        }

        return line;
    });

    // Thêm các key mới chưa tồn tại vào cuối file
    const missingKeys = Object.keys(updates).filter(k => !updatedKeys.has(k));
    if (missingKeys.length > 0) {
        // Đảm bảo có dòng trống trước khi thêm
        const lastLine = newLines[newLines.length - 1];
        if (lastLine && lastLine.trim() !== '') {
            newLines.push('');
        }
        newLines.push('# ── Cấu hình thêm từ Admin ──────────────────');
        for (const key of missingKeys) {
            newLines.push(`${key}=${updates[key]}`);
        }
        newLines.push('');
    }

    fs.writeFileSync(ENV_PATH, newLines.join('\n'), 'utf-8');
}

/**
 * Cập nhật process.env runtime (hot-reload)
 * Gọi sau khi writeEnvFile() để server nhận config mới mà không cần restart
 * 
 * @param {Object} updates - Object { KEY: 'value' }
 */
function updateProcessEnv(updates) {
    if (!updates) return;
    for (const [key, value] of Object.entries(updates)) {
        process.env[key] = value;
    }
}

/**
 * Hàm tiện lợi: ghi vào .env + cập nhật process.env cùng lúc
 * 
 * @param {Object} updates - Object { KEY: 'value' }
 */
function saveToEnv(updates) {
    writeEnvFile(updates);
    updateProcessEnv(updates);
}

module.exports = {
    ENV_PATH,
    readEnvFile,
    writeEnvFile,
    updateProcessEnv,
    saveToEnv
};
