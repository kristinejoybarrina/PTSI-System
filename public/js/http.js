/**
 * HTTP Client Utility
 * 
 * A flexible HTTP client with request/response interceptors, retries,
 * caching, and other advanced features.
 */

import { localStore, sessionStore } from './storage';
import { handleError } from './errorHandler';
import logger from './logger';
import CONFIG from './config';

// Default request options
const DEFAULT_OPTIONS = {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    credentials: 'same-origin',
    mode: 'cors',
    cache: 'default',
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
    timeout: 30000, // 30 seconds
    retries: 3,
    retryDelay: 1000, // 1 second
    maxRedirects: 5,
    responseType: 'json', // 'json', 'text', 'blob', 'arraybuffer', 'formData'
    params: {},
    data: null,
    validateStatus: (status) => status >= 200 && status < 300,
    withCredentials: false,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    onUploadProgress: null,
    onDownloadProgress: null,
    auth: null, // { username: 'user', password: 'pass' } or { token: 'token' }
    baseURL: '',
    paramsSerializer: null,
    // Caching
    cache: false, // true, false, 'local', 'session'
    cacheKey: null,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    // Request cancellation
    cancelToken: null,
    // Response transformation
    transformRequest: [],
    transformResponse: [],
    // Error handling
    throwHttpErrors: true,
    // Request identification (for cancellation)
    requestId: null
};

// Cache storage
const cacheStores = {
    local: localStore,
    session: sessionStore,
    memory: (() => {
        const store = new Map();
        return {
            getItem: (key) => store.get(key),
            setItem: (key, value) => store.set(key, value),
            removeItem: (key) => store.delete(key),
            clear: () => store.clear()
        };
    })()
};

class HttpClient {
    constructor(config = {}) {
        this.config = { ...DEFAULT_OPTIONS, ...config };
        this.interceptors = {
            request: [],
            response: []
        };
        this.pendingRequests = new Map();
        this.requestCounter = 0;
        
        // Bind methods
        this.request = this.request.bind(this);
        this.get = this.get.bind(this);
        this.post = this.post.bind(this);
        this.put = this.put.bind(this);
        this.patch = this.patch.bind(this);
        this.delete = this.delete.bind(this);
        this.head = this.head.bind(this);
        this.options = this.options.bind(this);
    }
    
