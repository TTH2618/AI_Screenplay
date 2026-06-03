// Tool Definitions
const tools = {
    logline: {
        title: '1. Khởi tạo Kịch bản',
        description: 'Công cụ này giúp bạn bắt đầu xây dựng kịch bản bằng cách nhập một ý tưởng (Logline) hoặc tải lên một câu chuyện có sẵn.',
        icon: 'fas fa-pen-fancy',
        fields: [
            {
                id: 'movie_idea',
                label: 'Ý tưởng phim của bạn là gì?',
                labelIcon: '🎬',
                type: 'textarea',
                placeholder: 'Ví dụ: Một thám tử săn lùng kẻ giết người hàng loạt trong một thành phố tương lai.',
                required: true
            }
        ],
        generatePrompt: (data) => `Tạo logline cho bộ phim: ${data.movie_idea}`
    },
    theme: {
        title: '2. Xác định Chủ đề',
        description: 'Công cụ này giúp bạn xác định thông điệp sâu sắc hơn của bộ phim (ví dụ: tình yêu, sự hy sinh, lòng dũng cảm) dựa trên Logline hoặc ý tưởng câu chuyện.',
        icon: 'fas fa-lightbulb',
        fields: [
            {
                id: 'logline',
                label: 'Nhập Logline hoặc ý tưởng phim',
                labelIcon: '🎬',
                type: 'textarea',
                placeholder: 'Ví dụ: Một thám tử săn lùng kẻ giết người hàng loạt trong một thành phố tương lai.',
                required: true
            }
        ],
        generatePrompt: (data) => `Xác định chủ đề cho phim với logline: ${data.logline}`
    },
    character: {
        title: '3. Mô tả Nhân vật',
        description: 'Công cụ này tạo hồ sơ chi tiết về tính cách, ngoại hình, động lực và vai trò của từng nhân vật dựa trên ý tưởng phim, giúp đảm bảo sự nhất quán trong kịch bản.',
        icon: 'fas fa-users',
        fields: [
            {
                id: 'logline',
                label: 'Nhập Logline hoặc ý tưởng phim',
                labelIcon: '🎬',
                type: 'textarea',
                placeholder: 'Ví dụ: Một thám tử săn lùng kẻ giết người hàng loạt trong một thành phố tương lai.',
                required: true
            },
            {
                id: 'theme',
                label: 'Nhập chủ đề chính của phim',
                labelIcon: '🎯',
                type: 'textarea',
                placeholder: 'Vui lòng nhập chủ đề của bộ phim.',
                required: true
            },
            {
                id: 'character_count',
                label: 'Bạn cần bao nhiêu nhân vật chính?',
                labelIcon: '👥',
                type: 'input',
                placeholder: 'Ví dụ: 1, 3, 5',
                required: false,
                optional: true
            }
        ],
        generatePrompt: (data) => `Tạo mô tả nhân vật cho phim với logline: ${data.logline}, chủ đề: ${data.theme}, số lượng nhân vật: ${data.character_count || '3-5'}`
    },
    synopsis: {
        title: '4. Viết Tóm tắt (Synopsis)',
        description: 'Công cụ này giúp bạn biến ý tưởng phim, chủ đề và nhân vật thành một bản tóm tắt chi tiết toàn bộ câu chuyện từ đầu đến cuối (bao gồm cả kết thúc), rõ ràng và hấp dẫn.',
        icon: 'fas fa-file-alt',
        fields: [
            {
                id: 'logline',
                label: 'Nhập Logline hoặc ý tưởng phim',
                labelIcon: '🎬',
                type: 'textarea',
                placeholder: 'Ví dụ: Một thám tử săn lùng kẻ giết người hàng loạt trong một thành phố tương lai.',
                required: true
            },
            {
                id: 'theme',
                label: 'Nhập chủ đề chính của phim',
                labelIcon: '🎯',
                type: 'textarea',
                placeholder: 'Vui lòng nhập chủ đề của bộ phim.',
                required: true
            },
            {
                id: 'characters',
                label: 'Nhập mô tả các nhân vật',
                labelIcon: '👥',
                type: 'textarea',
                placeholder: 'Vui lòng mô tả các nhân vật trong phim.',
                required: true
            }
        ],
        generatePrompt: (data) => `Viết synopsis cho phim: ${data.logline}, chủ đề: ${data.theme}, nhân vật: ${data.characters}`
    },
    structure: {
        title: '5. Phân tích theo từng hồi',
        description: 'Công cụ này giúp nhà biên kịch phân chia câu chuyện thành 4 hồi rõ ràng (Setup - Response - Action - Climax) theo Story Circle của Dan Harmon, giúp kiểm soát nhịp phim tốt hơn.',
        icon: 'fas fa-sitemap',
        fields: [
            {
                id: 'theme',
                label: 'Nhập chủ đề chính của phim',
                labelIcon: '🎯',
                type: 'textarea',
                placeholder: 'Vui lòng nhập chủ đề của bộ phim.',
                required: true
            },
            {
                id: 'characters',
                label: 'Nhập mô tả các nhân vật',
                labelIcon: '👥',
                type: 'textarea',
                placeholder: 'Vui lòng mô tả các nhân vật trong phim.',
                required: true
            },
            {
                id: 'synopsis',
                label: 'Nhập tóm tắt phim (Synopsis)',
                labelIcon: '📝',
                type: 'textarea',
                placeholder: 'Vui lòng nhập bản tóm tắt phim với các sự kiện chính từ đầu đến cuối.',
                required: true
            }
        ],
        generatePrompt: (data) => `Tạo cấu trúc 4 hồi cho phim với chủ đề: ${data.theme}, nhân vật: ${data.characters}, synopsis: ${data.synopsis}`
    },
    beatsheet: {
        title: '6. Tạo Beat Sheet',
        description: 'Công cụ này sắp xếp cốt truyện thành các beat rõ ràng, giúp bạn xây dựng câu chuyện mạch lạc với các tình tiết hấp dẫn và những khoảnh khắc quan trọng cho từng hồi.',
        icon: 'fas fa-list-ol',
        fields: [
            {
                id: 'synopsis',
                label: 'Nhập tóm tắt phim hoặc Logline',
                labelIcon: '📝',
                type: 'textarea',
                placeholder: 'Vui lòng nhập bản tóm tắt phim với các sự kiện chính từ đầu đến cuối.',
                required: true
            },
            {
                id: 'structure',
                label: 'Nhập dữ liệu phân tích theo từng hồi của phim',
                labelIcon: '🏗️',
                type: 'textarea',
                placeholder: 'Cung cấp các sự kiện chính và điểm ngoặt trong mỗi hồi của phim.',
                required: true
            },
            {
                id: 'characters',
                label: 'Nhập mô tả các nhân vật',
                labelIcon: '👥',
                type: 'textarea',
                placeholder: 'Vui lòng mô tả các nhân vật trong phim.',
                required: true
            }
        ],
        generatePrompt: (data) => `Tạo beat sheet cho phim với synopsis: ${data.synopsis}, cấu trúc: ${data.structure}, nhân vật: ${data.characters}`
    },
    scenelist: {
        title: '7. Danh sách Cảnh',
        description: 'Công cụ này giúp nhà biên kịch chia kịch bản thành số cảnh mong muốn, đảm bảo luồng truyện mạch lạc, cấu trúc chặt chẽ và phát triển nhân vật đầy đủ từ đầu đến cuối.',
        icon: 'fas fa-th-list',
        fields: [
            {
                id: 'synopsis',
                label: 'Nhập tóm tắt phim (Synopsis)',
                labelIcon: '📝',
                type: 'textarea',
                placeholder: 'Vui lòng nhập bản tóm tắt phim với các sự kiện chính từ đầu đến cuối.',
                required: true
            },
            {
                id: 'characters',
                label: 'Nhập mô tả các nhân vật',
                labelIcon: '👥',
                type: 'textarea',
                placeholder: 'Vui lòng mô tả các nhân vật trong phim.',
                required: true
            },
            {
                id: 'structure',
                label: 'Nhập dữ liệu phân tích theo từng hồi của phim',
                labelIcon: '🏗️',
                type: 'textarea',
                placeholder: 'Cung cấp các sự kiện chính và điểm ngoặt trong mỗi hồi của phim.',
                required: true
            },
            {
                id: 'beatsheet',
                label: 'Nhập Beat Sheet của phim',
                labelIcon: '📋',
                type: 'textarea',
                placeholder: 'Vui lòng nhập beat sheet của phim.',
                required: true
            },
            {
                id: 'scene_count',
                label: 'Tổng số cảnh muốn tạo là bao nhiêu?',
                labelIcon: '🎞️',
                type: 'input',
                placeholder: 'Ví dụ: 40 (khuyến nghị 30-60 cảnh)',
                required: true
            }
        ],
        generatePrompt: (data) => `Tạo danh sách cảnh cho phim với synopsis: ${data.synopsis}, nhân vật: ${data.characters}, cấu trúc: ${data.structure}, beat sheet: ${data.beatsheet}, số cảnh: ${data.scene_count}`
    },
    script: {
        title: '8. Viết Kịch bản',
        description: 'Công cụ này giúp bạn viết kịch bản chi tiết và rõ ràng cho một cảnh phim cụ thể, đảm bảo mọi thứ phù hợp với câu chuyện, nhân vật và cốt truyện theo chuẩn format Hollywood.',
        icon: 'fas fa-scroll',
        fields: [
            {
                id: 'synopsis',
                label: 'Nhập tóm tắt phim (Synopsis)',
                labelIcon: '📝',
                type: 'textarea',
                placeholder: 'Vui lòng nhập bản tóm tắt phim với các sự kiện chính từ đầu đến cuối.',
                required: true
            },
            {
                id: 'characters',
                label: 'Nhập mô tả các nhân vật',
                labelIcon: '👥',
                type: 'textarea',
                placeholder: 'Vui lòng mô tả các nhân vật trong phim.',
                required: true
            },
            {
                id: 'structure',
                label: 'Nhập dữ liệu phân tích theo từng hồi của phim',
                labelIcon: '🏗️',
                type: 'textarea',
                placeholder: 'Cung cấp các sự kiện chính và điểm ngoặt trong mỗi hồi của phim.',
                required: true
            },
            {
                id: 'beatsheet',
                label: 'Nhập Beat Sheet của phim',
                labelIcon: '📋',
                type: 'textarea',
                placeholder: 'Vui lòng nhập beat sheet của phim.',
                required: true
            },
            {
                id: 'scenelist',
                label: 'Nhập danh sách tất cả các cảnh',
                labelIcon: '🎬',
                type: 'textarea',
                placeholder: 'Cung cấp danh sách các cảnh của phim.',
                required: true
            },
            {
                id: 'scene_number',
                label: 'Bạn muốn viết kịch bản cho cảnh nào?',
                labelIcon: '🎯',
                type: 'input',
                placeholder: 'Nhập số cảnh, ví dụ: Cảnh 3',
                required: true
            }
        ],
        generatePrompt: (data) => `Viết kịch bản chuẩn Hollywood cho cảnh ${data.scene_number} với synopsis: ${data.synopsis}, nhân vật: ${data.characters}, cấu trúc: ${data.structure}, beat sheet: ${data.beatsheet}, danh sách cảnh: ${data.scenelist}`
    }
};

// Current active tool
let currentTool = 'logline';

// Current character cards data (for character/story_character tools)
let currentCharacters = [];

// Story content for analysis mode
let storyContent = '';
let storyFileName = '';

// Tool order for navigation
const toolOrder = ['logline', 'theme', 'character', 'synopsis', 'structure', 'beatsheet', 'scenelist', 'script'];

// Story analysis tool order
const storyToolOrder = ['story_upload', 'story_theme', 'story_character', 'story_synopsis', 'story_structure', 'story_beatsheet', 'story_scenelist', 'story_script'];

// Mapping: which previous step data fills which field in current step
const autoFillMapping = {
    theme: {
        logline: 'logline' // logline step output → theme step's logline field
    },
    character: {
        logline: 'logline',
        theme: 'theme'
    },
    synopsis: {
        logline: 'logline',
        theme: 'theme',
        character: 'characters'
    },
    structure: {
        theme: 'theme',
        character: 'characters',
        synopsis: 'synopsis'
    },
    beatsheet: {
        synopsis: 'synopsis',
        structure: 'structure',
        character: 'characters'
    },
    scenelist: {
        synopsis: 'synopsis',
        character: 'characters',
        structure: 'structure',
        beatsheet: 'beatsheet'
    },
    script: {
        synopsis: 'synopsis',
        character: 'characters',
        structure: 'structure',
        beatsheet: 'beatsheet',
        scenelist: 'scenelist'
    }
};

// Story analysis tool definitions
const storyTools = {
    story_upload: {
        title: '0. Tải truyện lên',
        description: 'Tải file truyện (.txt, .pdf, .docx) hoặc dán nội dung truyện để bắt đầu phân tích. Nội dung truyện sẽ được AI phân tích qua từng bước để chuyển thể thành kịch bản phim.',
        icon: 'fas fa-upload',
        fields: [],
        isUpload: true
    },
    story_theme: {
        title: '2. Xác định Chủ đề',
        description: 'AI sẽ phân tích truyện để xác định chủ đề chính, chủ đề phụ, và hành trình LIE → TRUTH của nhân vật.',
        icon: 'fas fa-lightbulb',
        fields: [],
        generatePrompt: () => `Phân tích chủ đề từ truyện`
    },
    story_character: {
        title: '3. Mô tả Nhân vật',
        description: 'AI sẽ phân tích và mô tả chi tiết các nhân vật trong truyện: tính cách, động lực, mối quan hệ và vai trò.',
        icon: 'fas fa-users',
        fields: [
            {
                id: 'theme',
                label: 'Chủ đề đã phân tích',
                labelIcon: '🎯',
                type: 'textarea',
                placeholder: 'Chủ đề sẽ được tự động điền từ bước trước...',
                required: true
            }
        ],
        generatePrompt: (data) => `Phân tích nhân vật từ truyện với chủ đề: ${data.theme}`
    },
    story_synopsis: {
        title: '4. Viết Tóm tắt (Synopsis)',
        description: 'AI sẽ tạo bản tóm tắt kịch bản (synopsis) từ nội dung truyện, có tính nhân quả và thể hiện arc nhân vật.',
        icon: 'fas fa-file-alt',
        fields: [
            {
                id: 'theme',
                label: 'Chủ đề đã phân tích',
                labelIcon: '🎯',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            },
            {
                id: 'characters',
                label: 'Nhân vật đã phân tích',
                labelIcon: '👥',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            }
        ],
        generatePrompt: (data) => `Viết synopsis từ truyện`
    },
    story_structure: {
        title: '5. Cấu trúc 4 Hồi',
        description: 'AI sẽ phân tích cấu trúc truyện theo mô hình Story Circle/4 hồi của Dan Harmon, xác định các điểm ngoặt quan trọng.',
        icon: 'fas fa-sitemap',
        fields: [
            {
                id: 'theme',
                label: 'Chủ đề đã phân tích',
                labelIcon: '🎯',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            },
            {
                id: 'characters',
                label: 'Nhân vật đã phân tích',
                labelIcon: '👥',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            },
            {
                id: 'synopsis',
                label: 'Synopsis đã tạo',
                labelIcon: '📝',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            }
        ],
        generatePrompt: (data) => `Phân tích cấu trúc 4 hồi từ truyện`
    },
    story_beatsheet: {
        title: '6. Tạo Beat Sheet',
        description: 'AI sẽ tạo Beat Sheet theo mô hình Save the Cat, map các sự kiện trong truyện vào 15 beat quan trọng.',
        icon: 'fas fa-list-ol',
        fields: [
            {
                id: 'synopsis',
                label: 'Synopsis đã tạo',
                labelIcon: '📝',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            },
            {
                id: 'structure',
                label: 'dữ liệu phân tích theo từng hồi',
                labelIcon: '🏗️',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            },
            {
                id: 'characters',
                label: 'Nhân vật đã phân tích',
                labelIcon: '👥',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            }
        ],
        generatePrompt: (data) => `Tạo beat sheet từ truyện`
    },
    story_scenelist: {
        title: '7. Danh sách Cảnh',
        description: 'AI sẽ chia truyện thành số cảnh phim bạn chỉ định, đảm bảo đầy đủ nội dung cốt truyện từ mở đầu đến kết thúc.',
        icon: 'fas fa-th-list',
        fields: [
            {
                id: 'synopsis',
                label: 'Synopsis đã tạo',
                labelIcon: '📝',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            },
            {
                id: 'characters',
                label: 'Nhân vật đã phân tích',
                labelIcon: '👥',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            },
            {
                id: 'structure',
                label: 'dữ liệu phân tích theo từng hồi',
                labelIcon: '🏗️',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            },
            {
                id: 'beatsheet',
                label: 'Beat Sheet đã tạo',
                labelIcon: '📋',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            },
            {
                id: 'scene_count',
                label: 'Tổng số cảnh muốn tạo là bao nhiêu?',
                labelIcon: '🎞️',
                type: 'input',
                placeholder: 'Ví dụ: 40 (khuyến nghị 30-60 cảnh)',
                required: true
            }
        ],
        generatePrompt: (data) => `Tạo danh sách cảnh từ truyện với số cảnh: ${data.scene_count}`
    },
    story_script: {
        title: '8. Viết Kịch bản',
        description: 'AI sẽ chuyển thể một cảnh cụ thể từ truyện thành kịch bản phim theo chuẩn format Hollywood.',
        icon: 'fas fa-scroll',
        fields: [
            {
                id: 'synopsis',
                label: 'Synopsis đã tạo',
                labelIcon: '📝',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            },
            {
                id: 'characters',
                label: 'Nhân vật đã phân tích',
                labelIcon: '👥',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            },
            {
                id: 'structure',
                label: 'dữ liệu phân tích theo từng hồi',
                labelIcon: '🏗️',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            },
            {
                id: 'beatsheet',
                label: 'Beat Sheet đã tạo',
                labelIcon: '📋',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            },
            {
                id: 'scenelist',
                label: 'Danh sách cảnh đã tạo',
                labelIcon: '🎬',
                type: 'textarea',
                placeholder: 'Tự động điền...',
                required: true
            },
            {
                id: 'scene_number',
                label: 'Bạn muốn viết kịch bản cho cảnh nào?',
                labelIcon: '🎯',
                type: 'input',
                placeholder: 'Nhập số cảnh, ví dụ: Cảnh 3',
                required: true
            }
        ],
        generatePrompt: (data) => `Viết kịch bản cho ${data.scene_number} từ truyện`
    }
};

