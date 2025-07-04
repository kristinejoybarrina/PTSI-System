/**
 * Internationalization (i18n) Utility
 * 
 * Provides translation and localization support for the application.
 * Supports dynamic language switching and pluralization.
 */

import { localStore } from './storage';
import CONFIG from './config';

// Default language (English)
const DEFAULT_LANGUAGE = 'en';

// Supported languages with their display names
const SUPPORTED_LANGUAGES = {
    en: 'English',
    // Add more languages as needed
    // Example:
    // es: 'Español',
    // fr: 'Français',
    // tl: 'Tagalog'
};

// Default translations (English)
const DEFAULT_TRANSLATIONS = {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.submit': 'Submit',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    
    // Auth
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.confirm_password': 'Confirm Password',
    'auth.remember_me': 'Remember me',
    'auth.forgot_password': 'Forgot password?',
    'auth.reset_password': 'Reset Password',
    'auth.login_success': 'Successfully logged in',
    'auth.logout_success': 'Successfully logged out',
    'auth.invalid_credentials': 'Invalid email or password',
    'auth.unauthorized': 'You are not authorized to access this page',
    'auth.session_expired': 'Your session has expired. Please log in again.',
    
    // Validation
    'validation.required': 'This field is required',
    'validation.email': 'Please enter a valid email address',
    'validation.min_length': 'Must be at least {{min}} characters',
    'validation.max_length': 'Must be at most {{max}} characters',
    'validation.passwords_dont_match': 'Passwords do not match',
    'validation.invalid_date': 'Please enter a valid date',
    'validation.invalid_number': 'Please enter a valid number',
    
    // Errors
    'error.network': 'Network error. Please check your connection and try again.',
    'error.server': 'Server error. Please try again later.',
    'error.not_found': 'The requested resource was not found.',
    'error.permission_denied': 'You do not have permission to perform this action.',
    'error.invalid_request': 'Invalid request. Please check your input and try again.',
    
    // Months
    'month.january': 'January',
    'month.february': 'February',
    'month.march': 'March',
    'month.april': 'April',
    'month.may': 'May',
    'month.june': 'June',
    'month.july': 'July',
    'month.august': 'August',
    'month.september': 'September',
    'month.october': 'October',
    'month.november': 'November',
    'month.december': 'December',
    
    // Days
    'day.sunday': 'Sunday',
    'day.monday': 'Monday',
    'day.tuesday': 'Tuesday',
    'day.wednesday': 'Wednesday',
    'day.thursday': 'Thursday',
    'day.friday': 'Friday',
    'day.saturday': 'Saturday',
    
    // Time
    'time.just_now': 'just now',
    'time.minute_ago': '{{count}} minute ago',
    'time.minutes_ago': '{{count}} minutes ago',
    'time.hour_ago': '{{count}} hour ago',
    'time.hours_ago': '{{count}} hours ago',
    'time.day_ago': '{{count}} day ago',
    'time.days_ago': '{{count}} days ago',
    'time.week_ago': '{{count}} week ago',
    'time.weeks_ago': '{{count}} weeks ago',
    'time.month_ago': '{{count}} month ago',
    'time.months_ago': '{{count}} months ago',
    'time.year_ago': '{{count}} year ago',
    'time.years_ago': '{{count}} years ago'
};

// Additional translations can be added here
const TRANSLATIONS = {
    en: DEFAULT_TRANSLATIONS
};

class I18n {
    constructor() {
        this.language = this.detectLanguage();
        this.translations = {
            ...DEFAULT_TRANSLATIONS,
            ...(TRANSLATIONS[this.language] || {})
        };
        
        // Bind methods
        this.t = this.t.bind(this);
        this.tc = this.tc.bind(this);
        this.tn = this.tn.bind(this);
        this.setLanguage = this.setLanguage.bind(this);
    }
    
    /**
     * Detect the user's preferred language
     * @private
     */
    detectLanguage() {
        // 1. Check for saved language preference
        const savedLanguage = localStore.get('user_language');
        if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
            return savedLanguage;
        }
        