    /**
     * Send an HTTP request
     */
    async request(config) {
        // Merge instance config with request config
        const mergedConfig = { ...this.config, ...config };
        const { url, method, baseURL, params, paramsSerializer, data, headers, 
                responseType, validateStatus, timeout, retries, retryDelay,
                withCredentials, xsrfCookieName, xsrfHeaderName, onUploadProgress,
                onDownloadProgress, auth, cache, cacheKey, cacheTTL, cancelToken,
                throwHttpErrors, requestId } = mergedConfig;
        
        // Generate request ID if not provided
        const reqId = requestId || `req_${++this.requestCounter}`;
        
        // Create abort controller for timeout and cancellation
        const controller = new AbortController();
        const signal = controller.signal;
        
        // Setup timeout
        let timeoutId;
        if (timeout) {
            timeoutId = setTimeout(() => {
                controller.abort(new Error(`Timeout of ${timeout}ms exceeded`));
            }, timeout);
        }
        
        // Setup cancellation
        if (cancelToken) {
            cancelToken.promise.then(cancel => {
                controller.abort(cancel);
            });
        }
        
        // Store the controller for potential cancellation
        this.pendingRequests.set(reqId, controller);
        
        try {
            // Build URL with query parameters
            let requestUrl = this.buildURL(url, baseURL, params, paramsSerializer);
            
            // Handle request data
            let requestData = data;
            let contentType = 'application/json';
            
            // Process request data based on type
            if (data) {
                if (data instanceof FormData) {
                    contentType = 'multipart/form-data';
                    // Don't set Content-Type header, let the browser set it with the boundary
                    delete headers['Content-Type'];
                } else if (data instanceof URLSearchParams) {
                    contentType = 'application/x-www-form-urlencoded;charset=utf-8';
                    requestData = data.toString();
                } else if (typeof data === 'object') {
                    requestData = JSON.stringify(data);
                }
                
                // Set Content-Type if not already set
                if (!headers['Content-Type']) {
                    headers['Content-Type'] = contentType;
                }
            }
            
            // Add XSRF token if needed
            if ((withCredentials || this.isSameOrigin(requestUrl)) && xsrfCookieName) {
                const xsrfValue = this.getCookie(xsrfCookieName);
                if (xsrfValue && xsrfHeaderName) {
                    headers[xsrfHeaderName] = xsrfValue;
                }
            }
            
            // Add Authorization header if needed
            if (auth) {
                if (auth.token) {
                    headers['Authorization'] = `Bearer ${auth.token}`;
                } else if (auth.username && auth.password) {
                    const credentials = btoa(`${auth.username}:${auth.password}`);
                    headers['Authorization'] = `Basic ${credentials}`;
                }
            }
            
            // Check cache for GET requests
            if (method.toUpperCase() === 'GET' && cache) {
                const cacheStore = typeof cache === 'string' ? cacheStores[cache] || cacheStores.memory : cacheStores.memory;
                const cacheKeyToUse = cacheKey || requestUrl;
                const cachedResponse = cacheStore.getItem(cacheKeyToUse);
                
                if (cachedResponse) {
                    const { data: cachedData, timestamp } = cachedResponse;
                    const isExpired = Date.now() - timestamp > (cacheTTL || this.config.cacheTTL);
                    
                    if (!isExpired) {
                        logger.debug(`Cache hit for ${requestUrl}`, { cacheKey: cacheKeyToUse });
                        return this.createResponse({
                            data: cachedData,
                            status: 200,
                            statusText: 'OK (from cache)',
                            headers: {},
                            config: mergedConfig,
                            request: null
                        });
                    } else {
                        logger.debug(`Cache expired for ${requestUrl}`, { cacheKey: cacheKeyToUse });
                        cacheStore.removeItem(cacheKeyToUse);
                    }
                }
            }
            
            // Create request config
            const requestConfig = {
                method: method.toUpperCase(),
                headers: { ...headers },
                credentials: withCredentials ? 'include' : 'same-origin',
                signal,
                body: requestData
            };
            
            // Add progress handlers if provided
            if (onUploadProgress || onDownloadProgress) {
                requestConfig.onProgress = (progressEvent) => {
                    if (progressEvent.lengthComputable) {
                        const percentComplete = (progressEvent.loaded / progressEvent.total) * 100;
                        
                        if (progressEvent.type === 'upload' && onUploadProgress) {
                            onUploadProgress({
                                loaded: progressEvent.loaded,
                                total: progressEvent.total,
                                percent: percentComplete,
                                event: progressEvent
                            });
                        } else if (onDownloadProgress) {
                            onDownloadProgress({
                                loaded: progressEvent.loaded,
                                total: progressEvent.total,
                                percent: percentComplete,
                                event: progressEvent
                            });
                        }
                    }
                };
            }
            
            // Execute request interceptors
            const requestChain = this.interceptors.request.reduceRight(
                (chain, interceptor) => chain.then(interceptor.fulfilled, interceptor.rejected),
                Promise.resolve(requestConfig)
            );
            
            let response;
            let attempts = 0;
            
            // Execute request with retries
            while (attempts <= (retries || 0)) {
                try {
                    const finalConfig = await requestChain;
                    const fetchResponse = await this.fetchWithProgress(requestUrl, finalConfig);
                    
                    // Process response
                    response = await this.processResponse(fetchResponse, mergedConfig);
                    
                    // Validate status
                    if (!validateStatus(response.status)) {
                        throw this.createError(
                            `Request failed with status code ${response.status}`,
                            mergedConfig,
                            null,
                            fetchResponse,
                            response
                        );
                    }
                    
                    // Cache the response if needed
                    if (method.toUpperCase() === 'GET' && cache && response.status === 200) {
                        const cacheStore = typeof cache === 'string' ? cacheStores[cache] || cacheStores.memory : cacheStores.memory;
                        const cacheKeyToUse = cacheKey || requestUrl;
                        
                        cacheStore.setItem(cacheKeyToUse, {
                            data: response.data,
                            timestamp: Date.now()
                        });
                    }
                    
                    // Execute response interceptors
                    const responseChain = this.interceptors.response.reduceRight(
                        (chain, interceptor) => chain.then(interceptor.fulfilled, interceptor.rejected),
                        Promise.resolve(response)
                    );
                    
                    return responseChain;
                    
                } catch (error) {
                    attempts++;
                    
                    // Don't retry if it's not a network error or if we've reached max retries
                    if (attempts > (retries || 0) || this.isRetryableError(error)) {
                        throw error;
                    }
                    
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
                    logger.warn(`Retrying request (${attempts}/${retries}): ${requestUrl}`);
                }
            }
            
            // This should never be reached, but just in case
            throw new Error('Request failed after maximum retries');
            
        } catch (error) {
            // Handle errors
            if (throwHttpErrors) {
                throw error;
            }
            
            return this.createResponse({
                data: null,
                status: error.response?.status || 0,
                statusText: error.response?.statusText || error.message,
                headers: error.response?.headers || {},
                config: mergedConfig,
                request: null,
                error: error
            });
            
        } finally {
            // Clean up
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            this.pendingRequests.delete(reqId);
        }
    }
    
