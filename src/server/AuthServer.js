// @ts-nocheck
import { Router, Server } from '@nan0web/http-node'
import crypto from 'node:crypto'
import { resolve } from 'node:path'
import process from 'node:process'
import { User } from '@nan0web/auth-core'
import AccessControl from '../AccessControl.js'
import AuthDB from '../AuthDB.js'
import IncomingMessage from '../IncomingMessage.js'
import RateLimiter from '../RateLimiter.js'
import ServerConfig from '../ServerConfig.js'
import ServerResponse from '../ServerResponse.js'
import TokenManager from '../TokenManager.js'
import TokenRotationRegistry from '../TokenRotationRegistry.js'

/**
 * @goal
 * # Authorization Server
 * Class handles user management with the provided access, db or its options, port,
 * ssl, logger, and router.
 *
 * ## Access
 * If access is not provided it is automatically created on constructor with the
 * provided db.
 *
 * User might belong to none or multiple groups.
 * Group can have users and groups: `testuser` is in `admin` and `correspondent` and
 * `developer` groups, anyuser is in `developer` group:
 *
 * ```.group
 * admin testuser
 * developer anyuser .correspondent
 * correspondent testuser
 * emptygroup
 * ```
 *
 * ### Token
 * Auth is done with standard Bearer method and self-generated token format.
 * Other methods may be implemented by extending class with `getToken()` overrides.
 *
 * ## Router
 * The routes under `auth/*` and `private/*` are overridden on construction.
 * Different routing logic can be specified via `setupRoutes()` override.
 * These routes handle auth and access to private content.
 *
 * ## Requirements
 * - All functions and properties must be JSDoc'd with typing hints.
 * - Each public function must be tested.
 * - All known vulnerabilities should be covered in tests.
 * - Brute-force IP address detection added to middleware.
 */
class AuthServer extends Server {
	static ROLES = {
		admin: 'admin',
	}
	/** @type {AuthDB} */
	db
	/** @type {AccessControl} */
	access
	/** @type {ServerConfig} */
	config
	/** @type {RateLimiter} */
	limiter
	/** @type {TokenManager} */
	tokenManager
	/** @type {TokenRotationRegistry} */
	tokenRotationRegistry

	constructor(options = {}) {
		const {
			access,
			db = {
				cwd: resolve(process.cwd(), 'auth-data'),
			},
			rateLimit = {
				maxAttempts: 10,
				windowMs: 1_000,
			},
			router = new Router(),
			tokenManager = new TokenManager(),
			...serverOptions
		} = options

		// Initialize super class with clean options
		super({
			...serverOptions,
			IncomingMessage,
			ServerResponse,
			router,
		})

		this.db = db instanceof AuthDB ? db : new AuthDB(db)
		this.access = access ? AccessControl.from(access) : new AccessControl(this.db)
		this.config = ServerConfig.from(options)
		this.logger = this.config.logger
		this.limiter = new RateLimiter(rateLimit.maxAttempts, rateLimit.windowMs)
		this.tokenManager = TokenManager.from(tokenManager)

		const { logger: _l, ...configOptions } = options
		this.logger.debug(
			'AuthServer initialized with options:',
			JSON.stringify(configOptions, null, 2),
		)
		this.setupMiddlewares()
		this.setupRoutes()
	}

	setupMiddlewares() {
		this.logger.debug('Setting up middlewares')
		// Enhance req/res
		this.use(this.enhanceMiddleware.bind(this))
		// Body parser middleware
		this.use(this.jsonParserMiddleware.bind(this))
		// Auth middleware
		this.use(this.authMiddleware.bind(this))
		this.logger.debug('Middlewares setup complete')
	}

	async enhanceMiddleware(req, res, next) {
		if (!res.status) {
			res.status = function (code) {
				this.statusCode = code
				return this
			}
		}
		if (!res.json) {
			res.json = function (data) {
				this.setHeader('Content-Type', 'application/json')
				this.end(JSON.stringify(data))
				return this
			}
		}
		await next()
	}

