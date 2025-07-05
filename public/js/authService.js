/**
 * Authentication Service
 * 
 * Handles user authentication, session management, and user state.
 * Integrates with the security utilities and API service.
 */

import { handleError } from './errorHandler';
import { generateToken, hashPassword } from './security';
import http from './api';
import CONFIG from './config';
import { showUserNotification } from './errorHandler';

// Session storage keys
const SESSION_KEY = 'auth_session';
const USER_KEY = 'auth_user';
const CSRF_KEY = 'auth_csrf';
const LOGIN_ATTEMPTS_KEY = 'login_attempts';
const LOCKOUT_UNTIL_KEY = 'lockout_until';

class AuthService {
    constructor() {
        this.session = this.getSession();
        this.user = this.getUser();
        this.csrfToken = this.getCSRFToken();
        this.loginAttempts = this.getLoginAttempts();
        this.lockoutUntil = this.getLockoutTime();
        
        // Auto-refresh session before it expires
        this.setupAutoRefresh();
        
        // Handle page visibility changes
        this.setupVisibilityHandlers();
    }
    
    /**
     * Log in a user with email and password
     * @param {string} email - User's email
     * @param {string} password - User's password
     * @param {boolean} rememberMe - Whether to remember the user
     * @returns {Promise<Object>} The user data
     */
    async login(email, password, rememberMe = false) {
        // Check if account is locked out
        if (this.isLockedOut()) {
            const remainingTime = Math.ceil((this.lockoutUntil - Date.now()) / 60000);
            throw new Error(`Too many failed attempts. Please try again in ${remainingTime} minutes.`);
        }
        
        try {
            // Hash the password client-side before sending
            const hashedPassword = await hashPassword(password);
            
            // Make login request
            const response = await http.post(CONFIG.API.ENDPOINTS.AUTH.LOGIN, {
                email,
                password: hashedPassword
            });
            
            // Start session
            await this.startSession({
                token: response.token,
                user: response.user,
                expiresIn: response.expiresIn || CONFIG.SECURITY.SESSION.MAX_AGE
            }, rememberMe);
            
            // Reset login attempts on successful login
            this.resetLoginAttempts();
            
            return response.user;
            
        } catch (error) {
            // Handle failed login attempts
            if (error.status === 401) {
                this.recordFailedLoginAttempt();
                
                const remainingAttempts = CONFIG.SECURITY.PASSWORD_POLICY.MAX_ATTEMPTS - this.loginAttempts;
                
                if (remainingAttempts <= 0) {
                    this.lockAccount();
                    const lockoutMinutes = CONFIG.SECURITY.PASSWORD_POLICY.LOCKOUT_TIME;
                    throw new Error(`Account locked. Too many failed attempts. Try again in ${lockoutMinutes} minutes.`);
                } else {
                    throw new Error(`Invalid email or password. ${remainingAttempts} attempts remaining.`);
                }
            }
            
            // Re-throw other errors
            throw error;
        }
    }
    
