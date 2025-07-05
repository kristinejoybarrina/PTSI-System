import { 
    generateSecureToken, 
    hashPassword, 
    validateCSRFToken,
    generateCSRFToken 
} from './js/security.js';

// Session and Authentication Management
const sessionManager = {
    /**
     * Starts a new user session with enhanced security
     * @param {Object} userData - User data to store in the session
     * @returns {string} The session token
     */
    startSession(userData) {
        const sessionToken = generateSecureToken();
        const sessionData = {
            user: {
                id: userData.id,
                email: userData.email,
                role: userData.role || 'user'
            },
            token: sessionToken,
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ip: '' // Will be set by the server
        };

        // Store in localStorage for persistence
        localStorage.setItem('userSession', JSON.stringify(sessionData));
        
        // Set secure cookie with HttpOnly and SameSite attributes
        document.cookie = `sessionToken=${sessionToken}; Path=/; Secure; SameSite=Strict; HttpOnly`;
        
        return sessionToken;
    },
    
    /**
     * Updates the last activity timestamp for the current session
     */
    updateActivity() {
        const session = this.getSession();
        if (session) {
            session.lastActivity = new Date().toISOString();
            localStorage.setItem('userSession', JSON.stringify(session));
        }
    },
    
    /**
     * Checks if the current session is valid
     * @returns {boolean} True if the session is valid
     */
    checkSession() {
        const session = this.getSession();
        if (!session) return false;
        
        // Check if session has expired (30 minutes of inactivity)
        const lastActivity = new Date(session.lastActivity);
        const inactiveTime = (new Date() - lastActivity) / 1000 / 60; // in minutes
        
        if (inactiveTime > 30) {
            this.endSession();
            return false;
        }
        
        // Update activity timestamp
        this.updateActivity();
        return true;
    },
    
    /**
     * Gets the current session data
     * @returns {Object|null} The session data or null if no session exists
     */
    getSession() {
        try {
            const sessionData = localStorage.getItem('userSession');
            if (!sessionData) return null;
            
            const session = JSON.parse(sessionData);
            
            // Verify the session token matches the cookie
            const cookies = document.cookie.split(';')
                .map(cookie => cookie.trim())
                .find(cookie => cookie.startsWith('sessionToken='));
                
            const token = cookies ? cookies.split('=')[1] : null;
            
            if (session.token !== token) {
                this.endSession();
                return null;
            }
            
            return session;
        } catch (error) {
            console.error('Error retrieving session:', error);
            this.endSession();
            return null;
        }
    },
    
    /**
     * Ends the current session and clears all session data
     */
    endSession() {
        // Clear localStorage
        localStorage.removeItem('userSession');
        
        // Clear session cookie
        document.cookie = 'sessionToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        // Redirect to login page
        window.location.href = 'index.html';
    },
    
    /**
     * Gets the CSRF token for the current session
     * @returns {string} The CSRF token
     */
    getCSRFToken() {
        return generateCSRFToken();
    },
    
    /**
     * Validates a CSRF token
     * @param {string} token - The token to validate
     * @returns {boolean} True if the token is valid
     */
    validateCSRFToken(token) {
        return validateCSRFToken(token);
    }
};

// Security Features
const securityConfig = {
    maxLoginAttempts: 5,
    lockoutTime: 15, // minutes
    loginAttemptsKey: 'loginAttempts',
    lockoutTimeKey: 'lockoutUntil'
};

/**
 * Checks if the current login attempt should be blocked due to too many failed attempts
 * @throws {Error} If the account is locked out
 */
function checkBruteForceProtection() {
    const now = new Date();
    const lockoutUntil = localStorage.getItem(securityConfig.lockoutTimeKey);
    
    // Check if account is locked out
    if (lockoutUntil && new Date(lockoutUntil) > now) {
        const waitTime = Math.ceil((new Date(lockoutUntil) - now) / 1000 / 60);
        throw new Error(`Account temporarily locked. Please try again in ${waitTime} minutes.`);
    }
    
    // Reset lockout if expired
    if (lockoutUntil && new Date(lockoutUntil) <= now) {
        localStorage.removeItem(securityConfig.lockoutTimeKey);
        localStorage.removeItem(securityConfig.loginAttemptsKey);
    }
}

/**
 * Increments the failed login attempt counter and locks the account if needed
 * @throws {Error} If the account is locked due to too many failed attempts
 */
function incrementLoginAttempts() {
    let attempts = parseInt(localStorage.getItem(securityConfig.loginAttemptsKey) || '0');
    attempts++;
    
    if (attempts >= securityConfig.maxLoginAttempts) {
        const lockoutUntil = new Date();
        lockoutUntil.setMinutes(lockoutUntil.getMinutes() + securityConfig.lockoutTime);
        
        localStorage.setItem(securityConfig.lockoutTimeKey, lockoutUntil.toISOString());
        localStorage.removeItem(securityConfig.loginAttemptsKey);
        
        throw new Error(
            `Too many failed attempts. Your account has been locked for ` +
            `${securityConfig.lockoutTime} minutes.`
        );
    }
    
    localStorage.setItem(securityConfig.loginAttemptsKey, attempts.toString());
}

// Initialize security features
(function initSecurity() {
    // Add security headers if not already present
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        const cspMeta = document.createElement('meta');
        cspMeta.httpEquiv = 'Content-Security-Policy';
        cspMeta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com;";
        document.head.appendChild(cspMeta);
    }
    
    // Add HSTS header
    if (!document.querySelector('meta[http-equiv="Strict-Transport-Security"]')) {
        const hstsMeta = document.createElement('meta');
        hstsMeta.httpEquiv = 'Strict-Transport-Security';
        hstsMeta.content = 'max-age=31536000; includeSubDomains; preload';
        document.head.appendChild(hstsMeta);
    }
})();

// Export the session manager and security functions
window.auth = {
    sessionManager,
    checkBruteForceProtection,
    incrementLoginAttempts,
    hashPassword,
    securityConfig
};
