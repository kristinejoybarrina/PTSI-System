/**
 * Form Validation Utility
 * 
 * Provides a declarative way to validate form fields with support for
 * custom validators, async validation, and i18n error messages.
 */

import i18n from './i18n';

// Built-in validators
const validators = {
    /**
     * Required field validator
     */
    required: (value, options = {}) => {
        const { message } = options;
        
        if (value === undefined || value === null || value === '') {
            return message || i18n.t('validation.required');
        }
        
        // Handle arrays and strings with whitespace
        if (Array.isArray(value) && value.length === 0) {
            return message || i18n.t('validation.required');
        }
        
        if (typeof value === 'string' && value.trim() === '') {
            return message || i18n.t('validation.required');
        }
        
        return null;
    },
    
    /**
     * Minimum length validator
     */
    minLength: (value, options) => {
        const { min, message } = options;
        
        if (value === undefined || value === null || value === '') {
            return null; // Let required handle empty values
        }
        
        if (typeof value === 'string' && value.length < min) {
            return message || i18n.t('validation.min_length', { min });
        }
        
        if (Array.isArray(value) && value.length < min) {
            return message || i18n.t('validation.min_length', { min });
        }
        
        return null;
    },
    
    /**
     * Maximum length validator
     */
    maxLength: (value, options) => {
        const { max, message } = options;
        
        if (!value) return null; // Skip validation for empty values
        
        if (typeof value === 'string' && value.length > max) {
            return message || i18n.t('validation.max_length', { max });
        }
        
        if (Array.isArray(value) && value.length > max) {
            return message || i18n.t('validation.max_length', { max });
        }
        
        return null;
    },
    
    /**
     * Email validator
     */
    email: (value, options = {}) => {
        const { message } = options;
        
        if (!value) return null; // Skip validation for empty values
        
        // Simple email regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return message || i18n.t('validation.email');
        }
        
        return null;
    },
    
    /**
     * Pattern validator (regex)
     */
    pattern: (value, options) => {
        const { pattern, message } = options;
        
        if (!value) return null; // Skip validation for empty values
        
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        if (!regex.test(value)) {
            return message || i18n.t('validation.invalid_format');
        }
        
        return null;
    },
    
    /**
     * Numeric range validator
     */
    range: (value, options) => {
        const { min, max, message } = options;
        
        if (value === undefined || value === null || value === '') {
            return null; // Skip validation for empty values
        }
        
        const num = Number(value);
        if (isNaN(num)) {
            return i18n.t('validation.invalid_number');
        }
        
        if ((min !== undefined && num < min) || (max !== undefined && num > max)) {
            return message || i18n.t('validation.range', { min, max });
        }
        
        return null;
    },
    
    /**
     * Equality validator (for password confirmation, etc.)
     */
    equals: (value, options) => {
        const { field, message } = options;
        
        if (!value) return null; // Skip validation for empty values
        
        const otherValue = typeof field === 'function' ? field() : field;
        
        if (value !== otherValue) {
            return message || i18n.t('validation.fields_dont_match');
        }
        
        return null;
    },
    
    /**
     * Custom validator function
     */
    custom: (value, options) => {
        const { validate, message } = options;
        
        if (!validate) {
            throw new Error('Custom validator requires a validate function');
        }
        
        const result = validate(value);
        
        if (result === false || typeof result === 'string') {
            return message || result || i18n.t('validation.invalid');
        }
        
        return null;
    },
    
    /**
     * Async validator (returns a promise)
     */
    async: async (value, options) => {
        const { validate, message } = options;
        
        if (!validate) {
            throw new Error('Async validator requires a validate function');
        }
        
        try {
            const result = await validate(value);
            
            if (result === false || typeof result === 'string') {
                return message || result || i18n.t('validation.invalid');
            }
            
            return null;
        } catch (error) {
            console.error('Async validation error:', error);
            return i18n.t('error.server');
        }
    }
};

/**
 * Validation result class
 */
class ValidationResult {
    constructor() {
        this.isValid = true;
        this.errors = {};
        this.fields = {};
    }
    
