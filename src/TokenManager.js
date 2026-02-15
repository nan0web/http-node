import crypto from 'node:crypto'

/**
 * Manages token creation and validation
 */
class TokenManager {
	static ACCESS_TOKEN_LIFETIME = 3600 * 1000 // 1 hour
	static REFRESH_TOKEN_LIFETIME = 30 * 24 * 3600 * 1000 // 30 days

	constructor(options = {}) {
		this.secret = options.secret || 'default-secret'
	}

	static from(options) {
		return new TokenManager(options)
	}

	createTokenPair(username) {
		const now = Date.now()
		const accessExpiry = new Date(now + TokenManager.ACCESS_TOKEN_LIFETIME)
		const refreshExpiry = new Date(now + TokenManager.REFRESH_TOKEN_LIFETIME)

		return {
			accessToken: this.generateToken(),
			refreshToken: this.generateToken(),
			accessExpiry,
			refreshExpiry,
		}
	}

	generateToken() {
		return crypto.randomBytes(32).toString('hex')
	}

	isRefreshValid(time) {
		const t = time instanceof Date ? time.getTime() : new Date(time).getTime()
		return Date.now() < t + TokenManager.REFRESH_TOKEN_LIFETIME
	}

	isAccessValid(time) {
		const t = time instanceof Date ? time.getTime() : new Date(time).getTime()
		return Date.now() < t + TokenManager.ACCESS_TOKEN_LIFETIME
	}
}

export default TokenManager
