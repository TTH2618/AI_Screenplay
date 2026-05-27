/**
 * Project Manager - Quản lý dự án kịch bản
 * Lưu trữ và hiển thị lịch sử các dự án phim từ MySQL
 */

// Ưu tiên APP_CONFIG từ config.js (native Capacitor app dùng ngrok/production URL)
const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)
    ? window.APP_CONFIG.API_BASE_URL
    : `${window.location.protocol}//${window.location.host}/api`;

// Lấy header Authorization từ storage
function getAuthHeaders() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Current project state
let currentProject = null;
let projects = [];

// Tool type mapping
const toolTypeMap = {
    logline: { name: '1. Logline Creator', icon: 'fas fa-pen-fancy' },
    story_upload: { name: '0. Tải truyện lên', icon: 'fas fa-upload', isStory: true },
    theme: { name: '2. Movie Theme Creator', icon: 'fas fa-lightbulb' },
    character: { name: '3. Character Creator', icon: 'fas fa-users' },
    synopsis: { name: '4. Synopsis Creator', icon: 'fas fa-file-alt' },
    structure: { name: '5. Cấu trúc 4 Hồi', icon: 'fas fa-sitemap' },
    beatsheet: { name: '6. Beat Sheet Creator', icon: 'fas fa-list-ol' },
    scenelist: { name: '7. Scene List Creator', icon: 'fas fa-th-list' },
    script: { name: '8. Script Writer', icon: 'fas fa-scroll' },
    // Story analysis tools
    story_theme: { name: '1. Phân tích Chủ đề', icon: 'fas fa-lightbulb', isStory: true },
    story_character: { name: '2. Phân tích Nhân vật', icon: 'fas fa-users', isStory: true },
    story_synopsis: { name: '3. Viết Synopsis', icon: 'fas fa-file-alt', isStory: true },
    story_structure: { name: '4. Phân tích theo từng hồi', icon: 'fas fa-sitemap', isStory: true },
    story_beatsheet: { name: '5. Tạo Beat Sheet', icon: 'fas fa-list-ol', isStory: true },
    story_scenelist: { name: '6. Danh sách Cảnh', icon: 'fas fa-th-list', isStory: true },
    story_script: { name: '7. Viết Kịch bản', icon: 'fas fa-scroll', isStory: true }
};

// ===================== API Helper =====================
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            const err = new Error(data.message || 'Có lỗi xảy ra');
            err.status = response.status;
            throw err;
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ===================== Initialize =====================
document.addEventListener('DOMContentLoaded', () => {
    loadProjectsFromDB();
    setupHistoryToggle();
});

// Setup history section toggle
function setupHistoryToggle() {
    const historyHeader = document.querySelector('.nav-section-header[onclick="toggleSection(\'history\')"]');
    if (historyHeader) {
        historyHeader.onclick = () => {
            const historyList = document.getElementById('history-list');
            const toggleIcon = document.getElementById('history-toggle-icon');
            
            if (historyList.style.display === 'none') {
                historyList.style.display = 'block';
                toggleIcon.classList.remove('fa-chevron-down');
                toggleIcon.classList.add('fa-chevron-up');
            } else {
                historyList.style.display = 'none';
                toggleIcon.classList.remove('fa-chevron-up');
                toggleIcon.classList.add('fa-chevron-down');
            }
        };
    }
}

// ===================== Load Projects from MySQL =====================
let projectsLoaded = false;

async function loadProjectsFromDB() {
    try {
        const response = await apiRequest('/projects');
        if (response.success) {
            projects = response.data;
            
            // Load steps for each project
            for (let project of projects) {
                try {
                    const stepsResponse = await apiRequest(`/ai-responses/project/${project.id}`);
                    if (stepsResponse.success) {
                        project.steps = {};
                        stepsResponse.data.forEach(step => {
                            project.steps[step.tool_type] = {
                                id: step.id,
                                input: typeof step.input_data === 'string' ? JSON.parse(step.input_data) : step.input_data,
                                output: step.output_data,
                                created_at: step.created_at
                            };
                        });
                    }
                } catch (e) {
                    project.steps = {};
                }
            }
            
            renderProjectList();
            projectsLoaded = true;
            console.log('✅ Đã tải', projects.length, 'dự án từ MySQL');
        }
    } catch (error) {
        console.error('❌ Lỗi khi tải dự án từ database:', error);
        if (error.status === 401 || error.status === 403) {
            alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            window.location.href = 'auth.html';
            return;
        }
        projectsLoaded = true; // Mark as loaded even on error
    }
}

