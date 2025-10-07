import { createServer } from '../server/index.js'
import fetch from '../client/fetch.js'

/** @typedef {import('../server/Server.js').MiddlewareFn} MiddlewareFn */

/**
 * TestServer для інтеграційних тестів: створює тимчасовий сервер з роутами.
 */
export default class TestServer {
	constructor(options = {}) {
		this.server = createServer({ ...options, port: 0, logger: console })
		this.baseUrl = null
	}

	/**
	 * Add a route to the test server
	 * @param {string} method - HTTP method (GET, POST, etc.)
	 * @param {string} path - Route path
	 * @param {MiddlewareFn} handler - Route handler function
	 * @returns {TestServer} This instance for chaining
	 */
	route(method, path, handler) {
		const methods = [
			'get',
			'post',
			'put',
			'delete',
			'patch',
			'head',
			'options',
		]

		method = method.toLowerCase()
		const actualMethod = methods.includes(method) ? method : null
		if (actualMethod && typeof this.server[actualMethod] === 'function') {
			this.server[actualMethod](path, handler)
		} else {
			// fallback to get for methods not explicitly supported
			this.server.get(path, handler)
		}
		return this
	}

	/**
	 * Add middleware to the test server
	 * @param {MiddlewareFn} middleware
	 * @returns {TestServer} This instance for chaining
	 */
	use(middleware) {
		this.server.use(middleware)
		return this
	}

	/**
	 * Start the test server
	 * @returns {Promise<TestServer>} This instance for chaining
	 */
	async start() {
		await this.server.listen()
		const addr = this.server.server?.address()
		// addr can be a string or AddressInfo; safely extract port
		const portNumber = typeof addr === 'object' && addr !== null && 'port' in addr
			? /** @type {number} */ (addr.port)
			: undefined
		const port = (':' + (portNumber ?? '80')).replace(/^\:80$/, '')
		// @ts-ignore
		this.baseUrl = `http://localhost${port}`
		return this
	}

	/**
	 * Stop the test server
	 * @returns {Promise<void>}
	 */
	async stop() {
		await this.server.close()
	}

	/**
	 * Make a request to the test server
	 * @param {string} path - Request path
	 * @param {Object} options - Fetch options
	 * @returns {Promise<import('../client/fetch.js').SimpleResponse|import('../messages/ResponseMessage').default>} Response object
	 */
	async request(path, options = {}) {
		if (!this.baseUrl) throw new Error('Call start() first')
		return fetch(`${this.baseUrl}${path}`, options)
	}
}