        // 2. Check browser language
        if (typeof navigator !== 'undefined') {
            const browserLanguages = [
                ...(navigator.languages || []),
                navigator.language,
                navigator.userLanguage,
                navigator.browserLanguage,
                navigator.systemLanguage
            ].filter(Boolean);
            
            for (const lang of browserLanguages) {
                const langCode = lang.split('-')[0].toLowerCase();
                if (SUPPORTED_LANGUAGES[langCode]) {
                    return langCode;
                }
            }
        }
        
        // 3. Default to English
        return DEFAULT_LANGUAGE;
    }
    
    /**
     * Set the current language
     * @param {string} language - The language code to set (e.g., 'en', 'es')
     * @returns {boolean} True if the language was set successfully
     */
    setLanguage(language) {
        if (!SUPPORTED_LANGUAGES[language]) {
            console.warn(`Language '${language}' is not supported`);
            return false;
        }
        
        this.language = language;
        this.translations = {
            ...DEFAULT_TRANSLATIONS,
            ...(TRANSLATIONS[language] || {})
        };
        
        // Save preference
        localStore.set('user_language', language);
        
        // Dispatch language change event
        this.dispatchLanguageChange();
        
        return true;
    }
    
    /**
     * Get the current language
     * @returns {string} The current language code
     */
    getLanguage() {
        return this.language;
    }
    
    /**
     * Get the display name of the current language
     * @returns {string} The display name of the current language
     */
    getLanguageName() {
        return SUPPORTED_LANGUAGES[this.language] || '';
    }
    
    /**
     * Get all supported languages
     * @returns {Object} Object mapping language codes to display names
     */
    getSupportedLanguages() {
        return { ...SUPPORTED_LANGUAGES };
    }
    
    /**
     * Translate a key
     * @param {string} key - The translation key
     * @param {Object} [params] - Parameters to interpolate
     * @returns {string} The translated string
     */
    t(key, params = {}) {
        let translation = this.translations[key] || key;
        
        // Replace placeholders with params
        if (params) {
            Object.entries(params).forEach(([param, value]) => {
                translation = translation.replace(new RegExp(`\\{\\{${param}\\}+`, 'g'), String(value));
            });
        }
        
        return translation;
    }
    
    /**
     * Translate a key with pluralization (simple)
     * @param {string} key - The translation key (should include both singular and plural forms)
     * @param {number} count - The count to determine singular/plural
     * @param {Object} [params] - Additional parameters to interpolate
     * @returns {string} The translated string
     */
    tc(key, count, params = {}) {
        return this.tn(key, key + '_plural', count, params);
    }
    
    /**
     * Translate a key with explicit singular/plural forms
     * @param {string} singularKey - The key for singular form
     * @param {string} pluralKey - The key for plural form
     * @param {number} count - The count to determine singular/plural
     * @param {Object} [params] - Additional parameters to interpolate
     * @returns {string} The translated string
     */
    tn(singularKey, pluralKey, count, params = {}) {
        const key = count === 1 ? singularKey : pluralKey;
        return this.t(key, { ...params, count });
    }
    
    /**
     * Format a date according to the current locale
     * @param {Date|string|number} date - The date to format
     * @param {Object} [options] - Intl.DateTimeFormat options
     * @returns {string} The formatted date string
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        
        const dateObj = date instanceof Date ? date : new Date(date);
        return dateObj.toLocaleDateString(this.language, { ...defaultOptions, ...options });
    }
    
    /**
     * Format a time according to the current locale
     * @param {Date|string|number} date - The date/time to format
     * @param {Object} [options] - Intl.DateTimeFormat options
     * @returns {string} The formatted time string
     */
    formatTime(date, options = {}) {
        const defaultOptions = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        };
        
        const dateObj = date instanceof Date ? date : new Date(date);
        return dateObj.toLocaleTimeString(this.language, { ...defaultOptions, ...options });
    }
    
    /**
     * Format a number according to the current locale
     * @param {number} number - The number to format
     * @param {Object} [options] - Intl.NumberFormat options
     * @returns {string} The formatted number string
     */
    formatNumber(number, options = {}) {
        return new Intl.NumberFormat(this.language, options).format(number);
    }
    
    /**
     * Format a currency value according to the current locale
     * @param {number} amount - The amount to format
     * @param {string} [currency='USD'] - The currency code
     * @param {Object} [options] - Intl.NumberFormat options
     * @returns {string} The formatted currency string
     */
    formatCurrency(amount, currency = 'USD', options = {}) {
        const defaultOptions = {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        };
        
        return this.formatNumber(amount, { ...defaultOptions, ...options });
    }
    
    /**
     * Format a relative time (e.g., "2 hours ago")
     * @param {Date|string|number} date - The date to format
     * @returns {string} The formatted relative time string
     */
    formatRelativeTime(date) {
        const now = new Date();
        const dateObj = date instanceof Date ? date : new Date(date);
        const diffInSeconds = Math.floor((now - dateObj) / 1000);
        
        if (diffInSeconds < 60) {
            return this.t('time.just_now');
        }
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return this.tc('time.minute_ago', diffInMinutes, { count: diffInMinutes });
        }
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return this.tc('time.hour_ago', diffInHours, { count: diffInHours });
        }
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return this.tc('time.day_ago', diffInDays, { count: diffInDays });
        }
        
        const diffInWeeks = Math.floor(diffInDays / 7);
        if (diffInWeeks < 4) {
            return this.tc('time.week_ago', diffInWeeks, { count: diffInWeeks });
        }
        
        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) {
            return this.tc('time.month_ago', diffInMonths, { count: diffInMonths });
        }
        
        const diffInYears = Math.floor(diffInMonths / 12);
        return this.tc('time.year_ago', diffInYears, { count: diffInYears });
    }
    
    /**
     * Add translations for a specific language
     * @param {string} language - The language code
     * @param {Object} translations - The translations to add
     * @param {boolean} [merge=true] - Whether to merge with existing translations
     */
    addTranslations(language, translations, merge = true) {
        if (!TRANSLATIONS[language]) {
            TRANSLATIONS[language] = {};
        }
        
        if (merge) {
            TRANSLATIONS[language] = {
                ...TRANSLATIONS[language],
                ...translations
            };
        } else {
            TRANSLATIONS[language] = translations;
        }
        
        // Update current translations if this is the active language
        if (language === this.language) {
            this.translations = {
                ...DEFAULT_TRANSLATIONS,
                ...TRANSLATIONS[language]
            };
            
            // Notify listeners
            this.dispatchLanguageChange();
        }
    }
    
    /**
     * Dispatch a language change event
     * @private
     */
    dispatchLanguageChange() {
        if (typeof window === 'undefined') return;
        
        const event = new CustomEvent('languageChange', {
            detail: {
                language: this.language,
                languageName: this.getLanguageName()
            }
        });
        
        window.dispatchEvent(event);
    }
    
    /**
     * Initialize i18n with custom configuration
     * @param {Object} config - Configuration options
     * @param {string} [config.defaultLanguage] - Default language code
     * @param {Object} [config.translations] - Additional translations
     * @param {Object} [config.supportedLanguages] - Additional supported languages
     */
    static init(config = {}) {
        const instance = new I18n();
        
        // Set default language if provided
        if (config.defaultLanguage && SUPPORTED_LANGUAGES[config.defaultLanguage]) {
            instance.setLanguage(config.defaultLanguage);
        }
        
        // Add translations if provided
        if (config.translations) {
            Object.entries(config.translations).forEach(([lang, translations]) => {
                instance.addTranslations(lang, translations);
            });
        }
        
        // Add supported languages if provided
        if (config.supportedLanguages) {
            Object.assign(SUPPORTED_LANGUAGES, config.supportedLanguages);
        }
        
        return instance;
    }
}

// Create a singleton instance
const i18n = I18n.init();

// Expose to window for easy access in templates
if (typeof window !== 'undefined') {
    window.i18n = i18n;
}

export default i18n;
