/**
 * notify.js — Custom notification system (replaces browser alert/confirm)
 * showToast(message, type, duration)   type: 'success' | 'error' | 'warning' | 'info'
 * showConfirm(message)                 returns Promise<boolean>
 */
(function () {
    const CSS = `
    /* ── Toast container ──────────────────────────────────────── */
    #notify-toast-container {
        position: fixed;
        top: 18px;
        right: 18px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
    }
    .notify-toast {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        min-width: 280px;
        max-width: 400px;
        padding: 13px 14px 13px 16px;
        border-radius: 12px;
        box-shadow: 0 6px 28px rgba(0,0,0,0.16);
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        font-size: 0.875rem;
        line-height: 1.45;
        pointer-events: all;
        opacity: 0;
        transform: translateX(30px);
        transition: opacity .25s ease, transform .25s ease;
        background: #fff;
        border-left: 4px solid #888;
        color: #1e293b;
        word-break: break-word;
    }
    .notify-toast.notify-show  { opacity: 1; transform: translateX(0); }
    .notify-toast.notify-hide  { opacity: 0; transform: translateX(30px); }

    .notify-toast.notify-success { border-color: #22c55e; }
    .notify-toast.notify-error   { border-color: #ef4444; }
    .notify-toast.notify-warning { border-color: #f59e0b; }
    .notify-toast.notify-info    { border-color: #6366f1; }

    .notify-icon {
        flex-shrink: 0;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: 700;
        margin-top: 1px;
        color: #fff;
    }
    .notify-success .notify-icon { background: #22c55e; }
    .notify-error   .notify-icon { background: #ef4444; }
    .notify-warning .notify-icon { background: #f59e0b; }
    .notify-info    .notify-icon { background: #6366f1; }

    .notify-msg { flex: 1; }
    .notify-close {
        flex-shrink: 0;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.1rem;
        line-height: 1;
        color: #94a3b8;
        padding: 0 0 0 4px;
        margin-top: -1px;
        transition: color .15s;
    }
    .notify-close:hover { color: #475569; }

    /* ── Confirm modal ────────────────────────────────────────── */
    .notify-confirm-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: notify-fade-in .18s ease;
    }
    @keyframes notify-fade-in { from { opacity: 0; } to { opacity: 1; } }

    .notify-confirm-box {
        background: #fff;
        border-radius: 16px;
        padding: 32px 28px 24px;
        max-width: 380px;
        width: calc(100vw - 40px);
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        animation: notify-slide-up .2s ease;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }
    @keyframes notify-slide-up { from { transform: translateY(18px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .notify-confirm-icon {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: #fef3c7;
        color: #d97706;
        font-size: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
    }
    .notify-confirm-msg {
        font-size: 0.95rem;
        color: #1e293b;
        line-height: 1.55;
        margin-bottom: 24px;
    }
    .notify-confirm-btns {
        display: flex;
        gap: 10px;
        justify-content: center;
    }
    .notify-btn-cancel {
        flex: 1;
        max-width: 130px;
        padding: 9px 0;
        border-radius: 8px;
        border: 1.5px solid #e2e8f0;
        background: #fff;
        color: #475569;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: background .15s, border-color .15s;
        font-family: inherit;
    }
    .notify-btn-cancel:hover { background: #f1f5f9; border-color: #cbd5e1; }
    .notify-btn-ok {
        flex: 1;
        max-width: 130px;
        padding: 9px 0;
        border-radius: 8px;
        border: none;
        background: #7c3aed;
        color: #fff;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: background .15s;
        font-family: inherit;
    }
    .notify-btn-ok:hover { background: #6d28d9; }
    .notify-btn-ok.notify-btn-danger { background: #ef4444; }
    .notify-btn-ok.notify-btn-danger:hover { background: #dc2626; }
    `;

    // Inject CSS once
    const styleEl = document.createElement('style');
    styleEl.id = 'notify-styles';
    document.head.appendChild(styleEl);
    styleEl.textContent = CSS;

    // Toast container (lazy)
    let _container = null;
    function getContainer() {
        if (!_container || !document.body.contains(_container)) {
            _container = document.createElement('div');
            _container.id = 'notify-toast-container';
            document.body.appendChild(_container);
        }
        return _container;
    }

    const ICONS = { success: '✓', error: '✕', warning: '!', info: 'i' };

    function dismiss(toast) {
        toast.classList.remove('notify-show');
        toast.classList.add('notify-hide');
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 320);
    }

    window.showToast = function (message, type, duration) {
        type = type || 'info';
        duration = duration != null ? duration : 3500;

        const c = getContainer();
        const toast = document.createElement('div');
        toast.className = 'notify-toast notify-' + type;
        toast.innerHTML =
            '<span class="notify-icon">' + (ICONS[type] || 'i') + '</span>' +
            '<span class="notify-msg">' + String(message) + '</span>' +
            '<button class="notify-close" aria-label="Đóng">&times;</button>';

        let timer;
        const closeBtn = toast.querySelector('.notify-close');
        closeBtn.addEventListener('click', function () {
            clearTimeout(timer);
            dismiss(toast);
        });

        c.appendChild(toast);
        // Trigger transition on next frame
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { toast.classList.add('notify-show'); });
        });

        if (duration > 0) {
            timer = setTimeout(function () { dismiss(toast); }, duration);
        }
    };

    window.showConfirm = function (message, isDanger) {
        return new Promise(function (resolve) {
            const overlay = document.createElement('div');
            overlay.className = 'notify-confirm-overlay';
            overlay.innerHTML =
                '<div class="notify-confirm-box">' +
                    '<div class="notify-confirm-icon">!</div>' +
                    '<div class="notify-confirm-msg">' + String(message) + '</div>' +
                    '<div class="notify-confirm-btns">' +
                        '<button class="notify-btn-cancel">Hủy</button>' +
                        '<button class="notify-btn-ok' + (isDanger ? ' notify-btn-danger' : '') + '">Xác nhận</button>' +
                    '</div>' +
                '</div>';

            function close(val) {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                resolve(val);
            }

            overlay.querySelector('.notify-btn-ok').addEventListener('click', function () { close(true); });
            overlay.querySelector('.notify-btn-cancel').addEventListener('click', function () { close(false); });
            overlay.addEventListener('click', function (e) { if (e.target === overlay) close(false); });

            document.body.appendChild(overlay);
        });
    };
})();