	async jsonParserMiddleware(req, res, next) {
		if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
			try {
				const buffers = []
				for await (const chunk of req) {
					buffers.push(chunk)
				}
				const data = Buffer.concat(buffers).toString()
				if (data) {
					req.body = JSON.parse(data)
				} else {
					req.body = {}
				}
			} catch (err) {
				this.logger.warn('JSON parse error:', err.message)
				req.body = {}
			}
		}
		await next()
	}

	/**
	 * Configures HTTP routes for authentication.
	 */
	setupRoutes() {
		this.logger.debug('Setting up routes')

		// Auth endpoints
		this.router.post('/auth/signup', this.handleSignup.bind(this))
		this.router.put('/auth/signup/:username', this.handleConfirmSignup.bind(this))
		this.router.delete('/auth/signup/:username', this.handleDeleteAccount.bind(this))
		this.router.post('/auth/signin/:username', this.handleSignin.bind(this))
		this.router.get('/auth/signin/:username', this.handleGetUser.bind(this))
		this.router.put('/auth/refresh/:token', this.handleRefreshToken.bind(this))
		this.router.post('/auth/forgot/:username', this.handleForgotPassword.bind(this))
		this.router.put('/auth/forgot/:username', this.handleResetPassword.bind(this))
		this.router.delete('/auth/signin/:username', this.handleSignout.bind(this))
		this.router.get('/auth/info', this.handleListUsers.bind(this))
		this.router.get('/auth/info/:username', this.handleGetUser.bind(this))
		this.router.get('/auth/access/info', this.handleGetAccessInfo.bind(this))

		// Protected endpoints
		this.router.get('/private/*', this.handlePrivateAccess.bind(this))
		this.router.post('/private/*', this.handlePrivateAccess.bind(this))
		this.router.delete('/private/*', this.handlePrivateAccess.bind(this))
		this.router.head('/private/*', this.handlePrivateAccess.bind(this))

		this.logger.debug('Routes setup complete')
		return this.router
	}

	/**
	 * Creates a root admin user if none exists.
	 */
	async createRootUser() {
		this.logger.debug('Creating root user')

		const tokenPair = this.tokenManager.createTokenPair('root')
		const root = new User({
			name: 'root',
			email: 'root@localhost',
			passwordHash: this.hashPassword('root'),
			verified: true,
			roles: [AuthServer.ROLES.admin],
		})
		await this.db.saveUser(root)
		await this.db.updateTokens('root', tokenPair)
		this.tokenRotationRegistry.registerToken(tokenPair.refreshToken, 'root')

		this.logger.info('Root user created with token pair')
	}

	async start() {
		this.logger.debug('Starting AuthServer')

		await this.db.connect()
		await this.db.load()

		// Initialize token rotation registry and load from DB
		this.tokenRotationRegistry = new TokenRotationRegistry({
			db: this.db,
			maxAge: TokenManager.REFRESH_TOKEN_LIFETIME,
		})
		await this.tokenRotationRegistry.load()

		if (this.db.meta.size === 0) {
			await this.createRootUser()
		}

		let prev = 0
		let max = 999

		do {
			try {
				this.port = this.config.getPort(prev)
				if (prev === this.port) {
					max = 0
				}
				this.logger.debug('Attempting to start server on port:', this.port)
				prev = this.port
				--max
				const res = await this.listen()
				this.logger.info('Server started on port:', this.port)
				return res
			} catch (err) {
				this.logger.debug('Failed to start server on port:', this.port, 'Error:', err.message)
				if (max < 0) {
					this.logger.error('Cannot start server: All ports exhausted')
					throw new Error('Cannot start server')
				}
				if (err.code !== 'EADDRINUSE') {
					this.logger.error('Server start failed with unexpected error:', err)
					throw err
				}
			}
		} while (true)
	}

	async stop() {
		this.logger.debug('Stopping AuthServer')

		// Save token rotation registry before stopping
		try {
			await this.tokenRotationRegistry.save()
		} catch {}

		try {
			await this.db.disconnect()
		} catch {}

		// Force close all connections
		if (this.server) {
			this.server.closeAllConnections?.()
		}
		await this.close()
		this.logger.info('Server stopped')
	}

	/**
	 * Authentication middleware, validates the authorization header.
	 *
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @param {Function} [next]
	 */
	async authMiddleware(req, res, next = () => 1) {
		const ip = req.headers['x-forwarded-for']?.split(/\s/, 1)[0] || req.remoteAddress
		this.logger.debug('Auth middleware processing request from IP:', ip)

		try {
			if (!(await this.limiter.tryAttempt(ip))) {
				this.logger.debug('Rate limit exceeded for IP:', ip)
				return res.status(429).json({ error: 'Too many requests' })
			}
			const token = req.headers.authorization?.split(' ')[1]
			req.user = null
			if (token) {
				req.user = await this.db.auth(token)
			}

			if (req.user) {
				this.logger.debug('Authenticated user:', req.user.name)
			} else {
				this.logger.debug('No authentication token provided')
			}

			next()
		} catch (err) {
			this.logger.debug('Authentication error:', err.message)
			return res.status(401).json({ error: err.message ?? 'Invalid token' })
		}
	}

	/**
	 * Handles access to private resources.
	 *
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @returns {Promise<void>} No explicit return.
	 */
	async handlePrivateAccess(req, res) {
		this.logger.debug('Handling private access for user:', req.user?.name, 'path:', req.url)

		if (!req.user) {
			this.logger.debug('Access denied: No authenticated user')
			return res.status(401).json({ error: 'Unauthorized' })
		}

		const path = req.url.slice('/private/'.length)
		this.logger.debug('Processing private', req.method, 'request for path:', path)

		// Map HTTP method to access level
		let level = AccessControl.READ
		if (req.method === 'POST') level = AccessControl.WRITE
		else if (req.method === 'DELETE') level = AccessControl.DELETE

		// Check permissions
		const hasAccess = await this.access.check(req.user.name, path, level)
		if (!hasAccess) {
			this.logger.debug(`Access denied (${level}) for ${req.user.name} to ${path}`)
			return res.status(403).json({ error: 'Forbidden' })
		}

		try {
			if (req.method === 'GET') {
				const data = await this.db.loadDocument(`private/${path}`)
				this.logger.debug('Successfully loaded private document:', path)
				return res.json(data)
			} else if (req.method === 'HEAD') {
				// Just check if document exists (loadDocument throws if not found)
				await this.db.loadDocument(`private/${path}`)
				return res.status(200).end()
			} else if ('POST' === req.method) {
				await this.db.saveDocument(`private/${path}`, req.body)
				this.logger.debug('Successfully saved private document:', path)
				return res.status(201).json({ success: true })
			} else if ('DELETE' === req.method) {
				await this.db.dropDocument(`private/${path}`)
				this.logger.debug('Successfully deleted private document:', path)
				return res.status(200).json({ success: true })
			}
		} catch (err) {
			this.logger.debug('Private document operation failed:', err.message)
			if (err.code === 'ENOENT') {
				this.logger.debug('Private document not found:', path)
				return res.status(404).json({ error: 'Not found' })
			}
			this.logger.error('Private document operation error:', err)
			return res.status(500).json({ error: err.message })
		}
	}

	getShortHash(value) {
		return crypto
			.createHash('sha256')
			.update(String(value))
			.digest('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '')
	}

	generateToken() {
		return this.getShortHash(crypto.randomBytes(32).toString('hex'))
	}

	hashPassword(password) {
		return this.getShortHash(password)
	}

	getToken(req) {
		return req.headers.authorization?.split(' ')[1]
	}

	/**
	 * Authenticates the user via token.
	 *
	 * @param {string} token
	 * @returns {Promise<User | null>} User object or null.
	 */
	async auth(token) {
		if (!token) {
			this.logger.debug('No token provided for authentication')
			return null
		}
		this.logger.debug('Authenticating user with token')
		return await this.db.auth(token)
	}

	/**
	 * Fetches authenticated user's info.
	 *
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @returns {Promise<void>} No explicit return.
	 */
	async handleGetUser(req, res) {
		const { username } = req.params
		this.logger.debug('Handling get user request for:', username)

		const me = await this.auth(this.getToken(req))
		if (!me) {
			this.logger.debug('Access denied: Not authenticated')
			return res.status(401).json({ error: 'Authorize to get access' })
		}

		const user = await this.db.getUser(username)
		if (!user) {
			this.logger.debug('User not found:', username)
			return res.status(404).json({ error: 'User not found' })
		}

		// Admin can see all user data except passwords
		if (me.is(AuthServer.ROLES.admin)) {
			this.logger.debug('Admin accessing user data for:', username)
			const { passwordHash, verificationCode, resetCode, resetCodeAt, ...visible } = user.toObject()
			return res.status(200).json(visible)
		}

		// User can see their own data
		if (me && user.name === me.name) {
			this.logger.debug('User accessing their own data:', username)
			const { passwordHash, verificationCode, resetCode, resetCodeAt, ...visible } = user.toObject()
			return res.status(200).json(visible)
		}

		// Public user data
		if (user.isPublic) {
			this.logger.debug('Accessing public user data for:', username)
			const { passwordHash, verificationCode, resetCode, resetCodeAt, ...visible } = user.toObject()
			return res.status(200).json(visible)
		}

		// Minimal public info
		this.logger.debug('Accessing minimal user info for:', username)
		return res.status(200).json({
			username: user.name,
			email: user.email,
			createdAt: user.createdAt,
		})
	}

	/**
	 * Register new user and send verification code.
	 *
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @return {Promise<void>} No explicit return.
	 */
	async handleSignup(req, res) {
		this.logger.debug('Handling signup request')

		const { username, password, email } = req.body
		if (!username || !password || !email) {
			this.logger.debug('Signup failed: Missing required fields')
			return res.status(400).json({ error: 'Missing required fields' })
		}

		const existingUser = await this.db.getUser(username)
		if (existingUser) {
			this.logger.debug('Signup failed: User already exists:', username)
			return res.status(409).json({ error: 'User already exists' })
		}

		const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
		const user = new User({
			name: username,
			email,
			passwordHash: this.hashPassword(password),
			verified: false,
			verificationCode,
			createdAt: new Date(),
			roles: ['user'],
		})

		await this.db.saveUser(user)
		this.logger.info('User signup successful for:', username)
		return res.status(200).json({
			message: 'Verification code sent',
		})
	}

	/**
	 * Confirms user registration with code and creates token.
	 *
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @return {Promise<void>} No explicit return.
	 */
	async handleConfirmSignup(req, res) {
		const { username } = req.params
		const { code } = req.body
		this.logger.debug('Handling confirm signup for:', username)

		const user = await this.db.getUser(username)
		if (!user) {
			this.logger.debug('Signup confirmation failed: User not found:', username)
			return res.status(404).json({ error: 'User not found' })
		}

		if (user.verified) {
			this.logger.debug('Signup confirmation failed: User already verified:', username)
			return res.status(400).json({ error: 'User already verified' })
		}

		if (user.verificationCode !== code) {
			this.logger.debug('Signup confirmation failed: Invalid verification code for:', username)
			return res.status(401).json({ error: 'Invalid verification code' })
		}

		user.verified = true
		user.verificationCode = null
		user.updatedAt = new Date()

		await this.db.saveUser(user)
		const tokenPair = this.tokenManager.createTokenPair(username)
		await this.db.updateTokens(username, tokenPair)
		this.tokenRotationRegistry.registerToken(tokenPair.refreshToken, username)

		this.logger.info('User account verified:', username)
		res.status(200).json({
			message: 'Account verified',
			accessToken: tokenPair.accessToken,
			refreshToken: tokenPair.refreshToken,
		})
	}

	/**
	 * Delete user account.
	 *
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @return {Promise<void>} No explicit return.
	 */
	async handleDeleteAccount(req, res) {
		const { username } = req.params
		this.logger.debug('Handling delete account for:', username)

		const user = await this.db.getUser(username)
		if (!user) {
			this.logger.debug('Account deletion failed: User not found:', username)
			return res.status(404).json({ error: 'User not found' })
		}

		await this.db.deleteUser(username)
		this.tokenRotationRegistry.clearUserTokens(username)
		await this.tokenRotationRegistry.save() // Persist changes
		this.logger.info('User account deleted:', username)
		return res.status(200).json({ message: 'Account deleted' })
	}

	/**
	 * Login with username and password.
	 *
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @return {Promise<void>} No explicit return.
	 */
	async handleSignin(req, res) {
		const { username } = req.params
		const { password } = req.body
		this.logger.debug('Handling signin for:', username)

		const user = await this.db.getUser(username)
		if (!user) {
			this.logger.debug('Signin failed: User not found:', username)
			return res.status(404).json({ error: 'Invalid password or username' })
		}

		if (!user.verified) {
			this.logger.debug('Signin failed: Account not verified:', username)
			return res.status(403).json({ error: 'Account not verified' })
		}

		if (user.passwordHash !== this.hashPassword(password)) {
			this.logger.debug('Signin failed: Invalid password for user:', username)
			return res.status(401).json({ error: 'Invalid password or username' })
		}

		const tokenPair = this.tokenManager.createTokenPair(username)
		await this.db.updateTokens(username, tokenPair)
		this.tokenRotationRegistry.registerToken(tokenPair.refreshToken, username)
		await this.tokenRotationRegistry.save() // Persist changes

		this.logger.info('User signin successful:', username)
		return res.status(200).json({
			accessToken: tokenPair.accessToken,
			refreshToken: tokenPair.refreshToken,
		})
	}

	/**
	 * Manage token refresh with optional replacement of current token.
	 *
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @return {Promise<void>} No explicit return.
	 */
	async handleRefreshToken(req, res) {
		const { token } = req.params
		const { replace } = req.body
		this.logger.debug('Handling token refresh')

		try {
			// First validate the refresh token by authenticating it
			const user = await this.db.auth(token)
			if (!user) {
				this.logger.debug('Token refresh failed: Invalid refresh token')
				return res.status(401).json({ error: 'Invalid refresh token' })
			}

			// Check if refresh token is still valid and part of rotation chain
			const tokenData = this.db.tokens.get(token)
			if (!this.tokenManager.isRefreshValid(tokenData.time)) {
				this.logger.debug('Token refresh failed: Refresh token expired')
				return res.status(401).json({ error: 'Refresh token expired' })
			}

			// Validate token rotation chain
			if (!this.tokenRotationRegistry.validateToken(token, user.name)) {
				this.logger.debug('Token refresh failed: Invalid token rotation')
				return res.status(401).json({ error: 'Invalid refresh token' })
			}

			const newTokenPair = this.tokenManager.createTokenPair(user.name)
			await this.db.updateTokens(user.name, newTokenPair)

			// Register new refresh token with reference to previous one
			this.tokenRotationRegistry.registerToken(newTokenPair.refreshToken, user.name, token)

			// Invalidate old refresh token if requested
			if (replace) {
				this.tokenRotationRegistry.invalidateToken(token)
				this.logger.debug('Old refresh token invalidated during refresh')
			}

			// Persist registry changes
			await this.tokenRotationRegistry.save()

			return res.status(200).json({
				accessToken: newTokenPair.accessToken,
				refreshToken: newTokenPair.refreshToken,
			})
		} catch (err) {
			this.logger.error('Token refresh failed:', err)
			return res.status(500).json({ error: 'Internal server error' })
		}
	}

	/**
	 * Sends a password reset code to the user.
	 *
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @return {Promise<void>} No explicit return.
	 */
	async handleForgotPassword(req, res) {
		const { username } = req.params
		this.logger.debug('Handling forgot password for:', username)

		const user = await this.db.getUser(username)
		if (!user) {
			this.logger.debug('Forgot password failed: User not found:', username)
			return res.status(404).json({ error: 'User not found' })
		}

		const resetCode = Math.floor(100000 + Math.random() * 900000).toString()
		user.resetCode = resetCode
		// Use updatedAt instead of resetCodeCreatedAt
		user.updatedAt = new Date()
		await this.db.saveUser(user)

		this.logger.info('Password reset code sent for user:', username)
		return res.status(200).json({ message: 'Reset code sent' })
	}

	/**
	 * Handles user password reset with verification code.
	 * Invalidates all previous tokens after reset.
	 *
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @return {Promise<void>} No explicit return.
	 */
	async handleResetPassword(req, res) {
		const { username } = req.params
		const { code, password } = req.body
		this.logger.debug('Handling password reset for:', username)

		const user = await this.db.getUser(username)
		if (!user) {
			this.logger.debug('Password reset failed: User not found:', username)
			return res.status(404).json({ error: 'Invalid reset code' })
		}

		if (user.resetCode !== code) {
			this.logger.debug('Password reset failed: Invalid reset code for user:', username)
			return res.status(401).json({ error: 'Invalid reset code' })
		}

		user.passwordHash = this.hashPassword(password)
		user.resetCode = null
		user.updatedAt = new Date()

		await this.db.saveUser(user)
		this.logger.info('Password reset successful for user:', username)

		if (this.config.clearTokensOnPasswordReset) {
			await this.db.clearTokens(user.name)
			this.tokenRotationRegistry.clearUserTokens(user.name)
			this.logger.debug('Previous tokens cleared for user:', username)
		}

		const tokenPair = this.tokenManager.createTokenPair(username)
		await this.db.updateTokens(username, tokenPair)
		this.tokenRotationRegistry.registerToken(tokenPair.refreshToken, username)
		await this.tokenRotationRegistry.save() // Persist changes

		return res.status(200).json({
			message: 'Password reset successful',
			accessToken: tokenPair.accessToken,
			refreshToken: tokenPair.refreshToken,
		})
	}

	/**
	 * Logout a user by removing their current tokens.
	 *
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @return {Promise<void>} No explicit return.
	 */
	async handleSignout(req, res) {
		const token = this.getToken(req)
		const me = await this.auth(token)
		this.logger.debug('Handling signout for user:', me?.name)

		if (!me) {
			this.logger.debug('Signout failed: Unauthorized')
			return res.status(401).json({ error: 'Unauthorized' })
		}

		await this.db.clearTokens(me.name)
		this.tokenRotationRegistry.clearUserTokens(me.name)
		await this.tokenRotationRegistry.save() // Persist changes
		this.logger.info('User logged out:', me.name)
		return res.status(200).json({ message: 'Logged out successfully' })
	}

	/**
	 * List all registered users.
	 * Requires admin role.
	 *
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @return {Promise<void>} No explicit return.
	 */
	async handleListUsers(req, res) {
		this.logger.debug('Handling list users request')

		const me = await this.auth(this.getToken(req))
		if (!me || !me.is(AuthServer.ROLES.admin)) {
			this.logger.debug('List users failed: Forbidden access')
			return res.status(403).json({ error: 'Forbidden' })
		}

		const users = []
		for (const [key] of this.db.data.entries()) {
			if (!key.endsWith('/info.json')) continue
			users.push(key.split('/').slice(-2)[0])
		}
		users.sort()

		this.logger.debug('Returning user list:', users)
		return res.status(200).json({ users })
	}

	/**
	 * Returns access rules information for the current authenticated user.
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 * @returns {Promise<void>}
	 */
	async handleGetAccessInfo(req, res) {
		this.logger.debug('Handling get access info request')

		const token = this.getToken(req)
		const user = await this.auth(token)
		if (!user) {
			this.logger.debug('Access info request failed: Unauthorized')
			return res.status(401).json({ error: 'Unauthorized' })
		}

		try {
			const accessRules = await this.access.info(user.name)
			const response = {
				userAccess: accessRules.rules.filter((rule) => rule.subject === user.name),
				groupRules: accessRules.rules.filter(
					(rule) => rule.subject !== user.name && rule.subject !== AccessControl.ANY,
				),
				globalRules: accessRules.rules.filter((rule) => rule.subject === AccessControl.ANY),
				groups: accessRules.groups,
			}

			this.logger.debug('Access info response:', response)
			return res.status(200).json(response)
		} catch (err) {
			this.logger.error('Failed to get access info:', err)
			return res.status(500).json({ error: 'Internal server error' })
		}
	}
}

export default AuthServer