// Story analysis auto-fill mapping
const storyAutoFillMapping = {
    story_character: {
        story_theme: 'theme'
    },
    story_synopsis: {
        story_theme: 'theme',
        story_character: 'characters'
    },
    story_structure: {
        story_theme: 'theme',
        story_character: 'characters',
        story_synopsis: 'synopsis'
    },
    story_beatsheet: {
        story_synopsis: 'synopsis',
        story_structure: 'structure',
        story_character: 'characters'
    },
    story_scenelist: {
        story_synopsis: 'synopsis',
        story_character: 'characters',
        story_structure: 'structure',
        story_beatsheet: 'beatsheet'
    },
    story_script: {
        story_synopsis: 'synopsis',
        story_character: 'characters',
        story_structure: 'structure',
        story_beatsheet: 'beatsheet',
        story_scenelist: 'scenelist'
    }
};

// Groq API Configuration - Đã chuyển sang Python API (xem python_api/.env)
// const GROQ_API_KEY = 'MOVED_TO_SERVER_ENV';
// const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Python API Configuration
// URL được lấy từ js/config.js (window.APP_CONFIG) để tự động phân biệt môi trường local/production
const PYTHON_API_URL = (window.APP_CONFIG && window.APP_CONFIG.PYTHON_API_URL)
    ? window.APP_CONFIG.PYTHON_API_URL
    : 'http://localhost:5000/api';
const FREE_DAILY_LIMIT_MESSAGE = 'Tài khoản Free chỉ được 10 lượt AI mỗi ngày. Nâng cấp PRO để dùng tối đa 50 lượt/ngày.';

