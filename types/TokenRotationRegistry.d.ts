export default TokenRotationRegistry;
/**
 * TokenRotationRegistry manages refresh token rotation to prevent replay attacks
 * Stores refresh token metadata including previous tokens for validation
 */
declare class TokenRotationRegistry {
    /**
     * Create a new TokenRotationRegistry
     * @param {Object} [options]
     * @param {AuthDB} [options.db] - AuthDB instance for persistence
     * @param {number} [options.maxAge=30*24*3_600_000] - Maximum age for tokens in milliseconds (30 days default)
     * @param {string} [options.location="."] - Location for persistence file
     */
    constructor(options?: {
        db?: AuthDB | undefined;
        maxAge?: number | undefined;
        location?: string | undefined;
    } | undefined);
    /** @type {string} */
    location: string;
    /**
     * Load registry from database
     * @returns {Promise<void>}
     */
    load(): Promise<void>;
    /**
     * Save registry to database
     * @returns {Promise<void>}
     */
    save(): Promise<void>;
    /**
     * Register a new refresh token
     * @param {string} token - Refresh token
     * @param {string} username - Associated username
     * @param {string|null} previousToken - Previous refresh token in rotation chain
     * @returns {void}
     */
    registerToken(token: string, username: string, previousToken?: string | null): void;
    /**
     * Validate refresh token and check if it's part of valid rotation chain
     * @param {string} token - Refresh token to validate
     * @param {string} username - Expected username
     * @returns {boolean} True if token is valid
     */
    validateToken(token: string, username: string): boolean;
    /**
     * Invalidate refresh token and its rotation chain
     * @param {string} token - Refresh token to invalidate
     * @returns {void}
     */
    invalidateToken(token: string): void;
    /**
     * Clear all tokens for a specific user
     * @param {string} username - Username to clear tokens for
     * @returns {void}
     */
    clearUserTokens(username: string): void;
    /**
     * Clear expired tokens from registry
     * @returns {void}
     */
    cleanup(): void;
    /**
     * Check if registry has token
     * @param {string} token - Token to check
     * @returns {boolean} True if registry contains token
     */
    has(token: string): boolean;
    /**
     * Get registry size
     * @returns {number} Number of entries in registry
     */
    get size(): number;
    #private;
}
import AuthDB from './AuthDB.js';