    /**
     * Add an error for a field
     */
    addError(field, error) {
        if (!this.errors[field]) {
            this.errors[field] = [];
        }
        
        this.errors[field].push(error);
        this.isValid = false;
        
        if (!this.fields[field]) {
            this.fields[field] = { isValid: false, errors: [] };
        }
        
        this.fields[field].isValid = false;
        this.fields[field].errors.push(error);
    }
    
    /**
     * Get the first error for a field
     */
    getFirstError(field) {
        return this.errors[field] && this.errors[field][0];
    }
    
    /**
     * Check if a field has errors
     */
    hasError(field) {
        return !!(this.errors[field] && this.errors[field].length > 0);
    }
    
    /**
     * Get all errors as a flat array
     */
    getAllErrors() {
        return Object.values(this.errors).flat();
    }
    
    /**
     * Merge another validation result into this one
     */
    merge(otherResult) {
        if (!(otherResult instanceof ValidationResult)) {
            throw new Error('Can only merge with another ValidationResult');
        }
        
        this.isValid = this.isValid && otherResult.isValid;
        
        // Merge errors
        Object.entries(otherResult.errors).forEach(([field, errors]) => {
            if (!this.errors[field]) {
                this.errors[field] = [];
            }
            this.errors[field].push(...errors);
        });
        
        // Merge fields
        Object.entries(otherResult.fields).forEach(([field, fieldData]) => {
            if (!this.fields[field]) {
                this.fields[field] = { isValid: true, errors: [] };
            }
            
            this.fields[field].isValid = this.fields[field].isValid && fieldData.isValid;
            this.fields[field].errors.push(...fieldData.errors);
        });
        
        return this;
    }
}

/**
 * Validate a single value against validation rules
 */
function validateValue(value, rules = []) {
    const result = {
        isValid: true,
        errors: []
    };
    
    if (!Array.isArray(rules)) {
        rules = [rules];
    }
    
    for (const rule of rules) {
        if (!rule) continue;
        
        const validatorName = typeof rule === 'string' ? rule : rule.rule || 'custom';
        const validator = validators[validatorName];
        
        if (!validator) {
            console.warn(`Validator '${validatorName}' not found`);
            continue;
        }
        
        const options = typeof rule === 'object' ? rule : {};
        
        // Handle async validators
        if (validatorName === 'async' || validator.constructor.name === 'AsyncFunction') {
            return validator(value, options).then(error => ({
                isValid: !error,
                errors: error ? [error] : []
            }));
        }
        
        // Sync validators
        const error = validator(value, options);
        
        if (error) {
            result.isValid = false;
            result.errors.push(error);
        }
    }
    
    return Promise.resolve(result);
}

/**
 * Validate a form or object against a validation schema
 */
function validateForm(data, schema) {
    const result = new ValidationResult();
    const promises = [];
    
    // Handle HTMLFormElement
    if (data instanceof HTMLFormElement) {
        const formData = new FormData(data);
        data = {};
        
        for (const [key, value] of formData.entries()) {
            // Handle multiple values for the same field (e.g., checkboxes)
            if (key in data) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        }
    }
    
    // Validate each field in the schema
    for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];
        const fieldResult = validateValue(value, rules);
        
        if (fieldResult instanceof Promise) {
            promises.push(
                fieldResult.then(({ isValid, errors }) => {
                    if (!isValid) {
                        errors.forEach(error => result.addError(field, error));
                    }
                })
            );
        } else if (!fieldResult.isValid) {
            fieldResult.errors.forEach(error => result.addError(field, error));
        }
    }
    
    // Wait for all async validations to complete
    if (promises.length > 0) {
        return Promise.all(promises).then(() => result);
    }
    
    return Promise.resolve(result);
}

/**
 * Create a validation schema
 */
function createSchema(schema) {
    return {
        validate: (data) => validateForm(data, schema)
    };
}

// Export the validation utilities
export {
    validators,
    validateValue,
    validateForm,
    createSchema,
    ValidationResult
};

// Default export for convenience
export default {
    validators,
    validateValue,
    validateForm,
    createSchema,
    ValidationResult
};
