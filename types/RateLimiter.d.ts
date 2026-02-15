export default RateLimiter;
/**
 * RateLimiter class manages request rate limiting by IP address.
 * Uses sliding window algorithm to allow concurrent requests.
 */
declare class RateLimiter {
    /**
     * @param {number} [maxAttempts=10] - Maximum number of allowed attempts per time window
     * @param {number} [windowMs=1000] - Time window in milliseconds
     */
    constructor(maxAttempts?: number | undefined, windowMs?: number | undefined);
    maxAttempts: number;
    windowMs: number;
    registry: Map<any, any>;
    /**
     * Attempts to register a new request for the given IP address.
     *
     * @param {string} ip - IP address to rate limit
     * @returns {Promise<boolean>} - TRUE if allowed, throws error if rate limit exceeded
     * @throws {Error} - Throws error 'Too many attempts' when ip exceeds maxAttempts
     */
    tryAttempt(ip: string): Promise<boolean>;
    /**
     * Removes rate limiting state for the given IP address
     * @param {string} ip - IP to clear
     * @returns {void}
     */
    clear(ip: string): void;
}