    /**
     * Build a full URL with query parameters
     */
    buildURL(url, baseURL = '', params = {}, paramsSerializer) {
        // Handle absolute URLs
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        // Combine baseURL and URL
        let fullUrl = baseURL ? `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}` : url;
        
        // Add query parameters
        const queryString = this.serializeParams(params, paramsSerializer);
        if (queryString) {
            const separator = fullUrl.includes('?') ? '&' : '?';
            fullUrl += separator + queryString;
        }
        
        return fullUrl;
    }
    
    /**
     * Serialize query parameters
     */
    serializeParams(params, paramsSerializer) {
        if (!params) return '';
        
        // Use custom serializer if provided
        if (paramsSerializer) {
            return paramsSerializer(params);
        }
        
        // Default serialization
        const parts = [];
        
        const processParam = (key, value) => {
            if (value === null || value === undefined) {
                return;
            }
            
            if (Array.isArray(value)) {
                value.forEach(item => processParam(`${key}[]`, item));
            } else if (typeof value === 'object' && !(value instanceof Date) && !(value instanceof File)) {
                Object.entries(value).forEach(([k, v]) => processParam(`${key}[${k}]`, v));
            } else {
                const encodedKey = encodeURIComponent(key);
                const encodedValue = value === null ? '' : encodeURIComponent(value);
                parts.push(`${encodedKey}=${encodedValue}`);
            }
        };
        
        Object.entries(params).forEach(([key, value]) => processParam(key, value));
        
        return parts.join('&');
    }
    
    /**
     * Check if an error is retryable
     */
    isRetryableError(error) {
        return (
            !error.response ||
            error.code === 'ECONNABORTED' ||
            error.code === 'ETIMEDOUT' ||
            error.message === 'Network Error' ||
            (error.response.status >= 500 && error.response.status < 600)
        );
    }
    
    /**
     * Check if a URL is from the same origin
     */
    isSameOrigin(url) {
        if (typeof window === 'undefined') return true;
        
        const parsedUrl = new URL(url, window.location.href);
        return (
            parsedUrl.protocol === window.location.protocol &&
            parsedUrl.hostname === window.location.hostname &&
            parsedUrl.port === window.location.port
        );
    }
    