// ─── Plan Helpers ───────────────────────────────────────────────
function _getCurrentUser() {
    try {
        const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function _isProUser() {
    const user = _getCurrentUser();
    if (!user) return false;
    return user.plan_type === 'pro' && (!user.pro_expires_at || new Date(user.pro_expires_at) > new Date());
}

function showUpgradePrompt(feature) {
    const featureText = feature ? `tính năng <strong>${feature}</strong>` : 'tính năng này';
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) {
        alert(`Nâng cấp PRO để sử dụng ${feature || 'tính năng này'}.`);
        return;
    }
    modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-crown" style="color:#f59e0b; margin-right:8px;"></i> Nâng cấp PRO</h3>
                <button class="btn-close" id="upgrade-prompt-close" aria-label="Đóng"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="content-section">
                    <p style="font-size:1rem; color:#374151; line-height:1.6; margin:0 0 12px;">
                        Gói <strong>Free</strong> không hỗ trợ ${featureText}.
                    </p>
                    <ul style="color:#374151; line-height:1.8; padding-left:1.2em; margin:0 0 16px;">
                        <li>✅ Tạo lại bằng AI (tối đa 50 lần/ngày)</li>
                        <li>✅ Chỉnh sửa nội dung tất cả các bước</li>
                        <li>✅ Tạo danh sách cảnh tối đa 40 cảnh</li>
                    </ul>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button id="upgrade-prompt-cancel" style="padding:8px 16px; border:1px solid #e5e7eb; border-radius:6px; background:white; cursor:pointer;">Dể sau</button>
                    <button class="btn-save" id="upgrade-prompt-go"><i class="fas fa-crown"></i> Nâng cấp PRO</button>
                </div>
            </div>
        </div>
    `;
    const closePopup = () => { modalOverlay.classList.remove('active'); modalOverlay.innerHTML = ''; modalOverlay.onclick = null; };
    modalOverlay.classList.add('active');
    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closePopup(); };
    document.getElementById('upgrade-prompt-close').addEventListener('click', closePopup);
    document.getElementById('upgrade-prompt-cancel').addEventListener('click', closePopup);
    document.getElementById('upgrade-prompt-go').addEventListener('click', () => {
        closePopup();
        sessionStorage.setItem('openUpgradeModal', '1');
        window.location.href = 'dashboard.html';
    });
}
document.addEventListener('DOMContentLoaded', () => {
    checkUserAuth();
    setupNavigation();
    handleDashboardRedirect();
});

// Handle redirect from dashboard
async function handleDashboardRedirect() {
    // Check if coming from dashboard with specific actions
    const openTool = sessionStorage.getItem('openTool');
    const openProject = sessionStorage.getItem('openProject');
    const newProject = sessionStorage.getItem('newProject');
    const newProjectLoaded = sessionStorage.getItem('newProjectLoaded');
    
    if (newProjectLoaded) {
        sessionStorage.removeItem('newProjectLoaded');
        sessionStorage.removeItem('openProject');
        const projectId = parseInt(openProject);
        
        // Wait for projects to load from DB
        if (typeof waitForProjectsLoaded === 'function') {
            await waitForProjectsLoaded();
        }
        
        // Load the project
        if (typeof loadProject === 'function') {
            await loadProject(projectId);
        }
        
        // Load the logline tool
        loadTool('logline');
    } else if (newProject) {
        sessionStorage.removeItem('newProject');
        // Create new project and start from logline
        if (typeof createNewProject === 'function') {
            createNewProject();
        }
        loadTool('logline');
    } else if (openProject) {
        sessionStorage.removeItem('openProject');
        // Load specific project and show its history
        const projectId = parseInt(openProject);
        
        // Wait for projects to load from DB
        if (typeof waitForProjectsLoaded === 'function') {
            await waitForProjectsLoaded();
        }
        
        // Load the project
        if (typeof loadProject === 'function') {
            await loadProject(projectId);
        }
        
        // If there's also an openTool request, show the tool detail directly
        if (openTool) {
            sessionStorage.removeItem('openTool');
            if (typeof viewStepDetail === 'function') {
                viewStepDetail(openTool, true);
            }
        }
    } else if (openTool) {
        sessionStorage.removeItem('openTool');
        loadTool(openTool);
        
        // Update nav item - use unified sidebar
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
        const navToolId = openTool.startsWith('story_') ? (storyToNavMap[openTool] || openTool) : openTool;
        
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.tool === navToolId) {
                item.classList.add('active');
            }
        });
    } else {
        // Người dùng truy cập trực tiếp index.html mà không có action nào
        // → Chuyển hướng về dashboard.html
        window.location.href = 'dashboard.html';
        return;
    }
}

// Check user authentication
function checkUserAuth() {
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (!user) {
        // Not logged in, redirect to auth page
        window.location.href = 'auth.html';
        return;
    }
    
    // Display user info
    try {
        const userData = JSON.parse(user);
        const displayName = document.getElementById('user-display-name');
        const planBadge = document.getElementById('user-plan-badge');
        const isProActive = userData.plan_type === 'pro'
            && (!userData.pro_expires_at || new Date(userData.pro_expires_at) > new Date());

        if (displayName) {
            displayName.textContent = userData.full_name || userData.username || 'Người dùng';
        }

        if (planBadge) {
            planBadge.textContent = isProActive ? 'PRO' : 'FREE';
            planBadge.className = `plan-badge ${isProActive ? 'pro' : 'free'}`;
        }
    } catch (e) {
        console.error('Error parsing user data:', e);
    }
}

// Handle logout
function handleLogout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        // Clear all auth data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        
        // Redirect to auth page
        window.location.href = 'auth.html';
    }
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const toolId = item.dataset.tool;
            setActiveNavItem(item);
            // Deselect story nav items
            document.querySelectorAll('.story-nav-item').forEach(si => si.classList.remove('active'));
            loadTool(toolId);
        });
    });
    
    // Setup story nav items
    setupStoryNavigation();
}

// Setup story tool navigation
function setupStoryNavigation() {
    const storyNavItems = document.querySelectorAll('.story-nav-item');
    storyNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const toolId = item.dataset.tool;
            
            // Check if story is loaded for non-upload tools
            if (toolId !== 'story_upload' && !storyContent) {
                loadTool('story_upload');
                setActiveStoryNavItem('story_upload');
                showSaveNotification('Vui lòng tải truyện trước!', 'error');
                return;
            }
            
            setActiveStoryNavItem(toolId);
            loadTool(toolId);
        });
    });
}

// Set active nav item
function setActiveNavItem(activeItem) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    activeItem.classList.add('active');
}

// Toggle sidebar open/close
function toggleSidebar() {
    const sidebar = document.getElementById('main-sidebar');
    const mainContent = document.querySelector('.main-content');
    const appContainer = document.querySelector('.app-container');
    const openBtn = document.getElementById('sidebar-open-btn');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleIcon = document.getElementById('sidebar-toggle-icon');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // Mobile: toggle .open class, show/hide overlay
        const isOpen = sidebar.classList.contains('open');
        if (isOpen) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        } else {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        }
    } else {
        // Desktop/Tablet: toggle .collapsed class
        const isCollapsed = sidebar.classList.contains('collapsed');
        if (isCollapsed) {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
            appContainer && appContainer.classList.remove('sidebar-collapsed');
            openBtn.classList.remove('visible');
            if (toggleIcon) {
                toggleIcon.classList.remove('fa-chevron-right');
                toggleIcon.classList.add('fa-chevron-left');
            }
        } else {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
            appContainer && appContainer.classList.add('sidebar-collapsed');
            openBtn.classList.add('visible');
            if (toggleIcon) {
                toggleIcon.classList.remove('fa-chevron-left');
                toggleIcon.classList.add('fa-chevron-right');
            }
        }
    }
}

// Auto-collapse sidebar on mobile on load
(function initSidebarResponsive() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _applySidebarState);
    } else {
        _applySidebarState();
    }
    window.addEventListener('resize', _applySidebarState);
})();

function _applySidebarState() {
    const sidebar = document.getElementById('main-sidebar');
    const mainContent = document.querySelector('.main-content');
    const appContainer = document.querySelector('.app-container');
    const openBtn = document.getElementById('sidebar-open-btn');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        // On mobile: sidebar uses .open class, always show floating button
        sidebar.classList.remove('collapsed');
        mainContent && mainContent.classList.remove('sidebar-collapsed');
        appContainer && appContainer.classList.remove('sidebar-collapsed');
        openBtn && openBtn.classList.add('visible');
    } else {
        // On desktop: remove mobile .open state; restore sidebar if it was open on mobile
        sidebar.classList.remove('open');
        overlay && overlay.classList.remove('active');
        // If sidebar was collapsed by user, keep it; otherwise ensure visible
        if (!sidebar.classList.contains('collapsed')) {
            openBtn && openBtn.classList.remove('visible');
            appContainer && appContainer.classList.remove('sidebar-collapsed');
        }
    }
}

// Toggle sidebar section
function toggleSection(sectionId) {
    const list = document.getElementById(`${sectionId}-list`);
    const toggleIcon = document.getElementById(`${sectionId}-toggle-icon`);
    
    if (list) {
        if (list.style.display === 'none') {
            list.style.display = 'block';
            if (toggleIcon) {
                toggleIcon.classList.remove('fa-chevron-down');
                toggleIcon.classList.add('fa-chevron-up');
            }
        } else if (list.style.display === 'block' || list.style.display === '') {
            list.style.display = 'none';
            if (toggleIcon) {
                toggleIcon.classList.remove('fa-chevron-up');
                toggleIcon.classList.add('fa-chevron-down');
            }
        } else {
            list.classList.toggle('collapsed');
        }
    }
}

// Load tool content
function loadTool(toolId) {
    if (hasUnsavedChanges()) {
        _pendingNavigation = () => loadTool(toolId);
        _showUnsavedPopup();
        return;
    }
    let actualToolId = toolId;
    
    // Determine project type from currentProject steps
    let projectType = 'idea';
    const currProj = window.ProjectManager ? window.ProjectManager.getCurrentProject() : null;
    if (currProj && currProj.steps) {
        if (currProj.steps['story_upload']) {
            projectType = 'story';
        }
    }
    
    // Redirect standard tools to story tools if project type is story
    if (projectType === 'story' && toolId !== 'logline') {
        const storyMapping = {
            'theme': 'story_theme',
            'character': 'story_character',
            'synopsis': 'story_synopsis',
            'structure': 'story_structure',
            'beatsheet': 'story_beatsheet',
            'scenelist': 'story_scenelist',
            'script': 'story_script'
        };
        if (storyMapping[toolId]) {
            actualToolId = storyMapping[toolId];
        }
    }

    currentTool = actualToolId;
    
    // Check if it's a story tool
    const isStoryTool = currentTool.startsWith('story_');
    const tool = isStoryTool ? storyTools[currentTool] : tools[currentTool];
    
    if (!tool) return;
    
    const container = document.getElementById('tool-container');

    // Show/hide result panel based on tool type
    const isCharTool = currentTool === 'character' || currentTool === 'story_character';
    const resultPanel = document.querySelector('.result-panel');
    if (resultPanel) {
        resultPanel.style.display = (isCharTool || currentTool === 'story_upload') ? 'none' : '';
    }
    
    // Special handling for step 1 (logline)
    if (currentTool === 'logline') {
        loadInitProjectForm(container, tool);
        return;
    }
    
    // Special handling for story upload (backward compatibility)
    if (currentTool === 'story_upload') {
        loadInitProjectForm(container, storyTools['story_upload']);
        return;
    }
    
    let fieldsHTML = tool.fields.map((field, index) => {
        const inputType = field.type === 'textarea' 
            ? `<textarea class="form-textarea" id="${field.id}" placeholder="${field.placeholder}" ${field.required ? 'required' : ''}></textarea>`
            : `<input type="text" class="form-input" id="${field.id}" placeholder="${field.placeholder}" ${field.required ? 'required' : ''}>`;
        
        let hideClass = '';
        // Hide inputs for step 2-8 (except scene_number and scene_count)
        if (currentTool !== 'logline' && currentTool !== 'story_upload' && field.id !== 'scene_number' && field.id !== 'scene_count') {
            hideClass = ' style="display: none;"';
        }
        
        return `
            <div class="form-group"${hideClass}>
                <label class="form-label">
                    <span class="step-number">${index + 1}</span>
                    <span class="label-icon">${field.labelIcon}</span>
                    <span>${field.label}</span>
                    ${field.optional ? '<span class="optional">(tùy chọn)</span>' : ''}
                </label>
                ${inputType}
            </div>
        `;
    }).join('');

    // Story indicator for story analysis tools
    const storyIndicator = isStoryTool && storyContent ? `
        <div class="story-indicator">
            <i class="fas fa-book-open"></i>
            <span>📖 Truyện: <strong>${storyFileName || 'Nội dung đã dán'}</strong> (${storyContent.length.toLocaleString()} ký tự)</span>
            <button class="btn-change-story" onclick="loadTool('story_upload')" title="Đổi truyện">
                <i class="fas fa-exchange-alt"></i>
            </button>
        </div>
    ` : '';

    container.innerHTML = `
        <div class="tool-header">
            <h2 class="tool-title">
                <i class="${tool.icon}"></i>
                ${tool.title}
                <span class="help-icon" title="Trợ giúp">?</span>
            </h2>
            <p class="tool-description">${tool.description}</p>
            <span class="more-link" onclick="toggleDescription(this)">xem thêm</span>
        </div>
        ${storyIndicator}
        <form id="tool-form" onsubmit="handleSubmit(event)">
            ${fieldsHTML}
            <button type="submit" class="submit-btn">
                <i class="fas fa-magic"></i>
                ${isStoryTool ? 'Phân tích' : 'Tạo Nội dung'}
            </button>
            ${(currentTool === 'script' || currentTool === 'story_script') ? `
            <button type="button" class="submit-btn btn-auto-all-scenes" onclick="autoGenerateAllScripts()" style="margin-top:10px;background:linear-gradient(135deg,#7c3aed,#4f46e5);">
                <i class="fas fa-film"></i> Tự động tạo tất cả cảnh
            </button>` : ''}
        </form>
        ${isCharTool ? '<div id="character-cards-container"></div>' : ''}
    `;

    // Apply scene count limits based on plan (scenelist step)
    if (currentTool === 'scenelist' || currentTool === 'story_scenelist') {
        const sceneCountEl = document.getElementById('scene_count');
        if (sceneCountEl) {
            const maxScenes = _isProUser() ? 40 : 10;
            sceneCountEl.type = 'number';
            sceneCountEl.min = '1';
            sceneCountEl.max = String(maxScenes);
            sceneCountEl.placeholder = _isProUser()
                ? 'Ví dụ: 30 (tối đa 40 cảnh)'
                : 'Ví dụ: 5 (tối đa 10 cảnh - Gói Free)';
        }
    }

    // Check if we have saved data for this tool in the current project
    let dataRestored = false;
    const currProjForRestore = window.ProjectManager ? window.ProjectManager.getCurrentProject() : null;
    
    if (currProjForRestore && currProjForRestore.steps && currProjForRestore.steps[actualToolId]) {
        const step = currProjForRestore.steps[actualToolId];
        
        // Restore inputs
        if (step.input) {
            setTimeout(() => {
                Object.keys(step.input).forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field && step.input[fieldId]) {
                        field.value = step.input[fieldId];
                        field.classList.add('restored-field');
                    }
                });

                // ── Always overlay with the LATEST outputs from previous steps ──
                // This ensures edits saved in prior steps are reflected here,
                // even if this step was generated before those edits.
                const fillMapping = isStoryTool
                    ? (storyAutoFillMapping[actualToolId] || {})
                    : (autoFillMapping[actualToolId] || {});

                Object.keys(fillMapping).forEach(sourceTool => {
                    const targetFieldId = fillMapping[sourceTool];
                    const sourceStep = currProjForRestore.steps[sourceTool];
                    if (!sourceStep || !sourceStep.output) return;
                    const targetField = document.getElementById(targetFieldId);
                    if (!targetField) return;
                    // Strip HTML tags before filling plain-text textarea/input
                    const latestValue = sourceStep.output.replace(/<[^>]*>/g, '').trim();
                    if (latestValue) {
                        targetField.value = latestValue;
                        targetField.classList.add('restored-field');
                    }
                });
            }, 50);
        }
        
        // Restore output
        if (step.output) {
            if (isCharTool) {
                // For character tools: restore cards from API or in-memory
                if (currentCharacters && currentCharacters.length > 0) {
                    displayCharacterCards(currentCharacters);
                } else {
                    fetchAndRenderCharacters(currProjForRestore.id);
                }
            } else {
                document.getElementById('result-content').innerHTML = step.output;
                _updateContentSnapshot();
                if (typeof showNextStepButton === 'function') {
                    showNextStepButton();
                }
            }
            dataRestored = true;
        }
    }

    if (dataRestored) {
        // Content already exists — show "Tạo lại" on the submit button
        const submitBtnExisting = document.querySelector('#tool-container .submit-btn');
        if (submitBtnExisting) {
            if (_isProUser()) {
                submitBtnExisting.innerHTML = '<i class="fas fa-sync-alt"></i> Tạo lại';
            } else {
                submitBtnExisting.innerHTML = '<i class="fas fa-lock"></i> Tạo lại (PRO)';
                submitBtnExisting.style.background = 'linear-gradient(135deg, #94a3b8, #64748b)';
            }
        }
    } else {
        // No prior output for this tool — but still fill inputs from latest previous steps
        const fillMapping = isStoryTool
            ? (storyAutoFillMapping[actualToolId] || {})
            : (autoFillMapping[actualToolId] || {});

        if (currProjForRestore && currProjForRestore.steps && Object.keys(fillMapping).length > 0) {
            setTimeout(() => {
                Object.keys(fillMapping).forEach(sourceTool => {
                    const targetFieldId = fillMapping[sourceTool];
                    const sourceStep = currProjForRestore.steps[sourceTool];
                    if (!sourceStep || !sourceStep.output) return;
                    const targetField = document.getElementById(targetFieldId);
                    if (!targetField) return;
                    const latestValue = sourceStep.output.replace(/<[^>]*>/g, '').trim();
                    if (latestValue) {
                        targetField.value = latestValue;
                        targetField.classList.add('restored-field');
                    }
                });
            }, 50);
        }

        if (!isCharTool) {
            // Clear result
            document.getElementById('result-content').innerHTML =
                '<p class="placeholder-text">Kết quả sẽ hiển thị ở đây sau khi bạn tạo nội dung...</p>';
        }
        // Hide next step button when switching tools
        hideNextStepButton();
    }
}

// Load Init Project form (combined Idea and Story upload)
function loadInitProjectForm(container, tool) {
    const hasStory = storyContent && storyContent.trim().length > 0;
    const currProj = window.ProjectManager ? window.ProjectManager.getCurrentProject() : null;
    const isStoryMode = (currProj && currProj.steps && currProj.steps['story_upload']) || hasStory;
    
    // Check if we have logline output
    let ideaContent = '';
    if (currProj && currProj.steps && currProj.steps['logline']) {
        const inputData = currProj.steps['logline'].input || {};
        ideaContent = inputData.movie_idea || '';
    }

    container.innerHTML = `
        <div class="tool-header">
            <h2 class="tool-title">
                <i class="fas fa-pen-fancy"></i>
                Khởi tạo Kịch bản
                <span class="help-icon" title="Trợ giúp">?</span>
            </h2>
            <p class="tool-description">Bắt đầu bằng cách nhập ý tưởng phim của bạn hoặc tải lên một câu chuyện có sẵn.</p>
        </div>
        
        <div class="init-project-tabs">
            <button class="btn-tab ${!isStoryMode ? 'active' : ''}" id="tab-idea" onclick="switchInitTab('idea')">
                <i class="fas fa-lightbulb"></i> Nhập ý tưởng
            </button>
            <button class="btn-tab ${isStoryMode ? 'active' : ''}" id="tab-story" onclick="switchInitTab('story')">
                <i class="fas fa-file-upload"></i> Tải truyện lên
            </button>
        </div>

        <div id="init-idea-section" style="display: ${!isStoryMode ? 'block' : 'none'};">
            <form id="tool-form" onsubmit="handleIdeaSubmit(event)">
                <div class="form-group">
                    <label class="form-label">
                        <span class="step-number">1</span>
                        <span class="label-icon">🎬</span>
                        <span>Ý tưởng phim của bạn là gì?</span>
                    </label>
                    <textarea class="form-textarea" id="movie_idea" placeholder="Ví dụ: Một thám tử săn lùng kẻ giết người hàng loạt trong một thành phố tương lai." required>${ideaContent}</textarea>
                </div>
                <button type="submit" class="submit-btn">
                    <i class="fas fa-magic"></i>
                    Tạo Nội dung
                </button>
            </form>
        </div>

        <div id="init-story-section" style="display: ${isStoryMode ? 'block' : 'none'};">
            <div class="story-upload-section">
                <div class="upload-area" id="upload-area">
                    <div class="upload-icon">
                        <i class="fas fa-cloud-upload-alt"></i>
                    </div>
                    <p class="upload-text">Kéo thả file vào đây hoặc</p>
                    <button class="upload-btn-label" type="button" onclick="triggerStoryFilePick()">
                        <i class="fas fa-folder-open"></i>
                        Chọn file
                    </button>
                    <!-- Input file ẩn đúng cách: không dùng display:none mà đặt ra ngoài màn hình -->
                    <input type="file" id="story-file-input" accept=".txt,.pdf,.docx"
                        style="position: fixed; top: -9999px; left: -9999px; width: 1px; height: 1px; opacity: 0;">
                    <p class="upload-hint">Hỗ trợ: .txt, .pdf, .docx</p>
                </div>
                
                <div class="upload-divider">
                    <span>hoặc dán nội dung truyện</span>
                </div>
                
                <textarea class="form-textarea story-textarea" id="story-text-input" 
                    placeholder="Dán nội dung truyện vào đây...">${hasStory ? storyContent : ''}</textarea>
                
                ${hasStory ? `
                    <div class="story-loaded-info" style="margin-top: 10px; color: #10b981; font-weight: 500;">
                        <i class="fas fa-check-circle"></i> Đã tải truyện thành công.
                    </div>
                ` : ''}
                
                <button class="submit-btn" onclick="startStoryAnalysis()" style="margin-top: 15px;">
                    <i class="fas fa-search"></i>
                    ${hasStory ? 'Cập nhật & Bắt đầu phân tích' : 'Bắt đầu phân tích'}
                </button>
            </div>
        </div>
    `;

    // Setup drag and drop
    setupStoryUpload();

    // Hide result panel when story tab is the active tab
    const resultPanel = document.querySelector('.result-panel');
    if (resultPanel) {
        resultPanel.style.display = isStoryMode ? 'none' : '';
    }

    // Check if we have saved data for this tool in the current project
    let dataRestored = false;
    const currProjForRestore = window.ProjectManager ? window.ProjectManager.getCurrentProject() : null;
    
    if (currProjForRestore && currProjForRestore.steps && currProjForRestore.steps[currentTool]) {
        const step = currProjForRestore.steps[currentTool];
        
        // Restore output
        if (step.output) {
            document.getElementById('result-content').innerHTML = step.output;
            _updateContentSnapshot();
            if (typeof showNextStepButton === 'function') {
                showNextStepButton();
            }
            dataRestored = true;
        }
    }
    
    if (!dataRestored) {
        // Clear result
        document.getElementById('result-content').innerHTML = 
            '<p class="placeholder-text">Kết quả sẽ hiển thị ở đây sau khi bạn tạo nội dung...</p>';
        
        // Hide next step button when switching tools
        hideNextStepButton();
    }
}

window.switchInitTab = function(tab) {
    const btnIdea = document.getElementById('tab-idea');
    const btnStory = document.getElementById('tab-story');
    const secIdea = document.getElementById('init-idea-section');
    const secStory = document.getElementById('init-story-section');
    
    const currProj = window.ProjectManager ? window.ProjectManager.getCurrentProject() : null;
    const hasIdeaSteps = currProj && currProj.steps && currProj.steps['logline'];
    const hasStorySteps = currProj && currProj.steps && currProj.steps['story_upload'];
    
    if (tab === 'story' && hasIdeaSteps) {
        showConstraintPopup('Dự án này đang sử dụng chế độ "Nhập ý tưởng".<br><br>Vui lòng tạo kịch bản mới để sử dụng chế độ "Tải truyện lên"!');
        return;
    }
    
    if (tab === 'idea' && hasStorySteps) {
        showConstraintPopup('Dự án này đang sử dụng chế độ "Tải truyện lên".<br><br>Vui lòng tạo kịch bản mới để sử dụng chế độ "Nhập ý tưởng"!');
        return;
    }

    if (tab === 'idea') {
        btnIdea.classList.add('active');
        btnStory.classList.remove('active');
        if (secIdea) secIdea.style.display = 'block';
        if (secStory) secStory.style.display = 'none';
        currentTool = 'logline';
    } else {
        btnStory.classList.add('active');
        btnIdea.classList.remove('active');
        if (secStory) secStory.style.display = 'block';
        if (secIdea) secIdea.style.display = 'none';
        currentTool = 'story_upload';
    }

    // Show/hide result panel based on active tab
    const resultPanelSwitch = document.querySelector('.result-panel');
    if (resultPanelSwitch) {
        resultPanelSwitch.style.display = (tab === 'story') ? 'none' : '';
    }

    // Clear result panel and hide next step button (same as switching any other tool)
    const resultContent = document.getElementById('result-content');
    if (resultContent) {
        resultContent.innerHTML = '<p class="placeholder-text">Kết quả sẽ hiển thị ở đây sau khi bạn tạo nội dung...</p>';
    }
    hideNextStepButton();
}

function showConstraintPopup(message) {
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) {
        alert(message.replace(/<br>/g, '\n'));
        return;
    }

    modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3><i class="fas fa-exclamation-triangle" style="color: #f59e0b; margin-right: 8px;"></i> Không thể chuyển chế độ</h3>
                <button class="btn-close" id="constraint-close-btn" aria-label="Đóng">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="content-section" style="padding: 10px 0 20px 0;">
                    <p style="font-size: 1.05rem; line-height: 1.5; color: #374151; margin: 0; text-align: center;">${message}</p>
                </div>
                <div style="display:flex; justify-content:center; gap: 10px;">
                    <button class="btn-cancel" id="constraint-cancel-btn" style="padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 6px; background: white; cursor: pointer;">Hủy</button>
                    <button class="btn-save" id="constraint-new-btn" style="background: #10b981; border-color: #10b981;">
                        <i class="fas fa-plus"></i> Tạo dự án mới
                    </button>
                </div>
            </div>
        </div>
    `;

    const closePopup = () => {
        modalOverlay.classList.remove('active');
        modalOverlay.innerHTML = '';
        modalOverlay.onclick = null;
    };

    modalOverlay.classList.add('active');
    modalOverlay.onclick = (event) => {
        if (event.target === modalOverlay) {
            closePopup();
        }
    };

    const closeBtn = document.getElementById('constraint-close-btn');
    const cancelBtn = document.getElementById('constraint-cancel-btn');
    const newBtn = document.getElementById('constraint-new-btn');
    
    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (cancelBtn) cancelBtn.addEventListener('click', closePopup);
    if (newBtn) {
        newBtn.addEventListener('click', () => {
            closePopup();
            if (typeof createNewProjectFromButton === 'function') {
                createNewProjectFromButton();
            } else if (typeof createNewProject === 'function') {
                createNewProject();
                loadTool('logline');
            }
        });
    }
}

async function autoGeneratePipeline(mode, initialData) {
    const isStory = mode === 'story';
    const pipeline = isStory ? 
        ['story_theme', 'story_character', 'story_synopsis', 'story_structure', 'story_beatsheet'] : 
        ['logline', 'theme', 'character', 'synopsis', 'structure', 'beatsheet'];
    
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = loadingOverlay.querySelector('p');
    
    loadingOverlay.classList.add('active');
    
    try {
        for (let i = 0; i < pipeline.length; i++) {
            const toolId = pipeline[i];
            currentTool = toolId;
            
            const tool = isStory ? storyTools[toolId] : tools[toolId];
            const toolName = tool ? tool.title : toolId;
            loadingMessage.textContent = `Đang tự động tạo: ${toolName} (Bước ${i+1}/${pipeline.length})...`;
            
            const formData = {};
            if (i === 0 && !isStory) {
                formData['movie_idea'] = initialData.movie_idea;
            } else {
                const mapping = isStory ? storyAutoFillMapping[toolId] : autoFillMapping[toolId];
                const currProj = ProjectManager ? ProjectManager.getCurrentProject() : currentProject;
                
                if (mapping && currProj && currProj.steps) {
                    for (const [sourceTool, targetField] of Object.entries(mapping)) {
                        if (currProj.steps[sourceTool]) {
                            formData[targetField] = currProj.steps[sourceTool].output;
                        }
                    }
                }
                
                if (toolId === 'character' || toolId === 'story_character') {
                    formData['character_count'] = '5';
                    // Inject original movie_idea so character names in the idea are preserved
                    if (!isStory && currProj && currProj.steps && currProj.steps['logline'] && currProj.steps['logline'].input) {
                        const loglineInput = currProj.steps['logline'].input;
                        if (loglineInput.movie_idea) {
                            formData['movie_idea'] = loglineInput.movie_idea;
                        }
                    }
                }
                
                if (isStory && storyContent) {
                    formData['story_content'] = storyContent;
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 300));
            
            console.log(`Auto-generating ${toolId}...`);
            const apiResult = await generateContent(toolId, formData);
            const result = apiResult.content;
            // Store characters for character tools
            if (toolId === 'character' || toolId === 'story_character') {
                currentCharacters = apiResult.characters_data || [];
            }
            
            if (typeof saveStepToProject === 'function') {
                await saveStepToProject(toolId, formData, result);
            }
        }
        
        loadingMessage.textContent = 'Hoàn tất tự động tạo kịch bản!';
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const finalTool = pipeline[pipeline.length - 1];
        loadTool(finalTool);
        if (window.setActiveNavItem) {
            window.setActiveNavItem('beatsheet');
        }
        
        showSaveNotification("Tạo kịch bản tự động hoàn tất!", "success");
        
    } catch (error) {
        console.error('Lỗi trong quá trình tự động tạo:', error);
        if (error && error.code === 'FREE_DAILY_LIMIT') {
            showFreeLimitPopup();
        } else {
            alert('Đã xảy ra lỗi khi tạo tự động: ' + error.message + '\\nBạn có thể thử tạo lại bước này thủ công.');
        }
        
        loadTool(currentTool);
        if (window.setActiveNavItem) {
            const navId = currentTool.replace('story_', '');
            window.setActiveNavItem(navId);
        }
    } finally {
        loadingOverlay.classList.remove('active');
        loadingMessage.textContent = 'Đang tạo nội dung...';
    }
}

// Steps downstream of logline that should be cleared on regenerate
const _DOWNSTREAM_STEPS = ['theme', 'character', 'synopsis', 'structure', 'beatsheet', 'scenelist', 'script'];

// Steps downstream of story_upload that should be cleared on re-analyze
const _STORY_DOWNSTREAM_STEPS = ['story_upload', 'story_theme', 'story_character', 'story_synopsis', 'story_structure', 'story_beatsheet', 'story_scenelist', 'story_script'];

// Delete all downstream story steps (including story_upload) from server + local project state
async function _clearStoryDownstreamSteps() {
    const project = (typeof ProjectManager !== 'undefined' && ProjectManager.getCurrentProject)
        ? ProjectManager.getCurrentProject() : null;
    if (!project || !project.steps) return;

    const NODE_API = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)
        ? window.APP_CONFIG.API_BASE_URL
        : PYTHON_API_URL.replace(':5000/api', ':3000/api');

    // Delete character JSON files from disk first
    if (project.steps['story_character']) {
        try {
            const qs = project.id ? `?project_id=${encodeURIComponent(project.id)}` : '';
            await fetch(`${PYTHON_API_URL}/characters${qs}`, {
                method: 'DELETE',
                headers: getAuthHeaders ? { ...getAuthHeaders() } : {}
            });
        } catch (e) {
            console.warn('Could not delete character JSON files:', e);
        }
    }

    for (const toolType of _STORY_DOWNSTREAM_STEPS) {
        const step = project.steps[toolType];
        if (!step) continue;
        if (step.id) {
            try {
                await fetch(`${NODE_API}/ai-responses/${toolType}/${step.id}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders ? { ...getAuthHeaders() } : {}
                });
            } catch (e) {
                console.warn(`Could not delete step ${toolType} from server:`, e);
            }
        }
        delete project.steps[toolType];
    }

    // Clear in-memory story/character data
    storyContent = '';
    storyFileName = '';
    currentCharacters = [];

    // Refresh project history panel if available
    if (typeof showProjectHistory === 'function') showProjectHistory();
    if (typeof renderProjectList === 'function') renderProjectList();
}

// Show the confirm-regenerate modal; resolves true if user confirms, false if cancelled
function _confirmRegenerate() {
    return new Promise(resolve => {
        const overlay = document.getElementById('confirm-regen-overlay');
        overlay.style.display = 'flex';
        const onOk = () => { cleanup(); resolve(true); };
        const onCancel = () => { cleanup(); resolve(false); };
        function cleanup() {
            overlay.style.display = 'none';
            document.getElementById('confirm-regen-ok').removeEventListener('click', onOk);
            document.getElementById('confirm-regen-cancel').removeEventListener('click', onCancel);
        }
        document.getElementById('confirm-regen-ok').addEventListener('click', onOk);
        document.getElementById('confirm-regen-cancel').addEventListener('click', onCancel);
    });
}

// Delete all downstream steps from server + local project state
async function _clearDownstreamSteps() {
    const project = (typeof ProjectManager !== 'undefined' && ProjectManager.getCurrentProject)
        ? ProjectManager.getCurrentProject() : null;
    if (!project || !project.steps) return;

    const NODE_API = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)
        ? window.APP_CONFIG.API_BASE_URL
        : PYTHON_API_URL.replace(':5000/api', ':3000/api');

    // Delete character JSON files from disk first
    if (project.steps['character']) {
        try {
            const qs = project.id ? `?project_id=${encodeURIComponent(project.id)}` : '';
            await fetch(`${PYTHON_API_URL}/characters${qs}`, {
                method: 'DELETE',
                headers: getAuthHeaders ? { ...getAuthHeaders() } : {}
            });
        } catch (e) {
            console.warn('Could not delete character JSON files:', e);
        }
    }

    for (const toolType of _DOWNSTREAM_STEPS) {
        const step = project.steps[toolType];
        if (!step) continue;
        // Delete from server if we have an id
        if (step.id) {
            try {
                await fetch(`${NODE_API}/ai-responses/${toolType}/${step.id}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders ? { ...getAuthHeaders() } : {}
                });
            } catch (e) {
                console.warn(`Could not delete step ${toolType} from server:`, e);
            }
        }
        delete project.steps[toolType];
    }

    // Also clear in-memory character data
    currentCharacters = [];

    // Refresh project history panel if available
    if (typeof showProjectHistory === 'function') showProjectHistory();
    if (typeof renderProjectList === 'function') renderProjectList();
}

