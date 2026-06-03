/**
 * i18n.js - Hệ thống chuyển đổi ngôn ngữ Tiếng Việt / English
 * Lưu lựa chọn vào localStorage với key: 'i18nLang'
 */
(function () {
    const TRANSLATIONS = {
        vi: {
            /* ── Language toggle ─────────────────────────────── */
            'lang.switch': 'VI',
            'lang.current': 'VI',

            /* ── Home / Landing page ─────────────────────────── */
            'home.nav.features': 'Tính năng',
            'home.nav.workflow': 'Quy trình',
            'home.nav.tools': 'Công cụ',
            'home.nav.reviews': 'Đánh giá',
            'home.nav.login': 'Đăng nhập',
            'home.nav.start': 'Bắt đầu miễn phí',

            /* ── Auth page ───────────────────────────────────── */
            'auth.branding.desc': 'Công cụ viết kịch bản phim thông minh với sự hỗ trợ của trí tuệ nhân tạo',
            'auth.branding.f1': 'Tạo Logline tự động',
            'auth.branding.f2': 'Phát triển nhân vật chi tiết',
            'auth.branding.f3': 'Cấu trúc kịch bản chuyên nghiệp',
            'auth.branding.f4': 'Xuất kịch bản hoàn chỉnh',
            'auth.login.title': 'Chào mừng trở lại!',
            'auth.login.subtitle': 'Đăng nhập để tiếp tục hành trình sáng tạo của bạn',
            'auth.login.email-label': 'Email',
            'auth.login.pass-label': 'Mật khẩu',
            'auth.login.remember': 'Ghi nhớ đăng nhập',
            'auth.login.forgot': 'Quên mật khẩu?',
            'auth.login.submit': 'Đăng nhập',
            'auth.login.or': 'hoặc',
            'auth.login.no-account': 'Chưa có tài khoản?',
            'auth.login.register-link': 'Đăng ký ngay',
            'auth.register.title': 'Tạo tài khoản mới',
            'auth.register.subtitle': 'Bắt đầu hành trình viết kịch bản của bạn',
            'auth.register.fullname-label': 'Họ và tên',
            'auth.register.username-label': 'Tên đăng nhập',
            'auth.register.email-label': 'Email',
            'auth.register.pass-label': 'Mật khẩu',
            'auth.register.confirm-label': 'Xác nhận mật khẩu',
            'auth.register.submit': 'Đăng ký',
            'auth.register.has-account': 'Đã có tài khoản?',
            'auth.register.login-link': 'Đăng nhập',

            /* ── Input placeholders ──────────────────────────── */
            'ph.email': 'Nhập email của bạn',
            'ph.password': 'Nhập mật khẩu',
            'ph.fullname': 'Nhập họ và tên',
            'ph.username': 'Chọn tên đăng nhập',
            'ph.new-password': 'Tạo mật khẩu (ít nhất 6 ký tự)',
            'ph.confirm-password': 'Nhập lại mật khẩu',
            'ph.search-projects': 'Tìm kiếm kịch bản...',

            /* ── Dashboard / Projects navbar ─────────────────── */
            'dash.nav.upgrade': 'Nâng cấp PRO',
            'dash.nav.admin': 'Trang quản trị',
            'dash.nav.profile': 'Hồ sơ cá nhân',
            'dash.nav.logout': 'Đăng xuất',

            /* ── Dashboard welcome ───────────────────────────── */
            'dash.welcome.prefix': 'Chào mừng trở lại,',
            'dash.welcome.sub': 'Bắt đầu viết kịch bản phim của bạn với sự hỗ trợ của AI',
            'dash.btn.new': 'Tạo kịch bản mới',

            /* ── Dashboard stats ─────────────────────────────── */
            'dash.stat.total': 'Tổng kịch bản',
            'dash.stat.completed': 'Hoàn thành',
            'dash.stat.in-progress': 'Đang thực hiện',
            'dash.stat.generated': 'Nội dung đã tạo',

            /* ── Dashboard tools section ─────────────────────── */
            'dash.tools.heading': 'Công cụ viết kịch bản',
            'dash.tools.sub': 'Chọn công cụ để bắt đầu hoặc tiếp tục kịch bản của bạn',
            'dash.tool1.title': 'Khởi tạo Kịch bản',
            'dash.tool1.desc': 'Nhập ý tưởng phim hoặc tải truyện lên để bắt đầu xây dựng kịch bản',
            'dash.tool2.title': 'Xác định Chủ đề',
            'dash.tool2.desc': 'Tìm ra thông điệp sâu sắc và ý nghĩa của câu chuyện',
            'dash.tool3.title': 'Mô tả Nhân vật',
            'dash.tool3.desc': 'Xây dựng hồ sơ chi tiết cho từng nhân vật trong phim',
            'dash.tool4.title': 'Viết Synopsis',
            'dash.tool4.desc': 'Tóm tắt toàn bộ câu chuyện từ đầu đến cuối',
            'dash.tool5.title': 'Cấu trúc 4 Hồi',
            'dash.tool5.desc': 'Phân chia câu chuyện theo Story Circle của Dan Harmon',
            'dash.tool6.title': 'Tạo Beat Sheet',
            'dash.tool6.desc': 'Liệt kê các beat quan trọng theo mô hình Save the Cat',
            'dash.tool7.title': 'Danh sách Cảnh',
            'dash.tool7.desc': 'Chia kịch bản thành 30-40 cảnh rõ ràng',
            'dash.tool8.title': 'Viết Kịch bản',
            'dash.tool8.desc': 'Viết kịch bản chi tiết theo format Hollywood chuẩn',

            /* ── Dashboard recent projects ───────────────────── */
            'dash.recent.heading': 'Kịch bản gần đây',
            'dash.recent.view-all': 'Xem tất cả',
            'dash.empty.title': 'Chưa có kịch bản nào',
            'dash.empty.sub': 'Bắt đầu tạo kịch bản đầu tiên của bạn!',
            'dash.empty.btn': 'Tạo kịch bản mới',
            'dash.tips.title': '💡 Mẹo viết kịch bản',
            'dash.tips.text': 'Bắt đầu với một Logline mạnh mẽ - đó là nền tảng cho toàn bộ kịch bản của bạn. Một Logline tốt sẽ giúp bạn giữ focus trong suốt quá trình viết.',
            'dash.footer': '© 2026 AI Screenplay. Công cụ viết kịch bản phim với AI.',

            /* ── Upgrade modal ───────────────────────────────── */
            'modal.upgrade.title': 'Nâng cấp PRO',
            'modal.pkg.1m.title': 'Gói 1 tháng',
            'modal.pkg.3m.title': 'Gói 3 tháng',
            'modal.pkg.1y.title': 'Gói 1 năm',
            'modal.pkg.popular': 'Phổ biến',
            'modal.pkg.select': 'Chọn gói này',
            'modal.pkg.1m.note': 'Phù hợp để trải nghiệm PRO nhanh',
            'modal.pkg.3m.note': 'Tiết kiệm hơn khi dùng lâu hơn',
            'modal.pkg.1y.note': 'Dùng dài hạn, không lo giới hạn',
            'modal.pay.title': 'Chọn phương thức',
            'modal.pay.selected': 'Đã chọn:',
            'modal.pay.gateway': 'Chọn cổng thanh toán:',
            'modal.pay.back': 'Quay lại chọn gói',

            /* ── Profile modal ───────────────────────────────── */
            'modal.profile.title': 'Hồ sơ cá nhân',
            'modal.tab.profile': 'Thông tin cá nhân',
            'modal.tab.password': 'Đổi mật khẩu',
            'modal.tab.history': 'Lịch sử thanh toán',
            'modal.profile.avatar-btn': 'Thay ảnh đại diện',
            'modal.profile.fullname': 'Họ và tên',
            'modal.profile.username': 'Tên đăng nhập',
            'modal.profile.gender': 'Giới tính',
            'modal.profile.dob': 'Ngày sinh',
            'modal.profile.phone': 'Số điện thoại',
            'modal.profile.email': 'Email',
            'modal.profile.cancel': 'Hủy',
            'modal.profile.save': 'Lưu thay đổi',
            'modal.pwd.current': 'Mật khẩu hiện tại',
            'modal.pwd.new': 'Mật khẩu mới',
            'modal.pwd.confirm': 'Xác nhận mật khẩu mới',
            'modal.pwd.submit': 'Đổi mật khẩu',

            /* ── Projects page ───────────────────────────────── */
            'proj.breadcrumb.home': 'Trang chủ',
            'proj.breadcrumb.all': 'Tất cả kịch bản',
            'proj.hero.title': 'Tất cả Kịch bản',
            'proj.hero.sub': 'Xem và quản lý toàn bộ dự án kịch bản của bạn',
            'proj.btn.back': 'Về Dashboard',
            'proj.btn.new': 'Tạo kịch bản mới',
            'proj.filter.all': 'Tất cả',
            'proj.filter.in-progress': 'Đang thực hiện',
            'proj.filter.completed': 'Hoàn thành',
            'proj.filter.draft': 'Bản nháp',

            /* ── Sidebar (index.html) ────────────────────────── */
            'side.home': 'Trang chủ',
            'side.tools-section': 'Công cụ viết kịch bản',
            'side.history-section': 'Lịch sử kịch bản',
            'side.no-projects': 'Chưa có kịch bản nào',
            'side.new-project': 'Tạo kịch bản mới',
            'side.open-title': 'Mở thanh công cụ',
            'side.close-title': 'Đóng thanh công cụ',
            'side.logout': 'Đăng xuất',
            'side.tool1': '1. Tạo Logline',
            'side.tool2': '2. Xác định Chủ đề',
            'side.tool3': '3. Mô tả Nhân vật',
            'side.tool4': '4. Viết Tóm tắt',
            'side.tool5': '5. Cấu trúc 4 Hồi',
            'side.tool6': '6. Tạo Beat Sheet',
            'side.tool7': '7. Danh sách Cảnh',
            'side.tool8': '8. Viết Kịch bản',

            /* ── Result panel (index.html) ───────────────────── */
            'result.heading': 'Kết quả của bạn',
            'result.save': 'Lưu',
            'result.placeholder': 'Kết quả sẽ hiển thị ở đây sau khi bạn tạo nội dung...',
            'result.footer': 'AI có thể mắc lỗi. Vui lòng xem xét trước khi sử dụng.',

            /* ── Dashboard modals (additional) ──────────────── */
            'modal.pay.support': 'Hỗ trợ thanh toán:',
            'modal.pay.secure': 'Thanh toán an toàn qua SePay.vn (chuyển khoản) hoặc VNPAY (thẻ / QR) — xác nhận tự động',
            'modal.profile.avatar-hint': 'JPG, PNG, GIF, WEBP. Tối đa 2MB',
            'opt.gender.choose': '-- Chọn giới tính --',
            'opt.gender.male': 'Nam',
            'opt.gender.female': 'Nữ',
            'opt.gender.other': 'Khác',
            'ph.profile-fullname': 'Nhập họ và tên',
            'ph.profile-username': 'Nhập tên đăng nhập',
            'ph.profile-phone': 'Nhập số điện thoại',
            'ph.pwd-current': 'Nhập mật khẩu hiện tại',
            'ph.pwd-new': 'Nhập mật khẩu mới (ít nhất 6 ký tự)',
            'ph.pwd-confirm': 'Nhập lại mật khẩu mới',
            'modal.hist.loading': 'Đang tải lịch sử thanh toán...',
            'pay.loading.title': 'Đang tạo đơn thanh toán...',
            'pay.loading.sub': 'Vui lòng chờ trong giây lát. Bạn sẽ được chuyển đến trang thanh toán.',

            /* ── Index.html overlays ─────────────────────────── */
            'loading.text': 'Đang tạo nội dung...',
            'regen.title': 'Tạo lại từ đầu?',
            'regen.body1': 'Dự án này đã có dữ liệu từ các bước trước.',
            'regen.body2': 'Việc tạo lại sẽ xóa toàn bộ dữ liệu của tất cả các bước sau',
            'regen.body3': '(chủ đề, nhân vật, synopsis, cấu trúc, beat sheet, danh sách cảnh, kịch bản).',
            'regen.cancel': 'Huỷ',
            'regen.confirm': 'Xác nhận xóa & Tạo lại',
            'scene-auto.title': 'Tự động tạo tất cả cảnh',
            'scene-auto.cancel': 'Huỷ',
            'rename.title': 'Đổi tên dự án',
            'ph.rename': 'Nhập tên mới...',
            'rename.cancel': 'Huỷ',
            'rename.save': 'Lưu',
            'delete.cancel': 'Huỷ',
            'delete.confirm': 'Xóa vĩnh viễn',
            'delete.title': 'Xóa dự án?',
            'delete.message': 'Bạn có chắc muốn xóa dự án này? Dữ liệu sẽ bị xóa vĩnh viễn khỏi database.',

            /* ── App dynamic strings (app.js) ─────────────────── */
            'app.btn.create': 'Tạo Nội dung',
            'app.btn.analyze': 'Phân tích',
            'app.btn.regen': 'Tạo lại',
            'app.btn.regen-pro': 'Tạo lại (PRO)',
            'app.btn.auto-scenes': 'Tự động tạo tất cả cảnh',
            'app.optional': '(tùy chọn)',
            'app.see-more': 'xem thêm',
            'app.see-less': 'rút gọn',
            'app.story-label': 'Truyện:',
            'app.story-paste': 'Nội dung đã dán',
            'app.change-story': 'Đổi truyện',
            'app.help': 'Trợ giúup',
            'app.auto.doing': 'Đang tự động tạo:',
            'app.auto.step': 'Bước',
            'app.auto.done': 'Hoàn tất tự động tạo kịch bản!',
            'app.placeholder': 'Kết quả sẽ hiển thị ở đây sau khi bạn tạo nội dung...',
            'app.scene.doing': 'Đang tạo',
            'app.scene.done-item': '✓',
            'app.limit.scenes': 'Ví dụ: 30 (tối đa 40 cảnh)',
            'app.limit.scenes-free': 'Ví dụ: 5 (tối đa 10 cảnh - Gói Free)',

            /* ── Tool titles & descriptions ────────────────────── */
            'tool.logline.title': '1. Khởi tạo Kịch bản',
            'tool.logline.desc': 'Công cụ này giúp bạn bắt đầu xây dựng kịch bản bằng cách nhập một ý tưởng (Logline) hoặc tải lên một câu chuyện có sẵn.',
            'tool.logline.f1.label': 'Ý tưởng phìm của bạn là gì?',
            'tool.logline.f1.ph': 'Ví dụ: Một thám tử săn lùng kẻ giết người hàng loạt trong một thành phố tương lai.',
            'tool.theme.title': '2. Xác định Chủ đề',
            'tool.theme.desc': 'Công cụ này giúp bạn xác định thông điệp sâu sắc hơn của bộ phìm dựa trên Logline hoặc ý tưởng câu chuyện.',
            'tool.theme.f1.label': 'Nhập Logline hoặc ý tưởng phìm',
            'tool.theme.f1.ph': 'Ví dụ: Một thám tử săn lùng kẻ giết người hàng loạt trong một thành phố tương lai.',
            'tool.char.title': '3. Mô tả Nhân vật',
            'tool.char.desc': 'Công cụ này tạo hồ sơ chi tiết về tính cách, ngoại hình, động lực và vai trò của từng nhân vật.',
            'tool.char.f1.label': 'Nhập Logline hoặc ý tưởng phìm',
            'tool.char.f1.ph': 'Ví dụ: Một thám tử săn lùng kẻ giết người hàng loạt trong một thành phố tương lai.',
            'tool.char.f2.label': 'Nhập chủ đề chính của phìm',
            'tool.char.f2.ph': 'Vui lòng nhập chủ đề của bộ phìm.',
            'tool.char.f3.label': 'Bạn cần bao nhiêu nhân vật chính?',
            'tool.char.f3.ph': 'Ví dụ: 1, 3, 5',
            'tool.synopsis.title': '4. Viết Tóm tắt (Synopsis)',
            'tool.synopsis.desc': 'Công cụ này giúp bạn biến ý tưởng phìm, chủ đề và nhân vật thành một bản tóm tắt chi tiết toàn bộ câu chuyện từ đầu đến cuối.',
            'tool.synopsis.f1.label': 'Nhập Logline hoặc ý tưởng phìm',
            'tool.synopsis.f1.ph': 'Ví dụ: Một thám tử săn lùng kẻ giết người hàng loạt trong một thành phố tương lai.',
            'tool.synopsis.f2.label': 'Nhập chủ đề chính của phìm',
            'tool.synopsis.f2.ph': 'Vui lòng nhập chủ đề của bộ phìm.',
            'tool.synopsis.f3.label': 'Nhập mô tả các nhân vật',
            'tool.synopsis.f3.ph': 'Vui lòng mô tả các nhân vật trong phìm.',
            'tool.struct.title': '5. Phân tích theo từng hồi',
            'tool.struct.desc': 'Công cụ này giúp nhà biên kịch phân chia câu chuyện thành 4 hồi rõ ràng theo Story Circle của Dan Harmon.',
            'tool.struct.f1.label': 'Nhập chủ đề chính của phìm',
            'tool.struct.f1.ph': 'Vui lòng nhập chủ đề của bộ phìm.',
            'tool.struct.f2.label': 'Nhập mô tả các nhân vật',
            'tool.struct.f2.ph': 'Vui lòng mô tả các nhân vật trong phìm.',
            'tool.struct.f3.label': 'Nhập tóm tắt phìm (Synopsis)',
            'tool.struct.f3.ph': 'Vui lòng nhập bản tóm tắt phìm với các sự kiện chính.',
            'tool.beat.title': '6. Tạo Beat Sheet',
            'tool.beat.desc': 'Công cụ này sắp xếp cốt truyện thành các beat rõ ràng theo mô hình Save the Cat.',
            'tool.beat.f1.label': 'Nhập tóm tắt phìm hoặc Logline',
            'tool.beat.f1.ph': 'Vui lòng nhập bản tóm tắt phìm với các sự kiện chính.',
            'tool.beat.f2.label': 'Nhập dữ liệu phân tích theo từng hồi của phìm',
            'tool.beat.f2.ph': 'Cung cấp các sự kiện chính và điểm ngoặt trong mỗi hồi.',
            'tool.beat.f3.label': 'Nhập mô tả các nhân vật',
            'tool.beat.f3.ph': 'Vui lòng mô tả các nhân vật trong phìm.',
            'tool.scene.title': '7. Danh sách Cảnh',
            'tool.scene.desc': 'Công cụ này giúp nhà biên kịch chia kịch bản thành số cảnh mong muốn.',
            'tool.scene.f1.label': 'Nhập tóm tắt phìm (Synopsis)',
            'tool.scene.f1.ph': 'Vui lòng nhập bản tóm tắt phìm với các sự kiện chính.',
            'tool.scene.f2.label': 'Nhập mô tả các nhân vật',
            'tool.scene.f2.ph': 'Vui lòng mô tả các nhân vật trong phìm.',
            'tool.scene.f3.label': 'Nhập dữ liệu phân tích theo từng hồi của phìm',
            'tool.scene.f3.ph': 'Cung cấp các sự kiện chính và điểm ngoặt trong mỗi hồi.',
            'tool.scene.f4.label': 'Nhập Beat Sheet của phìm',
            'tool.scene.f4.ph': 'Vui lòng nhập beat sheet của phìm.',
            'tool.scene.f5.label': 'Tổng số cảnh muốn tạo là bao nhiêu?',
            'tool.scene.f5.ph': 'Ví dụ: 40 (khuyến nghị 30-60 cảnh)',
            'tool.script.title': '8. Viết Kịch bản',
            'tool.script.desc': 'Công cụ này giúp bạn viết kịch bản chi tiết cho một cảnh phìm cụ thể theo chuẩn format Hollywood.',
            'tool.script.f1.label': 'Nhập tóm tắt phìm (Synopsis)',
            'tool.script.f1.ph': 'Vui lòng nhập bản tóm tắt phìm.',
            'tool.script.f2.label': 'Nhập mô tả các nhân vật',
            'tool.script.f2.ph': 'Vui lòng mô tả các nhân vật trong phìm.',
            'tool.script.f3.label': 'Nhập dữ liệu phân tích theo từng hồi của phìm',
            'tool.script.f3.ph': 'Cung cấp các sự kiện chính và điểm ngoặt trong mỗi hồi.',
            'tool.script.f4.label': 'Nhập Beat Sheet của phìm',
            'tool.script.f4.ph': 'Vui lòng nhập beat sheet của phìm.',
            'tool.script.f5.label': 'Nhập danh sách tất cả các cảnh',
            'tool.script.f5.ph': 'Cung cấp danh sách các cảnh của phìm.',
            'tool.script.f6.label': 'Bạn muốn viết kịch bản cho cảnh nào?',
            'tool.script.f6.ph': 'Nhập số cảnh, ví dụ: Cảnh 3',

            /* ── Projects page (á bảng chưa dịch) ──────────────── */
            'proj.stat.total': 'Tổng kịch bản',
            'proj.stat.completed': 'Hoàn thành',
            'proj.stat.in-progress': 'Đang thực hiện',
            'proj.stat.generated': 'Nội dung đã tạo',
            'proj.sort.updated-desc': 'Mới cập nhật nhất',
            'proj.sort.updated-asc': 'Cũ nhất',
            'proj.sort.title-asc': 'Tên A → Z',
            'proj.sort.title-desc': 'Tên Z → A',
            'proj.sort.progress-desc': 'Tiến độ cao nhất',
            'proj.sort.progress-asc': 'Tiến độ thấp nhất',
            'proj.count.loading': 'Đang tải...',
            'proj.footer': '© 2026 AI Screenplay. Công cụ viết kịch bản phìm với AI.',
            'proj.del.title': 'Xoá kịch bản?',
            'proj.del.body': 'Hành động này không thể hoàn tác. Toàn bộ nội dung và tiến độ của kịch bản sẽ bị xoá vĩnh viễn.',
            'proj.del.cancel': 'Huỷ',
            'proj.del.confirm': 'Xoá',
            'proj.upg.title': 'Nâng cấp PRO',
            'proj.upg.now': 'Nâng cấp ngay',

            /* ── Init project form (tool 0/1) ─────────────────── */
            'init.title': 'Khởi tạo Kịch bản',
            'init.desc': 'Bắt đầu bằng cách nhập ý tưởng phim của bạn hoặc tải lên một câu chuyện có sẵn.',
            'init.tab.idea': 'Nhập ý tưởng',
            'init.tab.story': 'Tải truyện lên',
            'init.idea.label': 'Ý tưởng phim của bạn là gì?',
            'init.idea.ph': 'Ví dụ: Một thám tử săn lùng kẻ giết người hàng loạt trong một thành phố tương lai.',
            'init.upload.drag': 'Kéo thả file vào đây hoặc',
            'init.upload.pick': 'Chọn file',
            'init.upload.hint': 'Hỗ trợ: .txt, .pdf, .docx',
            'init.upload.or': 'hoặc dán nội dung truyện',
            'init.upload.ph': 'Dán nội dung truyện vào đây...',
            'init.upload.done': 'Đã tải truyện thành công.',
            'init.upload.update': 'Cập nhật & Bắt đầu phân tích',
            'init.upload.start': 'Bắt đầu phân tích',
            'init.constraint.idea': 'Dự án này đang sử dụng chế độ "Nhập ý tưởng".<br><br>Vui lòng tạo kịch bản mới để sử dụng chế độ "Tải truyện lên"!',
            'init.constraint.story': 'Dự án này đang sử dụng chế độ "Tải truyện lên".<br><br>Vui lòng tạo kịch bản mới để sử dụng chế độ "Nhập ý tưởng"!',

            /* ── Project history detail ──────────────────────────── */
            'hist.created': 'Tạo ngày:',
            'hist.rename': 'Đổi tên',
            'hist.del': 'Xóa',
            'hist.view': 'Xem',
            'hist.section.tools': 'Công cụ viết kịch bản',
            'hist.section.story': 'Phân tích truyện',
            'hist.empty': 'Chưa có bước nào được tạo',
            'hist.empty.hint': 'Bắt đầu bằng cách tạo Logline',
            'hist.step.del.title': 'Xóa bước này?',
            'hist.step.del.body': 'Bạn có chắc muốn xóa bước này? Nội dung sẽ bị xóa khỏi dự án và không thể phục hồi.',
            'hist.restored': 'Đã khôi phục dữ liệu từ',

            /* ── Project sidebar item ─────────────────────────────── */
            'proj.item.updated': 'Cập nhật:',
            'proj.item.steps': 'bước',
            'proj.item.options': 'Tùy chọn',
            'proj.menu.view': 'Xem',
            'proj.menu.rename': 'Đổi tên',
            'proj.menu.del': 'Xóa',

            /* ── Tool map names ──────────────────────────────────── */
            'tool.map.upload': '0. Tải truyện lên',
            'tool.map.structure': '5. Cấu trúc 4 Hồi',
            'tool.map.story-theme': '1. Phân tích Chủ đề',
            'tool.map.story-char': '2. Phân tích Nhân vật',
            'tool.map.story-synopsis': '3. Viết Synopsis',
            'tool.map.story-struct': '4. Phân tích theo từng hồi',
            'tool.map.story-beat': '5. Tạo Beat Sheet',
            'tool.map.story-scene': '6. Danh sách Cảnh',
            'tool.map.story-script': '7. Viết Kịch bản',

            /* ── Admin page ──────────────────────────────────── */
            'admin.topbar.title': 'Admin Control',
            'admin.topbar.back': 'Dashboard',
            'admin.topbar.logout': 'Đăng xuất',
            'admin.tab.overview': 'Tổng quan',
            'admin.tab.users': 'Người dùng',
            'admin.tab.payments': 'Giao dịch',
            'admin.tab.ai': 'Cấu hình AI',
            'admin.tab.pay-config': 'Cổng thanh toán',
            'admin.tab.pricing': 'Giá gói PRO',
            'admin.tab.landing': 'Landing Page',
            'admin.tab.token': 'Token & Credits',
            'admin.nav.lang': 'Ngôn ngữ',
        },

        /* ════════════════════════════════════════════════════════ */
        en: {
            /* ── Language toggle ─────────────────────────────── */
            'lang.switch': 'EN',
            'lang.current': 'EN',

            /* ── Home / Landing page ─────────────────────────── */
            'home.nav.features': 'Features',
            'home.nav.workflow': 'Workflow',
            'home.nav.tools': 'Tools',
            'home.nav.reviews': 'Reviews',
            'home.nav.login': 'Login',
            'home.nav.start': 'Get Started Free',

            /* ── Auth page ───────────────────────────────────── */
            'auth.branding.desc': 'Smart screenplay writing tool powered by artificial intelligence',
            'auth.branding.f1': 'Auto-generate Logline',
            'auth.branding.f2': 'Detailed character development',
            'auth.branding.f3': 'Professional screenplay structure',
            'auth.branding.f4': 'Export complete screenplay',
            'auth.login.title': 'Welcome back!',
            'auth.login.subtitle': 'Login to continue your creative journey',
            'auth.login.email-label': 'Email',
            'auth.login.pass-label': 'Password',
            'auth.login.remember': 'Remember me',
            'auth.login.forgot': 'Forgot password?',
            'auth.login.submit': 'Login',
            'auth.login.or': 'or',
            'auth.login.no-account': "Don't have an account?",
            'auth.login.register-link': 'Register now',
            'auth.register.title': 'Create new account',
            'auth.register.subtitle': 'Start your screenplay writing journey',
            'auth.register.fullname-label': 'Full name',
            'auth.register.username-label': 'Username',
            'auth.register.email-label': 'Email',
            'auth.register.pass-label': 'Password',
            'auth.register.confirm-label': 'Confirm password',
            'auth.register.submit': 'Register',
            'auth.register.has-account': 'Already have an account?',
            'auth.register.login-link': 'Login',

            /* ── Input placeholders ──────────────────────────── */
            'ph.email': 'Enter your email',
            'ph.password': 'Enter your password',
            'ph.fullname': 'Enter your full name',
            'ph.username': 'Choose a username',
            'ph.new-password': 'Create password (at least 6 characters)',
            'ph.confirm-password': 'Re-enter your password',
            'ph.search-projects': 'Search screenplays...',

            /* ── Dashboard / Projects navbar ─────────────────── */
            'dash.nav.upgrade': 'Upgrade PRO',
            'dash.nav.admin': 'Admin Panel',
            'dash.nav.profile': 'Profile',
            'dash.nav.logout': 'Logout',

            /* ── Dashboard welcome ───────────────────────────── */
            'dash.welcome.prefix': 'Welcome back,',
            'dash.welcome.sub': 'Start writing your screenplay with AI assistance',
            'dash.btn.new': 'Create New Script',

            /* ── Dashboard stats ─────────────────────────────── */
            'dash.stat.total': 'Total Scripts',
            'dash.stat.completed': 'Completed',
            'dash.stat.in-progress': 'In Progress',
            'dash.stat.generated': 'Content Generated',

            /* ── Dashboard tools section ─────────────────────── */
            'dash.tools.heading': 'Screenplay Tools',
            'dash.tools.sub': 'Select a tool to start or continue your screenplay',
            'dash.tool1.title': 'Start Screenplay',
            'dash.tool1.desc': 'Enter your film idea or upload a story to start building your screenplay',
            'dash.tool2.title': 'Define Theme',
            'dash.tool2.desc': 'Discover the deep message and meaning of your story',
            'dash.tool3.title': 'Character Description',
            'dash.tool3.desc': 'Build detailed profiles for each character in your film',
            'dash.tool4.title': 'Write Synopsis',
            'dash.tool4.desc': 'Summarize the entire story from beginning to end',
            'dash.tool5.title': '4-Act Structure',
            'dash.tool5.desc': "Divide the story following Dan Harmon's Story Circle",
            'dash.tool6.title': 'Create Beat Sheet',
            'dash.tool6.desc': 'List key beats following the Save the Cat model',
            'dash.tool7.title': 'Scene List',
            'dash.tool7.desc': 'Divide the screenplay into 30-40 clear scenes',
            'dash.tool8.title': 'Write Screenplay',
            'dash.tool8.desc': 'Write detailed screenplay in standard Hollywood format',

            /* ── Dashboard recent projects ───────────────────── */
            'dash.recent.heading': 'Recent Screenplays',
            'dash.recent.view-all': 'View all',
            'dash.empty.title': 'No screenplays yet',
            'dash.empty.sub': 'Start creating your first screenplay!',
            'dash.empty.btn': 'Create New Script',
            'dash.tips.title': '💡 Screenwriting Tips',
            'dash.tips.text': 'Start with a strong Logline — it is the foundation of your entire screenplay. A good Logline will keep you focused throughout the writing process.',
            'dash.footer': '© 2026 AI Screenplay. AI-powered screenplay writing tool.',

            /* ── Upgrade modal ───────────────────────────────── */
            'modal.upgrade.title': 'Upgrade PRO',
            'modal.pkg.1m.title': '1-Month Plan',
            'modal.pkg.3m.title': '3-Month Plan',
            'modal.pkg.1y.title': '1-Year Plan',
            'modal.pkg.popular': 'Popular',
            'modal.pkg.select': 'Select this plan',
            'modal.pkg.1m.note': 'Great for a quick PRO experience',
            'modal.pkg.3m.note': 'More savings for longer use',
            'modal.pkg.1y.note': 'Long-term use without limits',
            'modal.pay.title': 'Select Payment Method',
            'modal.pay.selected': 'Selected:',
            'modal.pay.gateway': 'Choose payment gateway:',
            'modal.pay.back': 'Back to plans',

            /* ── Profile modal ───────────────────────────────── */
            'modal.profile.title': 'Profile',
            'modal.tab.profile': 'Personal Info',
            'modal.tab.password': 'Change Password',
            'modal.tab.history': 'Payment History',
            'modal.profile.avatar-btn': 'Change Avatar',
            'modal.profile.fullname': 'Full name',
            'modal.profile.username': 'Username',
            'modal.profile.gender': 'Gender',
            'modal.profile.dob': 'Date of birth',
            'modal.profile.phone': 'Phone number',
            'modal.profile.email': 'Email',
            'modal.profile.cancel': 'Cancel',
            'modal.profile.save': 'Save Changes',
            'modal.pwd.current': 'Current password',
            'modal.pwd.new': 'New password',
            'modal.pwd.confirm': 'Confirm new password',
            'modal.pwd.submit': 'Change Password',

            /* ── Projects page ───────────────────────────────── */
            'proj.breadcrumb.home': 'Home',
            'proj.breadcrumb.all': 'All Screenplays',
            'proj.hero.title': 'All Screenplays',
            'proj.hero.sub': 'View and manage all your screenplay projects',
            'proj.btn.back': 'Back to Dashboard',
            'proj.btn.new': 'Create New Script',
            'proj.filter.all': 'All',
            'proj.filter.in-progress': 'In Progress',
            'proj.filter.completed': 'Completed',
            'proj.filter.draft': 'Draft',

            /* ── Sidebar (index.html) ────────────────────────── */
            'side.home': 'Home',
            'side.tools-section': 'Screenplay Tools',
            'side.history-section': 'Script History',
            'side.no-projects': 'No screenplays yet',
            'side.new-project': 'Create New Script',
            'side.open-title': 'Open toolbar',
            'side.close-title': 'Close toolbar',
            'side.logout': 'Logout',
            'side.tool1': '1. Create Logline',
            'side.tool2': '2. Define Theme',
            'side.tool3': '3. Character Description',
            'side.tool4': '4. Write Synopsis',
            'side.tool5': '5. 4-Act Structure',
            'side.tool6': '6. Create Beat Sheet',
            'side.tool7': '7. Scene List',
            'side.tool8': '8. Write Screenplay',

            /* ── Result panel (index.html) ───────────────────── */
            'result.heading': 'Your Result',
            'result.save': 'Save',
            'result.placeholder': 'Results will appear here after you generate content...',
            'result.footer': 'AI may make mistakes. Please review before use.',

            /* ── Dashboard modals (additional) ──────────────── */
            'modal.pay.support': 'Payment support:',
            'modal.pay.secure': 'Secure payment via SePay.vn (bank transfer) or VNPAY (card / QR) — automatic confirmation',
            'modal.profile.avatar-hint': 'JPG, PNG, GIF, WEBP. Max 2MB',
            'opt.gender.choose': '-- Select gender --',
            'opt.gender.male': 'Male',
            'opt.gender.female': 'Female',
            'opt.gender.other': 'Other',
            'ph.profile-fullname': 'Enter your full name',
            'ph.profile-username': 'Enter your username',
            'ph.profile-phone': 'Enter your phone number',
            'ph.pwd-current': 'Enter current password',
            'ph.pwd-new': 'Enter new password (at least 6 characters)',
            'ph.pwd-confirm': 'Re-enter new password',
            'modal.hist.loading': 'Loading payment history...',
            'pay.loading.title': 'Creating payment order...',
            'pay.loading.sub': 'Please wait a moment. You will be redirected to the payment page.',

            /* ── Index.html overlays ─────────────────────────── */
            'loading.text': 'Generating content...',
            'regen.title': 'Regenerate from scratch?',
            'regen.body1': 'This project already has data from previous steps.',
            'regen.body2': 'Regenerating will delete all data from the following steps',
            'regen.body3': '(theme, characters, synopsis, structure, beat sheet, scene list, screenplay).',
            'regen.cancel': 'Cancel',
            'regen.confirm': 'Confirm Delete & Regenerate',
            'scene-auto.title': 'Auto-generate all scenes',
            'scene-auto.cancel': 'Cancel',
            'rename.title': 'Rename Project',
            'ph.rename': 'Enter new name...',
            'rename.cancel': 'Cancel',
            'rename.save': 'Save',
            'delete.cancel': 'Cancel',
            'delete.confirm': 'Delete Permanently',
            'delete.title': 'Delete project?',
            'delete.message': 'Are you sure you want to delete this project? Data will be permanently deleted from the database.',

            /* ── App dynamic strings ─────────────────────────── */
            'app.btn.create': 'Generate Content',
            'app.btn.analyze': 'Analyze',
            'app.btn.regen': 'Regenerate',
            'app.btn.regen-pro': 'Regenerate (PRO)',
            'app.btn.auto-scenes': 'Auto-generate all scenes',
            'app.optional': '(optional)',
            'app.see-more': 'see more',
            'app.see-less': 'collapse',
            'app.story-label': 'Story:',
            'app.story-paste': 'Pasted content',
            'app.change-story': 'Change story',
            'app.help': 'Help',
            'app.auto.doing': 'Auto-generating:',
            'app.auto.step': 'Step',
            'app.auto.done': 'Auto-generation complete!',
            'app.placeholder': 'Results will appear here after you generate content...',
            'app.scene.doing': 'Generating',
            'app.scene.done-item': '✓',
            'app.limit.scenes': 'Example: 30 (max 40 scenes)',
            'app.limit.scenes-free': 'Example: 5 (max 10 scenes - Free Plan)',

            /* ── Tool titles & descriptions ──────────────────── */
            'tool.logline.title': '1. Start Screenplay',
            'tool.logline.desc': 'This tool helps you start building your screenplay by entering a film idea (Logline) or uploading an existing story.',
            'tool.logline.f1.label': 'What is your film idea?',
            'tool.logline.f1.ph': 'Example: A detective hunting a serial killer in a futuristic city.',
            'tool.theme.title': '2. Define Theme',
            'tool.theme.desc': 'This tool helps you identify the deeper message of the film based on the Logline or story idea.',
            'tool.theme.f1.label': 'Enter Logline or film idea',
            'tool.theme.f1.ph': 'Example: A detective hunting a serial killer in a futuristic city.',
            'tool.char.title': '3. Character Description',
            'tool.char.desc': 'This tool creates detailed profiles covering personality, appearance, motivation and role of each character.',
            'tool.char.f1.label': 'Enter Logline or film idea',
            'tool.char.f1.ph': 'Example: A detective hunting a serial killer in a futuristic city.',
            'tool.char.f2.label': 'Enter the main theme of the film',
            'tool.char.f2.ph': 'Please enter the theme of the film.',
            'tool.char.f3.label': 'How many main characters do you need?',
            'tool.char.f3.ph': 'Example: 1, 3, 5',
            'tool.synopsis.title': '4. Write Synopsis',
            'tool.synopsis.desc': 'This tool helps you turn your film idea, theme and characters into a detailed summary of the entire story from beginning to end.',
            'tool.synopsis.f1.label': 'Enter Logline or film idea',
            'tool.synopsis.f1.ph': 'Example: A detective hunting a serial killer in a futuristic city.',
            'tool.synopsis.f2.label': 'Enter the main theme of the film',
            'tool.synopsis.f2.ph': 'Please enter the theme of the film.',
            'tool.synopsis.f3.label': 'Enter character descriptions',
            'tool.synopsis.f3.ph': 'Please describe the characters in the film.',
            'tool.struct.title': '5. 4-Act Structure',
            'tool.struct.desc': "This tool helps screenwriters divide the story into 4 clear acts following Dan Harmon's Story Circle.",
            'tool.struct.f1.label': 'Enter the main theme of the film',
            'tool.struct.f1.ph': 'Please enter the theme of the film.',
            'tool.struct.f2.label': 'Enter character descriptions',
            'tool.struct.f2.ph': 'Please describe the characters in the film.',
            'tool.struct.f3.label': 'Enter film synopsis',
            'tool.struct.f3.ph': 'Please enter the film synopsis with key events.',
            'tool.beat.title': '6. Create Beat Sheet',
            'tool.beat.desc': 'This tool organizes the story into clear beats following the Save the Cat model.',
            'tool.beat.f1.label': 'Enter film synopsis or Logline',
            'tool.beat.f1.ph': 'Please enter the film synopsis with key events.',
            'tool.beat.f2.label': 'Enter act-by-act analysis data',
            'tool.beat.f2.ph': 'Provide key events and turning points in each act.',
            'tool.beat.f3.label': 'Enter character descriptions',
            'tool.beat.f3.ph': 'Please describe the characters in the film.',
            'tool.scene.title': '7. Scene List',
            'tool.scene.desc': 'This tool helps screenwriters divide the screenplay into the desired number of scenes.',
            'tool.scene.f1.label': 'Enter film synopsis',
            'tool.scene.f1.ph': 'Please enter the film synopsis with key events.',
            'tool.scene.f2.label': 'Enter character descriptions',
            'tool.scene.f2.ph': 'Please describe the characters in the film.',
            'tool.scene.f3.label': 'Enter act-by-act analysis data',
            'tool.scene.f3.ph': 'Provide key events and turning points in each act.',
            'tool.scene.f4.label': 'Enter the film Beat Sheet',
            'tool.scene.f4.ph': 'Please enter the beat sheet of the film.',
            'tool.scene.f5.label': 'How many total scenes do you want to create?',
            'tool.scene.f5.ph': 'Example: 40 (recommended 30-60 scenes)',
            'tool.script.title': '8. Write Screenplay',
            'tool.script.desc': 'This tool helps you write a detailed screenplay for a specific scene in standard Hollywood format.',
            'tool.script.f1.label': 'Enter film synopsis',
            'tool.script.f1.ph': 'Please enter the film synopsis.',
            'tool.script.f2.label': 'Enter character descriptions',
            'tool.script.f2.ph': 'Please describe the characters in the film.',
            'tool.script.f3.label': 'Enter act-by-act analysis data',
            'tool.script.f3.ph': 'Provide key events and turning points in each act.',
            'tool.script.f4.label': 'Enter the film Beat Sheet',
            'tool.script.f4.ph': 'Please enter the beat sheet of the film.',
            'tool.script.f5.label': 'Enter the list of all scenes',
            'tool.script.f5.ph': 'Provide the list of scenes in the film.',
            'tool.script.f6.label': 'Which scene do you want to write?',
            'tool.script.f6.ph': 'Enter scene number, e.g.: Scene 3',

            /* ── Projects page (untranslated parts) ─────────── */
            'proj.stat.total': 'Total Scripts',
            'proj.stat.completed': 'Completed',
            'proj.stat.in-progress': 'In Progress',
            'proj.stat.generated': 'Content Generated',
            'proj.sort.updated-desc': 'Latest Updated',
            'proj.sort.updated-asc': 'Oldest',
            'proj.sort.title-asc': 'Name A → Z',
            'proj.sort.title-desc': 'Name Z → A',
            'proj.sort.progress-desc': 'Highest Progress',
            'proj.sort.progress-asc': 'Lowest Progress',
            'proj.count.loading': 'Loading...',
            'proj.footer': '© 2026 AI Screenplay. AI-powered screenplay writing tool.',
            'proj.del.title': 'Delete screenplay?',
            'proj.del.body': 'This action cannot be undone. All content and progress of the screenplay will be permanently deleted.',
            'proj.del.cancel': 'Cancel',
            'proj.del.confirm': 'Delete',
            'proj.upg.title': 'Upgrade PRO',
            'proj.upg.now': 'Upgrade Now',

            /* ── Init project form (tool 0/1) ─────────────────── */
            'init.title': 'Initialize Screenplay',
            'init.desc': 'Start by entering your film idea or uploading an existing story.',
            'init.tab.idea': 'Enter Idea',
            'init.tab.story': 'Upload Story',
            'init.idea.label': 'What is your film idea?',
            'init.idea.ph': 'E.g.: A detective hunts a serial killer across a futuristic city.',
            'init.upload.drag': 'Drag and drop file here or',
            'init.upload.pick': 'Browse File',
            'init.upload.hint': 'Supported: .txt, .pdf, .docx',
            'init.upload.or': 'or paste story content',
            'init.upload.ph': 'Paste story content here...',
            'init.upload.done': 'Story loaded successfully.',
            'init.upload.update': 'Update & Start Analysis',
            'init.upload.start': 'Start Analysis',
            'init.constraint.idea': 'This project uses "Enter Idea" mode.<br><br>Please create a new screenplay to use "Upload Story" mode!',
            'init.constraint.story': 'This project uses "Upload Story" mode.<br><br>Please create a new screenplay to use "Enter Idea" mode!',

            /* ── Project history detail ──────────────────────────── */
            'hist.created': 'Created:',
            'hist.rename': 'Rename',
            'hist.del': 'Delete',
            'hist.view': 'View',
            'hist.section.tools': 'Screenplay Tools',
            'hist.section.story': 'Story Analysis',
            'hist.empty': 'No steps created yet',
            'hist.empty.hint': 'Start by creating a Logline',
            'hist.step.del.title': 'Delete this step?',
            'hist.step.del.body': 'Are you sure? This step will be removed and cannot be recovered.',
            'hist.restored': 'Restored data from',

            /* ── Project sidebar item ─────────────────────────────── */
            'proj.item.updated': 'Updated:',
            'proj.item.steps': 'steps',
            'proj.item.options': 'Options',
            'proj.menu.view': 'View',
            'proj.menu.rename': 'Rename',
            'proj.menu.del': 'Delete',

            /* ── Tool map names ──────────────────────────────────── */
            'tool.map.upload': '0. Upload Story',
            'tool.map.structure': '5. 4-Act Structure',
            'tool.map.story-theme': '1. Theme Analysis',
            'tool.map.story-char': '2. Character Analysis',
            'tool.map.story-synopsis': '3. Write Synopsis',
            'tool.map.story-struct': '4. Act-by-Act Analysis',
            'tool.map.story-beat': '5. Create Beat Sheet',
            'tool.map.story-scene': '6. Scene List',
            'tool.map.story-script': '7. Write Screenplay',

            /* ── Admin page ──────────────────────────────────── */
            'admin.topbar.title': 'Admin Control',
            'admin.topbar.back': 'Dashboard',
            'admin.topbar.logout': 'Logout',
            'admin.tab.overview': 'Overview',
            'admin.tab.users': 'Users',
            'admin.tab.payments': 'Transactions',
            'admin.tab.ai': 'AI Config',
            'admin.tab.pay-config': 'Payment Gateway',
            'admin.tab.pricing': 'PRO Pricing',
            'admin.tab.landing': 'Landing Page',
            'admin.tab.token': 'Token & Credits',
            'admin.nav.lang': 'Language',
        }
    };

    /* ── Utilities ───────────────────────────────────────────── */
    function getLang() {
        return localStorage.getItem('i18nLang') || 'vi';
    }

    function applyTranslations(lang) {
        const t = TRANSLATIONS[lang] || TRANSLATIONS.vi;

        // textContent
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key] !== undefined) el.textContent = t[key];
        });

        // placeholder
        document.querySelectorAll('[data-i18n-ph]').forEach(el => {
            const key = el.getAttribute('data-i18n-ph');
            if (t[key] !== undefined) el.placeholder = t[key];
        });

        // title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (t[key] !== undefined) el.title = t[key];
        });

        // Language toggle buttons — show CURRENT language label
        document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
            btn.innerHTML = '<i class="fas fa-globe"></i> ' + t['lang.switch'];
        });

        // html[lang]
        document.documentElement.lang = lang;
    }

    /* ── Public API ──────────────────────────────────────────── */
    window.toggleLanguage = function () {
        const next = getLang() === 'vi' ? 'en' : 'vi';
        localStorage.setItem('i18nLang', next);
        location.reload();
    };

    window.setLanguage = function (lang) {
        localStorage.setItem('i18nLang', lang);
        location.reload();
    };

    window.getCurrentLang = function () { return getLang(); };

    /* ── t() helper — use in JS files for dynamic text ──────── */
    window.t = function (key) {
        const lang = getLang();
        const dict = TRANSLATIONS[lang] || TRANSLATIONS.vi;
        return dict[key] !== undefined ? dict[key] : (TRANSLATIONS.vi[key] || key);
    };

    window._i18n = { getLang, applyTranslations, TRANSLATIONS };

    /* ── Auto-apply on DOMContentLoaded ─────────────────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyTranslations(getLang()));
    } else {
        applyTranslations(getLang());
    }

    /* ── Inject button styles ────────────────────────────────── */
    const style = document.createElement('style');
    style.textContent = `
        .lang-toggle-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 6px 13px;
            border: 1.5px solid rgba(124,58,237,0.35);
            border-radius: 20px;
            background: rgba(124,58,237,0.07);
            color: #7c3aed;
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            font-family: inherit;
        }
        .lang-toggle-btn:hover {
            background: rgba(124,58,237,0.15);
            border-color: rgba(124,58,237,0.6);
        }
        /* On dark navbars (home page) */
        .dark-nav .lang-toggle-btn,
        nav.navbar.dark .lang-toggle-btn {
            border-color: rgba(255,255,255,0.3);
            background: rgba(255,255,255,0.08);
            color: #fff;
        }
        /* Sidebar variant */
        .lang-toggle-btn.sidebar-lang {
            border-radius: 8px;
            width: 100%;
            justify-content: center;
            padding: 8px 12px;
            margin-top: 6px;
            font-size: 0.85rem;
        }
    `;
    document.head.appendChild(style);
})();