// Wait for projects to be loaded
function waitForProjectsLoaded() {
    return new Promise((resolve) => {
        if (projectsLoaded) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (projectsLoaded) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
}

// ===================== Create New Project =====================
async function createNewProject() {
    return createNewProjectWithTitle('Dự án mới', {});
}

// Create new project with custom title
async function createNewProjectWithTitle(title, inputData) {
    try {
        // Get description from input data
        const description = Object.values(inputData).find(v => v && typeof v === 'string') || '';
        
        // Tạo project trong MySQL
        const response = await apiRequest('/projects', {
            method: 'POST',
            body: JSON.stringify({
                title: title,
                description: description.substring(0, 500),
                status: 'draft'
            })
        });
        
        if (response.success) {
            currentProject = {
                id: response.data.id,
                title: title,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                steps: {}
            };
            
            // Add to local list
            projects.unshift(currentProject);
            renderProjectList();
            
            console.log('✅ Đã tạo dự án mới trong MySQL, ID:', currentProject.id, '- Title:', title);
            
            // Show current project indicator
            showCurrentProjectBar();
            
            return currentProject;
        }
    } catch (error) {
        console.error('❌ Lỗi khi tạo dự án:', error);
        alert('Không thể tạo dự án. Vui lòng kiểm tra kết nối database.');
        return null;
    }
}

// Create new project and reset UI by reloading the page (called from button)
async function createNewProjectFromButton() {
    const project = await createNewProjectWithTitle('Dự án mới', {});
    if (project && project.id) {
        sessionStorage.setItem('openProject', project.id);
        sessionStorage.setItem('newProjectLoaded', 'true');
    }
    window.location.reload();
}

// Show current project bar
function showCurrentProjectBar() {
    if (!currentProject) return;
    
    let bar = document.querySelector('.current-project-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.className = 'current-project-bar';
        const mainContent = document.querySelector('.main-content');
        mainContent.insertBefore(bar, mainContent.firstChild);
    }
    
    const title = currentProject.title === 'Dự án mới' ? 'Dự án mới (chưa lưu)' : currentProject.title;
    
    bar.innerHTML = `
        <div class="project-name">
            <i class="fas fa-film"></i>
            <span>${title}</span>
         <!--   <small style="opacity: 0.8; font-size: 0.75rem; margin-left: 10px;">💾 MySQL ID: ${currentProject.id}</small> --!>
        </div>
       <!-- <button class="btn-change" onclick="showProjectHistory()">
            <i class="fas fa-history"></i> Xem lịch sử
        </button> --!>
    `;
}

// ===================== Save Step to MySQL =====================
async function saveStepToProject(toolType, inputData, outputData) {
    // Get title from input data - use first non-empty field value
    const getProjectTitle = (data) => {
        // Priority order for title extraction
        const priorityFields = ['movie_idea', 'logline', 'synopsis', 'theme'];
        
        for (const field of priorityFields) {
            if (data[field]) {
                const value = data[field];
                return value.length > 100 ? value.substring(0, 100) + '...' : value;
            }
        }
        
        // Fallback to first non-empty field
        const firstValue = Object.values(data).find(v => v && typeof v === 'string' && v.trim());
        if (firstValue) {
            return firstValue.length > 100 ? firstValue.substring(0, 100) + '...' : firstValue;
        }
        return 'Dự án không tên';
    };
    
    // If no current project, create new one with title from input
    if (!currentProject) {
        const projectTitle = getProjectTitle(inputData);
        await createNewProjectWithTitle(projectTitle, inputData);
    }
    
    if (!currentProject || !currentProject.id) {
        console.error('❌ Không có dự án hiện tại');
        return;
    }
    
    // Update project title if this is the first step or if it's logline
    const isFirstStep = Object.keys(currentProject.steps || {}).length === 0;
    if (isFirstStep || (toolType === 'logline' && inputData.movie_idea)) {
        const newTitle = getProjectTitle(inputData);
        currentProject.title = newTitle;
        
        // Update title in MySQL
        try {
            await apiRequest(`/projects/${currentProject.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: newTitle,
                    description: Object.values(inputData).find(v => v) || '',
                    status: 'in_progress'
                })
            });
            console.log('✅ Đã cập nhật tiêu đề dự án trong MySQL');
            renderProjectList();
            showCurrentProjectBar();
        } catch (error) {
            console.error('❌ Lỗi cập nhật tiêu đề:', error);
        }
    }
    
    // Save step data to local
    // Cho script/story_script: nối tiếp thay vì ghi đè
    const appendTools = ['script', 'story_script'];
    if (appendTools.includes(toolType) && currentProject.steps[toolType] && currentProject.steps[toolType].output) {
        const separator = '\n\n<hr/>\n\n';
        currentProject.steps[toolType] = {
            id: currentProject.steps[toolType].id,
            input: typeof inputData === 'string' ? JSON.parse(inputData) : inputData,
            output: currentProject.steps[toolType].output + separator + outputData,
            created_at: new Date().toISOString()
        };
        console.log('📜 Đã nối thêm kịch bản cảnh mới vào nội dung cũ');
    } else {
        currentProject.steps[toolType] = {
            id: currentProject.steps[toolType] ? currentProject.steps[toolType].id : undefined,
            input: typeof inputData === 'string' ? JSON.parse(inputData) : inputData,
            output: outputData,
            created_at: new Date().toISOString()
        };
    }
    currentProject.updated_at = new Date().toISOString();
    
    // Save to MySQL
    try {
        const saveResponse = await apiRequest('/ai-responses', {
            method: 'POST',
            body: JSON.stringify({
                project_id: currentProject.id,
                tool_type: toolType,
                input_data: inputData,
                output_data: outputData
            })
        });

        if (saveResponse && saveResponse.data && currentProject.steps[toolType]) {
            currentProject.steps[toolType].id = saveResponse.data.id;
        }
        
        console.log('✅ Đã lưu bước', toolType, 'vào MySQL (project_id:', currentProject.id, ')');
    } catch (error) {
        console.error('❌ Lỗi lưu vào MySQL:', error);
        alert('Lỗi khi lưu vào database: ' + error.message);
    }
    
    // Update local list - move to front (most recently modified)
    const existingIndex = projects.findIndex(p => p.id === currentProject.id);
    if (existingIndex >= 0) {
        projects.splice(existingIndex, 1);
    }
    projects.unshift(currentProject);
    
    renderProjectList();
    showCurrentProjectBar();
}

// ===================== Render Project List =====================
function renderProjectList() {
    const historyList = document.getElementById('history-list');
    const noProjects = document.getElementById('no-projects');
    
    if (!historyList) return;
    
    // Clear existing items except no-projects placeholder
    historyList.querySelectorAll('.project-item').forEach(item => item.remove());
    
    if (projects.length === 0) {
        if (noProjects) noProjects.style.display = 'flex';
        return;
    }
    
    if (noProjects) noProjects.style.display = 'none';
    
    // Sort by updated_at (most recent first), fallback to created_at
    const sorted = [...projects].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0);
        const dateB = new Date(b.updated_at || b.created_at || 0);
        return dateB - dateA;
    });
    
    sorted.forEach(project => {
        const item = document.createElement('li');
        item.className = 'project-item nav-item';
        item.dataset.id = project.id;
        if (currentProject && currentProject.id === project.id) {
            item.classList.add('active');
        }
        
        const displayDate = new Date(project.updated_at || project.created_at);
        const dateStr = displayDate.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const stepsCount = Object.keys(project.steps || {}).length;
        
        item.innerHTML = `
            <div class="project-icon">
                <i class="fas fa-film"></i>
            </div>
            <div class="project-info">
                <span class="project-name" title="${project.title}">${project.title}</span>
                <span class="project-date">Cập nhật: ${dateStr} • ${stepsCount} bước 💾</span>
            </div>
            <div class="project-actions">
                <button class="project-more" onclick="toggleProjectMenu(${project.id}, event)" title="Tùy chọn">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="project-menu">
                    <button onclick="event.stopPropagation(); loadProject(${project.id}); closeProjectMenus();">
                        <i class="fas fa-eye"></i> Xem
                    </button>
                    <button onclick="event.stopPropagation(); renameProject(${project.id}); closeProjectMenus();">
                        <i class="fas fa-edit"></i> Đổi tên
                    </button>
                    <button class="danger" onclick="event.stopPropagation(); deleteProject(${project.id}); closeProjectMenus();">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </div>
            </div>
        `;
        
        item.onclick = () => loadProject(project.id);

        const nameElement = item.querySelector('.project-name');
        // if (nameElement) {
        //     nameElement.addEventListener('click', (event) => {
        //         event.stopPropagation();
        //         renameProject(project.id);
        //     });
        // }
        historyList.appendChild(item);
    });
}

// Close any open project menus
function closeProjectMenus() {
    document.querySelectorAll('.project-menu').forEach(menu => menu.classList.remove('open'));
}

// Toggle project menu for a specific item
function toggleProjectMenu(projectId, event) {
    event.stopPropagation();
    const menu = document.querySelector(`.project-item[data-id="${projectId}"] .project-menu`);
    if (!menu) return;
    const isOpen = menu.classList.contains('open');
    closeProjectMenus();
    if (!isOpen) {
        menu.classList.add('open');
    }
}

// Close menus when clicking outside
document.addEventListener('click', () => {
    closeProjectMenus();
});

// ===================== Load Project =====================
async function loadProject(projectId) {
    if (typeof window.hasUnsavedChanges === 'function' && window.hasUnsavedChanges()) {
        window.checkUnsavedChanges(() => loadProject(projectId));
        return;
    }
    let project = projects.find(p => p.id === projectId);
    
    if (!project) {
        // Try to load from MySQL
        try {
            const response = await apiRequest(`/projects/${projectId}`);
            if (response.success) {
                project = response.data;
                project.steps = {};
                
                // Load steps
                const stepsResponse = await apiRequest(`/ai-responses/project/${projectId}`);
                if (stepsResponse.success) {
                    stepsResponse.data.forEach(step => {
                        project.steps[step.tool_type] = {
                            id: step.id,
                            input: typeof step.input_data === 'string' ? JSON.parse(step.input_data) : step.input_data,
                            output: step.output_data,
                            created_at: step.created_at
                        };
                    });
                }
            }
        } catch (error) {
            console.error('❌ Không thể tải dự án:', error);
            return;
        }
    }
    
    if (!project) return;
    
    currentProject = { ...project };
    
    // Khôi phục storyContent nếu dự án có bước story_upload
    if (project.steps && project.steps['story_upload'] && project.steps['story_upload'].output) {
        if (typeof window.setStoryContent === 'function') {
            const inputData = project.steps['story_upload'].input || {};
            window.setStoryContent(project.steps['story_upload'].output, inputData.file_name || 'Nội dung đã dán');
            console.log('📖 Đã khôi phục nội dung truyện từ database');
        }
    }
    
    // Update active state
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.remove('active');
    });
    
    showCurrentProjectBar();
    showProjectHistory();
    
    console.log('📂 Đã tải dự án:', project.title, '(ID:', project.id, ')');
}

// ===================== Rename Project =====================
async function renameProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newTitle = prompt('Nhập tên mới cho dự án:', project.title || 'Dự án');
    if (newTitle === null) return;

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle || trimmedTitle === project.title) return;

    try {
        await apiRequest(`/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify({
                title: trimmedTitle,
                description: project.description || '',
                status: project.status || 'draft'
            })
        });

        project.title = trimmedTitle;
        const index = projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            projects[index].title = trimmedTitle;
        }

        if (currentProject && currentProject.id === projectId) {
            currentProject.title = trimmedTitle;
            showCurrentProjectBar();
        }

        renderProjectList();
        const toolContainer = document.getElementById('tool-container');
        if (toolContainer && toolContainer.querySelector('.project-history-view')) {
            showProjectHistory();
        }
        console.log('✅ Đã đổi tên dự án:', trimmedTitle);
    } catch (error) {
        console.error('❌ Lỗi khi đổi tên dự án:', error);
        alert('Không thể đổi tên dự án: ' + error.message);
    }
}

// ===================== Delete Confirm Modal =====================
function showDeleteConfirm({ title, message, onConfirm }) {
    const overlay = document.getElementById('delete-confirm-overlay');
    if (!overlay) {
        // Fallback nếu không có modal trong DOM
        if (confirm(message)) onConfirm();
        return;
    }
    document.getElementById('delete-confirm-title').textContent = title || 'Xác nhận xóa';
    document.getElementById('delete-confirm-message').textContent = message || 'Hành động này không thể hoàn tác.';
    overlay.style.display = 'flex';

    const btnOk = document.getElementById('delete-confirm-ok');
    const btnCancel = document.getElementById('delete-confirm-cancel');

    function close() {
        overlay.style.display = 'none';
        btnOk.removeEventListener('click', handleOk);
        btnCancel.removeEventListener('click', close);
    }
    function handleOk() {
        close();
        onConfirm();
    }

    btnOk.addEventListener('click', handleOk);
    btnCancel.addEventListener('click', close);

    // Close on overlay background click
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

// ===================== Delete Project =====================
async function deleteProject(projectId) {
    showDeleteConfirm({
        title: 'Xóa dự án?',
        message: 'Bạn có chắc muốn xóa dự án này? Dữ liệu sẽ bị xóa vĩnh viễn khỏi database.',
        onConfirm: async () => {
            try {
                // Delete from MySQL
                await apiRequest(`/projects/${projectId}`, {
                    method: 'DELETE'
                });
                console.log('✅ Đã xóa dự án khỏi MySQL');
            } catch (error) {
                console.error('❌ Lỗi khi xóa từ MySQL:', error);
                alert('Lỗi khi xóa dự án: ' + error.message);
                return;
            }

            // Remove from local list
            projects = projects.filter(p => p.id !== projectId);

            if (currentProject && currentProject.id === projectId) {
                currentProject = null;
                const bar = document.querySelector('.current-project-bar');
                if (bar) bar.remove();
            }

            renderProjectList();

            // If viewing history, go back to tools
            const toolContainer = document.getElementById('tool-container');
            if (toolContainer && toolContainer.querySelector('.project-history-view')) {
                if (typeof loadTool === 'function') {
                    loadTool('logline');
                }
            }
        }
    });
}

// ===================== Show Project History =====================
function showProjectHistory() {
    if (!currentProject) return;
    
    const toolContainer = document.getElementById('tool-container');
    if (!toolContainer) return;
    
    // Hide result panel when viewing history
    const resultPanel = document.querySelector('.result-panel');
    if (resultPanel) {
        resultPanel.style.display = 'none';
    }
    
    const steps = currentProject.steps || {};
    const stepKeys = Object.keys(steps);
    
    // Sort steps by their order in toolTypeMap
    const toolOrder = Object.keys(toolTypeMap);
    stepKeys.sort((a, b) => {
        const indexA = toolOrder.indexOf(a);
        const indexB = toolOrder.indexOf(b);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    // Separate regular and story tools
    const regularKeys = stepKeys.filter(k => !k.startsWith('story_'));
    const storyKeys = stepKeys.filter(k => k.startsWith('story_'));
    
    let historyHTML = `
        <div class="project-history-view">
            <div class="project-history-header">
                <div>
                    <h2><i class="fas fa-film"></i> ${currentProject.title}</h2>
                    <p class="project-meta">
                        Tạo ngày: ${new Date(currentProject.created_at).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZoneName: 'short'
                        })}
                         <!-- <br><span style="color: #10b981;">💾 Đã lưu vào MySQL (ID: ${currentProject.id})</span> --!>
                    </p>
                </div>
                <div class="project-history-actions">
                    <button class="btn-rename" onclick="renameProject(${currentProject.id})">
                        <i class="fas fa-edit"></i>
                        Đổi tên
                    </button>
                    <button class="btn-del" onclick="deleteProject(${currentProject.id})">
                        <i class="fas fa-trash"></i>
                        Xóa
                    </button>
                </div>
            </div>
            
            <div class="history-timeline">
    `;
    
    if (stepKeys.length === 0) {
        historyHTML += `
            <div class="no-steps" style="text-align: center; padding: 40px; color: #9ca3af;">
                <i class="fas fa-clipboard-list" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>Chưa có bước nào được tạo</p>
                <p style="font-size: 0.85rem; margin-top: 5px;">Bắt đầu bằng cách tạo Logline</p>
            </div>
        `;
    } else {
        // Render regular tools section
        if (regularKeys.length > 0) {
            historyHTML += `<div class="history-section-label"><i class="fas fa-film"></i> Công cụ viết kịch bản</div>`;
            regularKeys.forEach(toolType => {
                historyHTML += renderHistoryItem(toolType, steps[toolType]);
            });
        }

        // Render story tools section
        if (storyKeys.length > 0) {
            historyHTML += `<div class="history-section-label" style="margin-top: 20px;"><i class="fas fa-book"></i> Phân tích truyện</div>`;
            storyKeys.forEach(toolType => {
                historyHTML += renderHistoryItem(toolType, steps[toolType]);
            });
        }
    }
    
    historyHTML += `
            </div>
        </div>
    `;
    
    toolContainer.innerHTML = historyHTML;
}

// Render a single history item
function renderHistoryItem(toolType, step) {
    const toolInfo = toolTypeMap[toolType] || { name: toolType, icon: 'fas fa-cog' };
    const stepDate = new Date(step.created_at).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
    
    // Truncate output for preview
    const outputPreview = step.output ? 
        step.output.replace(/<[^>]*>/g, '').substring(0, 300) + '...' : '';

    const stepIdAttr = step.id ? `data-step-id="${step.id}"` : '';
    
    return `
        <div class="history-item" data-tool="${toolType}" ${stepIdAttr}>
            <div class="history-item-header">
                <div class="tool-badge">
                    <div class="icon">
                        <i class="${toolInfo.icon}"></i>
                    </div>
                    <div>
                        <h3>${toolInfo.name}</h3>
                        <span class="date">${stepDate}</span>
                    </div>
                </div>
                <div class="history-item-actions">
                    <button class="btn-delete-step" onclick="deleteStep('${toolType}')">
                        Xóa
                    </button>
                    <button class="btn-view" onclick="viewStepDetail('${toolType}')">
                        Xem
                    </button>
                </div>
            </div>
            <div class="history-item-content">
                <div class="output-preview">${outputPreview}</div>
            </div>
        </div>
    `;
}

// Delete a specific step from project history
async function deleteStep(toolType) {
    if (!currentProject || !currentProject.steps || !currentProject.steps[toolType]) return;
    const step = currentProject.steps[toolType];
    if (!step.id) {
        alert('Không tìm thấy ID của bước để xóa.');
        return;
    }

    showDeleteConfirm({
        title: 'Xóa bước này?',
        message: 'Bạn có chắc muốn xóa bước này? Nội dung sẽ bị xóa khỏi dự án và không thể phục hồi.',
        onConfirm: async () => {
            try {
                await apiRequest(`/ai-responses/${toolType}/${step.id}`, {
                    method: 'DELETE'
                });

                delete currentProject.steps[toolType];

                const projectIndex = projects.findIndex(p => p.id === currentProject.id);
                if (projectIndex !== -1) {
                    if (projects[projectIndex].steps) {
                        delete projects[projectIndex].steps[toolType];
                    }
                }

                renderProjectList();
                showProjectHistory();
                console.log('🗑️ Đã xóa bước', toolType, 'khỏi dự án', currentProject.id);
            } catch (error) {
                console.error('❌ Lỗi khi xóa bước:', error);
                alert('Không thể xóa bước: ' + error.message);
            }
        }
    });
}

// Get input label based on field key
function getInputLabel(key) {
    const labels = {
        movie_idea: "What's your movie idea?",
        logline: "What's your movie idea?",
        theme: 'Theme',
        characters: 'Characters',
        synopsis: 'Synopsis',
        structure: 'Structure',
        character_count: 'Number of characters',
        beat_count: 'Number of beats',
        scene_number: 'Scene number'
    };
    return labels[key] || key;
}

// View step detail - Navigate to tool page with saved data
function viewStepDetail(toolType, isAfterReload = false) {
    if (!currentProject || !currentProject.steps[toolType]) return;
    
    if (!isAfterReload) {
        // Set sessionStorage to tell the app to load this project and tool after reload
        sessionStorage.setItem('openProject', currentProject.id);
        sessionStorage.setItem('openTool', toolType);
        
        // Hard reload the page
        window.location.reload();
        return;
    }
    
    const step = currentProject.steps[toolType];
    const isStoryTool = toolType.startsWith('story_');
    
    // Navigate to the tool
    if (typeof loadTool === 'function') {
        loadTool(toolType);
    }
    
    // Update navigation active state - use unified sidebar
    const storyToNavMap = {
        'story_theme': 'theme',
        'story_character': 'character',
        'story_synopsis': 'synopsis',
        'story_structure': 'structure',
        'story_beatsheet': 'beatsheet',
        'story_scenelist': 'scenelist',
        'story_script': 'script',
        'story_upload': 'logline'
    };
    
    const navToolId = isStoryTool ? (storyToNavMap[toolType] || toolType) : toolType;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tool === navToolId) {
            item.classList.add('active');
        }
    });
    
    // Wait for DOM to update, then fill in the data
    setTimeout(() => {
        // Fill input fields with saved data
        if (step.input) {
            Object.keys(step.input).forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field && step.input[fieldId]) {
                    field.value = step.input[fieldId];
                    // Add visual indicator that field is restored
                    field.classList.add('restored-field');
                }
            });
        }
        
        // Display saved output in result panel
        if (step.output) {
            const resultContent = document.getElementById('result-content');
            if (resultContent) {
                resultContent.innerHTML = step.output;
            }
            
            // Show next step button if not the last step
            if (typeof showNextStepButton === 'function') {
                showNextStepButton();
            }
        }
        
        // Show notification
        showRestoreNotification(toolType);
    }, 100);
    
    console.log('📂 Đã load dữ liệu cho công cụ:', toolType);
}

// Show notification when data is restored
function showRestoreNotification(toolType) {
    const toolInfo = toolTypeMap[toolType] || { name: toolType };
    
    // Remove existing notification
    const existing = document.querySelector('.restore-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'restore-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>Đã khôi phục dữ liệu từ "${toolInfo.name}"</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Close modal (keep for backward compatibility)
function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ===================== Export Functions =====================
window.ProjectManager = {
    createNewProject,
    createNewProjectFromButton,
    createNewProjectWithTitle,
    saveStepToProject,
    loadProject,
    deleteProject,
    showProjectHistory,
    getCurrentProject: () => currentProject,
    getProjects: () => projects,
    loadProjectsFromDB,
    waitForProjectsLoaded
};

// Expose to global scope for onclick handlers
window.createNewProject = createNewProjectFromButton; // Button uses this
window.createNewProjectWithTitle = createNewProjectWithTitle;
window.loadProject = loadProject;
window.deleteProject = deleteProject;
window.showProjectHistory = showProjectHistory;
window.viewStepDetail = viewStepDetail;
window.closeModal = closeModal;
window.saveStepToProject = saveStepToProject;
window.waitForProjectsLoaded = waitForProjectsLoaded;