async function handleIdeaSubmit(event) {
    event.preventDefault();
    
    const element = document.getElementById('movie_idea');
    const idea = element.value.trim();
    if (!idea) {
        alert('Vui lòng điền ý tưởng phim!');
        element.style.borderColor = '#ef4444';
        return;
    }
    element.style.borderColor = '#e5e7eb';

    // Check if any downstream step already has data
    const project = (typeof ProjectManager !== 'undefined' && ProjectManager.getCurrentProject)
        ? ProjectManager.getCurrentProject() : null;
    const hasDownstream = project && project.steps &&
        _DOWNSTREAM_STEPS.some(t => !!project.steps[t]);

    if (hasDownstream) {
        if (!_isProUser()) {
            showUpgradePrompt('Tạo lại kịch bản');
            return;
        }
        const confirmed = await _confirmRegenerate();
        if (!confirmed) return;
        await _clearDownstreamSteps();
    }
    
    await autoGeneratePipeline('idea', { movie_idea: idea });
}


// Setup story file upload handlers
function setupStoryUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('story-file-input');
    
    if (!uploadArea || !fileInput) return;
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleStoryFile(file);
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleStoryFile(file);
    });
}

/**
 * Trigger chọn file truyện: dùng Flutter bridge nếu chạy trong app, fallback về input file
 */
window.triggerStoryFilePick = function() {
    if (typeof FlutterBridge !== 'undefined' && typeof window.flutterPickFile === 'function') {
        // Dùng Flutter native file picker (hoạt động trên Android)
        window.flutterPickFile(function(result) {
            if (!result) {
                console.log('[Story] User hủy chọn file');
                return;
            }
            handleStoryFileFromBase64(result);
        });
    } else {
        // Fallback: trigger input file bình thường (web desktop)
        const input = document.getElementById('story-file-input');
        if (input) input.click();
    }
};

/**
 * Xử lý file truyện từ Flutter bridge (base64)
 */
async function handleStoryFileFromBase64(result) {
    const filename = (result.fileName || '').toLowerCase();
    const mimeType = result.mimeType || '';

    if (filename.endsWith('.txt') || mimeType === 'text/plain') {
        // Decode base64 thành text
        try {
            const text = atob(result.base64);
            document.getElementById('story-text-input').value = text;
            window.storyFileName = result.fileName;
            showSaveNotification(`Đã đọc file: ${result.fileName}`, 'success');
        } catch(e) {
            // Nếu UTF-8 bị lỗi, dùng TextDecoder
            try {
                const bytes = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));
                const text = new TextDecoder('utf-8').decode(bytes);
                document.getElementById('story-text-input').value = text;
                window.storyFileName = result.fileName;
                showSaveNotification(`Đã đọc file: ${result.fileName}`, 'success');
            } catch(e2) {
                alert('Lỗi đọc file text: ' + e2.message);
            }
        }
    } else if (filename.endsWith('.pdf') || filename.endsWith('.docx')) {
        // Gửi base64 lên server để extract text
        showLoading(true);
        try {
            // Convert base64 sang Blob
            const byteCharacters = atob(result.base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: result.mimeType });

            const formData = new FormData();
            formData.append('file', blob, result.fileName);

            const userRaw = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (userRaw) {
                try {
                    const userData = JSON.parse(userRaw);
                    if (userData?.id) formData.append('user_id', String(userData.id));
                } catch (e) {}
            }
            
            const response = await fetch(`${PYTHON_API_URL}/extract-text`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('story-text-input').value = data.text;
                window.storyFileName = result.fileName;
                showSaveNotification(`Đã đọc file: ${result.fileName} (${data.length.toLocaleString()} ký tự)`, 'success');
            } else {
                alert('Lỗi đọc file: ' + data.error);
            }
        } catch (error) {
            console.error('Error extracting text from base64:', error);
            alert('Lỗi khi đọc file. Vui lòng thử lại.');
        } finally {
            showLoading(false);
        }
    } else {
        alert('Chỉ hỗ trợ file .txt, .pdf, .docx');
    }
}

// Handle uploaded story file
async function handleStoryFile(file) {
    const filename = file.name.toLowerCase();
    
    if (filename.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('story-text-input').value = e.target.result;
            storyFileName = file.name;
            showSaveNotification(`Đã đọc file: ${file.name}`, 'success');
        };
        reader.readAsText(file);
    } else if (filename.endsWith('.pdf') || filename.endsWith('.docx')) {
        showLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const userRaw = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (userRaw) {
                try {
                    const userData = JSON.parse(userRaw);
                    if (userData?.id) {
                        formData.append('user_id', String(userData.id));
                    }
                } catch (e) {
                    console.warn('Cannot parse current user for upload metadata');
                }
            }
            
            const response = await fetch(`${PYTHON_API_URL}/extract-text`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('story-text-input').value = data.text;
                storyFileName = file.name;
                showSaveNotification(`Đã đọc file: ${file.name} (${data.length.toLocaleString()} ký tự)`, 'success');
            } else {
                alert('Lỗi đọc file: ' + data.error);
            }
        } catch (error) {
            console.error('Error extracting text:', error);
            alert('Lỗi khi đọc file. Vui lòng thử lại.');
        } finally {
            showLoading(false);
        }
    } else {
        alert('Chỉ hỗ trợ file .txt, .pdf, .docx');
    }
}

// Start story analysis
async function startStoryAnalysis() {
    const textInput = document.getElementById('story-text-input');
    const text = textInput ? textInput.value.trim() : '';
    
    if (!text) {
        alert('Vui lòng tải file hoặc dán nội dung truyện!');
        return;
    }

    // Check if project already has story data — warn before overwriting
    const project = (typeof ProjectManager !== 'undefined' && ProjectManager.getCurrentProject)
        ? ProjectManager.getCurrentProject() : null;
    const hasStoryData = project && project.steps &&
        _STORY_DOWNSTREAM_STEPS.some(t => !!project.steps[t]);

    if (hasStoryData) {
        if (!_isProUser()) {
            showUpgradePrompt('Tạo lại phân tích truyện');
            return;
        }
        const confirmed = await _confirmRegenerate();
        if (!confirmed) return;
        await _clearStoryDownstreamSteps();
    }
    
    storyContent = text;
    if (!storyFileName) storyFileName = 'Nội dung đã dán';
    
    // Lưu truyện vào database
    try {
        if (typeof saveStepToProject === 'function') {
            await saveStepToProject('story_upload', {
                file_name: storyFileName
            }, storyContent);
            console.log('Đã lưu nội dung truyện vào database');
        }
    } catch (error) {
        console.error('Lỗi lưu truyện vào database:', error);
    }
    
    // Start auto pipeline
    await autoGeneratePipeline('story', {});
}

// Set active nav item
window.setActiveNavItem = function(toolId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tool === toolId) {
            item.classList.add('active');
        }
    });
}

// Toggle description
// Parse scenelist text and return sorted array of {num, label, description}
function _parseSceneEntries(scenelistText) {
    if (!scenelistText) return [];
    // Convert block-level HTML tags to newlines before stripping
    let plain = scenelistText;
    if (plain.includes('<')) {
        plain = plain
            .replace(/<\/?(p|br|li|ul|ol|div|h[1-6]|hr|tr|td|th|blockquote)[^>]*>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
    }

    const seen = new Set();
    const entries = [];

    // Try line-start matching first
    const re = /(?:^|[\n\r])\s*[Cc][a\u1ea3]nh\s+(\d+)\s*[:.]+\s*(.+?)(?=[\n\r]\s*[Cc][a\u1ea3]nh\s+\d+\s*[:.]+|\s*$)/gms;
    let m;
    while ((m = re.exec(plain)) !== null) {
        const n = parseInt(m[1]);
        if (!seen.has(n)) {
            seen.add(n);
            const desc = m[2].trim().replace(/[\n\r]+/g, ' ');
            entries.push({ num: n, label: `C\u1ea3nh ${n}`, description: desc });
        }
    }

    // Fallback: no line-start requirement
    if (entries.length === 0) {
        const re2 = /[Cc][a\u1ea3]nh\s+(\d+)\s*[:.]+\s*(.+?)(?=[Cc][a\u1ea3]nh\s+\d+\s*[:.]+|\s*$)/gs;
        let m2;
        while ((m2 = re2.exec(plain)) !== null) {
            const n = parseInt(m2[1]);
            if (!seen.has(n)) {
                seen.add(n);
                const desc = m2[2].trim().replace(/[\n\r]+/g, ' ');
                entries.push({ num: n, label: `C\u1ea3nh ${n}`, description: desc });
            }
        }
    }

    entries.sort((a, b) => a.num - b.num);
    return entries;
}

// Keep backward-compat alias returning just numbers
function _parseSceneNumbers(scenelistText) {
    return _parseSceneEntries(scenelistText).map(e => e.num);
}

// Auto-generate scripts for every scene in the scenelist
async function autoGenerateAllScripts() {
    const isStory = currentTool === 'story_script';
    const scriptTool = isStory ? 'story_script' : 'script';
    const scenelistTool = isStory ? 'story_scenelist' : 'scenelist';

    const project = (typeof ProjectManager !== 'undefined' && ProjectManager.getCurrentProject)
        ? ProjectManager.getCurrentProject() : null;

    // Get scenelist from current form or from saved project
    let scenelistText = '';
    const scenelistEl = document.getElementById('scenelist');
    if (scenelistEl && scenelistEl.value.trim()) {
        scenelistText = scenelistEl.value.trim();
    } else if (project && project.steps && project.steps[scenelistTool]) {
        scenelistText = (project.steps[scenelistTool].output || '').replace(/<[^>]*>/g, '').trim();
    }

    const sceneEntries = _parseSceneEntries(scenelistText);
    if (sceneEntries.length === 0) {
        alert('Kh\u00f4ng t\u00ecm th\u1ea5y c\u1ea3nh n\u00e0o trong danh s\u00e1ch c\u1ea3nh. H\u00e3y t\u1ea1o danh s\u00e1ch c\u1ea3nh tr\u01b0\u1edbc.');
        return;
    }

    // Clear existing script step if present (no confirmation needed)
    const existingScript = project && project.steps && project.steps[scriptTool];
    if (existingScript) {
        const NODE_API = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)
            ? window.APP_CONFIG.API_BASE_URL
            : PYTHON_API_URL.replace(':5000/api', ':3000/api');
        if (existingScript.id) {
            try {
                await fetch(`${NODE_API}/ai-responses/${scriptTool}/${existingScript.id}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders ? { ...getAuthHeaders() } : {}
                });
            } catch(e) {}
        }
        if (project && project.steps) delete project.steps[scriptTool];
    }

    // Collect base form data (synopsis, characters, structure, beatsheet, scenelist)
    const baseFormData = {};
    const mapping = isStory ? storyAutoFillMapping[scriptTool] : autoFillMapping['script'];
    if (mapping && project && project.steps) {
        for (const [sourceTool, targetField] of Object.entries(mapping)) {
            if (project.steps[sourceTool]) {
                baseFormData[targetField] = (project.steps[sourceTool].output || '').replace(/<[^>]*>/g, '').trim();
            }
        }
    }
    // Also fill from current visible form fields (in case they're not yet saved)
    const tool = isStory ? storyTools[scriptTool] : tools['script'];
    if (tool) {
        tool.fields.forEach(field => {
            if (field.id === 'scene_number') return;
            const el = document.getElementById(field.id);
            if (el && el.value.trim()) baseFormData[field.id] = el.value.trim();
        });
    }
    if (isStory && storyContent) baseFormData.story_content = storyContent;
    if (!baseFormData.scenelist) baseFormData.scenelist = scenelistText;

    // Show the scene-progress overlay
    let cancelled = false;
    const overlay = document.getElementById('scene-auto-overlay');
    const progressBar = document.getElementById('scene-auto-progress-bar');
    const progressLabel = document.getElementById('scene-auto-label');
    const progressLog = document.getElementById('scene-auto-log');
    const cancelBtn = document.getElementById('scene-auto-cancel');
    overlay.style.display = 'flex';
    progressLog.innerHTML = '';
    const onCancel = () => { cancelled = true; };
    cancelBtn.addEventListener('click', onCancel, { once: true });

    const total = sceneEntries.length;
    let previousScript = '';

    for (let idx = 0; idx < total; idx++) {
        if (cancelled) break;
        const entry = sceneEntries[idx];
        // scene_number = full "Cảnh N: [mô tả]" so the prompt knows exactly what to write
        const sceneLabel = entry.description
            ? `${entry.label}: ${entry.description}`
            : entry.label;
        const pct = Math.round((idx / total) * 100);
        progressBar.style.width = pct + '%';
        progressLabel.textContent = `\u0110ang t\u1ea1o ${entry.label} (${idx + 1}/${total})...`;

        const logEntry = document.createElement('div');
        logEntry.className = 'scene-log-entry';
        logEntry.textContent = `\u23f3 ${entry.label}: \u0111ang t\u1ea1o...`;
        progressLog.appendChild(logEntry);
        progressLog.scrollTop = progressLog.scrollHeight;

        const formData = { ...baseFormData, scene_number: sceneLabel };
        if (previousScript) formData.previous_script = previousScript;

        try {
            const apiResult = await generateContent(scriptTool, formData);
            const scriptContent = apiResult.content;

            // Save to project (append mode for scripts)
            if (typeof saveStepToProject === 'function') {
                await saveStepToProject(scriptTool, formData, scriptContent);
            }

            previousScript = scriptContent.replace(/<[^>]*>/g, '').trim().slice(-2000);

            logEntry.textContent = `\u2705 ${entry.label}: xong`;
            logEntry.style.color = '#4ade80';
        } catch (err) {
            logEntry.textContent = `\u274c ${entry.label}: l\u1ed7i - ${err.message}`;
            logEntry.style.color = '#f87171';
            if (err && err.code === 'FREE_DAILY_LIMIT') {
                cancelled = true;
                showFreeLimitPopup();
                break;
            }
            // Continue to next scene on other errors
        }
    }

    progressBar.style.width = '100%';
    progressLabel.textContent = cancelled ? 'D\u1eebng l\u1ea1i.' : `\u2705 \u0110\u00e3 t\u1ea1o xong t\u1ea5t c\u1ea3 ${total} c\u1ea3nh!`;
    cancelBtn.textContent = '\u0110\u00f3ng';
    cancelBtn.removeEventListener('click', onCancel);
    cancelBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
        loadTool(scriptTool);
    }, { once: true });

    if (!cancelled) {
        showSaveNotification(`\u0110\u00e3 t\u1ea1o xong ${total} c\u1ea3nh!`, 'success');
    }
}

function toggleDescription(element) {
    const description = element.previousElementSibling;
    if (description.style.maxHeight) {
        description.style.maxHeight = null;
        element.textContent = 'xem thêm';
    } else {
        description.style.maxHeight = 'none';
        element.textContent = 'thu gọn';
    }
}

// Handle form submit
async function handleSubmit(event) {
    event.preventDefault();

    // FREE: block regeneration if content already exists
    if (!_isProUser()) {
        const rc = document.getElementById('result-content');
        const hasContent = rc && rc.innerHTML &&
            !rc.innerHTML.includes('placeholder-text') &&
            !rc.innerHTML.includes('Kết quả sẽ hiển thị');
        if (hasContent) {
            showUpgradePrompt('Tạo lại bằng AI');
            return;
        }
    }

    const isStoryTool = currentTool.startsWith('story_');
    const tool = isStoryTool ? storyTools[currentTool] : tools[currentTool];
    const formData = {};
    let isValid = true;

    tool.fields.forEach(field => {
        const element = document.getElementById(field.id);
        formData[field.id] = element.value.trim();
        
        if (field.required && !formData[field.id]) {
            isValid = false;
            element.style.borderColor = '#ef4444';
        } else {
            element.style.borderColor = '#e5e7eb';
        }
    });

    if (!isValid) {
        alert('Vui lòng điền đầy đủ các trường bắt buộc!');
        return;
    }

    // Validate scene count limit based on plan
    if ((currentTool === 'scenelist' || currentTool === 'story_scenelist') && formData.scene_count) {
        const maxScenes = _isProUser() ? 40 : 10;
        const cnt = parseInt(formData.scene_count);
        if (!isNaN(cnt) && cnt > maxScenes) {
            const scEl = document.getElementById('scene_count');
            if (scEl) scEl.style.borderColor = '#ef4444';
            showUpgradePrompt(`tạo danh sách cảnh nhiều hơn ${maxScenes} cảnh`);
            return;
        }
    }

    // Inject story content for story analysis tools
    if (isStoryTool && storyContent) {
        formData.story_content = storyContent;
    }

    // Inject original movie_idea for character tool so names in the idea are preserved
    if (currentTool === 'character') {
        const _charProj = (typeof ProjectManager !== 'undefined' && ProjectManager.getCurrentProject)
            ? ProjectManager.getCurrentProject() : currentProject;
        if (_charProj && _charProj.steps && _charProj.steps['logline'] && _charProj.steps['logline'].input) {
            const _loglineInput = _charProj.steps['logline'].input;
            if (_loglineInput.movie_idea) {
                formData['movie_idea'] = _loglineInput.movie_idea;
            }
        }
    }

    // Inject previous scene script for script tools (continuity between scenes)
    if (currentTool === 'script' || currentTool === 'story_script') {
        const previousScript = _getPreviousSceneScript();
        if (previousScript) {
            formData.previous_script = previousScript;
            console.log('📜 Đã thêm kịch bản cảnh trước để viết tiếp liền mạch');
        }
    }

    const isCharTool = currentTool === 'character' || currentTool === 'story_character';

    // If regenerating characters, delete old files first
    if (isCharTool && currentCharacters.length > 0) {
        try {
            const _regen_proj = (typeof ProjectManager !== 'undefined' && ProjectManager.getCurrentProject)
                ? ProjectManager.getCurrentProject() : null;
            const _regen_pid = _regen_proj?.id || null;
            const _regen_qs = _regen_pid ? `?project_id=${encodeURIComponent(_regen_pid)}` : '';
            await fetch(`${PYTHON_API_URL}/characters${_regen_qs}`, { method: 'DELETE' });
        } catch (e) {
            console.warn('Không thể xóa nhân vật cũ:', e);
        }
        currentCharacters = [];
    }

    // Show loading
    showLoading(true);

    try {
        // Simulate AI generation (replace with actual API call)
        const apiResult = await generateContent(currentTool, formData);
        if (isCharTool) {
            currentCharacters = apiResult.characters_data || [];
            displayCharacterCards(currentCharacters);
        } else {
            displayResult(apiResult.content);
        }

        // Update submit button to "Tạo lại"
        const _submitBtn = document.querySelector('#tool-container .submit-btn');
        if (_submitBtn) {
            if (_isProUser()) {
                _submitBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Tạo lại';
            } else {
                _submitBtn.innerHTML = '<i class="fas fa-lock"></i> Tạo lại (PRO)';
                _submitBtn.style.background = 'linear-gradient(135deg, #94a3b8, #64748b)';
            }
        }

        // Show validation badge
        _showValidationBadge(apiResult.validation);

        // Show next step button
        showNextStepButton();

        // Save step to current project
        if (typeof saveStepToProject === 'function') {
            saveStepToProject(currentTool, formData, apiResult.content);
        }
    } catch (error) {
        console.error('Error:', error);
        if (error && error.code === 'FREE_DAILY_LIMIT') {
            showFreeLimitPopup();
            return;
        }
        displayResult(error.message || 'Đã xảy ra lỗi khi tạo nội dung. Vui lòng thử lại.');
    } finally {
        showLoading(false);
    }
}

// Get previous scene script from current result panel
function _getPreviousSceneScript() {
    const resultContent = document.getElementById('result-content');
    if (resultContent) {
        const currentContent = resultContent.innerHTML;
        if (currentContent && !currentContent.includes('placeholder-text') && !currentContent.includes('Kết quả sẽ hiển thị')) {
            const plainText = currentContent.replace(/<[^>]*>/g, '').trim();
            if (plainText.length > 100) {
                return plainText;
            }
        }
    }
    return null;
}

// Generate content using Python API
async function generateContent(toolId, formData) {
    try {
        console.log('🐍 Calling Python API for tool:', toolId);

        const userRaw = localStorage.getItem('user') || sessionStorage.getItem('user');
        const userData = userRaw ? JSON.parse(userRaw) : null;
        const currentProject = (typeof ProjectManager !== 'undefined' && ProjectManager.getCurrentProject)
            ? ProjectManager.getCurrentProject()
            : null;
        
        const response = await fetch(`${PYTHON_API_URL}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tool_id: toolId,
                form_data: formData,
                user_id: userData?.id || null,
                project_id: currentProject?.id || null
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            const error = new Error(data.error || 'Lỗi khi gọi Python API');
            if (response.status === 429) {
                error.code = 'FREE_DAILY_LIMIT';
                error.message = FREE_DAILY_LIMIT_MESSAGE;
            }
            throw error;
        }

        console.log('✅ Python API response received');
        return {
            content: data.content,
            characters_data: data.characters_data || [],
            validation: data.validation || null,
        };
        
    } catch (error) {
        console.error('Python API Error:', error);
        throw error;
    }
}

function showFreeLimitPopup() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) {
        alert(FREE_DAILY_LIMIT_MESSAGE);
        return;
    }

    modalOverlay.innerHTML = `
        <div class="modal-content" style="max-width: 560px;">
            <div class="modal-header">
                <h3>Giới hạn người dùng</h3>
                <button class="btn-close" id="free-limit-close-btn" aria-label="Đóng">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="content-section">
                    <div class="content-box">${FREE_DAILY_LIMIT_MESSAGE}</div>
                </div>
                <div style="display:flex; justify-content:flex-end; margin-top: 16px;">
                    <button class="btn-save" id="free-limit-upgrade-btn">Nâng cấp PRO</button>
                </div>
            </div>
        </div>
    `;

    const closePopup = () => {
        modalOverlay.classList.remove('active');
        modalOverlay.innerHTML = '';
        modalOverlay.onclick = null;
    };

    modalOverlay.classList.add('active');
    modalOverlay.onclick = (event) => {
        if (event.target === modalOverlay) {
            closePopup();
        }
    };

    const closeBtn = document.getElementById('free-limit-close-btn');
    const upgradeBtn = document.getElementById('free-limit-upgrade-btn');
    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', () => {
            sessionStorage.setItem('openUpgradeModal', '1');
            window.location.href = 'dashboard.html';
        });
    }
}

