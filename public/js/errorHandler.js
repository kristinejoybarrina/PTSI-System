/**
 * Centralized Error Handling System
 * 
 * This module provides consistent error handling throughout the application,
 * including logging, user notifications, and error recovery.
 */

// Error types for consistent error handling
export const ErrorTypes = {
    VALIDATION: 'VALIDATION_ERROR',
    NETWORK: 'NETWORK_ERROR',
    AUTH: 'AUTHENTICATION_ERROR',
    PERMISSION: 'PERMISSION_ERROR',
    NOT_FOUND: 'NOT_FOUND_ERROR',
    SERVER: 'SERVER_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
};

// Default error messages for different error types
const defaultErrorMessages = {
    [ErrorTypes.VALIDATION]: 'Please check your input and try again.',
    [ErrorTypes.NETWORK]: 'Network error occurred. Please check your connection and try again.',
    [ErrorTypes.AUTH]: 'Authentication failed. Please log in again.',
    [ErrorTypes.PERMISSION]: 'You do not have permission to perform this action.',
    [ErrorTypes.NOT_FOUND]: 'The requested resource was not found.',
    [ErrorTypes.SERVER]: 'A server error occurred. Please try again later.',
    [ErrorTypes.UNKNOWN]: 'An unexpected error occurred. Please try again.'
};

// Log levels
const LogLevel = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
};

/**
 * Logs an error to the console and/or server
 * @param {Error} error - The error object
 * @param {string} level - The log level (error, warn, info, debug)
 * @param {Object} [context] - Additional context information
 */
function logError(error, level = LogLevel.ERROR, context = {}) {
    const timestamp = new Date().toISOString();
    const errorData = {
        timestamp,
        name: error.name,
        message: error.message,
        stack: error.stack,
        level,
        context: {
            ...context,
            url: window.location.href,
            userAgent: navigator.userAgent
        }
    };

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
        const logMethod = console[level] || console.error;
        logMethod(`[${timestamp}] ${error.name}: ${error.message}`, errorData);
    }

    // In production, send error to server
    if (process.env.NODE_ENV === 'production') {
        // Use navigator.sendBeacon for reliable error reporting
        try {
            const blob = new Blob([JSON.stringify(errorData)], { type: 'application/json' });
            navigator.sendBeacon('/api/logs/error', blob);
        } catch (e) {
            console.error('Failed to send error log:', e);
        }
    }
}

/**
 * Creates a user-friendly error message
 * @param {Error} error - The error object
 * @param {string} [customMessage] - Optional custom message to override defaults
 * @returns {string} User-friendly error message
 */
function getUserFriendlyMessage(error, customMessage) {
    // Return custom message if provided
    if (customMessage) return customMessage;
    
    // Check for error type in the error object
    if (error.type && defaultErrorMessages[error.type]) {
        return defaultErrorMessages[error.type];
    }
    
    // Handle HTTP status codes
    if (error.status) {
        switch (error.status) {
            case 400: return 'Invalid request. Please check your input and try again.';
            case 401: return 'You need to be logged in to perform this action.';
            case 403: return 'You do not have permission to perform this action.';
            case 404: return 'The requested resource was not found.';
            case 429: return 'Too many requests. Please try again later.';
            case 500: return 'A server error occurred. Please try again later.';
            default: return defaultErrorMessages[ErrorTypes.UNKNOWN];
        }
    }
    
    // Default to generic message
    return error.message || defaultErrorMessages[ErrorTypes.UNKNOWN];
}

/**
 * Handles an error by logging it and showing a user-friendly message
 * @param {Error} error - The error to handle
 * @param {Object} options - Additional options
 * @param {string} [options.context] - Context where the error occurred
 * @param {boolean} [options.showToUser=true] - Whether to show the error to the user
 * @param {string} [options.customMessage] - Custom message to show to the user
 * @param {Function} [options.onError] - Callback function to handle the error
 */
export function handleError(error, options = {}) {
    const {
        context = {},
        showToUser = true,
        customMessage,
        onError
    } = options;

    // Log the error
    logError(error, LogLevel.ERROR, context);

    // Show error to user if needed
    if (showToUser) {
        const message = getUserFriendlyMessage(error, customMessage);
        showUserNotification(message, 'error');
    }

    // Call custom error handler if provided
    if (typeof onError === 'function') {
        try {
            onError(error);
        } catch (e) {
            console.error('Error in custom error handler:', e);
        }
    }

    // For unhandled promise rejections
    if (window.onunhandledrejection) {
        window.onunhandledrejection({ reason: error });
    }

    return Promise.reject(error);
}

/**
 * Shows a notification to the user
 * @param {string} message - The message to display
 * @param {string} [type='info'] - The type of notification (success, error, warning, info)
 */
export function showUserNotification(message, type = 'info') {
    // Check if a notification system is available
    if (window.showNotification) {
        window.showNotification(message, type);
        return;
    }
    
    // Fallback to browser alert
    switch (type) {
        case 'error':
            console.error('Error:', message);
            alert(`Error: ${message}`);
            break;
        case 'warning':
            console.warn('Warning:', message);
            alert(`Warning: ${message}`);
            break;
        case 'success':
            console.log('Success:', message);
            alert(`Success: ${message}`);
            break;
        default:
            console.log('Info:', message);
            alert(`Info: ${message}`);
    }
}

/**
 * Creates a custom error class
 * @param {string} name - The name of the error
 * @param {string} [defaultMessage] - Default error message
 * @returns {Function} Custom error class
 */
export function createCustomError(name, defaultMessage) {
    class CustomError extends Error {
        constructor(message = defaultMessage, type = ErrorTypes.UNKNOWN) {
            super(message);
            this.name = name;
            this.type = type;
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, CustomError);
            }
        }
    }
    return CustomError;
}

// Initialize global error handling
function initGlobalErrorHandling() {
    // Handle uncaught errors
    window.onerror = function(message, source, lineno, colno, error) {
        const errorObj = error || new Error(message);
        handleError(errorObj, {
            context: { source, lineno, colno },
            showToUser: false
        });
        return true; // Prevent default browser error handling
    };

    // Handle unhandled promise rejections
    window.onunhandledrejection = function(event) {
        const error = event.reason || new Error('Unhandled promise rejection');
        handleError(error, {
            showToUser: false,
            context: { unhandledRejection: true }
        });
    };
}

// Initialize when loaded
if (typeof window !== 'undefined') {
    initGlobalErrorHandling();
}

// Export commonly used error classes
export const ValidationError = createCustomError('ValidationError', 'Validation failed');
ValidationError.type = ErrorTypes.VALIDATION;

export const AuthError = createCustomError('AuthError', 'Authentication failed');
AuthError.type = ErrorTypes.AUTH;

export const PermissionError = createCustomError('PermissionError', 'Permission denied');
PermissionError.type = ErrorTypes.PERMISSION;

export const NetworkError = createCustomError('NetworkError', 'Network request failed');
NetworkError.type = ErrorTypes.NETWORK;

export const NotFoundError = createCustomError('NotFoundError', 'Resource not found');
NotFoundError.type = ErrorTypes.NOT_FOUND;

export const ServerError = createCustomError('ServerError', 'Server error occurred');
ServerError.type = ErrorTypes.SERVER;
