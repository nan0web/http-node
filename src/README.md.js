import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import FS from '@nan0web/db-fs'
import { NoConsole } from '@nan0web/log'
import { DatasetParser, DocsParser } from '@nan0web/test'

// Import AuthServer to validate it exists
import AuthServer from './server/AuthServer.js'

const fs = new FS()
let pkg
let console = new NoConsole()

before(async () => {
	const doc = await fs.loadDocument('package.json', {})
	pkg = doc || {}
})

beforeEach(() => {
	console = new NoConsole()
})

function testRender() {
	/**
	 * @docs
	 * # @nan0web/auth-node
	 *
	 * Authorization node.js server for nan0web ecosystem.
	 *
	 * <!-- %PACKAGE_STATUS% -->
	 *
	 * ## Description
	 *
	 * The `@nan0web/auth-node` package provides a standalone Authorization Server capable of:
	 * - **User Management**: Creating and managing users with roles and permissions.
	 * - **Token Issuance**: Generating Access and Refresh tokens (JWT/opaque).
	 * - **Authentication**: Verifying credentials and tokens.
	 * - **RBAC**: Role-Based Access Control logic for permissions.
	 * - **Rate Limiting**: Built-in protection against brute-force attacks.
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
	 * ## Usage
	 *
	 * ### Server Initialization
	 *
	 * Initialize the AuthServer with configuration options like port and database path.
	 */
	it('How to create and start AuthServer?', () => {
		/**
		 * ```js
		 * import AuthServer from '@nan0web/auth-node'
		 * import { NoConsole } from '@nan0web/log'
		 *
		 * const server = new AuthServer({
		 * 	db: { cwd: './auth-data' },
		 * 	port: 3000,
		 * 	logger: new NoConsole(),
		 * })
		 *
		 * await server.start()
		 * console.log('Server started on port:', server.port)
		 *
		 * // Graceful shutdown
		 * await server.stop()
		 * ```
		 */
		assert.ok(AuthServer)
		const server = new AuthServer({
			db: { cwd: './test-unused' },
			port: 0,
			logger: new NoConsole(),
		})
		assert.ok(server)
		assert.ok(server.db)
	})

	/**
	 * @docs
	 * ### Authorization Flow
	 *
	 * The server exposes endpoints for login and token refresh.
	 */
	it('How to authenticate user?', () => {
		/**
		 * ```
		 * POST /auth/login     - { username, password }
		 * POST /auth/refresh   - { refreshToken }
		 * GET  /auth/me        - (with Bearer token)
		 * ```
		 */
		assert.ok(true)
	})

	/**
	 * @docs
	 * ## CLI
	 *
	 * You can run the auth server directly via CLI:
	 *
	 * ```bash
	 * npx nan0auth
	 * ```
	 */
	it('CLI command exists', () => {
		assert.ok(pkg.bin?.nan0auth)
	})
}

describe('README.md testing', testRender)

describe('Rendering README.md', async () => {
	let text = ''
	const format = new Intl.NumberFormat('en-US').format
	const parser = new DocsParser()
	text = String(parser.decode(testRender))

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
