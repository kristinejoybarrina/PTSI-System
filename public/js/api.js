/**
 * API Request Handler
 * 
 * Provides a centralized way to make API requests with built-in authentication,
 * error handling, and request/response transformations.
 */

import { handleError } from './errorHandler';
import CONFIG from './config';

// Active requests for cancellation
const activeRequests = new Map();

// Default request options
const defaultOptions = {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    credentials: 'same-origin',
    mode: 'cors',
    cache: 'no-cache',
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
    timeout: CONFIG.API.TIMEOUT,
    retry: CONFIG.API.RETRY_ATTEMPTS,
    retryDelay: CONFIG.API.RETRY_DELAY,
    auth: true, // Automatically add auth token
    parseResponse: true, // Automatically parse JSON response
    handleErrors: true, // Automatically handle errors
    signal: null // For request cancellation
};

/**
 * Makes an API request with built-in error handling and authentication
 * @param {string} endpoint - The API endpoint (can be full URL or path)
 * @param {Object} options - Request options
 * @returns {Promise<any>} The response data
 */
export async function apiRequest(endpoint, options = {}) {
    // Generate a unique ID for this request
    const requestId = generateRequestId();
    
    try {
        // Merge options with defaults
        const mergedOptions = { ...defaultOptions, ...options };
        
        // Get full URL
        const url = getFullUrl(endpoint);
        
        // Prepare headers
        const headers = await prepareHeaders(mergedOptions);
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), mergedOptions.timeout);
        
        // Store the controller for potential cancellation
        activeRequests.set(requestId, { controller, timeoutId });
        
        // Make the request
        const response = await fetch(url, {
            ...mergedOptions,
            headers,
            signal: mergedOptions.signal || controller.signal
        });
        
        // Clear timeout and remove from active requests
        clearTimeout(timeoutId);
        activeRequests.delete(requestId);
        
        // Handle response
        return handleResponse(response, mergedOptions);
        
    } catch (error) {
        // Clean up on error
        activeRequests.delete(requestId);
        
        // Handle specific error types
        if (error.name === 'AbortError') {
            error.message = 'Request timed out. Please check your connection and try again.';
            error.type = 'NETWORK_ERROR';
        } else if (!navigator.onLine) {
            error.message = 'No internet connection. Please check your network and try again.';
            error.type = 'NETWORK_OFFLINE';
        }
        
        // Handle or rethrow the error
        if (options.handleErrors !== false) {
            return handleError(error, {
                context: { endpoint, options },
                showToUser: true
            });
        }
        
        throw error;
    }
}

/**
 * Generate a unique ID for the request
 * @private
 */
function generateRequestId() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * Get full URL from endpoint
 * @private
 */
function getFullUrl(endpoint) {
    // If it's already a full URL, return as is
    if (endpoint.startsWith('http')) {
        return endpoint;
    }
    
    // Remove leading slash if present
    const path = endpoint.startsWith('/') ? endpoint.substr(1) : endpoint;
    
    // Combine with base URL
    return `${CONFIG.API.BASE_URL}/${path}`;
}

/**
 * Prepare headers for the request
 * @private
 */
async function prepareHeaders(options) {
    const headers = new Headers(options.headers);
    
    // Add authentication token if needed
    if (options.auth && window.auth?.sessionManager?.getSession) {
        const session = window.auth.sessionManager.getSession();
        if (session?.token) {
            headers.set('Authorization', `Bearer ${session.token}`);
        }
    }
    
    // Add CSRF token if needed
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
        if (window.auth?.sessionManager?.getCSRFToken) {
            headers.set('X-CSRF-Token', window.auth.sessionManager.getCSRFToken());
        }
    }
    
    return headers;
}

/**
 * Handle API response
 * @private
 */
async function handleResponse(response, options) {
    // Handle 204 No Content
    if (response.status === 204) {
        return null;
    }
    
    // Parse response based on content type
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
        data = await response.json().catch(() => ({}));
    } else {
        data = await response.text();
    }
    
    // Handle non-2xx responses
    if (!response.ok) {
        const error = new Error(data.message || 'Request failed');
        error.status = response.status;
        error.response = data;
        
        // Handle specific status codes
        if (response.status === 401) {
            // Unauthorized - redirect to login
            if (window.auth?.sessionManager) {
                window.auth.sessionManager.endSession();
            }
            window.location.href = '/login?session_expired=1';
        } else if (response.status === 403) {
            // Forbidden
            error.type = 'PERMISSION_ERROR';
        } else if (response.status === 404) {
            // Not Found
            error.type = 'NOT_FOUND_ERROR';
        } else if (response.status >= 500) {
            // Server Error
            error.type = 'SERVER_ERROR';
        }
        
        throw error;
    }
    
    return options.parseResponse ? data : response;
}

/**
 * Cancel an active request
 * @param {string} requestId - The ID of the request to cancel
 */
export function cancelRequest(requestId) {
    const request = activeRequests.get(requestId);
    if (request) {
        request.controller.abort();
        clearTimeout(request.timeoutId);
        activeRequests.delete(requestId);
    }
}

/**
 * Cancel all active requests
 */
export function cancelAllRequests() {
    for (const [id, request] of activeRequests.entries()) {
        request.controller.abort();
        clearTimeout(request.timeoutId);
        activeRequests.delete(id);
    }
}

// Helper methods for common HTTP methods
const http = {
    get: (endpoint, options = {}) => 
        apiRequest(endpoint, { ...options, method: 'GET' }),
    
    post: (endpoint, data, options = {}) => 
        apiRequest(endpoint, { 
            ...options, 
            method: 'POST', 
            body: JSON.stringify(data) 
        }),
    
    put: (endpoint, data, options = {}) => 
        apiRequest(endpoint, { 
            ...options, 
            method: 'PUT', 
            body: JSON.stringify(data) 
        }),
    
    patch: (endpoint, data, options = {}) => 
        apiRequest(endpoint, { 
            ...options, 
            method: 'PATCH', 
            body: JSON.stringify(data) 
        }),
    
    delete: (endpoint, options = {}) => 
        apiRequest(endpoint, { ...options, method: 'DELETE' }),
    
    upload: (endpoint, file, options = {}) => {
        const formData = new FormData();
        formData.append('file', file);
        
        return apiRequest(endpoint, {
            ...options,
            method: 'POST',
            body: formData,
            headers: {
                ...options.headers,
                'Content-Type': 'multipart/form-data'
            }
        });
    }
};

// Export the http methods
export default http;

// Automatically cancel pending requests when the page is unloaded
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cancelAllRequests);
}
