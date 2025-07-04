// Session and Authentication Management
const sessionManager = {
    startSession(userData) {
        sessionStorage.setItem('userSession', JSON.stringify({
            ...userData,
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        }));
    },
    
    updateActivity() {
        const session = this.getSession();
        if (session) {
            session.lastActivity = new Date().toISOString();
            sessionStorage.setItem('userSession', JSON.stringify(session));
        }
    },
    
    checkSession() {
        const session = this.getSession();
        if (!session) return false;
        
        const lastActivity = new Date(session.lastActivity);
        const inactiveTime = (new Date() - lastActivity) / 1000 / 60; // in minutes
        
        if (inactiveTime > 30) { // 30 minutes timeout
            this.endSession();
            return false;
        }
        return true;
    },
    
    getSession() {
        const sessionData = sessionStorage.getItem('userSession');
        return sessionData ? JSON.parse(sessionData) : null;
    },
    
    endSession() {
        sessionStorage.removeItem('userSession');
        window.location.href = 'index.html';
    }
};

// Security Features
let loginAttempts = 0;
const maxAttempts = 3;
let lockoutTime = null;

function checkBruteForceProtection() {
    if (lockoutTime && new Date() < lockoutTime) {
        const waitTime = Math.ceil((lockoutTime - new Date()) / 1000);
        throw new Error(`Please wait ${waitTime} seconds before trying again`);
    }
}

function incrementLoginAttempts() {
    loginAttempts++;
    if (loginAttempts >= maxAttempts) {
        lockoutTime = new Date(Date.now() + 5 * 60000); // 5 minutes lockout
        loginAttempts = 0;
        throw new Error('Too many failed attempts. Please try again in 5 minutes.');
    }
}

// Export the session manager and security functions
window.auth = {
    sessionManager,
    checkBruteForceProtection,
    incrementLoginAttempts
};
