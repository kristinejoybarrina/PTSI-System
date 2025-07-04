/**
 * Secure Storage Utility
 * 
 * Provides a secure way to store data in localStorage and sessionStorage
 * with encryption, expiration, and type safety.
 */

import { generateToken } from './security';
import CONFIG from './config';

// Prefix for all keys to avoid conflicts
const STORAGE_PREFIX = CONFIG.ENV.IS_PRODUCTION 
    ? 'pts_' 
    : 'pts_dev_';

// Encryption key for sensitive data
const ENCRYPTION_KEY = 'storage_encryption_key';

class SecureStorage {
    /**
     * Create a new SecureStorage instance
     * @param {Storage} storage - The storage implementation (localStorage or sessionStorage)
     * @param {Object} options - Configuration options
     * @param {boolean} options.encrypt - Whether to encrypt stored values
     * @param {string} options.prefix - Key prefix
     */
    constructor(storage, options = {}) {
        if (!storage) {
            throw new Error('Storage implementation is required');
        }
        
        this.storage = storage;
        this.options = {
            encrypt: true,
            prefix: STORAGE_PREFIX,
            ...options
        };
        
        // Generate or retrieve encryption key
        this.ensureEncryptionKey();
    }
    
    /**
     * Ensure encryption key exists in storage
     * @private
     */
    ensureEncryptionKey() {
        const keyName = `${this.options.prefix}${ENCRYPTION_KEY}`;
        
        // Try to get existing key
        let key = this.storage.getItem(keyName);
        
        // Generate new key if none exists
        if (!key) {
            key = generateToken(32);
            try {
                this.storage.setItem(keyName, key);
            } catch (e) {
                console.warn('Failed to store encryption key, falling back to in-memory key');
                // Fall back to in-memory key if storage is full
                this.encryptionKey = key;
            }
        }
        
        if (!this.encryptionKey) {
            this.encryptionKey = key;
        }
    }
    
    /**
     * Encrypt a value
     * @private
     */
    encrypt(value) {
        if (!this.options.encrypt) return value;
        
        try {
            // In a real app, you would use a proper encryption library like CryptoJS or Web Crypto API
            // This is a simplified example and NOT secure for production use
            return btoa(unescape(encodeURIComponent(
                JSON.stringify({
                    v: value,
                    t: Date.now(),
                    h: this.hash(value + this.encryptionKey)
                })
            )));
        } catch (e) {
            console.error('Encryption failed:', e);
            return value;
        }
    }
    
    /**
     * Decrypt a value
     * @private
     */
    decrypt(encrypted) {
        if (!this.options.encrypt) return encrypted;
        
        try {
            const decrypted = JSON.parse(decodeURIComponent(escape(atob(encrypted))));
            
            // Verify hash to detect tampering
            if (decrypted.h !== this.hash(decrypted.v + this.encryptionKey)) {
                console.warn('Tamper detected in stored data');
                return null;
            }
            
            return decrypted.v;
        } catch (e) {
            console.error('Decryption failed:', e);
            return encrypted;
        }
    }
    
    /**
     * Simple hash function for tamper detection
     * @private
     */
    hash(str) {
        // This is a simple hash function for demonstration
        // In production, use a proper hash function like SHA-256
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    }
    
    /**
     * Set a value in storage
     * @param {string} key - The key to set
     * @param {*} value - The value to store
     * @param {Object} options - Additional options
     * @param {number} options.expiresIn - Expiration time in seconds
     * @param {boolean} options.encrypt - Whether to encrypt the value
     */
    set(key, value, options = {}) {
        if (key === undefined || value === undefined) {
            throw new Error('Key and value are required');
        }
        
        const prefixedKey = this.options.prefix + key;
        const storageOptions = {
            encrypt: this.options.encrypt,
            ...options
        };
        
        const storageItem = {
            value,
            options: {
                expiresAt: options.expiresIn 
                    ? Date.now() + (options.expiresIn * 1000) 
                    : null,
                encrypted: storageOptions.encrypt,
                createdAt: Date.now()
            }
        };
        
        try {
            const serialized = JSON.stringify(storageItem);
            const finalValue = storageOptions.encrypt 
                ? this.encrypt(serialized) 
                : serialized;
                
            this.storage.setItem(prefixedKey, finalValue);
            return true;
        } catch (e) {
            console.error(`Failed to set item ${key}:`, e);
            return false;
        }
    }
    
