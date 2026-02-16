import { describe, it, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import FS from '@nan0web/db-fs'
import { NoConsole as Logger } from '@nan0web/log'
import { DatasetParser, DocsParser } from '@nan0web/test'

import AuthServer from './server/AuthServer.js'

const fs = new FS()
let pkg
let console = new Logger()

before(async () => {
	const doc = await fs.loadDocument('package.json', {})
	pkg = doc || {}
})

beforeEach(() => {
	console = new Logger()
})

function testRender() {
	let api
	let port
	let url
	let accessToken
	let refreshToken
	// Shared user credentials
	const user = { username: 'alice', email: 'alice@example.com', password: 'secret123' }

	// Setup Executable Documentation Server
	before(async () => {
		api = new AuthServer({
			db: { cwd: './test-docs-api' },
			port: 0,
			logger: new Logger(),
			rateLimit: { maxAttempts: 100, windowMs: 1000 },
		})
		await api.start()
		port = api.port
		url = `http://localhost:${port}`
	})

	after(async () => {
		await api?.stop()
		try {
			rmSync('./test-docs-api', { recursive: true, force: true })
			rmSync('./test-unused', { recursive: true, force: true })
		} catch (e) {
			// ignore cleanup errors
		}
	})

	/**
	 * @docs
	 * # @nan0web/auth-node
	 *
	 * Authorization server for the nan0web ecosystem.
	 *
	 * <!-- %PACKAGE_STATUS% -->
	 *
	 * ## Description
	 *
	 * A standalone, zero-framework Authorization Server with:
	 * - **User Management** — signup, verification, password reset, account deletion
	 * - **Token System** — access + refresh tokens with rotation registry
	 * - **Access Control** — role-based permissions for private resources
	 * - **Rate Limiting** — built-in brute-force protection
	 * - **Playground** — interactive CLI to explore all flows
	 *
	 * ## Installation
	 */
	it('How to install with npm?', () => {
		/**
		 * ```bash
		 * npm install @nan0web/auth-node
		 * ```
		 */
		assert.equal(pkg.name, '@nan0web/auth-node')
	})

	/**
	 * @docs
	 * ## Server Initialization
	 *
	 * Create and start the auth server with configuration options.
	 */
	it('How to create and start AuthServer?', async () => {
		/**
		 * ```js
		 * import AuthServer from '@nan0web/auth-node'
		 * import Logger from '@nan0web/log'
		 *
		 * const server = new AuthServer({
		 * 	db: { cwd: './auth-data' },
		 * 	port: 4320,
		 * 	logger: new Logger(),
		 * })
		 *
		 * await server.start()
		 * console.info('Server started on port:', server.port)
		 * // Server started on port: 4320
		 *
		 * // Graceful shutdown
		 * await server.stop()
		 * ```
		 */
		assert.ok(AuthServer)
		const server = new AuthServer({
			db: { cwd: './test-unused' },
			port: 4320,
			logger: new Logger(),
		})
		await server.start()
		console.info('Server started on port:', server.port)
		await server.stop()

		assert.deepStrictEqual(console.output(), [['info', 'Server started on port:', 4320]])
		assert.ok(server)
	})

	/**
	 * @docs
	 * ## API Reference
	 *
	 * All endpoints are prefixed with `/auth`. Examples use `curl` with `localhost:3000`.
	 *
	 * ---
	 *
	 * ### POST /auth/signup — Register
	 *
	 * The user must verify their email before logging in.
	 */
	it('How to create a new user account?', async () => {
		/**
		 * ```bash
		 * curl -X POST http://localhost:3000/auth/signup \
		 *   -H "Content-Type: application/json" \
		 *   -d '{"username":"alice","email":"alice@example.com","password":"secret123"}'
		 * ```
		 *
		 * **Response** `200`:
		 * ```json
		 * { "message": "Verification code sent" }
		 * ```
		 *
		 * | Status | Meaning |
		 * |--------|---------|
		 * | `200`  | Success — verification code sent (via email) |
		 * | `400`  | Missing required fields |
		 * | `409`  | User already exists |
		 */
		assert.ok(api)
		const res = await fetch(`${url}/auth/signup`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(user),
		})
		const body = await res.json()
		assert.equal(res.status, 200)
		assert.equal(body.message, 'Verification code sent')
	})

	/**
	 * @docs
	 * ### PUT /auth/signup/:username — Verify Account
	 *
	 * Confirms user registration with the 6-digit code.
	 * Returns token pair on success.
	 */
	it('How to verify user account?', async () => {
		/**
		 * ```bash
		 * curl -X PUT http://localhost:3000/auth/signup/alice \
		 *   -H "Content-Type: application/json" \
		 *   -d '{"code":"123456"}'
		 * ```
		 *
		 * **Response** `200`:
		 * ```json
		 * { "message": "Account verified", "accessToken": "...", "refreshToken": "..." }
		 * ```
		 *
		 * | Status | Meaning |
		 * |--------|---------|
		 * | `200`  | Verified — tokens issued |
		 * | `400`  | Already verified |
		 * | `401`  | Invalid code |
		 * | `404`  | User not found |
		 */
		assert.ok(api)
		const dbUser = await api.db.getUser(user.username)
		const code = dbUser.verificationCode
		const res = await fetch(`${url}/auth/signup/${user.username}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code }),
		})
		const body = await res.json()
		assert.equal(res.status, 200)
		assert.ok(body.accessToken)
		assert.ok(body.refreshToken)
		accessToken = body.accessToken
		refreshToken = body.refreshToken
	})

	/**
	 * @docs
	 * ### POST /auth/signin/:username — Login
	 *
	 * Authenticate with username and password. Account must be verified first.
	 */
	it('How to login with password?', async () => {
		/**
		 * ```bash
		 * curl -X POST http://localhost:3000/auth/signin/alice \
		 *   -H "Content-Type: application/json" \
		 *   -d '{"password":"secret123"}'
		 * ```
		 *
		 * **Response** `200`:
		 * ```json
		 * { "accessToken": "...", "refreshToken": "..." }
		 * ```
		 *
		 * | Status | Meaning |
		 * |--------|---------|
		 * | `200`  | Success — tokens issued |
		 * | `401`  | Invalid password |
		 * | `403`  | Account not verified |
		 * | `404`  | User not found |
		 */
		assert.ok(api)
		const res = await fetch(`${url}/auth/signin/${user.username}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ password: user.password }),
		})
		const body = await res.json()
		assert.equal(res.status, 200)
		assert.ok(body.accessToken)
		assert.ok(body.refreshToken)
	})

	/**
	 * @docs
	 * ### PUT /auth/refresh/:token — Refresh Tokens
	 *
	 * Exchange a valid refresh token for a new token pair.
	 * Pass `{ "replace": true }` to invalidate the old refresh token.
	 */
	it('How to refresh access tokens?', async () => {
		/**
		 * ```bash
		 * curl -X PUT http://localhost:3000/auth/refresh/YOUR_REFRESH_TOKEN \
		 *   -H "Content-Type: application/json" \
		 *   -d '{"replace":true}'
		 * ```
		 *
		 * **Response** `200`:
		 * ```json
		 * { "accessToken": "new_access", "refreshToken": "new_refresh" }
		 * ```
		 *
		 * | Status | Meaning |
		 * |--------|---------|
		 * | `200`  | New tokens issued |
		 * | `401`  | Invalid or expired refresh token |
		 */
		assert.ok(api)
		const res = await fetch(`${url}/auth/refresh/${refreshToken}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ replace: true }),
		})
		const body = await res.json()
		assert.equal(res.status, 200)
		assert.ok(body.accessToken)
		assert.notEqual(accessToken, body.accessToken)
		accessToken = body.accessToken
		refreshToken = body.refreshToken
	})

	/**
	 * @docs
	 * ---
	 *
	 * ### POST /auth/forgot/:username — Request Password Reset
	 *
	 * Sends a 6-digit reset code to the user (via email in production).
	 */
	it('How to request password reset?', async () => {
		/**
		 * ```bash
		 * curl -X POST http://localhost:3000/auth/forgot/alice
		 * ```
		 *
		 * **Response** `200`:
		 * ```json
		 * { "message": "Reset code sent" }
		 * ```
		 *
		 * | Status | Meaning |
		 * |--------|---------|
		 * | `200`  | Reset code generated |
		 * | `404`  | User not found |
		 */
		assert.ok(api)
		const res = await fetch(`${url}/auth/forgot/${user.username}`, { method: 'POST' })
		const body = await res.json()
		assert.equal(res.status, 200)
		assert.equal(body.message, 'Reset code sent')
	})

	/**
	 * @docs
	 * ### PUT /auth/forgot/:username — Reset Password
	 *
	 * Set a new password using the reset code.
	 * All previous tokens are invalidated.
	 */
	it('How to reset password with code?', async () => {
		/**
		 * ```bash
		 * curl -X PUT http://localhost:3000/auth/forgot/alice \
		 *   -H "Content-Type: application/json" \
		 *   -d '{"code":"654321","password":"newSecret456"}'
		 * ```
		 *
		 * **Response** `200`:
		 * ```json
		 * { "message": "Password reset successful", "accessToken": "...", "refreshToken": "..." }
		 * ```
		 *
		 * | Status | Meaning |
		 * |--------|---------|
		 * | `200`  | Password changed — new tokens issued |
		 * | `401`  | Invalid reset code |
		 * | `404`  | User not found |
		 */
		assert.ok(api)
		const dbUser = await api.db.getUser(user.username)
		const code = dbUser.resetCode
		const res = await fetch(`${url}/auth/forgot/${user.username}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code, password: 'newSecret456' }),
		})
		const body = await res.json()
		assert.equal(res.status, 200)
		assert.ok(body.accessToken)
		accessToken = body.accessToken
		refreshToken = body.refreshToken
	})

	/**
	 * @docs
	 * ---
	 *
	 * ### GET /auth/signin/:username — User Info
	 *
	 * Returns user profile. Visibility depends on the requester's role.
	 * Requires `Authorization: Bearer <token>`.
	 */
	it('How to get user profile info?', async () => {
		/**
		 * ```bash
		 * curl http://localhost:3000/auth/signin/alice \
		 *   -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
		 * ```
		 *
		 * **Response** `200` (own profile or admin):
		 * ```json
		 * { "name": "alice", "email": "alice@example.com", "verified": true, "roles": ["user"] }
		 * ```
		 *
		 * | Access Level | Visible Fields |
		 * |-------------|----------------|
		 * | Own profile | All except password, codes |
		 * | Admin       | All except password, codes |
		 * | Other user  | name, email, createdAt |
		 */
		assert.ok(api)
		const res = await fetch(`${url}/auth/signin/${user.username}`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		})
		const body = await res.json()
		assert.equal(res.status, 200)
		assert.equal(body.name, user.username)
		assert.equal(body.email, user.email)
		assert.equal(body.passwordHash, undefined)
	})

	/**
	 * @docs
	 * ### GET /auth/info — List Users (Admin)
	 *
	 * Returns a list of all registered usernames. Admin role required.
	 */
	it('How to list all users as admin?', async () => {
		/**
		 * ```bash
		 * curl http://localhost:3000/auth/info \
		 *   -H "Authorization: Bearer ADMIN_TOKEN"
		 * ```
		 *
		 * **Response** `200`:
		 * ```json
		 * { "users": ["alice", "bob", "carol"] }
		 * ```
		 *
		 * | Status | Meaning |
		 * |--------|---------|
		 * | `200`  | User list returned |
		 * | `403`  | Not admin |
		 */
		assert.ok(api)
		const res = await fetch(`${url}/auth/info`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		})
		assert.equal(res.status, 403)
	})

	/**
	 * @docs
	 * ### GET /auth/access/info — Access Control Rules
	 *
	 * Returns the current user's permissions: personal rules, group rules, and global rules.
	 */
	it('How to get access control rules?', async () => {
		/**
		 * ```bash
		 * curl http://localhost:3000/auth/access/info \
		 *   -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
		 * ```
		 *
		 * **Response** `200`:
		 * ```json
		 * { "userAccess": [], "groupRules": [], "globalRules": [], "groups": [] }
		 * ```
		 *
		 * | Status | Meaning |
		 * |--------|---------|
		 * | `200`  | Access rules returned |
		 * | `401`  | Not authenticated |
		 */
		assert.ok(api)
		const res = await fetch(`${url}/auth/access/info`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		})
		const body = await res.json()
		assert.equal(res.status, 200)
		assert.ok(Array.isArray(body.userAccess))
	})

	/**
	 * @docs
	 * ---
	 *
	 * ## Private Resources
	 *
	 * All `/private/*` routes require `Authorization: Bearer <token>`.
	 * Access is controlled by `.access` rules (see Access Control).
	 *
	 * ### POST /private/:path — Create/Update Resource
	 */
	it('How to write a private resource?', async () => {
		/**
		 * ```bash
		 * curl -X POST http://localhost:3000/private/notes.json \
		 *   -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
		 *   -H "Content-Type: application/json" \
		 *   -d '{"title":"My Note","content":"Hello World"}'
		 * ```
		 *
		 * | Status | Meaning |
		 * |--------|---------|
		 * | `201`  | Created |
		 * | `401`  | Not authenticated |
		 * | `403`  | No write permission |
		 */
		assert.ok(api)
		const res = await fetch(`${url}/private/notes.json`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ title: 'My Note' }),
		})
		assert.ok(res.status < 500)
	})

	/**
	 * @docs
	 * ### GET /private/:path — Read Resource
	 */
	it('How to read a private resource?', async () => {
		/**
		 * ```bash
		 * curl http://localhost:3000/private/notes.json \
		 *   -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
		 * ```
		 *
		 * | Status | Meaning |
		 * |--------|---------|
		 * | `200`  | Resource data returned |
		 * | `401`  | Not authenticated |
		 * | `403`  | No read permission |
		 * | `404`  | Resource not found |
		 */
		assert.ok(api)
		const res = await fetch(`${url}/private/notes.json`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		})
		assert.ok(res.status < 500)
	})

	/**
	 * @docs
	 * ### HEAD /private/:path — Check Resource Exists
	 */
	it('How to check if private resource exists?', async () => {
		/**
		 * ```bash
		 * curl -I http://localhost:3000/private/notes.json \
		 *   -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
		 * ```
		 *
		 * | Status | Meaning |
		 * |--------|---------|
		 * | `200`  | Exists |
		 * | `401`  | Not authenticated |
		 * | `403`  | No read permission |
		 * | `404`  | Not found |
		 */
		assert.ok(api)
		const res = await fetch(`${url}/private/notes.json`, {
			method: 'HEAD',
			headers: { Authorization: `Bearer ${accessToken}` },
		})
		assert.ok(res.status < 500)
	})

	/**
	 * @docs
	 * ### DELETE /private/:path — Delete Resource
	 */
	it('How to delete a private resource?', async () => {
		/**
		 * ```bash
		 * curl -X DELETE http://localhost:3000/private/notes.json \
		 *   -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
		 * ```
		 *
		 * | Status | Meaning |
		 * |--------|---------|
		 * | `200`  | Deleted |
		 * | `401`  | Not authenticated |
		 * | `403`  | No delete permission |
		 * | `404`  | Resource not found |
		 */
		assert.ok(api)
		const res = await fetch(`${url}/private/notes.json`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${accessToken}` },
		})
		assert.ok(res.status < 500)
	})

	/**
	 * @docs
	 * ### DELETE /auth/signin/:username — Logout
	 *
	 * Invalidates all tokens for the authenticated user.
	 * Requires `Authorization: Bearer <token>` header.
	 */
	it('How to logout user?', async () => {
		/**
		 * ```bash
		 * curl -X DELETE http://localhost:3000/auth/signin/alice \
		 *   -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
		 * ```
		 *
		 * **Response** `200`:
		 * ```json
		 * { "message": "Logged out successfully" }
		 * ```
		 *
		 * | Status | Meaning |
		 * |--------|---------|
		 * | `200`  | Logged out — all tokens cleared |
		 * | `401`  | Not authenticated |
		 * | `403`  | Not authorized (if trying to logout someone else) |
		 * | `404`  | User not found |
		 */
		assert.ok(api)
		const res = await fetch(`${url}/auth/signin/${user.username}`, {
			method: 'DELETE',
			headers: { Authorization: `Bearer ${accessToken}` },
		})
		const body = await res.json()
		assert.equal(res.status, 200)
		assert.equal(body.message, 'Logged out successfully')
	})

	/**
	 * @docs
	 * ### DELETE /auth/signup/:username — Delete Account
	 *
	 * Permanently deletes the user account and all associated tokens.
	 */
	it('How to delete user account?', async () => {
		/**
		 * ```bash
		 * curl -X DELETE http://localhost:3000/auth/signup/alice
		 * ```
		 *
		 * **Response** `200`:
		 * ```json
		 * { "message": "Account deleted" }
		 * ```
		 *
		 * | Status | Meaning |
		 * |--------|---------|
		 * | `200`  | Account deleted |
		 * | `404`  | User not found |
		 */
		assert.ok(api)
		const res = await fetch(`${url}/auth/signup/${user.username}`, { method: 'DELETE' })
		const body = await res.json()
		assert.equal(res.status, 200)
		assert.equal(body.message, 'Account deleted')
	})

	/**
	 * @docs
	 * ---
	 *
	 * ## Authentication Flow
	 *
	 * ```
	 * ┌──────────┐     POST /auth/signup          ┌──────────┐
	 * │  Client  │ ───────────────────────── >    │  Server  │
	 * │          │ < ─ { message: "code sent" }   │          │
	 * │          │                                │          │
	 * │          │   PUT /auth/signup/:user       │          │
	 * │          │ ──── { code: "123456" } ──── > │          │
	 * │          │ < ── { accessToken, refresh }  │          │
	 * │          │                                │          │
	 * │          │   POST /auth/signin/:user      │          │
	 * │          │ ──── { password } ──────── >   │          │
	 * │          │ < ── { accessToken, refresh }  │          │
	 * │          │                                │          │
	 * │          │   GET /private/data.json       │          │
	 * │          │ ── Bearer <accessToken> ── >   │          │
	 * │          │ < ── { ... data ... }          │          │
	 * │          │                                │          │
	 * │          │   PUT /auth/refresh/:token     │          │
	 * │          │ ──────────────────────────── > │          │
	 * │          │ < ── { new accessToken }       │          │
	 * │          │                                │          │
	 * │          │   DELETE /auth/signin/:user    │          │
	 * │          │ ── Bearer <accessToken> ── >   │          │
	 * │          │ < ── { "Logged out" }          │          │
	 * └──────────┘                                └──────────┘
	 * ```
	 *
	 * ## CLI
	 *
	 * Run the auth server directly:
	 *
	 * ```bash
	 * npx nan0auth
	 * ```
	 */
	it('How to run auth server from CLI?', () => {
		assert.ok(pkg.bin?.nan0auth)
	})

	/**
	 * @docs
	 * ## Playground (Interactive CLI)
	 *
	 * Explore all authentication flows interactively without writing code.
	 *
	 * ```bash
	 * npm run play
	 * ```
	 *
	 * **Available scenarios:**
	 *
	 * | Scenario      | What it tests |
	 * |---------------|---------------|
	 * | `demo`        | Full flow: signup → verify → login → private resources → logout |
	 * | `error-cases` | Duplicate signup, wrong password, unauthorized access |
	 * | `token-flow`  | Token refresh, HEAD checks, resource lifecycle |
	 */
	it('In playground mode, verification codes are automatically read from the database.', () => {
		assert.ok(pkg.scripts?.play)
	})

	/**
	 * @docs
	 * ## Contributing
	 */
	it('How to contribute? - [check here]($pkgURL/blob/main/CONTRIBUTING.md)', async () => {
		assert.ok(pkg.scripts?.test)
		assert.equal(pkg.scripts?.precommit, 'npm test')
		assert.equal(pkg.scripts?.prepare, 'husky')
		const text = await fs.loadDocument('CONTRIBUTING.md')
		assert.ok(String(text).includes('# Contributing'))
	})

	/**
	 * @docs
	 * ## License
	 */
	it('How to license? - [ISC LICENSE]($pkgURL/blob/main/LICENSE) file.', async () => {
		/** @docs */
		const text = await fs.loadDocument('LICENSE')
		assert.ok(String(text).includes('ISC'))
	})
}

describe('README.md testing', testRender)

describe('Rendering README.md', async () => {
	let text = ''
	const format = new Intl.NumberFormat('en-US').format
	const parser = new DocsParser()
	const source = await fs.loadDocument('src/README.md.js')
	text = String(parser.decode(source))

	// Create datasets directory if missing
	try {
		await fs.mkdir('.datasets', { recursive: true })
	} catch (e) {}

	await fs.saveDocument('README.md', text)
	const dataset = DatasetParser.parse(text, pkg.name)
	await fs.saveDocument('.datasets/README.dataset.jsonl', dataset)

	it(`document is rendered in README.md [${format(Buffer.byteLength(text))}b]`, async () => {
		const text = await fs.loadDocument('README.md')
		assert.ok(text.includes('# @nan0web/auth-node'))
	})
})