// ==================== OLD GROQ FUNCTIONS (kept for reference) ====================
// These functions are no longer used - AI calls now go through Python API

/*
// Get system prompt based on tool
function getSystemPrompt(toolId) {
    const prompts = {
        logline: `Bạn là một nhà biên kịch Hollywood chuyên nghiệp. Nhiệm vụ của bạn là tạo logline cho phim.
Logline phải:
- Ngắn gọn 1-2 câu
- Nêu rõ nhân vật chính, mục tiêu và xung đột
- Hấp dẫn và tạo sự tò mò
- Có tính độc đáo

Trả lời bằng tiếng Việt với format:
1. Logline chính
2. Phân tích các yếu tố (nhân vật, mục tiêu, xung đột, stakes)
3. 2-3 phiên bản logline thay thế`,

        theme: `Bạn là một nhà biên kịch Hollywood chuyên nghiệp. Nhiệm vụ của bạn là xác định chủ đề cho phim.
Cần phân tích:
- Chủ đề chính (universal theme)
- Các chủ đề phụ
- Câu hỏi chủ đề (thematic question)
- Cách thể hiện chủ đề qua câu chuyện

Trả lời bằng tiếng Việt với format rõ ràng và chi tiết.`,

        character: `Bạn là một nhà biên kịch Hollywood chuyên nghiệp. Nhiệm vụ của bạn là tạo mô tả nhân vật chi tiết.
Với mỗi nhân vật, cần có:
- Tên, tuổi, nghề nghiệp
- Ngoại hình chi tiết
- Tính cách (strengths & flaws)
- Backstory ngắn gọn
- Động lực (motivation)
- Arc phát triển dự kiến
- Mối quan hệ với nhân vật khác

Trả lời bằng tiếng Việt với format rõ ràng.`,

        synopsis: `Bạn là một nhà biên kịch Hollywood chuyên nghiệp. Nhiệm vụ của bạn là viết synopsis chi tiết.
Synopsis cần:
- Kể toàn bộ câu chuyện từ đầu đến cuối (bao gồm cả kết thúc)
- Mô tả rõ ràng các sự kiện chính
- Thể hiện arc nhân vật
- Dành cho nhà sản xuất, không phải khán giả
- Độ dài khoảng 500-800 từ

Trả lời bằng tiếng Việt với format: Mở đầu, Phát triển, Cao trào, Kết thúc.`,

        structure: `Bạn là một nhà biên kịch Hollywood chuyên nghiệp. Nhiệm vụ của bạn là tạo cấu trúc 4 hồi.
Sử dụng Story Circle của Dan Harmon:
- HỒI 1 (SETUP - 25%): Giới thiệu, Catalyst, Debate
- HỒI 2A (RESPONSE - 25%): Thế giới mới, B-Story, Fun & Games, Midpoint
- HỒI 2B (ACTION - 25%): Bad guys close in, All is lost, Dark night
- HỒI 3 (CLIMAX - 25%): Break into 3, Finale, Final image

Với mỗi hồi, liệt kê các sự kiện cụ thể và điểm ngoặt quan trọng.
Trả lời bằng tiếng Việt.`,

        beatsheet: `Bạn là một nhà biên kịch Hollywood chuyên nghiệp. Nhiệm vụ của bạn là tạo Beat Sheet theo mô hình Save the Cat.
Các beat cần có:
1. Opening Image (Trang 1)
2. Theme Stated (Trang 5)
3. Setup (Trang 1-10)
4. Catalyst (Trang 12)
5. Debate (Trang 12-25)
6. Break into Two (Trang 25)
7. B Story (Trang 30)
8. Fun and Games (Trang 30-55)
9. Midpoint (Trang 55)
10. Bad Guys Close In (Trang 55-75)
11. All Is Lost (Trang 75)
12. Dark Night of the Soul (Trang 75-85)
13. Break into Three (Trang 85)
14. Finale (Trang 85-110)
15. Final Image (Trang 110)

Mô tả cụ thể nội dung từng beat. Trả lời bằng tiếng Việt.`,

        scenelist: `Bạn là một nhà biên kịch Hollywood chuyên nghiệp. Nhiệm vụ của bạn là tạo danh sách cảnh.
Tạo 30-40 cảnh với format:
CẢNH [số]: [NỘI/NGOẠI]. [ĐỊA ĐIỂM] - [THỜI GIAN]
[Mô tả ngắn gọn nội dung cảnh]

Phân chia theo 4 hồi:
- Hồi 1: Cảnh 1-10
- Hồi 2A: Cảnh 11-20
- Hồi 2B: Cảnh 21-30
- Hồi 3: Cảnh 31-40

Trả lời bằng tiếng Việt.`,

        script: `Bạn là một nhà biên kịch Hollywood chuyên nghiệp. Nhiệm vụ của bạn là viết kịch bản theo chuẩn format Hollywood.
Format chuẩn:
- Scene heading: NỘI/NGOẠI. ĐỊA ĐIỂM - THỜI GIAN (in hoa)
- Action lines: Mô tả hành động, bối cảnh (viết thường)
- Character name: TÊN NHÂN VẬT (in hoa, căn giữa)
- Parenthetical: (chỉ dẫn diễn xuất) (trong ngoặc, căn giữa)
- Dialogue: Lời thoại (căn giữa, thụt vào)

Viết chi tiết, sinh động, có tính điện ảnh. Trả lời bằng tiếng Việt.`
    };

    return prompts[toolId] || 'Bạn là một trợ lý AI hữu ích chuyên về viết kịch bản phim.';
}

// Build user prompt based on tool and form data
function buildUserPrompt(toolId, formData) {
    const prompts = {
        logline: `Hãy tạo logline cho ý tưởng phim sau:
${formData.movie_idea}`,

        theme: `Hãy xác định chủ đề cho phim với logline/ý tưởng sau:
${formData.logline}`,

        character: `Hãy tạo mô tả chi tiết các nhân vật cho phim:

LOGLINE: ${formData.logline}

CHỦ ĐỀ: ${formData.theme}

SỐ LƯỢNG NHÂN VẬT: ${formData.character_count || '3-5 nhân vật chính'}`,

        synopsis: `Hãy viết synopsis chi tiết cho phim:

LOGLINE: ${formData.logline}

CHỦ ĐỀ: ${formData.theme}

NHÂN VẬT: ${formData.characters}`,

        structure: `Hãy tạo cấu trúc 4 hồi cho phim:

CHỦ ĐỀ: ${formData.theme}

NHÂN VẬT: ${formData.characters}

SYNOPSIS: ${formData.synopsis}`,

        beatsheet: `Hãy tạo beat sheet chi tiết cho phim:

SYNOPSIS: ${formData.synopsis}

CẤU TRÚC 4 HỒI: ${formData.structure}

NHÂN VẬT: ${formData.characters}`,

        scenelist: `Hãy tạo danh sách 30-40 cảnh cho phim:

SYNOPSIS: ${formData.synopsis}

NHÂN VẬT: ${formData.characters}

CẤU TRÚC 4 HỒI: ${formData.structure}

BEAT SHEET: ${formData.beatsheet}`,

        script: `Hãy viết kịch bản chi tiết cho ${formData.scene_number} theo chuẩn format Hollywood:

SYNOPSIS: ${formData.synopsis}

NHÂN VẬT: ${formData.characters}

CẤU TRÚC 4 HỒI: ${formData.structure}

BEAT SHEET: ${formData.beatsheet}

DANH SÁCH CẢNH: ${formData.scenelist}

Lưu ý: Viết đầy đủ scene heading, action, dialogue, parenthetical theo chuẩn Hollywood.`
    };

    return prompts[toolId] || JSON.stringify(formData);
}
*/

// ==================== END OLD GROQ FUNCTIONS ====================

// Format response to HTML (kept for local formatting if needed)
function formatResponseToHTML(content) {
    // Convert markdown-style formatting to HTML
    let html = content
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        // Lists
        .replace(/^- (.*)/gim, '<li>$1</li>')
        .replace(/^\d+\. (.*)/gim, '<li>$1</li>')
        // Horizontal rule
        .replace(/^---$/gim, '<hr>');

    // Wrap in paragraph if not already
    if (!html.startsWith('<')) {
        html = '<p>' + html + '</p>';
    }

    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    
    // Group list items
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    html = html.replace(/<\/ul><ul>/g, '');

    return html;
}

// Sample content generators
function generateLoglineSample(data) {
    return `
<h2>📝 LOGLINE</h2>

<p><strong>Ý tưởng gốc:</strong> ${data.movie_idea}</p>

<hr>

<h3>🎬 Logline đề xuất:</h3>

<p><em>"Trong một thế giới nơi [bối cảnh], [nhân vật chính] - một [mô tả nhân vật] - phải [mục tiêu/hành động] trước khi [mối đe dọa/deadline], nhưng [xung đột/trở ngại] đe dọa không chỉ sứ mệnh mà còn cả [điều quan trọng với nhân vật]."</em></p>

<h3>📌 Phân tích Logline:</h3>
<ul>
    <li><strong>Nhân vật chính:</strong> Được giới thiệu với đặc điểm nổi bật</li>
    <li><strong>Mục tiêu:</strong> Rõ ràng và có tính cấp bách</li>
    <li><strong>Xung đột:</strong> Tạo căng thẳng và drama</li>
    <li><strong>Rủi ro:</strong> Hậu quả nếu thất bại</li>
</ul>

<h3>💡 Gợi ý cải thiện:</h3>
<ol>
    <li>Thêm yếu tố thời gian (deadline) để tăng tính cấp bách</li>
    <li>Làm rõ điểm độc đáo của câu chuyện</li>
    <li>Đảm bảo xung đột có tính cá nhân với nhân vật</li>
</ol>
    `;
}

function generateThemeSample(data) {
    return `
<h2>🎯 CHỦ ĐỀ PHIM</h2>

<p><strong>Logline:</strong> ${data.logline}</p>

<hr>

<h3>📌 Chủ đề chính:</h3>
<p><strong>"Sức mạnh của sự hy sinh và tình yêu có thể vượt qua mọi ranh giới"</strong></p>

<h3>🔍 Phân tích chủ đề:</h3>

<h4>1. Thông điệp cốt lõi:</h4>
<p>Câu chuyện khám phá cách con người đối mặt với những lựa chọn khó khăn khi tình yêu và nghĩa vụ xung đột với nhau.</p>

<h4>2. Chủ đề phụ:</h4>
<ul>
    <li><strong>Sự chuộc lỗi:</strong> Hành trình tìm kiếm sự tha thứ</li>
    <li><strong>Danh tính:</strong> Khám phá bản thân thực sự</li>
    <li><strong>Niềm tin:</strong> Học cách tin tưởng người khác</li>
</ul>

<h4>3. Câu hỏi chủ đề:</h4>
<p><em>"Liệu một người có thể thay đổi bản chất của mình vì tình yêu?"</em></p>

<h3>💡 Cách thể hiện chủ đề:</h3>
<ol>
    <li>Qua hành trình nhân vật chính</li>
    <li>Qua các mối quan hệ trong phim</li>
    <li>Qua biểu tượng và hình ảnh</li>
    <li>Qua đối thoại và hành động</li>
</ol>
    `;
}

function generateCharacterSample(data) {
    return `
<h2>👥 MÔ TẢ NHÂN VẬT</h2>

<hr>

<h3>🦸 NHÂN VẬT CHÍNH: [TÊN]</h3>

<h4>Thông tin cơ bản:</h4>
<ul>
    <li><strong>Tuổi:</strong> 35</li>
    <li><strong>Nghề nghiệp:</strong> Thám tử</li>
    <li><strong>Ngoại hình:</strong> Cao ráo, tóc đen bạc hai bên thái dương, ánh mắt sắc sảo nhưng mệt mỏi</li>
</ul>

<h4>Tính cách:</h4>
<ul>
    <li>Thông minh, quan sát tỉ mỉ</li>
    <li>Khép kín, khó tin người</li>
    <li>Có quá khứ đau buồn</li>
    <li>Công bằng đến mức cố chấp</li>
</ul>

<h4>Động lực:</h4>
<p>Muốn chuộc lại lỗi lầm trong quá khứ khi không thể cứu được ai đó quan trọng.</p>

<h4>Điểm yếu:</h4>
<p>Không thể tha thứ cho bản thân, xu hướng làm việc một mình.</p>

<hr>

<h3>😈 NHÂN VẬT PHẢN DIỆN: [TÊN]</h3>

<h4>Thông tin cơ bản:</h4>
<ul>
    <li><strong>Tuổi:</strong> 40</li>
    <li><strong>Nghề nghiệp:</strong> Bí ẩn</li>
    <li><strong>Ngoại hình:</strong> Bình thường đến mức dễ bị lãng quên, đây là lợi thế lớn nhất</li>
</ul>

<h4>Động lực:</h4>
<p>Tin rằng xã hội đã phản bội mình, muốn chứng minh sự giả dối của mọi người.</p>

<hr>

<h3>❤️ NHÂN VẬT PHỤ: [TÊN]</h3>
<p>Đồng nghiệp/người yêu của nhân vật chính, đại diện cho hy vọng và niềm tin vào con người.</p>
    `;
}