    /**
     * Get a value from storage
     * @param {string} key - The key to get
     * @param {*} defaultValue - Default value if key doesn't exist or is expired
     * @returns {*} The stored value or defaultValue
     */
    get(key, defaultValue = null) {
        const prefixedKey = this.options.prefix + key;
        const item = this.storage.getItem(prefixedKey);
        
        if (item === null) {
            return defaultValue;
        }
        
        try {
            // Try to decrypt if needed
            let parsed;
            try {
                // Check if the value is encrypted by trying to parse it
                parsed = JSON.parse(item);
            } catch (e) {
                // If parsing fails, try to decrypt
                parsed = JSON.parse(this.decrypt(item));
            }
            
            // Check if the item has expired
            if (parsed.options.expiresAt && parsed.options.expiresAt < Date.now()) {
                this.remove(key);
                return defaultValue;
            }
            
            return parsed.value !== undefined ? parsed.value : defaultValue;
        } catch (e) {
            console.error(`Error parsing stored item ${key}:`, e);
            this.remove(key);
            return defaultValue;
        }
    }
    
    /**
     * Remove an item from storage
     * @param {string} key - The key to remove
     */
    remove(key) {
        const prefixedKey = this.options.prefix + key;
        this.storage.removeItem(prefixedKey);
    }
    
    /**
     * Clear all items with the current prefix
     */
    clear() {
        const keysToRemove = [];
        
        // Find all keys with our prefix
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key.startsWith(this.options.prefix) && key !== `${this.options.prefix}${ENCRYPTION_KEY}`) {
                keysToRemove.push(key);
            }
        }
        
        // Remove the keys
        keysToRemove.forEach(key => this.storage.removeItem(key));
    }
    
    /**
     * Get all keys with the current prefix
     * @returns {string[]} Array of keys
     */
    keys() {
        const keys = [];
        
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key.startsWith(this.options.prefix) && key !== `${this.options.prefix}${ENCRYPTION_KEY}`) {
                keys.push(key.substring(this.options.prefix.length));
            }
        }
        
        return keys;
    }
    
    /**
     * Check if a key exists
     * @param {string} key - The key to check
     * @returns {boolean} True if the key exists and is not expired
     */
    has(key) {
        const prefixedKey = this.options.prefix + key;
        const item = this.storage.getItem(prefixedKey);
        
        if (item === null) {
            return false;
        }
        
        try {
            let parsed;
            try {
                parsed = JSON.parse(item);
            } catch (e) {
                parsed = JSON.parse(this.decrypt(item));
            }
            
            // Check if expired
            if (parsed.options.expiresAt && parsed.options.expiresAt < Date.now()) {
                this.remove(key);
                return false;
            }
            
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Get the number of items with the current prefix
     * @returns {number} The number of items
     */
    size() {
        return this.keys().length;
    }
    
    /**
     * Set multiple items at once
     * @param {Object} items - Object of key-value pairs to store
     * @param {Object} options - Options to apply to all items
     */
    setItems(items, options = {}) {
        Object.entries(items).forEach(([key, value]) => {
            this.set(key, value, options);
        });
    }
    
    /**
     * Get multiple items at once
     * @param {string[]} keys - Array of keys to get
     * @returns {Object} Object with key-value pairs
     */
    getItems(keys) {
        return keys.reduce((result, key) => {
            result[key] = this.get(key);
            return result;
        }, {});
    }
    
    /**
     * Remove multiple items at once
     * @param {string[]} keys - Array of keys to remove
     */
    removeItems(keys) {
        keys.forEach(key => this.remove(key));
    }
    
    /**
     * Add an expiration time to an existing item
     * @param {string} key - The key of the item
     * @param {number} expiresIn - Expiration time in seconds from now
     * @returns {boolean} True if successful, false otherwise
     */
    setExpiration(key, expiresIn) {
        const value = this.get(key, undefined);
        
        if (value === undefined) {
            return false;
        }
        
        return this.set(key, value, { expiresIn });
    }
    
    /**
     * Get the remaining time until expiration in seconds
     * @param {string} key - The key of the item
     * @returns {number|null} Remaining time in seconds, or null if no expiration
     */
    getTimeUntilExpiration(key) {
        const prefixedKey = this.options.prefix + key;
        const item = this.storage.getItem(prefixedKey);
        
        if (item === null) {
            return null;
        }
        
        try {
            let parsed;
            try {
                parsed = JSON.parse(item);
            } catch (e) {
                parsed = JSON.parse(this.decrypt(item));
            }
            
            if (!parsed.options.expiresAt) {
                return null;
            }
            
            const remaining = parsed.options.expiresAt - Date.now();
            return Math.max(0, Math.ceil(remaining / 1000));
        } catch (e) {
            return null;
        }
    }
    
    /**
     * Clear expired items from storage
     * @returns {number} Number of items removed
     */
    clearExpired() {
        const keys = this.keys();
        let count = 0;
        
        keys.forEach(key => {
            // This will automatically remove expired items
            if (!this.has(key)) {
                count++;
            }
        });
        
        return count;
    }
}

// Create instances for localStorage and sessionStorage
export const localStore = new SecureStorage(
    typeof window !== 'undefined' ? window.localStorage : null,
    { encrypt: true }
);

export const sessionStore = new SecureStorage(
    typeof window !== 'undefined' ? window.sessionStorage : null,
    { encrypt: true }
);

// Export the class for custom instances
export default SecureStorage;
