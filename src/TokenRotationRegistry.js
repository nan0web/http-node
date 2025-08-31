import AuthDB from "./AuthDB.js"

/**
 * TokenRotationRegistry manages refresh token rotation to prevent replay attacks
 * Stores refresh token metadata including previous tokens for validation
 */
class TokenRotationRegistry {
	/** @type {Map<string, {username: string, createdAt: Date, previousToken: string|null}>} */
	#registry = new Map()

	/** @type {number} */
	#maxAge

	/** @type {AuthDB} */
	#db

	/** @type {string} */
	location

	/**
	 * Create a new TokenRotationRegistry
	 * @param {Object} options
	 * @param {AuthDB} options.db - AuthDB instance for persistence
	 * @param {number} [options.maxAge=30*24*3_600_000] - Maximum age for tokens in milliseconds (30 days default)
	 * @param {string} [options.location="."] - Maximum age for tokens in milliseconds (30 days default)
	 */
	constructor(options = {}) {
		const {
			db,
			maxAge = 30 * 24 * 60 * 60 * 1_000,
			location = ".token-rotation-registry"
		} = options
		this.#db = AuthDB.from(db)
		this.#maxAge = Number(maxAge)
		this.location = String(location)
	}

	/**
	 * Load registry from database
	 * @returns {Promise<void>}
	 */
	async load() {
		try {
			const data = await this.#db.loadDocument(this.location, {})
			for (const [token, entry] of Object.entries(data)) {
				this.#registry.set(token, {
					username: entry.username,
					createdAt: new Date(entry.createdAt),
					previousToken: entry.previousToken
				})
			}
		} catch (err) {
			// Registry file might not exist yet, that's okay
			if (err.code !== 'ENOENT') {
				throw err
			}
		}
	}

	/**
	 * Save registry to database
	 * @returns {Promise<void>}
	 */
	async save() {
		const data = {}
		for (const [token, entry] of this.#registry.entries()) {
			data[token] = {
				username: entry.username,
				createdAt: entry.createdAt.toISOString(),
				previousToken: entry.previousToken
			}
		}
		await this.#db.saveDocument(this.location, data)
	}

	/**
	 * Register a new refresh token
	 * @param {string} token - Refresh token
	 * @param {string} username - Associated username
	 * @param {string|null} previousToken - Previous refresh token in rotation chain
	 * @returns {void}
	 */
	registerToken(token, username, previousToken = null) {
		this.#registry.set(token, {
			username,
			createdAt: new Date(),
			previousToken
		})
	}

	/**
	 * Validate refresh token and check if it's part of valid rotation chain
	 * @param {string} token - Refresh token to validate
	 * @param {string} username - Expected username
	 * @returns {boolean} True if token is valid
	 */
	validateToken(token, username) {
		const entry = this.#registry.get(token)

		// Token doesn't exist
		if (!entry) {
			return false
		}

		// Token expired
		if (Date.now() - entry.createdAt.getTime() > this.#maxAge) {
			this.#registry.delete(token)
			return false
		}

		// Username mismatch
		if (entry.username !== username) {
			return false
		}

		return true
	}

	/**
	 * Invalidate refresh token and its rotation chain
	 * @param {string} token - Refresh token to invalidate
	 * @returns {void}
	 */
	invalidateToken(token) {
		const entry = this.#registry.get(token)
		if (!entry) return

		// Delete the token and all previous tokens in the chain
		let current = token
		while (current) {
			const currentEntry = this.#registry.get(current)
			if (!currentEntry) break

			this.#registry.delete(current)
			current = currentEntry.previousToken
		}
	}

	/**
	 * Clear all tokens for a specific user
	 * @param {string} username - Username to clear tokens for
	 * @returns {void}
	 */
	clearUserTokens(username) {
		for (const [token, entry] of this.#registry.entries()) {
			if (entry.username === username) {
				this.#registry.delete(token)
			}
		}
	}

	/**
	 * Clear expired tokens from registry
	 * @returns {void}
	 */
	cleanup() {
		const now = Date.now()
		for (const [token, entry] of this.#registry.entries()) {
			if (now - entry.createdAt.getTime() > this.#maxAge) {
				this.#registry.delete(token)
			}
		}
	}

	/**
	 * Check if registry has token
	 * @param {string} token - Token to check
	 * @returns {boolean} True if registry contains token
	 */
	has(token) {
		return this.#registry.has(token)
	}

	/**
	 * Get registry size
	 * @returns {number} Number of entries in registry
	 */
	get size() {
		return this.#registry.size
	}
}

export default TokenRotationRegistry
