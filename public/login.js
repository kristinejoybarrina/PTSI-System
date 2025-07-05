// login.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDA_dVWeUjfgWTJHTIkIomj6ALtD_Lre6g",
  authDomain: "ptsi-project-48025.firebaseapp.com",
  projectId: "ptsi-project-48025",
  storageBucket: "ptsi-project-48025.appspot.com",
  messagingSenderId: "761002258561",
  appId: "1:761002258561:web:1fce70be6b73c1b628dd80"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const rememberMeCheckbox = document.getElementById('rememberMe');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');

/**
 * Initialize the login form
 */
function initLoginForm() {
    if (!loginForm) return;
    
    // Load saved username if "Remember me" was checked
    loadRememberedUser();
    
    // Add form submission handler
    loginForm.addEventListener('submit', handleLogin);
    
    // Add input event listeners for real-time validation
    usernameInput?.addEventListener('input', clearError);
    passwordInput?.addEventListener('input', clearError);
    
    // Add keyboard navigation
    document.addEventListener('keydown', handleKeyDown);
}

/**
 * Handle form submission
 * @param {Event} event - The form submission event
 */
async function handleLogin(event) {
    event.preventDefault();
    
    // Reset messages
    clearMessages();
    
    try {
        // Check brute force protection
        // auth.checkBruteForceProtection();
        
        // Get form values
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const rememberMe = rememberMeCheckbox.checked;
        
        // Validate inputs
        if (!username || !password) {
            showError('Please enter both username and password');
            return;
        }
        
        // Show loading state
        setFormLoading(true);
        
        // Hash the password before sending
        const hashedPassword = await hashPassword(password);
        
        // Handle "Remember me" functionality
        if (rememberMe) {
            localStorage.setItem('rememberedUsername', username);
        } else {
            localStorage.removeItem('rememberedUsername');
        }
        
        // Send login request to server
        const snapshot = await getDocs(collection(db, "registrationForm"));
        let found = false;

        snapshot.forEach((doc) => {
            const user = doc.data();
            if (user.username === username && user.password === hashedPassword) {
                found = true;
            }
        });

        if (found) {
            // Login successful - start session
            // auth.sessionManager.startSession({
            //     id: data.userId,
            //     username: data.username,
            //     role: data.role,
            //     lastLogin: new Date().toISOString()
            // });
            
            // Show success message and redirect
            showSuccess('Login successful! Redirecting...');
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1500);
            
        } else {
            // Handle failed login
            // auth.incrementLoginAttempts();
            throw new Error('Invalid username or password.');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'An error occurred during login. Please try again.');
    } finally {
        setFormLoading(false);
    }
}

/**
 * Load remembered username from localStorage
 */
function loadRememberedUser() {
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername && usernameInput) {
        usernameInput.value = rememberedUsername;
        rememberMeCheckbox.checked = true;
        passwordInput.focus();
    }
}

/**
 * Handle keyboard navigation
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyDown(event) {
    // Submit form on Enter key
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        loginForm.dispatchEvent(new Event('submit'));
    }
}

/**
 * Show error message
 * @param {string} message - The error message to display
 */
function showError(message) {
    if (!errorMessage) return;
    
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Add error class to form inputs
    if (usernameInput?.value.trim() === '') {
        usernameInput.classList.add('is-invalid');
    }
    if (passwordInput?.value.trim() === '') {
        passwordInput.classList.add('is-invalid');
    }
}

/**
 * Show success message
 * @param {string} message - The success message to display
 */
function showSuccess(message) {
    if (!successMessage) return;
    
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Clear all error and success messages
 */
function clearMessages() {
    if (errorMessage) errorMessage.style.display = 'none';
    if (successMessage) successMessage.style.display = 'none';
    
    // Remove error classes from inputs
    usernameInput?.classList.remove('is-invalid');
    passwordInput?.classList.remove('is-invalid');
}

/**
 * Clear error message when user starts typing
 */
function clearError() {
    if (errorMessage) errorMessage.style.display = 'none';
    this.classList.remove('is-invalid');
}

/**
 * Set form loading state
 * @param {boolean} isLoading - Whether the form is loading
 */
function setFormLoading(isLoading) {
    const submitButton = loginForm?.querySelector('button[type="submit"]');
    if (!submitButton) return;
    
    if (isLoading) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Signing in...';
    } else {
        submitButton.disabled = false;
        submitButton.textContent = 'Sign In';
    }
}

// Initialize the login form when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initLoginForm);

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // Check session when user returns to the tab
        // const session = auth.sessionManager.getSession();
        // if (session) {
        //     // Update last activity
        //     auth.sessionManager.updateActivity();
        // }
    }
});
