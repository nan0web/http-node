/** @typedef {import('../messages/IncomingMessage.js').default} IncomingMessage */
/** @typedef {import('../messages/ResponseMessage.js').default} ResponseMessage */

/**
 * Brute force protection middleware.
 * @param {Object} [options]
 * @param {number} [options.windowMs=60_000] - Time window in milliseconds.
 * @param {number} [options.max=100] - Max requests per window per pathname.
 * @param {(req: IncomingMessage, res: ResponseMessage, next: Function) => void} [options.handler] - Custom handler when limit is exceeded.
 * @returns {(req: IncomingMessage, res: ResponseMessage, next: Function) => Promise<void>}
 */
export default function bruteForce(options = {}) {
	const {
		windowMs = 60_000,
		max = 100,
		handler = (req, res, next) => {
			// Використовуємо writeHead для сумісності з ResponseMessage та тестами
			res.writeHead(429, 'Too Many Requests', [
				['Content-Type', 'text/plain']
			])
			// @ts-ignore - ResponseMessage has end method in practice
			res.end('Too Many Requests')
		}
	} = options

	const hits = new Map()

	const cleanUp = () => {
		const now = Date.now()
		for (const [key, { timestamp }] of hits.entries()) {
			if (now - timestamp > windowMs) {
				hits.delete(key)
			}
		}
	}

	/**
	 * @param {IncomingMessage} req
	 * @param {ResponseMessage} res
	 * @param {Function} next
	 * @returns {Promise<void>}
	 */
	return async (req, res, next) => {
		const ip = req.socket?.remoteAddress || 'unknown'
		// Parse URL to get pathname only (ignore query params)
		const url = new URL(req.url || '/', 'http://localhost')
		const pathname = url.pathname
		const key = `${ip}:${pathname}`

		cleanUp() // Викликаємо перед перевіркою для свіжості

		if (!hits.has(key)) {
			hits.set(key, {
				count: 1,
				timestamp: Date.now()
			})
			return await next()
		}

		const entry = hits.get(key)
		entry.count++

		if (entry.count > max) {
			return handler(req, res, next)
		}

		return await next()
	}
}