/**
 * Logging and Monitoring Utility
 * 
 * Provides a centralized logging system with different log levels,
 * remote logging, and activity monitoring.
 */

import { handleError } from './errorHandler';
import { localStore, sessionStore } from './storage';
import CONFIG from './config';

// Log levels
const LogLevel = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    CRITICAL: 'critical'
};

// Default log configuration
const defaultConfig = {
    console: {
        enabled: true,
        level: CONFIG.ENV.IS_PRODUCTION ? LogLevel.INFO : LogLevel.DEBUG
    },
    remote: {
        enabled: true,
        endpoint: CONFIG.API.ENDPOINTS.LOGS.ERROR,
        level: LogLevel.ERROR,
        batchSize: 10,
        flushInterval: 10000, // 10 seconds
        maxQueueSize: 50
    },
    userTracking: {
        enabled: true,
        sessionTimeout: 30 * 60 * 1000 // 30 minutes
    },
    performance: {
        enabled: true,
        sampleRate: 0.1 // 10% of page loads
    }
};

class Logger {
    constructor(config = {}) {
        this.config = {
            ...defaultConfig,
            ...config
        };
        
        this.logQueue = [];
        this.userSession = null;
        this.performanceMetrics = {};
        this.initialized = false;
        
        // Initialize the logger
        this.initialize();
    }
    
    /**
     * Initialize the logger
     */
    initialize() {
        if (this.initialized) return;
        
        // Set up user session tracking
        if (this.config.userTracking.enabled) {
            this.setupUserTracking();
        }
        
        // Set up performance monitoring
        if (this.config.performance.enabled && 
            Math.random() < this.config.performance.sampleRate) {
            this.setupPerformanceMonitoring();
        }
        
        // Set up automatic log flushing
        if (this.config.remote.enabled) {
            this.flushInterval = setInterval(
                () => this.flushLogs(),
                this.config.remote.flushInterval
            );
            
            // Flush logs before page unload
            window.addEventListener('beforeunload', () => this.flushLogs(true));
        }
        
        // Log initialization
        this.initialized = true;
        this.info('Logger initialized', { environment: CONFIG.ENV.NODE_ENV });
    }
    
    /**
     * Set up user session tracking
     */
    setupUserTracking() {
        // Try to restore existing session
        const sessionId = localStore.get('user_session_id');
        const lastActivity = localStore.get('last_activity');
        const now = Date.now();
        
        // Check if session has expired
        if (sessionId && lastActivity && (now - lastActivity < this.config.userTracking.sessionTimeout)) {
            this.userSession = {
                id: sessionId,
                startTime: localStore.get('session_start_time') || now,
                pageViews: (localStore.get('session_page_views') || 0) + 1,
                lastActivity: now
            };
        } else {
            // Start new session
            this.userSession = {
                id: this.generateSessionId(),
                startTime: now,
                pageViews: 1,
                lastActivity: now
            };
            
            // Store session info
            localStore.set('user_session_id', this.userSession.id);
            localStore.set('session_start_time', this.userSession.startTime);
            
            // Log new session
            this.info('New user session started', {
                sessionId: this.userSession.id,
                referrer: document.referrer || 'direct',
                userAgent: navigator.userAgent,
                language: navigator.language,
                screen: {
                    width: window.screen.width,
                    height: window.screen.height,
                    colorDepth: window.screen.colorDepth
                },
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                doNotTrack: navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes' || false
            });
        }
        
        // Update session info
        localStore.set('last_activity', now);
        localStore.set('session_page_views', this.userSession.pageViews);
        
        // Track page view
        this.trackPageView();
    }
    
    /**
     * Set up performance monitoring
     */
    setupPerformanceMonitoring() {
        if (!window.performance || !window.performance.timing) return;
        
        // Store initial performance metrics
        this.performanceMetrics = {
            navigationStart: performance.timing.navigationStart,
            pageLoadTime: Date.now() - performance.timing.navigationStart,
            domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            domComplete: performance.timing.domComplete - performance.timing.navigationStart,
            networkLatency: performance.timing.responseStart - performance.timing.fetchStart,
            pageRender: performance.timing.domComplete - performance.timing.domLoading,
            firstPaint: performance.timing.domLoading - performance.timing.navigationStart,
            timeToFirstByte: performance.timing.responseStart - performance.timing.requestStart,
            domInteractive: performance.timing.domInteractive - performance.timing.navigationStart,
            domContentLoadedEventStart: performance.timing.domContentLoadedEventStart - performance.timing.navigationStart,
            domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            domComplete: performance.timing.domComplete - performance.timing.navigationStart,
            loadEventStart: performance.timing.loadEventStart - performance.timing.navigationStart,
            loadEventEnd: performance.timing.loadEventEnd - performance.timing.navigationStart
        };
        
        // Log performance metrics
        this.info('Page performance metrics', this.performanceMetrics);
    }
    
    /**
     * Track a page view
     */
    trackPageView() {
        if (!this.userSession) return;
        
        const pageData = {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer || 'direct',
            timestamp: new Date().toISOString(),
            sessionId: this.userSession.id,
            pageLoadTime: this.performanceMetrics?.pageLoadTime || 0,
            pageViewCount: this.userSession.pageViews
        };
        
        // Log page view
        this.info('Page view', pageData);
    }
    
    /**
     * Log a debug message
     */
    debug(message, data = {}) {
        this._log(LogLevel.DEBUG, message, data);
    }
    
    /**
     * Log an info message
     */
    info(message, data = {}) {
        this._log(LogLevel.INFO, message, data);
    }
    
    /**
     * Log a warning
     */
    warn(message, data = {}) {
        this._log(LogLevel.WARN, message, data);
    }
    