function generateSynopsisSample(data) {
    return `
<h2>📖 TÓM TẮT PHIM (SYNOPSIS)</h2>

<hr>

<h3>MỞ ĐẦU</h3>
<p>Câu chuyện bắt đầu trong [bối cảnh], nơi chúng ta gặp [NHÂN VẬT CHÍNH], một [mô tả]. Cuộc sống của anh/cô ta bị xáo trộn khi [sự kiện khởi đầu] xảy ra.</p>

<h3>PHÁT TRIỂN</h3>
<p>[NHÂN VẬT CHÍNH] buộc phải [hành động] để [mục tiêu]. Trên hành trình này, anh/cô ta gặp [NHÂN VẬT PHỤ] - người sẽ [vai trò trong câu chuyện].</p>

<p>Tuy nhiên, [XỬ ĐỐI THỦ] luôn ở phía trước một bước. Mỗi manh mối đều dẫn đến ngõ cụt, và [NHÂN VẬT CHÍNH] bắt đầu nghi ngờ [điều gì đó quan trọng].</p>

<h3>CAO TRÀO</h3>
<p>Khi sự thật dần được hé lộ, [NHÂN VẬT CHÍNH] phát hiện ra [bí mật shocking]. Giờ đây, anh/cô ta phải đối mặt với [quyết định khó khăn]: [lựa chọn A] hoặc [lựa chọn B].</p>

<p>Trong trận đối đầu cuối cùng, [mô tả cao trào], [NHÂN VẬT CHÍNH] phải sử dụng tất cả những gì đã học được để [hành động quyết định].</p>

<h3>KẾT THÚC</h3>
<p>[Mô tả cách câu chuyện kết thúc, số phận của các nhân vật, và thông điệp cuối cùng]. Câu chuyện khép lại với [hình ảnh/cảnh cuối] - nhắc nhở chúng ta về [chủ đề phim].</p>

<hr>

<p><em>Độ dài dự kiến: 120 phút</em></p>
<p><em>Thể loại: [Thể loại phim]</em></p>
    `;
}

function generateStructureSample(data) {
    return `
<h2>🏗️ PHÂN TÍCH THEO TỪNG HỒI</h2>

<hr>

<h3>HỒI 1: SETUP (Thiết lập) - Khoảng 25%</h3>
<p><strong>Mục tiêu:</strong> Giới thiệu thế giới, nhân vật và xung đột cơ bản</p>

<h4>Các điểm quan trọng:</h4>
<ul>
    <li><strong>Hình ảnh mở đầu:</strong> [Mô tả cảnh đầu tiên thiết lập tone phim]</li>
    <li><strong>Giới thiệu nhân vật:</strong> [Nhân vật chính trong cuộc sống thường ngày]</li>
    <li><strong>Sự kiện kích hoạt (Inciting Incident):</strong> [Sự kiện phá vỡ trạng thái cân bằng]</li>
    <li><strong>Tranh luận/Do dự:</strong> [Nhân vật cân nhắc có nên hành động không]</li>
    <li><strong>Bước vào Hồi 2:</strong> [Quyết định dẫn đến hành trình mới]</li>
</ul>

<hr>

<h3>HỒI 2A: RESPONSE (Phản hồi) - Khoảng 25%</h3>
<p><strong>Mục tiêu:</strong> Nhân vật phản ứng, học hỏi và thích nghi</p>

<h4>Các điểm quan trọng:</h4>
<ul>
    <li><strong>Thế giới mới:</strong> [Nhân vật khám phá môi trường/tình huống mới]</li>
    <li><strong>Gặp đồng minh/kẻ thù:</strong> [Các mối quan hệ mới được hình thành]</li>
    <li><strong>Thử thách ban đầu:</strong> [Nhân vật đối mặt với khó khăn đầu tiên]</li>
    <li><strong>Midpoint (Điểm giữa):</strong> [Sự kiện thay đổi mọi thứ - twist hoặc revelation]</li>
</ul>

<hr>

<h3>HỒI 2B: ACTION (Hành động) - Khoảng 25%</h3>
<p><strong>Mục tiêu:</strong> Nhân vật chủ động hơn, stakes được nâng cao</p>

<h4>Các điểm quan trọng:</h4>
<ul>
    <li><strong>Phản công:</strong> [Nhân vật bắt đầu chủ động tấn công]</li>
    <li><strong>Rủi ro tăng cao:</strong> [Consequences trở nên nghiêm trọng hơn]</li>
    <li><strong>Mất mát:</strong> [Nhân vật mất điều gì đó quan trọng]</li>
    <li><strong>All Is Lost:</strong> [Điểm thấp nhất - dường như không còn hy vọng]</li>
    <li><strong>Dark Night of the Soul:</strong> [Nhân vật đối mặt với bản thân]</li>
</ul>

<hr>

<h3>HỒI 3: CLIMAX (Cao trào) - Khoảng 25%</h3>
<p><strong>Mục tiêu:</strong> Giải quyết xung đột và hoàn thành arc nhân vật</p>

<h4>Các điểm quan trọng:</h4>
<ul>
    <li><strong>Kế hoạch cuối cùng:</strong> [Nhân vật tìm ra giải pháp/quyết tâm mới]</li>
    <li><strong>Đối đầu cuối:</strong> [Trận chiến/đối mặt với antagonist]</li>
    <li><strong>Climax:</strong> [Khoảnh khắc quyết định - nhân vật phải lựa chọn]</li>
    <li><strong>Resolution:</strong> [Hậu quả của lựa chọn, thế giới mới]</li>
    <li><strong>Hình ảnh cuối:</strong> [Cảnh đối lập với hình ảnh mở đầu, thể hiện sự thay đổi]</li>
</ul>
    `;
}

function generateDevelopmentSample(data) {
    return `
<h2>📈 PHÁT TRIỂN NHÂN VẬT</h2>

<hr>

<h3>NHÂN VẬT CHÍNH: [TÊN]</h3>

<h4>🔄 Arc phát triển:</h4>

<table border="1" style="width:100%; border-collapse: collapse;">
<tr>
    <th>Giai đoạn</th>
    <th>Trạng thái</th>
    <th>Sự kiện thay đổi</th>
</tr>
<tr>
    <td>Bắt đầu</td>
    <td>Khép kín, không tin ai, sống với tội lỗi quá khứ</td>
    <td>-</td>
</tr>
<tr>
    <td>Hồi 1 → 2</td>
    <td>Buộc phải hợp tác, vẫn giữ khoảng cách</td>
    <td>Nhận nhiệm vụ không thể từ chối</td>
</tr>
<tr>
    <td>Midpoint</td>
    <td>Bắt đầu mở lòng, thấy giá trị của đội nhóm</td>
    <td>Được cứu bởi người mình không tin</td>
</tr>
<tr>
    <td>All Is Lost</td>
    <td>Mất niềm tin hoàn toàn, muốn bỏ cuộc</td>
    <td>Sự phản bội hoặc mất mát lớn</td>
</tr>
<tr>
    <td>Kết thúc</td>
    <td>Chấp nhận quá khứ, học cách tin tưởng</td>
    <td>Hy sinh vì người khác</td>
</tr>
</table>

<h4>🎭 Các mặt đối lập (Internal Conflict):</h4>
<ul>
    <li><strong>Want (Muốn):</strong> Bắt được tội phạm, hoàn thành nhiệm vụ</li>
    <li><strong>Need (Cần):</strong> Tha thứ cho bản thân, học cách tin người</li>
    <li><strong>Lie (Điều tin sai):</strong> "Mình không xứng đáng được hạnh phúc"</li>
    <li><strong>Truth (Sự thật):</strong> "Ai cũng có quyền được cơ hội thứ hai"</li>
</ul>

<h4>🔑 Khoảnh khắc chuyển đổi quan trọng:</h4>
<ol>
    <li><strong>Lần đầu mở lòng:</strong> [Mô tả cảnh]</li>
    <li><strong>Đối mặt với quá khứ:</strong> [Mô tả cảnh]</li>
    <li><strong>Quyết định hy sinh:</strong> [Mô tả cảnh]</li>
    <li><strong>Chấp nhận sự thật:</strong> [Mô tả cảnh]</li>
</ol>

<hr>

<h3>NHÂN VẬT PHỤ: [TÊN]</h3>
<p><em>[Áp dụng cấu trúc tương tự cho các nhân vật quan trọng khác]</em></p>
    `;
}

function generateBeatSheetSample(data) {
    return `
<h2>📋 BEAT SHEET</h2>

<hr>

<h3>HỒI 1: SETUP</h3>

<p><strong>Beat 1 - Opening Image (Trang 1):</strong><br>
[Mô tả hình ảnh mở đầu - thiết lập tone và thế giới phim]</p>

<p><strong>Beat 2 - Theme Stated (Trang 5):</strong><br>
[Ai đó nói điều gì thể hiện chủ đề - nhân vật chưa hiểu]</p>

<p><strong>Beat 3 - Setup (Trang 1-10):</strong><br>
[Giới thiệu nhân vật chính trong "cuộc sống bình thường"]</p>

<p><strong>Beat 4 - Catalyst (Trang 12):</strong><br>
[Sự kiện phá vỡ trạng thái cân bằng - điểm không thể quay lại]</p>

<p><strong>Beat 5 - Debate (Trang 12-25):</strong><br>
[Nhân vật do dự, cân nhắc hành động]</p>

<hr>

<h3>HỒI 2A: RESPONSE</h3>

<p><strong>Beat 6 - Break into Two (Trang 25):</strong><br>
[Nhân vật quyết định hành động, bước vào thế giới mới]</p>

<p><strong>Beat 7 - B Story (Trang 30):</strong><br>
[Giới thiệu tuyến phụ - thường là mối quan hệ tình cảm]</p>

<p><strong>Beat 8 - Fun and Games (Trang 30-55):</strong><br>
[Nhân vật khám phá thế giới mới, "promise of the premise"]</p>

<p><strong>Beat 9 - Midpoint (Trang 55):</strong><br>
[Chiến thắng giả hoặc thất bại giả - stakes được nâng cao]</p>

<hr>

<h3>HỒI 2B: ACTION</h3>

<p><strong>Beat 10 - Bad Guys Close In (Trang 55-75):</strong><br>
[Áp lực từ bên ngoài và bên trong tăng cao]</p>

<p><strong>Beat 11 - All Is Lost (Trang 75):</strong><br>
[Điểm thấp nhất - mất mát lớn, mùi vị của cái chết]</p>

<p><strong>Beat 12 - Dark Night of the Soul (Trang 75-85):</strong><br>
[Nhân vật đối mặt với sự tuyệt vọng, tự vấn bản thân]</p>

<hr>

<h3>HỒI 3: CLIMAX</h3>

<p><strong>Beat 13 - Break into Three (Trang 85):</strong><br>
[Eureka! Nhân vật tìm ra giải pháp từ A+B story]</p>

<p><strong>Beat 14 - Finale (Trang 85-110):</strong><br>
[Thực hiện kế hoạch, đối đầu cuối cùng, giải quyết xung đột]</p>

<p><strong>Beat 15 - Final Image (Trang 110):</strong><br>
[Hình ảnh đối lập với opening - thể hiện sự thay đổi]</p>
    `;
}

function generateSceneListSample(data) {
    return `
<h2>🎬 DANH SÁCH CẢNH</h2>

<hr>

<h3>HỒI 1: SETUP (Cảnh 1-10)</h3>

<p><strong>Cảnh 1:</strong> NỘI. CĂN HỘ [NHÂN VẬT CHÍNH] - ĐÊM<br>
<em>Giới thiệu nhân vật chính trong không gian sống. Thiết lập tính cách qua chi tiết.</em></p>

<p><strong>Cảnh 2:</strong> NGOẠI. ĐƯỜNG PHỐ THÀNH PHỐ - SÁNG<br>
<em>Nhân vật đi làm, thể hiện thế giới xung quanh và vị trí của họ trong đó.</em></p>

<p><strong>Cảnh 3:</strong> NỘI. VĂN PHÒNG - NGÀY<br>
<em>Giới thiệu môi trường làm việc và các đồng nghiệp quan trọng.</em></p>

<p><strong>Cảnh 4:</strong> NỘI. HIỆN TRƯỜNG VỤ ÁN - NGÀY<br>
<em>CATALYST: Phát hiện vụ án khởi đầu câu chuyện.</em></p>

<p><strong>Cảnh 5:</strong> NỘI. PHÒNG HỌP - NGÀY<br>
<em>Nhận nhiệm vụ, giới thiệu stakes.</em></p>

<hr>

<h3>HỒI 2A: RESPONSE (Cảnh 11-20)</h3>

<p><strong>Cảnh 11:</strong> NGOẠI. ĐỊA ĐIỂM ĐIỀU TRA - NGÀY<br>
<em>Bắt đầu điều tra, thu thập manh mối đầu tiên.</em></p>

<p><strong>Cảnh 12:</strong> NỘI. QUÁN CÀ PHÊ - NGÀY<br>
<em>B-STORY: Gặp gỡ nhân vật quan trọng (tình cảm/mentor).</em></p>

[... Tiếp tục danh sách ...]

<hr>

<h3>HỒI 2B: ACTION (Cảnh 21-30)</h3>

<p><strong>Cảnh 21:</strong> NỘI. CĂN CỨ BÍ MẬT - ĐÊM<br>
<em>Phát hiện quan trọng thay đổi hướng điều tra.</em></p>

[... Tiếp tục danh sách ...]

<hr>

<h3>HỒI 3: CLIMAX (Cảnh 31-40)</h3>

<p><strong>Cảnh 35:</strong> NGOẠI. ĐỊA ĐIỂM ĐỐI ĐẦU - ĐÊM<br>
<em>CLIMAX: Đối đầu cuối cùng với antagonist.</em></p>

<p><strong>Cảnh 40:</strong> NGOẠI. [ĐỊA ĐIỂM] - SÁNG<br>
<em>FINAL IMAGE: Hình ảnh kết thúc - thể hiện sự thay đổi của nhân vật.</em></p>

<hr>

<p><em>Tổng cộng: 40 cảnh</em></p>
<p><em>Thời lượng ước tính: 110-120 phút</em></p>
    `;
}

function generateScriptSample(data) {
    return `
<div class="script-format">
<h2>📜 KỊCH BẢN - CẢNH ${data.scene_number}</h2>

<hr>

<p class="scene-heading">NỘI. HIỆN TRƯỜNG VỤ ÁN - ĐÊM</p>

<p class="action">Đèn flash của cảnh sát nhấp nháy xanh đỏ qua cửa sổ vỡ. Căn phòng tối tăm chỉ được chiếu sáng bởi ánh đèn pin của đội điều tra.</p>

<p class="action">[NHÂN VẬT CHÍNH] (35, khuôn mặt khắc khổ, mắt sắc như dao) bước vào, tay đeo găng cao su. Anh dừng lại ở ngưỡng cửa, quan sát.</p>

<p class="character-name">[NHÂN VẬT CHÍNH]</p>
<p class="parenthetical">(nhìn quanh)</p>
<p class="dialogue">Cậu nói có gì khác lạ?</p>

<p class="action">[ĐỒNG NGHIỆP] (28, tóc ngắn, mặc áo khoác pháp y) đang chụp ảnh hiện trường, quay lại.</p>

<p class="character-name">[ĐỒNG NGHIỆP]</p>
<p class="dialogue">Không có dấu vết xâm nhập. Nạn nhân tự mở cửa cho hung thủ vào.</p>

<p class="character-name">[NHÂN VẬT CHÍNH]</p>
<p class="parenthetical">(quỳ xuống cạnh thi thể)</p>
<p class="dialogue">Hoặc nạn nhân biết kẻ đó.</p>

<p class="action">Anh nhìn gần hơn vào vết thương. Điều gì đó khiến anh đứng hình.</p>

<p class="character-name">[NHÂN VẬT CHÍNH]</p>
<p class="parenthetical">(thì thầm)</p>
<p class="dialogue">Không thể nào...</p>

<p class="character-name">[ĐỒNG NGHIỆP]</p>
<p class="dialogue">Sao? Anh tìm thấy gì?</p>

<p class="action">[NHÂN VẬT CHÍNH] đứng dậy, mặt trắng bệch. Anh lùi lại một bước, cố giữ bình tĩnh.</p>

<p class="character-name">[NHÂN VẬT CHÍNH]</p>
<p class="dialogue">Gọi đội trưởng. Nói với ông ấy...</p>
<p class="parenthetical">(nuốt nước bọt)</p>
<p class="dialogue">...kẻ đó đã quay lại.</p>

<p class="action">ĐỒNG NGHIỆP nhìn anh đầy lo lắng. Ngoài cửa sổ, đèn cảnh sát vẫn nhấp nháy không ngừng.</p>

<p class="scene-heading">CẮT SANG:</p>

</div>

<hr>

<p><em>Ghi chú:</em></p>
<ul>
    <li>INT. = Interior (Nội)</li>
    <li>EXT. = Exterior (Ngoại)</li>
    <li>Format tuân theo chuẩn Hollywood</li>
    <li>Mỗi trang kịch bản ≈ 1 phút phim</li>
</ul>
    `;
}

// ==================== CHARACTER CARD FUNCTIONS ====================

/**
 * Fetch character JSON files for a project from the Python API and render cards.
 */
async function fetchAndRenderCharacters(projectId) {
    try {
        const url = projectId
            ? `${PYTHON_API_URL}/characters?project_id=${encodeURIComponent(projectId)}`
            : `${PYTHON_API_URL}/characters`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.success && data.characters && data.characters.length > 0) {
            currentCharacters = data.characters;
            displayCharacterCards(currentCharacters);
        }
    } catch (e) {
        console.warn('Could not fetch character files:', e);
    }
}

/**
 * Render character cards grid into #character-cards-container.
 */
function displayCharacterCards(characters) {
    const container = document.getElementById('character-cards-container');
    if (!container) return;

    if (!characters || characters.length === 0) {
        container.innerHTML = '<p class="char-empty-msg">Chưa có nhân vật nào. Hãy tạo nội dung để sinh ra danh sách nhân vật.</p>';
        return;
    }

    const roleClass = (role) => {
        const r = (role || '').toLowerCase();
        if (r.includes('chính') || r.includes('main') || r.includes('protagonist')) return 'role-main';
        if (r.includes('phản') || r.includes('villain') || r.includes('antagonist')) return 'role-villain';
        return 'role-support';
    };

    const cardsHTML = characters.map((char, idx) => `
        <div class="character-card" onclick="openCharacterModal(${idx})" tabindex="0" role="button"
             aria-label="Xem chi tiết nhân vật ${(char.ho_ten || '').replace(/"/g, '&quot;')}">
            <div class="char-card-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="char-card-body">
                <h4 class="char-card-name">${char.ho_ten || 'Không rõ tên'}</h4>
                <span class="char-card-role ${roleClass(char.vai_tro)}">${char.vai_tro || 'Không rõ vai trò'}</span>
            </div>
            <div class="char-card-footer">
                <span class="char-card-meta">${char.gioi_tinh || ''} ${char.tuoi ? '· ' + char.tuoi + ' tuổi' : ''}</span>
            </div>
        </div>
    `).join('');

    const addCardHTML = `
        <div class="character-card char-card-add" onclick="openNewCharacterModal()" tabindex="0" role="button"
             aria-label="Thêm nhân vật mới">
            <div class="char-card-avatar char-card-add-icon">
                <i class="fas fa-plus-circle"></i>
            </div>
            <div class="char-card-body">
                <h4 class="char-card-name">Thêm nhân vật</h4>
                <span class="char-card-role role-support" style="opacity:0.6">Tạo thủ công</span>
            </div>
            <div class="char-card-footer"></div>
        </div>
    `;

    container.innerHTML = `
        <div class="char-cards-header">
            <h3><i class="fas fa-users"></i> Danh sách Nhân vật (${characters.length})</h3>
        </div>
        <div class="character-cards-grid">${cardsHTML}${addCardHTML}</div>
    `;

    // Show next step button since we have results
    if (typeof showNextStepButton === 'function') showNextStepButton();
}

