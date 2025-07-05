// Security utilities for the application

/**
 * Generates a secure random token
 * @returns {string} A secure random token
 */
function generateSecureToken() {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes a password using SHA-256
 * @param {string} password - The password to hash
 * @returns {Promise<string>} A promise that resolves to the hashed password
 */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates password strength
 * @param {string} password - The password to validate
 * @returns {Object} An object with validation results
 */
function validatePasswordStrength(password) {
    const requirements = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const isValid = Object.values(requirements).every(Boolean);
    const score = Object.values(requirements).filter(Boolean).length;
    
    return {
        isValid,
        score,
        requirements
    };
}

/**
 * Generates a CSRF token and stores it in the session
 * @returns {string} The generated CSRF token
 */
function generateCSRFToken() {
    const token = generateSecureToken();
    sessionStorage.setItem('csrfToken', token);
    return token;
}

/**
 * Validates a CSRF token
 * @param {string} token - The token to validate
 * @returns {boolean} True if the token is valid
 */
function validateCSRFToken(token) {
    const storedToken = sessionStorage.getItem('csrfToken');
    return token === storedToken;
}

export {
    generateSecureToken,
    hashPassword,
    validatePasswordStrength,
    generateCSRFToken,
    validateCSRFToken
};
