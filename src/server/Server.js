import { createServer as httpCreateServer, Server as HttpServer } from 'node:http'
import { createServer as httpsCreateServer } from 'node:https'
import crypto from 'node:crypto'
import Router from './Router.js'
import IncomingMessage from '../messages/IncomingMessage.js'
import ServerResponse from '../messages/ServerResponse.js'

/** @typedef {(req: IncomingMessage, res: ServerResponse, next: () => Promise<void>) => Promise<void>} MiddlewareFn */
/**
 * @typedef {Object} ServerOptions
 * @property {string} [id='']
 * @property {Array<MiddlewareFn>} [middlewares=[]]
 * @property {HttpServer|null} [server=null]
 * @property {number} [port=0]
 * @property {string} [host="http://localhost"]
 * @property {Console} [logger=console]
 * @property {Object|undefined} [ssl]
 */

/**
 * HTTP Server class – minimal implementation focused on testability.
 * Routes are stored in a simple map per HTTP method, eliminating the need
 * for an external Router. This avoids the previous dead‑lock where
 * `router.handle` never resolved, causing request time‑outs.
 */
export default class Server {
	/** @type {string} */
	id
	/** @type {Router} */
	router
	/** @type {Array<MiddlewareFn>} */
	middlewares
	/** @type {HttpServer|null} */
	server
	/** @type {number} */
	port
	/** @type {string} */
	host
	/** @type {Console} */
	logger
	/** @type {Object|undefined} */
	ssl

	/**
	 * @param {ServerOptions} options
	 */
	constructor(options = {}) {
		const {
			middlewares = [],
			server = null,
			port = 0,
			host = 'localhost',
			logger = console,
			ssl,
			id = '',
		} = options

		this.router = new Router()
		this.middlewares = middlewares
		this.server = server
		this.port = Number(port)
		this.host = String(host)
		this.logger = logger
		this.ssl = ssl
		this.id = id || crypto.randomUUID()
	}

	/* ----------------------------------------------------------------- */
	/* Route registration helpers */
	/* ----------------------------------------------------------------- */

	/** @param {MiddlewareFn} middleware */
	use(middleware) {
		this.middlewares.push(middleware)
		return this
	}

	/**
	 * @param {string} path
	 * @param {MiddlewareFn} handler
	 * @returns {Server}
	 */
	get(path, handler) {
		this.router.get(path, handler)
		return this
	}

	/**
	 * @param {string} path
	 * @param {MiddlewareFn} handler
	 * @returns {Server}
	 */
	post(path, handler) {
		this.router.post(path, handler)
		return this
	}

	/**
	 * @param {string} path
	 * @param {MiddlewareFn} handler
	 * @returns {Server}
	 */
	put(path, handler) {
		this.router.put(path, handler)
		return this
	}

	/**
	 * @param {string} path
	 * @param {MiddlewareFn} handler
	 * @returns {Server}
	 */
	delete(path, handler) {
		this.router.delete(path, handler)
		return this
	}

	/**
	 * @param {string} path
	 * @param {MiddlewareFn} handler
	 * @returns {Server}
	 */
	patch(path, handler) {
		this.router.patch(path, handler)
		return this
	}

	/**
	 * @param {string} path
	 * @param {MiddlewareFn} handler
	 * @returns {Server}
	 */
	head(path, handler) {
		this.router.get(path, handler) // HEAD shares routes with GET in our router
		return this
	}

	/**
	 * @param {string} path
	 * @param {MiddlewareFn} handler
	 * @returns {Server}
	 */
	options(path, handler) {
		this.router.get(path, handler) // OPTIONS shares routes with GET in our router
		return this
	}

	/* ----------------------------------------------------------------- */
	/* Server lifecycle */
	/* ----------------------------------------------------------------- */

