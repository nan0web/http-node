/** @typedef {import("../messages/IncomingMessage.js").default} IncomingMessage */
/** @typedef {import("../messages/ServerResponse.js").default} ServerResponse */
/** @typedef {import("../server/Server.js").MiddlewareFn} MiddlewareFn */

/**
 * Body parser middleware.
 * @returns {MiddlewareFn}
 */
function bodyParser() {
	/**
	 * Parses request body based on content-type
	 * @param {IncomingMessage & import('node:events').EventEmitter} req
	 * @param {ServerResponse} res
	 * @param {Function} next
	 * @returns {Promise<void>}
	 */
	return async (req, res, next) => {
		if (!req.method || !['POST', 'PUT', 'PATCH'].includes(req.method)) {
			return await next()
		}

		return new Promise((resolve, reject) => {
			let body = ''
			req.on('data', (chunk) => body += chunk)
			req.on('end', async () => {
				try {
					let contentType = ''
					if (req.headers?.get && typeof req.headers.get === 'function') {
						// @ts-ignore
						contentType = req.headers.get('content-type') || ''
					} else if (req.headers && typeof req.headers === 'object') {
						contentType = req.headers['content-type'] || ''
					}

					if (contentType.includes('application/json')) {
						// @ts-ignore
						req.body = JSON.parse(body || '{}')
					} else if (contentType.includes('application/x-www-form-urlencoded')) {
						// @ts-ignore
						req.body = Object.fromEntries(new URLSearchParams(body))
					} else {
						// @ts-ignore
						req.body = body
					}
				} catch {
					// @ts-ignore
					req.body = body
				}
				try {
					await next()
					resolve()
				} catch (err) {
					reject(err)
				}
			})
			req.on('error', reject)
		})
	}
}

export default bodyParser
