const TOAST_TYPES = {
    info: { bg: '#d1ecf1', color: '#0c5460', icon: 'ℹ️' },
    success: { bg: '#d4edda', color: '#155724', icon: '✅' },
    warning: { bg: '#fff3cd', color: '#856404', icon: '⚠️' },
    error: { bg: '#f8d7da', color: '#721c24', icon: '❌' }
};

let toastContainer = null;
let uiStylesInjected = false;

function ensureStyles() {
    if (uiStylesInjected) return;
    const style = document.createElement('style');
    style.textContent = `
        .ui-toast-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            z-index: 10000;
        }

        .ui-toast {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 14px 16px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
            transform: translateY(20px);
            opacity: 0;
            transition: transform 0.25s ease, opacity 0.25s ease;
            font-size: 14px;
            line-height: 1.4;
            max-width: 320px;
        }

        .ui-toast.is-visible {
            transform: translateY(0);
            opacity: 1;
        }

        .ui-toast__icon {
            font-size: 18px;
            line-height: 1;
        }

        .ui-toast__message {
            flex: 1;
        }

        .ui-toast__dismiss {
            background: none;
            border: none;
            color: inherit;
            font-size: 16px;
            cursor: pointer;
            opacity: 0.6;
            transition: opacity 0.2s ease;
        }

        .ui-toast__dismiss:hover {
            opacity: 1;
        }

        .ui-global-loader {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.45);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            z-index: 9999;
            color: #f7fafc;
            font-weight: 600;
        }

        .ui-global-loader__spinner {
            width: 54px;
            height: 54px;
            border-radius: 50%;
            border: 4px solid rgba(255, 255, 255, 0.15);
            border-top-color: #63b3ed;
            animation: ui-spin 0.9s linear infinite;
        }

        @keyframes ui-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    uiStylesInjected = true;
}

function ensureToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement('div');
    toastContainer.className = 'ui-toast-container';
    document.body.appendChild(toastContainer);
    return toastContainer;
}

function notify({ message, type = 'info', duration = 4000 } = {}) {
    ensureStyles();
    const container = ensureToastContainer();
    const config = TOAST_TYPES[type] || TOAST_TYPES.info;

    const toast = document.createElement('div');
    toast.className = 'ui-toast';
    toast.style.background = config.bg;
    toast.style.color = config.color;

    toast.innerHTML = `
        <span class="ui-toast__icon">${config.icon}</span>
        <div class="ui-toast__message">${message}</div>
        <button class="ui-toast__dismiss" aria-label="Fechar">✖</button>
    `;

    const dismissButton = toast.querySelector('.ui-toast__dismiss');
    const remove = () => {
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 200);
    };

    dismissButton.addEventListener('click', remove);
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('is-visible'));

    if (duration > 0) {
        setTimeout(remove, duration);
    }

    return toast;
}

function setGlobalLoader(show, { text = 'Carregando...' } = {}) {
    ensureStyles();
    let loader = document.querySelector('.ui-global-loader');

    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'ui-global-loader';
            loader.innerHTML = `
                <div class="ui-global-loader__spinner" role="presentation"></div>
                <div class="ui-global-loader__label">${text}</div>
            `;
            document.body.appendChild(loader);
        } else {
            const label = loader.querySelector('.ui-global-loader__label');
            if (label) {
                label.textContent = text;
            }
        }
    } else if (loader) {
        loader.remove();
    }
}

function applyBadgeState(element, state = 'default', label) {
    if (!element) return;
    element.classList.remove('is-online', 'is-offline', 'is-warning');

    switch (state) {
        case 'online':
            element.classList.add('is-online');
            element.textContent = label || 'Conectado';
            break;
        case 'offline':
            element.classList.add('is-offline');
            element.textContent = label || 'Offline';
            break;
        case 'warning':
            element.classList.add('is-warning');
            element.textContent = label || 'Atenção';
            break;
        default:
            element.textContent = label || element.dataset.defaultLabel || '—';
    }
}

export const ui = {
    notify,
    setGlobalLoader,
    applyBadgeState
};
