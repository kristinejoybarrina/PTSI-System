/**
 * Form Handler Utility
 * 
 * Provides a consistent way to handle form submissions with validation,
 * error handling, and security features.
 */

import { handleError, showUserNotification } from './errorHandler';
import { hashPassword } from './security';
import CONFIG from './config';

// Default form options
const defaultOptions = {
    validate: true,
    showLoader: true,
    showSuccess: true,
    showErrors: true,
    resetOnSuccess: false,
    redirectOnSuccess: null,
    beforeSubmit: null,
    afterSubmit: null,
    onSuccess: null,
    onError: null,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

/**
 * Handles form submission with validation and error handling
 * @param {HTMLFormElement} form - The form element to handle
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} The response data
 */
export async function handleFormSubmit(form, options = {}) {
    // Merge default options with provided options
    const opts = { ...defaultOptions, ...options };
    const formData = new FormData(form);
    
    try {
        // Show loading state
        if (opts.showLoader) {
            setFormLoading(form, true);
        }
        
        // Call beforeSubmit hook if provided
        if (typeof opts.beforeSubmit === 'function') {
            await opts.beforeSubmit(formData);
        }
        
        // Validate form if enabled
        if (opts.validate && !form.checkValidity()) {
            // Trigger HTML5 validation UI
            const submitButton = form.querySelector('[type="submit"]');
            if (submitButton) {
                submitButton.click();
            } else {
                form.reportValidity();
            }
            throw new Error('Please fill in all required fields');
        }
        
        // Process form data
        const processedData = await processFormData(form, formData, opts);
        
        // Make API request
        const response = await submitForm(form, processedData, opts);
        
        // Handle successful response
        if (opts.showSuccess) {
            const successMessage = form.dataset.successMessage || 'Form submitted successfully';
            showUserNotification(successMessage, 'success');
        }
        
        // Call onSuccess callback if provided
        if (typeof opts.onSuccess === 'function') {
            await opts.onSuccess(response, form);
        }
        
        // Reset form if enabled
        if (opts.resetOnSuccess) {
            form.reset();
        }
        
        // Redirect if specified
        if (opts.redirectOnSuccess) {
            window.location.href = opts.redirectOnSuccess;
        }
        
        // Call afterSubmit hook if provided
        if (typeof opts.afterSubmit === 'function') {
            await opts.afterSubmit(response, form);
        }
        
        return response;
        
    } catch (error) {
        // Handle errors
        if (opts.showErrors) {
            handleError(error, {
                context: { form: form.id || 'unknown', action: form.action },
                showToUser: true,
                customMessage: error.message,
                onError: opts.onError
            });
        }
        
        // Re-throw the error for further handling if needed
        throw error;
        
    } finally {
        // Reset loading state
        if (opts.showLoader) {
            setFormLoading(form, false);
        }
    }
}

/**
 * Process form data before submission
 * @private
 */
async function processFormData(form, formData, options) {
    const data = {};
    const passwordFields = [];
    
    // Convert FormData to object and identify password fields
    for (const [key, value] of formData.entries()) {
        data[key] = value;
        
        // Check if this is a password field
        const input = form.querySelector(`[name="${key}"]`);
        if (input?.type === 'password') {
            passwordFields.push(key);
        }
    }
    
    // Hash password fields if needed
    if (passwordFields.length > 0) {
        await Promise.all(
            passwordFields.map(async (field) => {
                if (data[field]) {
                    data[field] = await hashPassword(data[field]);
                }
            })
        );
    }
    
    return options.processData ? options.processData(data, form) : data;
}

/**
 * Submit form data to the server
 * @private
 */
async function submitForm(form, data, options) {
    const url = options.url || form.action || window.location.href;
    const method = (options.method || form.method || 'POST').toUpperCase();
    
    // Add CSRF token if needed
    const headers = { ...options.headers };
    if (window.auth?.sessionManager?.getCSRFToken) {
        headers['X-CSRF-Token'] = window.auth.sessionManager.getCSRFToken();
    }
    
    // Make the request
    const response = await fetch(url, {
        method,
        headers,
        body: method === 'GET' ? null : JSON.stringify(data),
        credentials: 'same-origin'
    });
    
    // Parse response
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
    } else {
        responseData = await response.text();
    }
    
    // Handle non-2xx responses
    if (!response.ok) {
        const error = new Error(responseData.message || 'Request failed');
        error.status = response.status;
        error.response = responseData;
        throw error;
    }
    
    return responseData;
}

/**
 * Set form loading state
 * @param {HTMLFormElement} form - The form element
 * @param {boolean} isLoading - Whether the form is loading
 */
export function setFormLoading(form, isLoading) {
    if (!form) return;
    
    const buttons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
    const inputs = form.querySelectorAll('input, select, textarea, button');
    
    buttons.forEach(button => {
        if (isLoading) {
            button.disabled = true;
            button.setAttribute('data-original-text', button.textContent);
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        } else {
            button.disabled = false;
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.textContent = originalText;
                button.removeAttribute('data-original-text');
            }
        }
    });
    
    inputs.forEach(input => {
        if (input !== document.activeElement) {
            input.readOnly = isLoading;
        }
    });
    
    // Add/remove loading class to form
    if (isLoading) {
        form.classList.add('form-loading');
    } else {
        form.classList.remove('form-loading');
    }
}

/**
 * Initialize form with enhanced handling
 * @param {string|HTMLFormElement} formSelector - Form selector or element
 * @param {Object} options - Form handling options
 */
export function initForm(formSelector, options = {}) {
    const form = typeof formSelector === 'string' 
        ? document.querySelector(formSelector) 
        : formSelector;
    
    if (!form) {
        console.warn(`Form not found: ${formSelector}`);
        return;
    }
    
    // Prevent multiple initializations
    if (form._formHandlerInitialized) {
        return;
    }
    
    form._formHandlerInitialized = true;
    
    // Add novalidate to prevent default HTML5 validation
    form.setAttribute('novalidate', '');
    
    // Add submit handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleFormSubmit(form, options);
    });
    
    // Add real-time validation
    if (options.realTimeValidation) {
        const validateInput = (input) => {
            if (!input.willValidate) return;
            
            const isValid = input.checkValidity();
            const container = input.closest('.form-group') || input.parentElement;
            
            if (container) {
                // Remove existing validation classes
                container.classList.remove('is-valid', 'is-invalid');
                
                // Remove existing feedback
                const existingFeedback = container.querySelector('.valid-feedback, .invalid-feedback');
                if (existingFeedback) {
                    existingFeedback.remove();
                }
                
                // Add validation state
                if (input.value.trim() !== '') {
                    container.classList.add(isValid ? 'is-valid' : 'is-invalid');
                    
                    // Show validation message
                    if (!isValid && input.validationMessage) {
                        const feedback = document.createElement('div');
                        feedback.className = 'invalid-feedback';
                        feedback.textContent = input.validationMessage;
                        container.appendChild(feedback);
                    }
                }
            }
        };
        
        // Add input event listeners for real-time validation
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => validateInput(input));
            input.addEventListener('blur', () => validateInput(input));
        });
    }
    
    return form;
}

// Auto-initialize forms with data-form-handler attribute
document.addEventListener('DOMContentLoaded', () => {
    const forms = document.querySelectorAll('[data-form-handler]');
    forms.forEach(form => {
        try {
            const options = JSON.parse(form.dataset.formHandler || '{}');
            initForm(form, options);
        } catch (e) {
            console.error('Error initializing form:', e);
        }
    });
});