    /**
     * Log out the current user
     * @param {boolean} redirect - Whether to redirect to login page
     */
    logout(redirect = true) {
        // Clear session data
        this.clearSession();
        
        // Make logout request
        http.post(CONFIG.API.ENDPOINTS.AUTH.LOGOUT, {}, { handleErrors: false })
            .catch(error => console.error('Logout error:', error));
        
        // Redirect to login page if specified
        if (redirect) {
            window.location.href = '/login';
        }
    }
    
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} The created user data
     */
    async register(userData) {
        try {
            // Hash the password client-side before sending
            if (userData.password) {
                userData.password = await hashPassword(userData.password);
            }
            
            // Make registration request
            const response = await http.post(CONFIG.API.ENDPOINTS.AUTH.REGISTER, userData);
            
            // Auto-login after registration if token is returned
            if (response.token) {
                await this.startSession({
                    token: response.token,
                    user: response.user,
                    expiresIn: response.expiresIn || CONFIG.SECURITY.SESSION.MAX_AGE
                });
            }
            
            return response.user;
            
        } catch (error) {
            // Handle specific registration errors
            if (error.response && error.response.errors) {
                const errorMessages = Object.values(error.response.errors).flat();
                throw new Error(errorMessages.join('\n'));
            }
            
            throw error;
        }
    }
    
    /**
     * Start a new session
     * @private
     */
    async startSession({ token, user, expiresIn }, rememberMe = false) {
        // Calculate expiration time
        const expiresAt = Date.now() + (expiresIn * 1000);
        
        // Store session data
        this.session = { token, expiresAt };
        this.user = user;
        this.csrfToken = generateToken(32);
        
        // Store in appropriate storage
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(SESSION_KEY, JSON.stringify(this.session));
        storage.setItem(USER_KEY, JSON.stringify(this.user));
        
        // Store CSRF token in both session and local storage
        // for consistency across page reloads
        sessionStorage.setItem(CSRF_KEY, this.csrfToken);
        localStorage.setItem(CSRF_KEY, this.csrfToken);
        
        // Set up auto-refresh
        this.setupAutoRefresh(expiresIn);
        
        // Dispatch event
        this.dispatchAuthEvent('authChange', { isAuthenticated: true, user });
    }
    
    /**
     * Clear the current session
     * @private
     */
    clearSession() {
        // Clear from all storage
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(CSRF_KEY);
        
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(CSRF_KEY);
        
        // Clear instance properties
        this.session = null;
        this.user = null;
        this.csrfToken = null;
        
        // Clear auto-refresh timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        // Dispatch event
        this.dispatchAuthEvent('authChange', { isAuthenticated: false });
    }
    
    /**
     * Get the current session
     * @returns {Object|null} The current session or null if not authenticated
     */
    getSession() {
        if (this.session) return this.session;
        
        // Try to get from storage
        const sessionData = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
        
        if (!sessionData) return null;
        
        try {
            const session = JSON.parse(sessionData);
            
            // Check if session is expired
            if (session.expiresAt && session.expiresAt < Date.now()) {
                this.clearSession();
                return null;
            }
            
            return session;
            
        } catch (e) {
            console.error('Error parsing session data:', e);
            this.clearSession();
            return null;
        }
    }
    
    /**
     * Get the current user
     * @returns {Object|null} The current user or null if not authenticated
     */
    getUser() {
        if (this.user) return this.user;
        
        // Try to get from storage
        const userData = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
        
        if (!userData) return null;
        
        try {
            return JSON.parse(userData);
        } catch (e) {
            console.error('Error parsing user data:', e);
            return null;
        }
    }
    
    /**
     * Get the CSRF token
     * @returns {string|null} The CSRF token or null if not available
     */
    getCSRFToken() {
        return this.csrfToken || 
               sessionStorage.getItem(CSRF_KEY) || 
               localStorage.getItem(CSRF_KEY);
    }
    
    /**
     * Check if the user is authenticated
     * @returns {boolean} True if authenticated, false otherwise
     */
    isAuthenticated() {
        return !!this.getSession();
    }
    
    /**
     * Check if the current user has a specific role
     * @param {string|Array} role - The role or roles to check
     * @returns {boolean} True if the user has the role, false otherwise
     */
    hasRole(role) {
        const user = this.getUser();
        if (!user || !user.roles) return false;
        
        const userRoles = Array.isArray(user.roles) ? user.roles : [user.roles];
        const rolesToCheck = Array.isArray(role) ? role : [role];
        
        return rolesToCheck.some(r => userRoles.includes(r));
    }
    
    /**
     * Check if the current user has a specific permission
     * @param {string|Array} permission - The permission or permissions to check
     * @returns {boolean} True if the user has the permission, false otherwise
     */
    hasPermission(permission) {
        const user = this.getUser();
        if (!user || !user.permissions) return false;
        
        const userPermissions = Array.isArray(user.permissions) ? user.permissions : [user.permissions];
        const permsToCheck = Array.isArray(permission) ? permission : [permission];
        
        return permsToCheck.every(p => userPermissions.includes(p));
    }
    
    /**
     * Refresh the authentication token
     * @returns {Promise<boolean>} True if the token was refreshed, false otherwise
     */
    async refreshToken() {
        try {
            const response = await http.post(CONFIG.API.ENDPOINTS.AUTH.REFRESH_TOKEN, {}, {
                auth: false,
                handleErrors: false
            });
            
            if (response.token) {
                await this.startSession({
                    token: response.token,
                    user: response.user || this.getUser(),
                    expiresIn: response.expiresIn || CONFIG.SECURITY.SESSION.MAX_AGE
                });
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearSession();
            return false;
        }
    }
    
    /**
     * Set up auto-refresh of the authentication token
     * @private
     */
    setupAutoRefresh(expiresIn) {
        // Clear any existing timer
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        
        // Set up refresh to happen 5 minutes before expiration
        const refreshTime = Math.max(
            (expiresIn || CONFIG.SECURITY.SESSION.MAX_AGE) - 300,
            60
        ) * 1000; // Convert to milliseconds
        
        this.refreshTimer = setTimeout(() => {
            this.refreshToken().catch(console.error);
        }, refreshTime);
    }
    
    /**
     * Set up visibility change handlers
     * @private
     */
    setupVisibilityHandlers() {
        if (typeof document === 'undefined') return;
        
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Check if session is still valid when tab becomes visible again
                if (this.isAuthenticated()) {
                    this.refreshToken().catch(console.error);
                }
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    /**
     * Record a failed login attempt
     * @private
     */
    recordFailedLoginAttempt() {
        this.loginAttempts = (this.getLoginAttempts() || 0) + 1;
        sessionStorage.setItem(LOGIN_ATTEMPTS_KEY, this.loginAttempts);
    }
    
    /**
     * Get the number of login attempts
     * @private
     */
    getLoginAttempts() {
        return parseInt(sessionStorage.getItem(LOGIN_ATTEMPTS_KEY) || '0', 10);
    }
    
    /**
     * Reset the login attempt counter
     * @private
     */
    resetLoginAttempts() {
        this.loginAttempts = 0;
        sessionStorage.removeItem(LOGIN_ATTEMPTS_KEY);
        sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
        this.lockoutUntil = null;
    }
    
    /**
     * Lock the account after too many failed attempts
     * @private
     */
    lockAccount() {
        const lockoutTime = CONFIG.SECURITY.PASSWORD_POLICY.LOCKOUT_TIME * 60 * 1000; // Convert to milliseconds
        this.lockoutUntil = Date.now() + lockoutTime;
        sessionStorage.setItem(LOCKOUT_UNTIL_KEY, this.lockoutUntil);
    }
    
    /**
     * Get the lockout time
     * @private
     */
    getLockoutTime() {
        const lockoutTime = sessionStorage.getItem(LOCKOUT_UNTIL_KEY);
        return lockoutTime ? parseInt(lockoutTime, 10) : null;
    }
    
    /**
     * Check if the account is currently locked out
     * @returns {boolean} True if locked out, false otherwise
     */
    isLockedOut() {
        if (!this.lockoutUntil) {
            this.lockoutUntil = this.getLockoutTime();
        }
        
        if (this.lockoutUntil && this.lockoutUntil > Date.now()) {
            return true;
        }
        
        // Clear lockout if it has expired
        if (this.lockoutUntil) {
            this.resetLoginAttempts();
        }
        
        return false;
    }
    
    /**
     * Dispatch an authentication event
     * @private
     */
    dispatchAuthEvent(eventName, detail = {}) {
        if (typeof window === 'undefined') return;
        
        const event = new CustomEvent(`auth:${eventName}`, { 
            bubbles: true,
            cancelable: true,
            detail: {
                isAuthenticated: this.isAuthenticated(),
                user: this.getUser(),
                ...detail
            }
        });
        
        window.dispatchEvent(event);
    }
    
    /**
     * Add an event listener for authentication events
     * @param {string} eventName - The name of the event to listen for
     * @param {Function} callback - The callback function
     * @param {Object} [options] - Event listener options
     */
    on(eventName, callback, options) {
        if (typeof window === 'undefined') return () => {};
        
        const handler = (event) => callback(event.detail);
        window.addEventListener(`auth:${eventName}`, handler, options);
        
        // Return a function to remove the event listener
        return () => window.removeEventListener(`auth:${eventName}`, handler, options);
    }
}

// Create a singleton instance
export const authService = new AuthService();

// Expose to window for debugging in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    window.authService = authService;
}

export default authService;