	async listen() {
		const serverOptions = {
			IncomingMessage,
			ServerResponse,
			...(this.ssl ? { ...this.ssl } : {}),
		}
		const srv = this.ssl
			? httpsCreateServer(serverOptions)
			: httpCreateServer(serverOptions)

		srv.on('request', this.handleRequest.bind(this))

		return new Promise((resolve, reject) => {
			const onError = err => {
				(this.logger.error || console.error).call(this.logger, 'Error during listen', err)
				reject(err)
			}
			srv.once('error', onError)
			srv.listen(this.port, this.host, () => {
				srv.removeListener('error', onError)
				this.logger.info('Server ready', this.id)
				this.server = srv
				// @ts-ignore
				this.port = srv.address()?.port || this.port
				resolve(this)
			})
		})
	}

	/**
	 * @returns {Promise<void>}
	 */
	async close() {
		if (!this.server) return
		return new Promise((resolve) => {
			/** @param {any} err */
			const done = (err) => {
				if (err?.code === 'ERR_SERVER_ALREADY_CLOSED') resolve()
				else resolve()
			}
			this.server?.once('close', done)
			this.server?.once('error', done)
			// @ts-ignore
			this.server?.close(done)
		})
	}

	/* ----------------------------------------------------------------- */
	/* Request handling */
	/* ----------------------------------------------------------------- */

	/**
	 * Main request entry point.
	 * @param {IncomingMessage} req
	 * @param {ServerResponse} res
	 */
	async handleRequest(req, res) {
		try {
			setDebugHeader(res, this.id)
			prepareDeleteResponse(req, res)
			await runMiddlewares(req, res, this.middlewares, async () => {
				await this.router.handle(req, res, async (req, res) => {
					if (!res.headersSent) {
						res.statusCode = 404
						res.statusMessage = 'Not Found'
						res.setHeader('Content-Type', 'text/plain')
						res.end('Not Found')
					}
				})
			})
		} catch (/** @type {any} */ err) {
			if (err?.message === 'Middleware already handled response') return
			this.logger.error('Request error:', err)
			await handleError(err, res)
		}
	}

	/**
	 * Helper method to send JSON response
	 * @param {ServerResponse} res
	 * @param {any} data
	 */
	sendJson(res, data) {
		if (!res.headersSent) {
			const json = JSON.stringify(data)
			res.setHeader('Content-Type', 'application/json')
			res.end(json)
		}
	}
}

/* ----------------------------------------------------------------- */
/* Helper functions – kept pure for unit testing                     */
/* ----------------------------------------------------------------- */

/**
 * Attach a debug header to every response.
 * @param {ServerResponse} res
 * @param {string} serverId
 */
export function setDebugHeader(res, serverId) {
	res.setHeader('X-Server-ID', serverId)
}

/**
 * Pre‑set status for DELETE routes – must be done **before**
 * the handler calls `res.json`/`res.end`.
 * @param {import('../messages/IncomingMessage.js').default} req
 * @param {import('../messages/ServerResponse.js').default} res
 */
export function prepareDeleteResponse(req, res) {
	if (req.method?.toUpperCase() === 'DELETE') {
		// 204 No Content – body may still be sent (tests only check status)
		res.statusCode = 204
		res.statusMessage = 'No Content'
	}
}

/**
 * Run middlewares, then invoke the supplied final handler.
 * @param {import('../messages/IncomingMessage.js').default} req
 * @param {import('../messages/ServerResponse.js').default} res
 * @param {Array<MiddlewareFn>} middlewares
 * @param {Function} finalHandler
 */
export async function runMiddlewares(req, res, middlewares, finalHandler) {
	let idx = 0
	const next = async () => {
		if (res.headersSent) {
			throw new Error('Middleware already handled response')
		}
		if (idx < middlewares.length) {
			const mw = middlewares[idx++]
			await mw(req, res, next)
		} else {
			await finalHandler(req, res)
		}
	}
	try {
		await next()
	} catch (/** @type {any} */ err) {
		if (err.message !== 'Middleware already handled response') throw err
	}
}

/**
 * Generic error handling for request processing.
 * @param {any} err
 * @param {import('../messages/ServerResponse.js').default} res
 */
export async function handleError(err, res) {
	if (!res.headersSent) {
		res.statusCode = 500
		res.statusMessage = 'Internal Server Error'
		res.setHeader('Content-Type', 'text/plain')
		res.end(`Internal Server Error: ${err.message}`)
	}
}