    /**
     * Log an error
     */
    error(message, error = null, data = {}) {
        if (error instanceof Error) {
            data.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
                ...data.error
            };
        } else if (error) {
            data.error = error;
        }
        
        this._log(LogLevel.ERROR, message, data);
    }
    
    /**
     * Log a critical error
     */
    critical(message, error = null, data = {}) {
        this.error(message, error, { ...data, isCritical: true });
        
        // For critical errors, also trigger error handling
        handleError(error || new Error(message), {
            context: data,
            showToUser: true
        });
    }
    
    /**
     * Track an event
     */
    event(name, properties = {}) {
        this._log(LogLevel.INFO, `Event: ${name}`, {
            event: name,
            ...properties,
            _type: 'event'
        });
    }
    
    /**
     * Track user identification
     */
    identify(userId, traits = {}) {
        this._log(LogLevel.INFO, 'User identified', {
            userId,
            traits,
            _type: 'identify'
        });
    }
    
    /**
     * Internal log method
     */
    _log(level, message, data = {}) {
        if (!this.initialized) {
            console.warn('Logger not initialized. Call logger.initialize() first.');
            return;
        }
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            level,
            message,
            timestamp,
            data,
            context: {
                url: window.location.href,
                path: window.location.pathname,
                sessionId: this.userSession?.id,
                userId: localStore.get('user_id'),
                environment: CONFIG.ENV.NODE_ENV,
                version: CONFIG.ENV.VERSION
            }
        };
        
        // Add to console if enabled and level is sufficient
        if (this.config.console.enabled && 
            this._shouldLog(level, this.config.console.level)) {
            this._logToConsole(level, logEntry);
        }
        
        // Add to queue for remote logging if enabled and level is sufficient
        if (this.config.remote.enabled && 
            this._shouldLog(level, this.config.remote.level)) {
            this._addToQueue(logEntry);
        }
        
        return logEntry;
    }
    
    /**
     * Determine if a log level should be logged based on minimum level
     */
    _shouldLog(level, minLevel) {
        const levels = Object.values(LogLevel);
        const levelIndex = levels.indexOf(level);
        const minLevelIndex = levels.indexOf(minLevel);
        
        return levelIndex >= minLevelIndex;
    }
    
    /**
     * Log to console with appropriate styling
     */
    _logToConsole(level, entry) {
        const styles = {
            [LogLevel.DEBUG]: 'color: #666;',
            [LogLevel.INFO]: 'color: #2b73b7;',
            [LogLevel.WARN]: 'color: #e67e22;',
            [LogLevel.ERROR]: 'color: #e74c3c; font-weight: bold;',
            [LogLevel.CRITICAL]: 'color: #fff; background: #c0392b; padding: 2px 4px; border-radius: 2px; font-weight: bold;'
        };
        
        const style = styles[level] || '';
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();
        const prefix = `%c[${timestamp}] [${level.toUpperCase()}]`;
        
        console.groupCollapsed(`${prefix} ${entry.message}`, style);
        console.log('Context:', entry.context);
        
        if (Object.keys(entry.data).length > 0) {
            console.log('Data:', entry.data);
        }
        
        if (entry.data.error?.stack) {
            console.log('Stack:', entry.data.error.stack);
        }
        
        console.groupEnd();
    }
    
    /**
     * Add log entry to queue for remote logging
     */
    _addToQueue(entry) {
        this.logQueue.push(entry);
        
        // Flush if queue reaches batch size
        if (this.logQueue.length >= this.config.remote.batchSize) {
            this.flushLogs();
        }
        
        // Trim queue if it gets too large
        if (this.logQueue.length > this.config.remote.maxQueueSize) {
            this.logQueue = this.logQueue.slice(-this.config.remote.maxQueueSize);
        }
    }
    
    /**
     * Flush logs to remote server
     */
    async flushLogs(force = false) {
        if (this.flushing && !force) return;
        
        const logsToSend = [...this.logQueue];
        this.logQueue = [];
        
        if (logsToSend.length === 0) return;
        
        this.flushing = true;
        
        try {
            // In a real app, you would send the logs to your server
            // For now, we'll just log them to the console
            if (this.config.console.enabled) {
                console.groupCollapsed(`[Logger] Flushing ${logsToSend.length} logs to server`);
                logsToSend.forEach(log => console.log(log));
                console.groupEnd();
            }
            
            // Simulate network request
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // In a real app, you would do something like:
            // await fetch(this.config.remote.endpoint, {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify({
            //         logs: logsToSend,
            //         sessionId: this.userSession?.id,
            //         timestamp: new Date().toISOString()
            //     })
            // });
            
        } catch (error) {
            console.error('Failed to send logs:', error);
            
            // Requeue failed logs
            this.logQueue.unshift(...logsToSend);
            
            // Trim queue if it gets too large
            if (this.logQueue.length > this.config.remote.maxQueueSize) {
                this.logQueue = this.logQueue.slice(-this.config.remote.maxQueueSize);
            }
            
        } finally {
            this.flushing = false;
        }
    }
    
    /**
     * Generate a unique session ID
     */
    generateSessionId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    /**
     * Get the current session ID
     */
    getSessionId() {
        return this.userSession?.id || localStore.get('user_session_id');
    }
    
    /**
     * Set a user ID for the current session
     */
    setUserId(userId) {
        localStore.set('user_id', userId);
        this.identify(userId);
    }
    
    /**
     * Clear the current user ID
     */
    clearUserId() {
        localStore.remove('user_id');
    }
    
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    
    /**
     * Get the current log queue (for debugging)
     */
    getLogQueue() {
        return [...this.logQueue];
    }
}

// Create a singleton instance
const logger = new Logger();

export default logger;
