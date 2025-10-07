/**
 * Body parser middleware.
 * @returns {(req: import('../messages/IncomingMessage.js').default, res: import('../messages/ResponseMessage.js').default, next: Function) => Promise<void>}
 */
function bodyParser() {
	/**
	 * Parses request body based on content-type
	 * @param {import('../messages/IncomingMessage.js').default & import('node:events').EventEmitter} req
	 * @param {import('../messages/ResponseMessage.js').default} res
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
					const contentType = req.headers?.get('content-type') || ''

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