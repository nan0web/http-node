import DBFS from '@nan0web/db-fs'
import { User } from '@nan0web/auth-core'
import { TokenExpiryService } from '@nan0web/auth-core'
import TokenManager from './TokenManager.js'

class AuthDB extends DBFS {
	static TOKEN_LIFETIME = 3_600_000
	/** @type {Map<string, {time: Date, username: string, isRefresh: boolean}>} */
	tokens = new Map()
	/** @type {Console} */
	logger
	/** @type {TokenExpiryService} */
	tokenExpiryService
	/** @type {TokenManager} */
	tokenManager

	constructor(input = {}) {
		super(input)
		const {
			logger = console,
			tokenLifetime = AuthDB.TOKEN_LIFETIME,
			tokenManager = new TokenManager(),
		} = input
		this.logger = logger
		this.tokenExpiryService = new TokenExpiryService(tokenLifetime)
		this.tokenManager = TokenManager.from(tokenManager)
	}

	async load() {
		await this.connect()
		for await (const entry of this.findStream('.')) {
			// filling up this.data
		}

		// Load all tokens into memory
		for (const [uri, value] of this.data.entries()) {
			if (!uri.endsWith('/tokens.json')) continue
			const data = value || (await this.loadDocument(uri, {}))
			const username = uri.split('/').slice(-2)[0]
			for (const [token, metadata] of Object.entries(data)) {
				this.tokens.set(token, {
					time: new Date(metadata.time),
					username,
					isRefresh: Boolean(metadata.isRefresh),
				})
			}
		}
	}

	getUserPath(username, suffix = '/') {
		const levelA = username.slice(0, 2).toLowerCase()
		const levelB = username.slice(2, 4).toLowerCase()
		return `users/${levelA}/${levelB}/${username}${suffix}`
	}

	/**
	 * @param {string} token
	 * @returns {Promise<User | null>} The user instance.
	 */
	async auth(token) {
		if (!token) {
			this.logger.debug('No token provided for authentication')
			return null
		}
		this.logger.debug('Authenticating user with token')
		try {
			const data = this.tokens.get(token)
			if (!data) {
				this.logger.debug('Token not found in auth')
				return null
			}

			if (data.isRefresh) {
				if (!this.tokenManager.isRefreshValid(data.time)) {
					await this.deleteToken(token)
					this.logger.debug('Refresh token expired during auth')
					return null
				}
			} else {
				if (!this.tokenManager.isAccessValid(data.time)) {
					await this.deleteToken(token)
					this.logger.debug('Access token expired during auth')
					return null
				}
			}

			const user = await this.getUser(data.username)
			if (!user) {
				this.logger.debug('User not found for token')
				return null
			}

			return user
		} catch (err) {
			this.logger.error('Authentication error:', err)
			return null
		}
	}

	async updateTokens(username, tokenPair) {
		const dir = this.getUserPath(username)
		const tokensPath = `${dir}tokens.json`

		// Store both tokens with their expiry times
		const tokens = await this.loadDocument(tokensPath, {})
		tokens[tokenPair.accessToken] = {
			time: tokenPair.accessExpiry.toISOString(),
			isRefresh: false,
		}
		tokens[tokenPair.refreshToken] = {
			time: tokenPair.refreshExpiry.toISOString(),
			isRefresh: true,
		}

		await this.saveDocument(tokensPath, tokens)

		// Update in-memory tokens
		this.tokens.set(tokenPair.accessToken, {
			time: tokenPair.accessExpiry,
			username,
			isRefresh: false,
		})
		this.tokens.set(tokenPair.refreshToken, {
			time: tokenPair.refreshExpiry,
			username,
			isRefresh: true,
		})
	}

	async deleteToken(token) {
		const tokenData = this.tokens.get(token)
		if (!tokenData) return false

		const { username } = tokenData
		const tokensPath = this.getUserPath(username) + 'tokens.json'

		this.tokens.delete(token)
		try {
			const tokens = await this.loadDocument(tokensPath, {})
			if (tokens[token]) {
				delete tokens[token]
				await this.saveDocument(tokensPath, tokens)
			}
			return true
		} catch (err) {
			if (/** @type {any} */ (err).code !== 'ENOENT') {
				this.logger.error('Failed to delete token', err)
			}
			return false
		}
	}

	/**
	 * @param {string} username
	 * @returns {Promise<boolean>} True on success, false on failure.
	 */
	async clearTokens(username) {
		const tokensPath = this.getUserPath(username) + 'tokens.json'
		try {
			await this.dropDocument(tokensPath)
			// Invalidate all existing tokens
			for (const [token, data] of this.tokens.entries()) {
				if (data.username === username) {
					this.tokens.delete(token)
				}
			}
			return true
		} catch (err) {
			this.logger.error('Failed to clear tokens', err)
			return false
		}
	}

	/**
	 * @throws
	 * @param {string} username
	 * @returns {Promise<User | null>}
	 */
	async getUser(username) {
		try {
			const data = await this.loadDocument(this.getUserPath(username) + 'info.json')
			if (!data) return null
			const tokens = await this.loadDocument(this.getUserPath(username) + 'tokens.json', {})
			return new User({ ...data, tokens })
		} catch (err) {
			this.logger.error('Failed to get User', err)
			if (/** @type {any} */ (err).code === 'ENOENT') return null
			throw err
		}
	}

	/**
	 * @param {User} user
	 * @returns {Promise<boolean>}
	 */
	async saveUser(user) {
		if (!/^[a-z0-9_-]{3,32}$/i.test(user.name)) {
			throw new Error('Invalid username format')
		}
		return this.saveDocument(`${this.getUserPath(user.name)}info.json`, user.toObject())
	}

	async deleteUser(username) {
		const path = this.getUserPath(username)
		await this.dropDocument(`${path}info.json`)
		await this.dropDocument(`${path}tokens.json`)
	}
}

export default AuthDB
