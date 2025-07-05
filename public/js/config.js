/**
 * Application Configuration
 * 
 * Centralized configuration for the application, including API endpoints,
 * feature flags, and security settings.
 */

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Base API configuration
const API_CONFIG = {
    BASE_URL: isProduction ? 'https://api.yourdomain.com' : 'http://localhost:5000',
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/api/auth/login',
            LOGOUT: '/api/auth/logout',
            REGISTER: '/api/auth/register',
            REFRESH_TOKEN: '/api/auth/refresh-token',
            FORGOT_PASSWORD: '/api/auth/forgot-password',
            RESET_PASSWORD: '/api/auth/reset-password'
        },
        USERS: {
            PROFILE: '/api/users/me',
            UPDATE_PROFILE: '/api/users/me',
            CHANGE_PASSWORD: '/api/users/change-password'
        },
        LOGS: {
            ERROR: '/api/logs/error',
            ACTIVITY: '/api/logs/activity'
        }
    },
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // 1 second
};

// Security configuration
const SECURITY_CONFIG = {
    // Session management
    SESSION: {
        COOKIE_NAME: 'session_token',
        MAX_AGE: 60 * 60 * 24 * 7, // 7 days in seconds
        HTTP_ONLY: true,
        SECURE: isProduction,
        SAME_SITE: 'Strict',
        RENEW_BEFORE_EXPIRY: 60 * 5 // 5 minutes in seconds
    },
    
    // CSRF protection
    CSRF: {
        COOKIE_NAME: 'csrf_token',
        HEADER_NAME: 'X-CSRF-Token',
        MAX_AGE: 60 * 60 * 24, // 24 hours in seconds
        HTTP_ONLY: false, // Needs to be accessible from JavaScript
        SECURE: isProduction,
        SAME_SITE: 'Strict'
    },
    
    // Password policy
    PASSWORD_POLICY: {
        MIN_LENGTH: 8,
        REQUIRE_UPPERCASE: true,
        REQUIRE_LOWERCASE: true,
        REQUIRE_NUMBER: true,
        REQUIRE_SPECIAL_CHAR: true,
        MAX_AGE_DAYS: 90, // Require password change every 90 days
        HISTORY_SIZE: 5, // Remember last 5 passwords
        MAX_ATTEMPTS: 5, // Lock account after 5 failed attempts
        LOCKOUT_TIME: 15 // Lockout duration in minutes
    },
    
    // Rate limiting
    RATE_LIMIT: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 100, // Limit each IP to 100 requests per windowMs
        MESSAGE: 'Too many requests from this IP, please try again later.'
    },
    
    // Content Security Policy
    CSP: {
        DEFAULT_SRC: ["'self'"],
        SCRIPT_SRC: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'"
        ],
        STYLE_SRC: [
            "'self'",
            "'unsafe-inline'"
        ],
        IMG_SRC: [
            "'self'",
            "data:",
            "https: data:"
        ],
        FONT_SRC: ["'self'"],
        CONNECT_SRC: [
            "'self'",
            API_CONFIG.BASE_URL
        ],
        FRAME_SRC: ["'none'"],
        OBJECT_SRC: ["'none'"],
        BASE_URI: ["'self'"],
        FORM_ACTION: ["'self'"],
        FRAME_ANCESTORS: ["'none'"],
        UPGRADE_INSECURE_REQUESTS: isProduction,
        BLOCK_ALL_MIXED_CONTENT: true
    }
};

// Feature flags
const FEATURE_FLAGS = {
    ENABLE_REGISTRATION: true,
    ENABLE_PASSWORD_RESET: true,
    ENABLE_TWO_FACTOR_AUTH: false,
    ENABLE_ACTIVITY_LOGGING: true,
    ENABLE_ANALYTICS: isProduction,
    MAINTENANCE_MODE: false
};

// UI configuration
const UI_CONFIG = {
    THEME: {
        PRIMARY_COLOR: '#007bff',
        SECONDARY_COLOR: '#6c757d',
        SUCCESS_COLOR: '#28a745',
        DANGER_COLOR: '#dc3545',
        WARNING_COLOR: '#ffc107',
        INFO_COLOR: '#17a2b8',
        LIGHT_COLOR: '#f8f9fa',
        DARK_COLOR: '#343a40',
        BORDER_RADIUS: '4px',
        BOX_SHADOW: '0 2px 4px rgba(0,0,0,0.1)'
    },
    NOTIFICATIONS: {
        AUTO_HIDE: true,
        AUTO_HIDE_DURATION: 5000, // 5 seconds
        MAX_VISIBLE: 3,
        POSITION: 'top-right'
    },
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 10,
        PAGE_SIZE_OPTIONS: [10, 25, 50, 100]
    }
};

// Export configuration
const CONFIG = {
    ENV: {
        IS_PRODUCTION: isProduction,
        IS_DEVELOPMENT: isDevelopment,
        NODE_ENV: process.env.NODE_ENV || 'development',
        VERSION: process.env.REACT_APP_VERSION || '1.0.0',
        BUILD_DATE: process.env.BUILD_DATE || new Date().toISOString()
    },
    API: API_CONFIG,
    SECURITY: SECURITY_CONFIG,
    FEATURES: FEATURE_FLAGS,
    UI: UI_CONFIG,
    
    // Helper methods
    getApiUrl: (endpoint) => {
        // Check if the endpoint is a full URL
        if (endpoint.startsWith('http')) {
            return endpoint;
        }
        
        // Check if the endpoint is a path in the API config
        const path = endpoint.replace(/^\//, ''); // Remove leading slash
        const parts = path.split('/');
        
        // Try to find the endpoint in the nested structure
        let current = API_CONFIG.ENDPOINTS;
        for (const part of parts) {
            if (current[part] === undefined) {
                // If the path doesn't exist in the config, use it as is
                return `${API_CONFIG.BASE_URL}${endpoint}`;
            }
            current = current[part];
        }
        
        return `${API_CONFIG.BASE_URL}${endpoint}`;
    },
    
    // Get CSP header value
    getCspHeader: () => {
        return Object.entries(SECURITY_CONFIG.CSP)
            .filter(([_, value]) => {
                // Filter out falsy values and empty arrays
                if (Array.isArray(value)) {
                    return value.length > 0;
                }
                return Boolean(value);
            })
            .map(([directive, value]) => {
                if (Array.isArray(value)) {
                    return `${directive} ${value.join(' ')}`;
                }
                return `${directive} ${value}`;
            })
            .join('; ');
    }
};

// Make config available globally
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

export default CONFIG;