    /**
     * Get a cookie value by name
     */
    getCookie(name) {
        if (typeof document === 'undefined') return null;
        
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        
        return null;
    }
    
    /**
     * Fetch with progress support
     */
    async fetchWithProgress(url, config) {
        const { onProgress, ...fetchConfig } = config;
        
        if (!onProgress) {
            return fetch(url, fetchConfig);
        }
        
        const response = await fetch(url, fetchConfig);
        
        if (!response.body) {
            return response;
        }
        
        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let loaded = 0;
        
        const reader = response.body.getReader();
        const stream = new ReadableStream({
            async start(controller) {
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        controller.close();
                        break;
                    }
                    
                    loaded += value.length;
                    
                    if (onProgress) {
                        onProgress({
                            loaded,
                            total,
                            percent: total ? (loaded / total) * 100 : 0,
                            lengthComputable: !!total
                        });
                    }
                    
                    controller.enqueue(value);
                }
            }
        });
        
        return new Response(stream, {
            headers: response.headers,
            status: response.status,
            statusText: response.statusText
        });
    }
    
    /**
     * Process fetch response
     */
    async processResponse(response, config) {
        const { responseType } = config;
        let data;
        
        // Handle different response types
        switch (responseType) {
            case 'arraybuffer':
                data = await response.arrayBuffer();
                break;
                
            case 'blob':
                data = await response.blob();
                break;
                
            case 'formData':
                data = await response.formData();
                break;
                
            case 'text':
                data = await response.text();
                break;
                
            case 'json':
            default:
                try {
                    data = await response.json();
                } catch (e) {
                    data = await response.text();
                }
                break;
        }
        
        return this.createResponse({
            data,
            status: response.status,
            statusText: response.statusText,
            headers: this.parseHeaders(response.headers),
            config,
            request: null,
            response
        });
    }
    
    /**
     * Parse headers from Headers object
     */
    parseHeaders(headers) {
        const result = {};
        
        if (headers instanceof Headers) {
            headers.forEach((value, key) => {
                result[key] = value;
            });
        } else if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
                result[key] = value;
            });
        }
        
        return result;
    }
    
    /**
     * Create a response object
     */
    createResponse({
        data,
        status,
        statusText,
        headers = {},
        config,
        request,
        response,
        error
    }) {
        return {
            data,
            status,
            statusText,
            headers,
            config,
            request,
            response,
            error,
            // Helper methods
            ok: status >= 200 && status < 300,
            headers: headers,
            // Alias for data
            data
        };
    }
    
    /**
     * Create an error object
     */
    createError(message, config, code, request, response) {
        const error = new Error(message);
        
        if (code) {
            error.code = code;
        }
        
        error.config = config;
        error.request = request;
        error.response = response;
        error.isHttpError = true;
        
        return error;
    }
    
    /**
     * Add a request interceptor
     */
    addRequestInterceptor(fulfilled, rejected) {
        this.interceptors.request.push({ fulfilled, rejected });
        return this.interceptors.request.length - 1; // Return ID for removal
    }
    
    /**
     * Add a response interceptor
     */
    addResponseInterceptor(fulfilled, rejected) {
        this.interceptors.response.push({ fulfilled, rejected });
        return this.interceptors.response.length - 1; // Return ID for removal
    }
    
    /**
     * Remove a request interceptor
     */
    removeRequestInterceptor(id) {
        if (this.interceptors.request[id]) {
            this.interceptors.request.splice(id, 1);
            return true;
        }
        return false;
    }
    
    /**
     * Remove a response interceptor
     */
    removeResponseInterceptor(id) {
        if (this.interceptors.response[id]) {
            this.interceptors.response.splice(id, 1);
            return true;
        }
        return false;
    }
    
    /**
     * Cancel a request by ID
     */
    cancelRequest(requestId, message = 'Request cancelled') {
        const controller = this.pendingRequests.get(requestId);
        if (controller) {
            controller.abort(message);
            return true;
        }
        return false;
    }
    
    /**
     * Cancel all pending requests
     */
    cancelAllRequests(message = 'All requests cancelled') {
        this.pendingRequests.forEach(controller => {
            controller.abort(message);
        });
        
        this.pendingRequests.clear();
    }
    
    /**
     * Create a cancel token
     */
    createCancelToken() {
        let cancel;
        const token = new Promise((resolve) => {
            cancel = resolve;
        });
        
        return {
            token,
            cancel: (message = 'Request cancelled') => cancel(message)
        };
    }
    
    /**
     * Clear cache
     */
    clearCache(cacheType = 'all') {
        if (cacheType === 'all') {
            Object.values(cacheStores).forEach(store => store.clear());
        } else if (cacheStores[cacheType]) {
            cacheStores[cacheType].clear();
        }
    }
    
    /**
     * Clear expired cache entries
     */
    clearExpiredCache(cacheType = 'all') {
        const stores = cacheType === 'all' 
            ? Object.entries(cacheStores) 
            : [[cacheType, cacheStores[cacheType]]].filter(([_, store]) => store);
        
        let count = 0;
        const now = Date.now();
        
        for (const [type, store] of stores) {
            const keys = [];
            
            // Get all cache keys
            if (type === 'memory') {
                // Memory store (Map)
                for (const key of store.keys()) {
                    const entry = store.get(key);
                    if (entry && entry.timestamp && now - entry.timestamp > entry.ttl) {
                        keys.push(key);
                    }
                }
                
                // Remove expired entries
                keys.forEach(key => store.delete(key));
                count += keys.length;
                
            } else {
                // Other stores (localStorage, sessionStorage)
                for (let i = 0; i < store.length; i++) {
                    const key = store.key(i);
                    try {
                        const entry = JSON.parse(store.getItem(key));
                        if (entry && entry.timestamp && now - entry.timestamp > (entry.ttl || 0)) {
                            keys.push(key);
                        }
                    } catch (e) {
                        // Skip invalid entries
                        continue;
                    }
                }
                
                // Remove expired entries
                keys.forEach(key => store.removeItem(key));
                count += keys.length;
            }
        }
        
        return count;
    }
    
    // HTTP method shortcuts
    get(url, config = {}) {
        return this.request({
            ...config,
            method: 'GET',
            url
        });
    }
    
    post(url, data, config = {}) {
        return this.request({
            ...config,
            method: 'POST',
            url,
            data
        });
    }
    
    put(url, data, config = {}) {
        return this.request({
            ...config,
            method: 'PUT',
            url,
            data
        });
    }
    
    patch(url, data, config = {}) {
        return this.request({
            ...config,
            method: 'PATCH',
            url,
            data
        });
    }
    
    delete(url, config = {}) {
        return this.request({
            ...config,
            method: 'DELETE',
            url
        });
    }
    
    head(url, config = {}) {
        return this.request({
            ...config,
            method: 'HEAD',
            url
        });
    }
    
    options(url, config = {}) {
        return this.request({
            ...config,
            method: 'OPTIONS',
            url
        });
    }
}

// Create a default instance
export const http = new HttpClient({
    baseURL: CONFIG.API.BASE_URL,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    withCredentials: true
});

// Add default request interceptor for auth token
http.addRequestInterceptor(async (config) => {
    // Add auth token if available
    const token = localStore.get('auth_token');
    if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
});

// Add default response interceptor for error handling
http.addResponseInterceptor(
    (response) => response,
    (error) => {
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            // Clear auth data
            localStore.remove('auth_token');
            
            // Redirect to login if not already there
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login?session_expired=1';
            }
        }
        
        return Promise.reject(error);
    }
);

// Export the HttpClient class for custom instances
export { HttpClient };

export default http;