/**
 * Build the shared modal fields HTML. Pass an empty {} for a blank create form.
 */
function _buildCharModalFieldsHTML(char) {
    const fields = [
        { key: 'ho_ten',     label: 'Họ và tên',   icon: '👤' },
        { key: 'vai_tro',    label: 'Vai trò',      icon: '🎭' },
        { key: 'gioi_tinh',  label: 'Giới tính',    icon: '⚧' },
        { key: 'tuoi',       label: 'Tuổi',         icon: '🎂' },
        { key: 'quoc_tich',  label: 'Quốc tịch',    icon: '🌍' },
        { key: 'ngoai_hinh', label: 'Ngoại hình',   icon: '🪞', multiline: true },
        { key: 'tinh_cach',  label: 'Tính cách',    icon: '💡', multiline: true },
        { key: 'background', label: 'Background',   icon: '📖', multiline: true },
    ];
    return fields.map(f => `
        <div class="char-modal-field">
            <label class="char-modal-label">${f.icon} ${f.label}</label>
            ${f.multiline
                ? `<textarea id="char-field-${f.key}" class="char-modal-input char-modal-textarea">${char[f.key] != null ? char[f.key] : ''}</textarea>`
                : `<input type="text" id="char-field-${f.key}" class="char-modal-input" value="${String(char[f.key] != null ? char[f.key] : '').replace(/"/g, '&quot;')}">`
            }
        </div>
    `).join('');
}

/**
 * Open the character detail modal for the character at index idx.
 */
function openCharacterModal(idx) {
    const char = currentCharacters[idx];
    if (!char) return;

    const overlay = document.getElementById('char-modal-overlay');
    if (!overlay) return;

    overlay.innerHTML = `
        <div class="char-modal-content" role="dialog" aria-modal="true" aria-label="Chi tiết nhân vật">
            <div class="char-modal-header">
                <h3><i class="fas fa-user"></i> ${char.ho_ten || 'Chi tiết Nhân vật'}</h3>
                <button class="char-modal-close" onclick="closeCharacterModal()" aria-label="Đóng">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="char-modal-body">
                ${_buildCharModalFieldsHTML(char)}
            </div>
            <div class="char-modal-footer">
                <span id="char-save-status" class="char-save-status"></span>
                <button class="char-modal-cancel-btn" onclick="closeCharacterModal()">Hủy</button>
                <button class="char-modal-save-btn" onclick="saveCharacterEdit(${idx})">
                    <i class="fas fa-save"></i> Lưu
                </button>
            </div>
        </div>
    `;

    overlay.classList.add('active');
    overlay.onclick = (e) => { if (e.target === overlay) closeCharacterModal(); };
}

/**
 * Open a blank modal to create a new character manually.
 */
function openNewCharacterModal() {
    const overlay = document.getElementById('char-modal-overlay');
    if (!overlay) return;

    overlay.innerHTML = `
        <div class="char-modal-content" role="dialog" aria-modal="true" aria-label="Tạo nhân vật mới">
            <div class="char-modal-header">
                <h3><i class="fas fa-user-plus"></i> Tạo Nhân vật Mới</h3>
                <button class="char-modal-ai-btn" id="char-ai-gen-btn" onclick="aiGenerateCharacter()" title="Nhờ AI tạo tự động">
                    <i class="fas fa-robot"></i> AI tạo tự động
                </button>
                <button class="char-modal-close" onclick="closeCharacterModal()" aria-label="Đóng">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="char-modal-body">
                ${_buildCharModalFieldsHTML({})}
            </div>
            <div class="char-modal-footer">
                <span id="char-save-status" class="char-save-status"></span>
                <button class="char-modal-cancel-btn" onclick="closeCharacterModal()">Hủy</button>
                <button class="char-modal-save-btn" onclick="saveNewCharacter()">
                    <i class="fas fa-plus"></i> Tạo nhân vật
                </button>
            </div>
        </div>
    `;

    overlay.classList.add('active');
    overlay.onclick = (e) => { if (e.target === overlay) closeCharacterModal(); };
}

/**
 * Call AI to auto-fill the new character form fields.
 */
async function aiGenerateCharacter() {
    const btn = document.getElementById('char-ai-gen-btn');
    const statusEl = document.getElementById('char-save-status');

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo...'; }
    if (statusEl) { statusEl.textContent = ''; }

    try {
        const existingNames = currentCharacters.map(c => c.ho_ten).filter(Boolean);
        const response = await fetch(`${PYTHON_API_URL}/characters/generate-one`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ existing_names: existingNames })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Lỗi khi gọi AI');

        const char = result.character;
        const fieldKeys = ['ho_ten', 'vai_tro', 'gioi_tinh', 'tuoi', 'quoc_tich', 'ngoai_hinh', 'tinh_cach', 'background'];
        fieldKeys.forEach(key => {
            const el = document.getElementById(`char-field-${key}`);
            if (el) el.value = char[key] != null ? char[key] : '';
        });

        if (statusEl) { statusEl.textContent = '✓ AI đã điền thông tin, bạn có thể chỉnh sửa trước khi lưu'; statusEl.style.color = '#10b981'; }
    } catch (error) {
        console.error('AI generate character error:', error);
        if (statusEl) { statusEl.textContent = 'Lỗi: ' + error.message; statusEl.style.color = '#ef4444'; }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-robot"></i> AI tạo tự động'; }
    }
}

async function saveNewCharacter() {
    const fieldKeys = ['ho_ten', 'vai_tro', 'gioi_tinh', 'tuoi', 'quoc_tich', 'ngoai_hinh', 'tinh_cach', 'background'];
    const newData = {};
    fieldKeys.forEach(key => {
        const el = document.getElementById(`char-field-${key}`);
        if (el) newData[key] = el.value.trim();
    });

    if (!newData.ho_ten) {
        const statusEl = document.getElementById('char-save-status');
        if (statusEl) { statusEl.textContent = 'Vui l\u00f2ng nh\u1eadp h\u1ecd t\u00ean nh\u00e2n v\u1eadt'; statusEl.style.color = '#ef4444'; }
        document.getElementById('char-field-ho_ten')?.focus();
        return;
    }

    const saveBtn = document.querySelector('.char-modal-save-btn');
    const statusEl = document.getElementById('char-save-status');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> \u0110ang t\u1ea1o...'; }
    if (statusEl) statusEl.textContent = '';

    try {
        const currentProject = (typeof ProjectManager !== 'undefined' && ProjectManager.getCurrentProject)
            ? ProjectManager.getCurrentProject() : null;
        const project_id = currentProject?.id || null;

        const response = await fetch(`${PYTHON_API_URL}/characters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id, data: newData })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'L\u1ed7i khi t\u1ea1o nh\u00e2n v\u1eadt');

        // Add to in-memory list and re-render
        currentCharacters.push(result.character);
        displayCharacterCards(currentCharacters);

        if (statusEl) { statusEl.textContent = '\u2713 \u0110\u00e3 t\u1ea1o th\u00e0nh c\u00f4ng'; statusEl.style.color = '#10b981'; }
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-plus"></i> T\u1ea1o nh\u00e2n v\u1eadt'; }

        setTimeout(() => closeCharacterModal(), 800);
    } catch (error) {
        console.error('Create character error:', error);
        if (statusEl) { statusEl.textContent = 'L\u1ed7i: ' + error.message; statusEl.style.color = '#ef4444'; }
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-plus"></i> T\u1ea1o nh\u00e2n v\u1eadt'; }
    }
}

async function saveCharacterEdit(idx) {
    const char = currentCharacters[idx];
    if (!char) return;

    const fieldKeys = ['ho_ten', 'vai_tro', 'gioi_tinh', 'tuoi', 'quoc_tich', 'ngoai_hinh', 'tinh_cach', 'background'];
    const updatedData = {};
    fieldKeys.forEach(key => {
        const el = document.getElementById(`char-field-${key}`);
        if (el) updatedData[key] = el.value.trim();
    });

    const saveBtn = document.querySelector('.char-modal-save-btn');
    const statusEl = document.getElementById('char-save-status');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...'; }
    if (statusEl) statusEl.textContent = '';

    try {
        const currentProject = (typeof ProjectManager !== 'undefined' && ProjectManager.getCurrentProject)
            ? ProjectManager.getCurrentProject() : null;
        const project_id = currentProject?.id || null;

        if (char._filename) {
            // Save to file via API
            const response = await fetch(`${PYTHON_API_URL}/characters`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id, filename: char._filename, data: updatedData })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Lỗi khi lưu');
        }

        // Update in-memory data
        Object.assign(currentCharacters[idx], updatedData);

        // Re-render cards to reflect name/role change
        displayCharacterCards(currentCharacters);

        if (statusEl) { statusEl.textContent = '✓ Đã lưu'; statusEl.style.color = '#10b981'; }
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> Lưu'; }

        // Close modal after short delay
        setTimeout(() => closeCharacterModal(), 800);

    } catch (error) {
        console.error('Save character error:', error);
        if (statusEl) { statusEl.textContent = 'Lỗi: ' + error.message; statusEl.style.color = '#ef4444'; }
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> Lưu'; }
    }
}

/**
 * Close the character detail modal.
 */
function closeCharacterModal() {
    const overlay = document.getElementById('char-modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.innerHTML = '';
        overlay.onclick = null;
    }
}

// ==================== END CHARACTER CARD FUNCTIONS ====================

/**
 * Show a small validation status badge below the result panel header.
 * @param {object|null} validation - { attempts, passed, history }
 */
function _showValidationBadge(validation) {
    // Remove any existing badge
    const old = document.getElementById('validation-badge');
    if (old) old.remove();
    if (!validation) return;

    const { attempts, passed, history } = validation;
    const lastRound = history && history.length ? history[history.length - 1] : null;
    const score = lastRound ? lastRound.score : null;
    const issues = lastRound ? (lastRound.issues || []) : [];

    const isOk = passed;
    const color = isOk ? '#10b981' : '#ef4444';
    const icon = isOk ? 'fa-check-circle' : 'fa-exclamation-circle';
    const label = isOk
        ? `Đã kiểm tra ✓ (${attempts} lần thử, điểm: ${score}/10)`
        : `Không đạt sau ${attempts} lần thử (điểm: ${score}/10)`;

    const issueHTML = issues.length
        ? `<ul style="margin:4px 0 0 16px;padding:0;font-size:0.78rem;color:#6b7280;">${issues.map(i => `<li>${i}</li>`).join('')}</ul>`
        : '';

    const badge = document.createElement('div');
    badge.id = 'validation-badge';
    badge.style.cssText = `
        display:flex;flex-direction:column;gap:2px;
        padding:6px 12px;margin:8px 0 0 0;
        background:${isOk ? '#f0fdf4' : '#fef2f2'};
        border:1px solid ${isOk ? '#bbf7d0' : '#fecaca'};
        border-radius:8px;font-size:0.82rem;color:${color};
    `;
    badge.innerHTML = `<span><i class="fas ${icon}" style="margin-right:5px;"></i>${label}</span>${issueHTML}`;

    const resultPanel = document.querySelector('.result-panel');
    if (resultPanel) {
        const header = resultPanel.querySelector('.result-header') || resultPanel.firstElementChild;
        if (header) header.after(badge);
        else resultPanel.prepend(badge);
    }
}

// ===================== Unsaved Changes Guard =====================
let _savedContentSnapshot = '';
let _pendingNavigation = null;

function _updateContentSnapshot() {
    const rc = document.getElementById('result-content');
    if (rc) {
        _savedContentSnapshot = rc.innerHTML;
        if (_isProUser()) {
            rc.contentEditable = 'true';
            rc.style.background = '';
            rc.style.cursor = '';
            rc.onclick = null;
        } else {
            rc.contentEditable = 'false';
            rc.style.background = 'linear-gradient(135deg, #e2e8f0, #cbd5e1)';
            rc.style.cursor = 'not-allowed';
            rc.onclick = function () {
                showUpgradePrompt('chỉnh sửa nội dung kết quả');
            };
        }
    }
}

function hasUnsavedChanges() {
    const rc = document.getElementById('result-content');
    if (!rc) return false;
    const current = rc.innerHTML;
    if (!current || current.includes('placeholder-text') || current.includes('Kết quả sẽ hiển thị')) return false;
    if (!_savedContentSnapshot) return false;
    return current !== _savedContentSnapshot;
}

function checkUnsavedChanges(action) {
    if (!hasUnsavedChanges()) { action(); return; }
    _pendingNavigation = action;
    _showUnsavedPopup();
}

function _showUnsavedPopup() {
    let popup = document.getElementById('unsaved-changes-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'unsaved-changes-popup';
        popup.innerHTML = `
            <div id="unsaved-popup-overlay" style="
                position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;
                display:flex;align-items:center;justify-content:center;">
                <div style="
                    background:#fff;border-radius:12px;padding:28px 32px;
                    max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                    <h3 style="margin:0 0 12px;font-size:1.1rem;color:#1f2937;">
                        <i class="fas fa-exclamation-triangle" style="color:#f59e0b;margin-right:8px;"></i>
                        Chưa lưu thay đổi
                    </h3>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:0.95rem;line-height:1.6;">
                        Bạn chưa lưu thay đổi nội dung, bạn muốn lưu hay hủy bỏ thay đổi?
                    </p>
                    <div style="display:flex;gap:12px;justify-content:flex-end;">
                        <button id="unsaved-discard-btn" style="
                            padding:8px 20px;border:1px solid #d1d5db;border-radius:8px;
                            background:#fff;color:#374151;cursor:pointer;font-size:0.9rem;">
                            Hủy
                        </button>
                        <button id="unsaved-save-btn" style="
                            padding:8px 20px;border:none;border-radius:8px;
                            background:#6366f1;color:#fff;cursor:pointer;font-size:0.9rem;">
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
    }
    popup.style.display = 'block';
    document.getElementById('unsaved-save-btn').onclick = async () => {
        _hideUnsavedPopup();
        await saveResult();
        _updateContentSnapshot();
        if (_pendingNavigation) { const a = _pendingNavigation; _pendingNavigation = null; a(); }
    };
    document.getElementById('unsaved-discard-btn').onclick = () => {
        _hideUnsavedPopup();
        _savedContentSnapshot = '';
        if (_pendingNavigation) { const a = _pendingNavigation; _pendingNavigation = null; a(); }
    };
}

function _hideUnsavedPopup() {
    const popup = document.getElementById('unsaved-changes-popup');
    if (popup) popup.style.display = 'none';
}

window.hasUnsavedChanges = hasUnsavedChanges;
window.checkUnsavedChanges = checkUnsavedChanges;
window._showUnsavedPopup = _showUnsavedPopup;
window._updateContentSnapshot = _updateContentSnapshot;

// Display result
function displayResult(content) {
    const resultContent = document.getElementById('result-content');
    
    // Nếu đang ở bước viết kịch bản (script), thêm kết quả mới vào sau kết quả cũ
    if (currentTool === 'script' || currentTool === 'story_script') {
        // Xóa placeholder text nếu có
        const placeholder = resultContent.querySelector('.placeholder-text');
        if (placeholder) {
            placeholder.remove();
        }
        
        // Thêm separator nếu đã có nội dung
        if (resultContent.innerHTML.trim() !== '') {
            resultContent.innerHTML += '<hr style="margin: 2rem 0; border: none; border-top: 2px solid #e5e7eb;">';
        }
        
        // Thêm kết quả mới vào cuối
        resultContent.innerHTML += content;
    } else {
        // Các bước khác thì thay thế toàn bộ như cũ
        resultContent.innerHTML = content;
    }
    setTimeout(_updateContentSnapshot, 0);
}

// Show/hide loading
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// Save result to database
async function saveResult() {
    const content = document.getElementById('result-content').innerHTML;
    
    // Check if content is empty or just placeholder
    if (!content || content.includes('placeholder-text')) {
        alert('Chưa có nội dung để lưu!');
        return;
    }
    
    // Check if there's a current project
    if (typeof ProjectManager === 'undefined' || !ProjectManager.getCurrentProject()) {
        alert('Chưa có dự án. Vui lòng tạo nội dung trước!');
        return;
    }
    
    const project = ProjectManager.getCurrentProject();
    
    // Check if this step has been generated before
    if (!project.steps || !project.steps[currentTool]) {
        alert('Bước này chưa được tạo. Vui lòng tạo nội dung trước khi lưu!');
        return;
    }
    
    try {
        // Get the original input data for this step
        const inputData = project.steps[currentTool].input || {};
        
        // Update local project data with edited content
        project.steps[currentTool].output = content;
        project.steps[currentTool].updated_at = new Date().toISOString();
        
        // Save to MySQL via API (script tools: overwrite with current result panel content)
        const requestBody = {
            project_id: project.id,
            tool_type: currentTool,
            input_data: inputData,
            output_data: content
        };
        // Nút Lưu luôn ghi đè với nội dung hiện tại trong ô kết quả
        if (currentTool === 'script' || currentTool === 'story_script') {
            requestBody.save_mode = 'overwrite';
        }
        const nodeApiUrl = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)
            ? window.APP_CONFIG.API_BASE_URL
            : PYTHON_API_URL.replace(':5000/api', ':3000/api');
        const response = await fetch(`${nodeApiUrl}/ai-responses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Đã lưu kết quả chỉnh sửa vào MySQL');
            _updateContentSnapshot();
            // Show success notification
            showSaveNotification('Đã lưu kết quả thành công!', 'success');
        } else {
            throw new Error(data.message || 'Lỗi khi lưu');
        }
    } catch (error) {
        console.error('❌ Lỗi lưu vào MySQL:', error);
        alert('Lỗi khi lưu vào database: ' + error.message);
    }
}

