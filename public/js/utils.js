// Input Validation Utils
const ValidationUtils = {
    validateEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    validateUsername: (username) => {
        // Username should be 3-20 characters, alphanumeric and underscore only
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return usernameRegex.test(username);
    },

    validatePasswordStrength: (password) => {
        const strength = {
            hasLower: /[a-z]/.test(password),
            hasUpper: /[A-Z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
            isLongEnough: password.length >= 8
        };
        
        return {
            score: Object.values(strength).filter(Boolean).length,
            strength
        };
    },

    sanitizeInput: (input) => {
        return input.replace(/[<>]/g, '').trim();
    }
};

// UI/UX Utils
const UIUtils = {
    showLoading: (button) => {
        const originalText = button.textContent;
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> Loading...';
        return originalText;
    },

    hideLoading: (button, originalText) => {
        button.disabled = false;
        button.textContent = originalText;
    },

    showError: (message, element) => {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message animate';
        errorDiv.textContent = message;
        element.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    },

    showSuccess: (message, element) => {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message animate';
        successDiv.textContent = message;
        element.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 5000);
    }
};

// Accessibility Utils
const AccessibilityUtils = {
    setAriaAttributes: (element, attributes) => {
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(`aria-${key}`, value);
        });
    },

    handleKeyboardNavigation: (event, elements) => {
        if (event.key === 'Tab') {
            const currentIndex = elements.indexOf(document.activeElement);
            if (event.shiftKey && currentIndex === 0) {
                event.preventDefault();
                elements[elements.length - 1].focus();
            } else if (!event.shiftKey && currentIndex === elements.length - 1) {
                event.preventDefault();
                elements[0].focus();
            }
        }
    },

    announceScreenReader: (message) => {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    }
};

// Network Utils
const NetworkUtils = {
    isOnline: () => navigator.onLine,

    handleOffline: (callback) => {
        window.addEventListener('offline', callback);
    },

    handleOnline: (callback) => {
        window.addEventListener('online', callback);
    },

    checkNetworkSpeed: async () => {
        const startTime = performance.now();
        try {
            await fetch('/ping');
            const endTime = performance.now();
            return endTime - startTime;
        } catch (error) {
            return Infinity;
        }
    }
};

// Session Utils
const SessionUtils = {
    startSessionTimer: (timeoutMinutes, warningMinutes, callbacks) => {
        let timeoutId;
        let warningId;

        const resetTimer = () => {
            clearTimeout(timeoutId);
            clearTimeout(warningId);
            
            warningId = setTimeout(() => {
                callbacks.onWarning(warningMinutes);
            }, (timeoutMinutes - warningMinutes) * 60 * 1000);

            timeoutId = setTimeout(() => {
                callbacks.onTimeout();
            }, timeoutMinutes * 60 * 1000);
        };

        // Reset timer on user activity
        ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
            document.addEventListener(event, resetTimer);
        });

        resetTimer();
        return resetTimer;
    },

    clearSessionTimers: () => {
        // Clear all existing timers
        const highestId = window.setTimeout(() => {}, 0);
        for (let i = highestId; i >= 0; i--) {
            window.clearTimeout(i);
        }
    }
};

// CSRF Protection
const SecurityUtils = {
    generateCSRFToken: () => {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    },

    validateCSRFToken: (token) => {
        // Implement your token validation logic here
        return !!token;
    },

    setCSRFToken: () => {
        const token = SecurityUtils.generateCSRFToken();
        document.querySelectorAll('form').forEach(form => {
            const tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = 'csrf_token';
            tokenInput.value = token;
            form.appendChild(tokenInput);
        });
        return token;
    }
};

// Export all utilities
window.ValidationUtils = ValidationUtils;
window.UIUtils = UIUtils;
window.AccessibilityUtils = AccessibilityUtils;
window.NetworkUtils = NetworkUtils;
window.SessionUtils = SessionUtils;
window.SecurityUtils = SecurityUtils;
