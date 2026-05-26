/**
 * API Service - Kết nối với backend server
 * Xử lý các request tới MySQL thông qua REST API
 *
 * URL được lấy từ js/config.js (window.APP_CONFIG) để tự động
 * phân biệt môi trường local và production.
 */

// Lấy URL từ APP_CONFIG (định nghĩa trong js/config.js)
// Fallback về localhost nếu config chưa được load
const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)
    ? window.APP_CONFIG.API_BASE_URL
    : 'http://localhost:3000/api';

// ===================== Helper Functions =====================

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Có lỗi xảy ra');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ===================== Health Check =====================

async function checkServerHealth() {
    try {
        const response = await apiRequest('/health');
        return response;
    } catch (error) {
        console.error('Server không khả dụng:', error);
        return { status: 'unhealthy', database: 'disconnected' };
    }
}

// ===================== Projects API =====================

const ProjectsAPI = {
    // Lấy tất cả dự án
    async getAll() {
        return await apiRequest('/projects');
    },
    
    // Lấy dự án theo ID
    async getById(id) {
        return await apiRequest(`/projects/${id}`);
    },
    
    // Tạo dự án mới
    async create(projectData) {
        return await apiRequest('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    },
    
    // Cập nhật dự án
    async update(id, projectData) {
        return await apiRequest(`/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(projectData)
        });
    },
    
    // Xóa dự án
    async delete(id) {
        return await apiRequest(`/projects/${id}`, {
            method: 'DELETE'
        });
    }
};

// ===================== AI Responses API =====================

const AIResponsesAPI = {
    // Lấy tất cả kết quả AI của một dự án
    async getByProject(projectId) {
        return await apiRequest(`/ai-responses/project/${projectId}`);
    },
    
    // Lấy kết quả AI theo loại công cụ
    async getByToolType(projectId, toolType) {
        return await apiRequest(`/ai-responses/project/${projectId}/${toolType}`);
    },
    
    // Lưu kết quả AI mới
    async save(responseData) {
        return await apiRequest('/ai-responses', {
            method: 'POST',
            body: JSON.stringify(responseData)
        });
    },
    
    // Xóa kết quả AI
    async delete(id) {
        return await apiRequest(`/ai-responses/${id}`, {
            method: 'DELETE'
        });
    }
};

// ===================== Async Job API (Python AI service) =====================

// Lấy URL từ APP_CONFIG (định nghĩa trong js/config.js)
// AI_API_BASE_URL = http://localhost:3000/python-api  (proxy tới Python :5000/api)
// Fallback: nếu config chưa load thì gọi thẳng Python :5000/api
const AI_API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.AI_API_BASE_URL)
    ? window.APP_CONFIG.AI_API_BASE_URL
    : 'http://localhost:5000/api';

/**
 * Gửi yêu cầu tạo nội dung AI không đồng bộ.
 * Trả về { job_id, status: "pending" } ngay lập tức.
 */
async function submitGenerateJob(payload) {
    const response = await fetch(`${AI_API_BASE_URL}/generate-async`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Lỗi khi gửi yêu cầu');
    return data;  // { success, job_id, status }
}

/**
 * Kiểm tra trạng thái một job theo job_id.
 * Trả về { status, progress, result?, error? }
 */
async function pollJob(jobId) {
    const response = await fetch(`${AI_API_BASE_URL}/job/${jobId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Lỗi khi kiểm tra job');
    return data;
}

/**
 * Submit job và liên tục kiểm tra tiến độ cho đến khi hoàn thành hoặc lỗi.
 *
 * @param {object}   payload           - Dữ liệu gửi lên (tool_id, form_data, user_id, project_id)
 * @param {object}   [options]
 * @param {number}   [options.interval=3000]  - Khoảng thời gian giữa mỗi lần poll (ms)
 * @param {number}   [options.timeout=300000] - Thời gian tối đa chờ đợi (ms), mặc định 5 phút
 * @param {function} [options.onProgress]     - Callback(progress, status) khi có cập nhật
 * @returns {Promise<object>} result từ AI khi job "done"
 */
async function generateWithPolling(payload, options = {}) {
    const {
        interval    = 3000,
        timeout     = 300_000,
        onProgress  = null,
    } = options;

    // 1. Gửi yêu cầu → nhận job_id
    const { job_id } = await submitGenerateJob(payload);

    // 2. Poll cho đến khi done/error hoặc hết timeout
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, interval));

        const job = await pollJob(job_id);

        if (onProgress) {
            onProgress(job.progress, job.status);
        }

        if (job.status === 'done') {
            return job.result;
        }

        if (job.status === 'error') {
            const err = new Error(job.error || 'Job thất bại');
            err.error_code = job.error_code;
            throw err;
        }
        // status = "pending" | "processing" → tiếp tục vòng lặp
    }

    throw new Error(`Job ${job_id} không hoàn thành trong ${timeout / 1000}s`);
}

const AsyncJobAPI = { submitGenerateJob, pollJob, generateWithPolling };

// ===================== Export =====================

// Kiểm tra kết nối khi tải trang
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔍 Đang kiểm tra kết nối server...');
    const health = await checkServerHealth();
    
    if (health.status === 'healthy') {
        console.log('✅ Kết nối server và database thành công!');
    } else {
        console.warn('⚠️ Không thể kết nối tới server. Một số chức năng có thể không hoạt động.');
    }
});

// Export cho global use
window.API = {
    checkHealth: checkServerHealth,
    Projects: ProjectsAPI,
    AIResponses: AIResponsesAPI,
    AsyncJob: AsyncJobAPI,
};