// Show save notification
function showSaveNotification(message, type = 'success') {
    // Remove existing notification
    const existing = document.querySelector('.save-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `save-notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Copy result
function copyResult() {
    const content = document.getElementById('result-content').innerText;
    navigator.clipboard.writeText(content).then(() => {
        alert('Đã sao chép vào clipboard!');
    }).catch(err => {
        console.error('Lỗi khi sao chép:', err);
    });
}

// Download result
async function downloadResult() {
    const content = document.getElementById('result-content');
    const htmlContent = content.innerHTML;
    
    try {
        // Sử dụng docx library để tạo file DOCX
        const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
        
        // Parse HTML content và chuyển thành docx paragraphs
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Loại bỏ placeholder text nếu có
        const placeholder = tempDiv.querySelector('.placeholder-text');
        if (placeholder) {
            placeholder.remove();
        }
        
        const paragraphs = [];
        
        // Hàm đệ quy để xử lý text runs với formatting
        const processTextNode = (node, formatting = {}) => {
            const runs = [];
            
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (text) {
                    runs.push(new TextRun({
                        text: text,
                        bold: formatting.bold || false,
                        italics: formatting.italics || false,
                        underline: formatting.underline || undefined
                    }));
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName;
                const newFormatting = { ...formatting };
                
                if (tagName === 'B' || tagName === 'STRONG') {
                    newFormatting.bold = true;
                } else if (tagName === 'I' || tagName === 'EM') {
                    newFormatting.italics = true;
                } else if (tagName === 'U') {
                    newFormatting.underline = {};
                } else if (tagName === 'BR') {
                    // BR thêm line break
                    runs.push(new TextRun({ text: '', break: 1 }));
                    return runs;
                }
                
                // Xử lý các child nodes
                node.childNodes.forEach(child => {
                    runs.push(...processTextNode(child, newFormatting));
                });
            }
            
            return runs;
        };
        
        // Duyệt qua tất cả các nodes (bao gồm cả text nodes)
        const processNode = (node) => {
            // Text node trực tiếp
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                if (text) {
                    paragraphs.push(new Paragraph({
                        children: [new TextRun(text)],
                        spacing: { after: 200 }
                    }));
                }
                return;
            }
            
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return;
            }
            
            const tagName = node.tagName;
            
            // Xử lý HR (separator)
            if (tagName === 'HR') {
                paragraphs.push(new Paragraph({
                    text: '',
                    spacing: { before: 200, after: 200 },
                    border: {
                        top: {
                            color: "auto",
                            space: 1,
                            style: "single",
                            size: 6
                        }
                    }
                }));
                return;
            }
            
            // Xử lý các heading
            if (tagName === 'H1') {
                paragraphs.push(new Paragraph({
                    text: node.textContent,
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                }));
                return;
            } else if (tagName === 'H2') {
                paragraphs.push(new Paragraph({
                    text: node.textContent,
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 200 }
                }));
                return;
            } else if (tagName === 'H3') {
                paragraphs.push(new Paragraph({
                    text: node.textContent,
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 240, after: 120 }
                }));
                return;
            } else if (tagName === 'H4') {
                paragraphs.push(new Paragraph({
                    text: node.textContent,
                    heading: HeadingLevel.HEADING_4,
                    spacing: { before: 200, after: 100 }
                }));
                return;
            } else if (tagName === 'H5') {
                paragraphs.push(new Paragraph({
                    text: node.textContent,
                    heading: HeadingLevel.HEADING_5,
                    spacing: { before: 200, after: 100 }
                }));
                return;
            } else if (tagName === 'H6') {
                paragraphs.push(new Paragraph({
                    text: node.textContent,
                    heading: HeadingLevel.HEADING_6,
                    spacing: { before: 200, after: 100 }
                }));
                return;
            }
            
            // Xử lý paragraph
            if (tagName === 'P') {
                // Xử lý nội dung của paragraph, bao gồm cả BR tags
                const childNodes = Array.from(node.childNodes);
                let currentRuns = [];
                
                const flushParagraph = () => {
                    if (currentRuns.length > 0) {
                        paragraphs.push(new Paragraph({
                            children: currentRuns,
                            spacing: { after: 200 }
                        }));
                        currentRuns = [];
                    }
                };
                
                childNodes.forEach(childNode => {
                    if (childNode.nodeType === Node.ELEMENT_NODE && childNode.tagName === 'BR') {
                        // Khi gặp BR, tạo paragraph mới
                        flushParagraph();
                    } else {
                        // Xử lý text và formatting
                        const runs = processTextNode(childNode);
                        currentRuns.push(...runs);
                    }
                });
                
                // Flush paragraph cuối cùng
                flushParagraph();
                return;
            }
            
            // Xử lý list items
            if (tagName === 'LI') {
                const runs = processTextNode(node);
                if (runs.length > 0) {
                    paragraphs.push(new Paragraph({
                        children: runs,
                        spacing: { after: 100 },
                        bullet: { level: 0 }
                    }));
                }
                return;
            }
            
            // Xử lý ul/ol - duyệt qua các li
            if (tagName === 'UL' || tagName === 'OL') {
                Array.from(node.children).forEach(child => {
                    if (child.tagName === 'LI') {
                        processNode(child);
                    }
                });
                return;
            }
            
            // Xử lý div - duyệt qua các child
            if (tagName === 'DIV') {
                Array.from(node.childNodes).forEach(child => {
                    processNode(child);
                });
                return;
            }
            
            // Xử lý span và các inline elements - extract text với formatting
            if (tagName === 'SPAN' || tagName === 'STRONG' || tagName === 'B' || 
                tagName === 'EM' || tagName === 'I' || tagName === 'U') {
                const runs = processTextNode(node);
                if (runs.length > 0) {
                    paragraphs.push(new Paragraph({
                        children: runs,
                        spacing: { after: 200 }
                    }));
                }
                return;
            }
        };
        
        // Xử lý tất cả các child nodes
        Array.from(tempDiv.childNodes).forEach(node => {
            processNode(node);
        });
        
        // Nếu không có paragraphs, fallback to plain text
        if (paragraphs.length === 0) {
            const textContent = tempDiv.textContent || '';
            if (textContent.trim()) {
                const lines = textContent.split('\n');
                lines.forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed) {
                        paragraphs.push(new Paragraph({
                            children: [new TextRun(trimmed)],
                            spacing: { after: 200 }
                        }));
                    }
                });
            }
        }
        
        // Nếu vẫn không có gì, thêm thông báo
        if (paragraphs.length === 0) {
            paragraphs.push(new Paragraph({
                children: [new TextRun('Không có nội dung')]
            }));
        }
        
        // Tạo document
        const doc = new Document({
            sections: [{
                properties: {},
                children: paragraphs
            }]
        });
        
        // Tạo blob và download
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screenplay_${currentTool}_${new Date().toISOString().split('T')[0]}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error creating DOCX:', error);
        alert('Có lỗi khi tạo file DOCX. Vui lòng thử lại.');
    }
}

// ===================== Toolbar Functions =====================

// Execute format command
function formatText(command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('result-content').focus();
}

// Format as heading
function formatHeading() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText) {
            // Wrap in h3 tag
            document.execCommand('formatBlock', false, 'h3');
        } else {
            // Insert heading placeholder
            document.execCommand('insertHTML', false, '<h3>Tiêu đề</h3>');
        }
    }
    document.getElementById('result-content').focus();
}

// Format as bold
function formatBold() {
    formatText('bold');
}

// Format as italic
function formatItalic() {
    formatText('italic');
}

// Format as strikethrough
function formatStrikethrough() {
    formatText('strikeThrough');
}

// Insert unordered list
function formatUnorderedList() {
    formatText('insertUnorderedList');
}

// Insert ordered list
function formatOrderedList() {
    formatText('insertOrderedList');
}

// Insert blockquote
function formatQuote() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText) {
            document.execCommand('formatBlock', false, 'blockquote');
        } else {
            document.execCommand('insertHTML', false, '<blockquote>Trích dẫn...</blockquote>');
        }
    }
    document.getElementById('result-content').focus();
}

// Insert table
function formatTable() {
    const rows = prompt('Số hàng:', '3');
    const cols = prompt('Số cột:', '3');
    
    if (rows && cols) {
        let tableHTML = '<table class="result-table"><thead><tr>';
        
        // Header row
        for (let j = 0; j < parseInt(cols); j++) {
            tableHTML += `<th>Cột ${j + 1}</th>`;
        }
        tableHTML += '</tr></thead><tbody>';
        
        // Data rows
        for (let i = 0; i < parseInt(rows) - 1; i++) {
            tableHTML += '<tr>';
            for (let j = 0; j < parseInt(cols); j++) {
                tableHTML += '<td>Nội dung</td>';
            }
            tableHTML += '</tr>';
        }
        tableHTML += '</tbody></table><p></p>';
        
        document.execCommand('insertHTML', false, tableHTML);
    }
    document.getElementById('result-content').focus();
}

// Initialize toolbar buttons
function initToolbar() {
    const toolbarButtons = document.querySelectorAll('.toolbar-btn');
    
    toolbarButtons.forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const title = btn.getAttribute('title');
            
            switch(title) {
                case 'Tiêu đề':
                    formatHeading();
                    break;
                case 'In đậm':
                    formatBold();
                    break;
                case 'In nghiêng':
                    formatItalic();
                    break;
                case 'Gạch ngang':
                    formatStrikethrough();
                    break;
                case 'Danh sách':
                    formatUnorderedList();
                    break;
                case 'Danh sách số':
                    formatOrderedList();
                    break;
                case 'Trích dẫn':
                    formatQuote();
                    break;
                case 'Bảng':
                    formatTable();
                    break;
            }
        });
    });
}

// Initialize toolbar when DOM is loaded
document.addEventListener('DOMContentLoaded', initToolbar);

// ===================== End Toolbar Functions =====================

// Go back
function goBack() {
    // Could implement navigation history
    console.log('Go back');
}

// Show next step button after generating content
function showNextStepButton() {
    // Disabled – next step banner removed
    return;
}

// Hide next step button
function hideNextStepButton() {
    const existingBtn = document.querySelector('.next-step-container');
    if (existingBtn) {
        existingBtn.remove();
    }
}

// Go to next step with auto-fill
function goToNextStep() {
    const isStoryTool = currentTool.startsWith('story_');
    const currentOrder = isStoryTool ? storyToolOrder : toolOrder;
    const currentIndex = currentOrder.indexOf(currentTool);
    if (currentIndex >= currentOrder.length - 1) return;
    
    const nextTool = currentOrder[currentIndex + 1];
    
    // Get the CURRENT content from result-content (may have been edited by user)
    const editedContent = document.getElementById('result-content').innerHTML;
    
    // Update the current step's output with edited content
    if (typeof ProjectManager !== 'undefined' && ProjectManager.getCurrentProject()) {
        const project = ProjectManager.getCurrentProject();
        if (project.steps && project.steps[currentTool]) {
            // Update with edited content
            project.steps[currentTool].output = editedContent;
            console.log('📝 Đã cập nhật nội dung đã chỉnh sửa cho bước:', currentTool);
        }
    }
    
    // Get current project data for auto-fill
    let projectData = {};
    if (typeof ProjectManager !== 'undefined' && ProjectManager.getCurrentProject()) {
        const project = ProjectManager.getCurrentProject();
        if (project.steps) {
            // Collect all previous step outputs (including edited content)
            Object.keys(project.steps).forEach(stepTool => {
                const stepData = project.steps[stepTool];
                projectData[stepTool] = {
                    input: stepData.input,
                    output: stepData.output
                };
            });
        }
    }
    
    // Load next tool
    loadToolWithAutoFill(nextTool, projectData);
    
    // Update nav items - use unified sidebar for both idea and story tools
    const storyToNavMap = {
        'story_theme': 'theme',
        'story_character': 'character',
        'story_synopsis': 'synopsis',
        'story_structure': 'structure',
        'story_beatsheet': 'beatsheet',
        'story_scenelist': 'scenelist',
        'story_script': 'script'
    };
    const navToolId = isStoryTool ? (storyToNavMap[nextTool] || nextTool) : nextTool;
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tool === navToolId) {
            item.classList.add('active');
        }
    });
    
    // Remove next step button and clear result panel
    const nextStepContainer = document.querySelector('.next-step-container');
    if (nextStepContainer) nextStepContainer.remove();
    
    // Clear result panel
    document.getElementById('result-content').innerHTML =
        '<p class="placeholder-text">Kết quả sẽ hiển thị ở đây sau khi bạn tạo nội dung...</p>';
}

// Load tool with auto-fill from previous steps
function loadToolWithAutoFill(toolId, projectData) {
    currentTool = toolId;
    const isStoryTool = toolId.startsWith('story_');
    const tool = isStoryTool ? storyTools[toolId] : tools[toolId];
    const container = document.getElementById('tool-container');
    
    // Get auto-fill mapping for this tool
    const fillMapping = isStoryTool 
        ? (storyAutoFillMapping[toolId] || {})
        : (autoFillMapping[toolId] || {});
    
    let fieldsHTML = tool.fields.map((field, index) => {
        // Check if this field should be auto-filled
        let autoFillValue = '';
        let autoFillSource = '';
        
        // Find which previous step provides data for this field
        Object.keys(fillMapping).forEach(stepTool => {
            if (fillMapping[stepTool] === field.id && projectData[stepTool]) {
                // Use the output from the previous step
                autoFillValue = projectData[stepTool].output || '';
                // Strip HTML tags for textarea
                autoFillValue = autoFillValue.replace(/<[^>]*>/g, '');
                const toolSet = isStoryTool ? storyTools : tools;
                autoFillSource = toolSet[stepTool]?.title || stepTool;
            }
        });
        
        const inputType = field.type === 'textarea' 
            ? `<textarea class="form-textarea" id="${field.id}" placeholder="${field.placeholder}" ${field.required ? 'required' : ''}>${autoFillValue}</textarea>`
            : `<input type="text" class="form-input" id="${field.id}" placeholder="${field.placeholder}" ${field.required ? 'required' : ''} value="${autoFillValue}">`;
        
        const autoFillBadge = autoFillValue ? '' : '';
        
        return `
            <div class="form-group ${autoFillValue ? 'auto-filled' : ''}">
                <label class="form-label">
                    <span class="step-number">${index + 1}</span>
                    <span class="label-icon">${field.labelIcon}</span>
                    <span>${field.label}</span>
                    ${field.optional ? '<span class="optional">(tùy chọn)</span>' : ''}
                    ${autoFillBadge}
                </label>
                ${inputType}
            </div>
        `;
    }).join('');

    // Story indicator for story analysis tools
    const storyIndicator = isStoryTool && storyContent ? `
        <div class="story-indicator">
            <i class="fas fa-book-open"></i>
            <span>📖 Truyện: <strong>${storyFileName || 'Nội dung đã dán'}</strong> (${storyContent.length.toLocaleString()} ký tự)</span>
            <button class="btn-change-story" onclick="loadTool('story_upload')" title="Đổi truyện">
                <i class="fas fa-exchange-alt"></i>
            </button>
        </div>
    ` : '';

    container.innerHTML = `
        <div class="tool-header">
            <h2 class="tool-title">
                <i class="${tool.icon}"></i>
                ${tool.title}
                <span class="help-icon" title="Trợ giúp">?</span>
            </h2>
            <p class="tool-description">${tool.description}</p>
            <span class="more-link" onclick="toggleDescription(this)">xem thêm</span>
        </div>
        ${storyIndicator}
        <form id="tool-form" onsubmit="handleSubmit(event)">
            ${fieldsHTML}
            <button type="submit" class="submit-btn">
                <i class="fas fa-magic"></i>
                ${isStoryTool ? 'Phân tích' : 'Tạo Nội dung'}
            </button>
        </form>
    `;

    // Apply scene count limits based on plan (scenelist step)
    if (toolId === 'scenelist' || toolId === 'story_scenelist') {
        const sceneCountEl = document.getElementById('scene_count');
        if (sceneCountEl) {
            const maxScenes = _isProUser() ? 40 : 10;
            sceneCountEl.type = 'number';
            sceneCountEl.min = '1';
            sceneCountEl.max = String(maxScenes);
            sceneCountEl.placeholder = _isProUser()
                ? 'Ví dụ: 30 (tối đa 40 cảnh)'
                : 'Ví dụ: 5 (tối đa 10 cảnh - Gói Free)';
        }
    }

    // Check if we have saved data for this tool in the current project
    let dataRestored = false;
    const currProjForRestore = window.ProjectManager ? window.ProjectManager.getCurrentProject() : null;
    
    if (currProjForRestore && currProjForRestore.steps && currProjForRestore.steps[toolId]) {
        const step = currProjForRestore.steps[toolId];
        
        // Restore output
        if (step.output) {
            document.getElementById('result-content').innerHTML = step.output;
            _updateContentSnapshot();
            if (typeof showNextStepButton === 'function') {
                showNextStepButton();
            }
            dataRestored = true;
            // Update button based on plan
            const _afBtn = document.querySelector('#tool-container .submit-btn');
            if (_afBtn) {
                if (_isProUser()) {
                    _afBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Tạo lại';
                } else {
                    _afBtn.innerHTML = '<i class="fas fa-lock"></i> Tạo lại (PRO)';
                    _afBtn.style.background = 'linear-gradient(135deg, #94a3b8, #64748b)';
                }
            }
        }
    }
    
    if (!dataRestored) {
        // Clear result panel and hide next step button
        document.getElementById('result-content').innerHTML =
            '<p class="placeholder-text">Kết quả sẽ hiển thị ở đây sau khi bạn tạo nội dung...</p>';
        hideNextStepButton();
    }
}

// Export for potential API integration
window.AIScreenplay = {
    tools,
    storyTools,
    currentTool,
    loadTool,
    generateContent,
    goToNextStep,
    loadToolWithAutoFill,
    startStoryAnalysis
};

// Expose functions globally
window.goToNextStep = goToNextStep;
window.startStoryAnalysis = startStoryAnalysis;
window.handleStoryFile = handleStoryFile;
window.setActiveNavItem = setActiveNavItem;

// Expose story content getter/setter for projectManager
window.setStoryContent = function(content, fileName) {
    storyContent = content || '';
    storyFileName = fileName || 'Nội dung đã dán';
};
window.getStoryContent = function() {
    return { content: storyContent, fileName: storyFileName };
};
