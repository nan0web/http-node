/**
 * RateLimiter class manages request rate limiting by IP address.
 * Uses sliding window algorithm to allow concurrent requests.
 */
class RateLimiter {
	/**
	 * @param {number} [maxAttempts=10] - Maximum number of allowed attempts per time window
	 * @param {number} [windowMs=1000] - Time window in milliseconds
	 */
	constructor(maxAttempts = 10, windowMs = 1000) {
		this.maxAttempts = maxAttempts
		this.windowMs = windowMs
		this.registry = new Map()
	}

	/**
	 * Attempts to register a new request for the given IP address.
	 *
	 * @param {string} ip - IP address to rate limit
	 * @returns {Promise<boolean>} - TRUE if allowed, throws error if rate limit exceeded
	 * @throws {Error} - Throws error 'Too many attempts' when ip exceeds maxAttempts
	 */
	async tryAttempt(ip) {
		const now = Date.now()
		const entry = this.registry.get(ip)

		if (entry) {
			if (now - entry.timestamp > this.windowMs) {
				// Reset counter after window
				this.registry.set(ip, {
					timestamp: now,
					count: 1
				})
				return true
			}

			if (entry.count >= this.maxAttempts) {
				throw new Error('Too many attempts')
			}

			// Increment counter
			this.registry.set(ip, {
				timestamp: entry.timestamp,
				count: entry.count + 1
			})
		} else {
			this.registry.set(ip, {
				timestamp: now,
				count: 1
			})
		}

		return true
	}

	/**
	 * Removes rate limiting state for the given IP address
	 * @param {string} ip - IP to clear
	 * @returns {void}
	 */
	clear(ip) {
		this.registry.delete(ip)
	}
}

export default RateLimiter
