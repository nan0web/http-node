import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { connect as http2Connect } from 'node:http2'
import { URL } from 'node:url'
import { Buffer } from 'node:buffer'
import { HTTPStatusCode, AbortError } from "@nan0web/http"
import ResponseMessage from '../messages/ResponseMessage.js'

/**
 * @typedef {Object} FetchOptions
 * @property {string} [options.method] - The HTTP method
 * @property {Record<string, string|string[]|undefined>} [options.headers] - The request headers
 * @property {Buffer|ReadableStream|Object} [options.body] - The request body
 * @property {string} [options.type] - The response type
 * @property {string} [options.protocol] - The protocol to use (http, https, http2)
 * @property {string[]} [options.ALPNProtocols] - The ALPNProtocols.
 * @property {number} [options.timeout] - The timeout in milliseconds
 * @property {boolean} [options.rejectUnauthorized] - Reject self-signed certificates
 * @property {Console} [options.logger] - The logger to use
 * @property {AbortSignal} [options.signal] - Abort signal.
 */

/**
 * Core fetch function
 * @param {string} url - The URL to fetch
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<ResponseMessage>} The response
 */
async function fetch(url, options = {}) {
	const {
		method = 'GET',
		headers = {},
		body,
		type = 'json',
		protocol = 'http',
		ALPNProtocols = ['h2', 'http/1.1'],
		rejectUnauthorized = true,
		timeout = 0,
		logger = console,
		signal,
	} = options

	const parsedUrl = new URL(url)
	const isHttps = parsedUrl.protocol === 'https:'
	const useHttp2 = protocol === 'http2' && isHttps

	const requestHeaders = { ...headers }
	if (body && !requestHeaders['Content-Type']) {
		if (type === 'json') requestHeaders['Content-Type'] = 'application/json'
		else if (type === 'binary') requestHeaders['Content-Type'] = 'application/octet-stream'
	}

	const controller = new AbortController()
	let timeoutId = null

	if (signal) {
		if (signal.aborted) {
			controller.abort()
		} else {
			signal.addEventListener('abort', () => controller.abort())
		}
	}

	if (timeout > 0) {
		timeoutId = setTimeout(() => controller.abort(), timeout)
	}

	return new Promise((resolve, reject) => {
		const onAbort = () => {
			if (timeoutId) clearTimeout(timeoutId)
			reject(new AbortError('The operation was aborted'))
		}

		controller.signal.addEventListener('abort', onAbort)

		if (useHttp2) {
			logger.debug(`Attempting HTTP/2 connection to ${url}`)
			let client
			try {
				client = http2Connect(`${parsedUrl.protocol}//${parsedUrl.host}`, {
					rejectUnauthorized,
					ALPNProtocols,
				})
				logger.debug('HTTP/2 client connected')
			} catch (/** @type {unknown} */ err) {
				logger.error('HTTP/2 connect error:', err)
				controller.signal.removeEventListener('abort', onAbort)
				return reject(err)
			}

			client.on('error', (err) => {
				if (timeoutId) clearTimeout(timeoutId)
				logger.error('HTTP/2 client error:', err)
				controller.signal.removeEventListener('abort', onAbort)
				reject(err)
			})

			client.on('connect', () => {
				logger.debug('HTTP/2 session established')
			})

			const req = client.request({
				':method': method.toUpperCase(),
				':path': parsedUrl.pathname + parsedUrl.search,
				...requestHeaders
			}, {
				signal: controller.signal
			})

			req.on('error', (err) => {
				if (timeoutId) clearTimeout(timeoutId)
				logger.error('HTTP/2 request error:', err)
				controller.signal.removeEventListener('abort', onAbort)
				reject(err)
			})

			if (body) {
				if (typeof body === 'string' || body instanceof Buffer) req.write(body)
				else if (typeof body.pipe === 'function') body.pipe(req)
				else req.write(JSON.stringify(body))
			}
			req.end()

			req.on('response', (headers, flags) => {
				logger.debug('HTTP/2 response received with status:', headers[':status'])
				const status = headers[':status'] || 200
				const responseHeaders = { ...headers }
				delete responseHeaders[':status']

				const responseType = type // keep original type

				if (type === 'sockets') {
					controller.signal.removeEventListener('abort', onAbort)
					if (timeoutId) clearTimeout(timeoutId)
					resolve(
						new ResponseMessage(req, {
							status,
							statusText: HTTPStatusCode.get(status) || 'OK',
							headers: responseHeaders,
							url,
							type: responseType
						})
					)
				} else {
					/** @type {Uint8Array[]} */
					const chunks = []
					req.on('data', chunk => {
						logger.debug('Received data chunk')
						chunks.push(chunk)
					})
					req.on('end', () => {
						logger.debug('Request ended')
						controller.signal.removeEventListener('abort', onAbort)
						if (timeoutId) clearTimeout(timeoutId)
						const buffer = Buffer.concat(chunks)
						resolve(
							new ResponseMessage(buffer, {
								status,
								statusText: HTTPStatusCode.get(status) || 'OK',
								headers: responseHeaders,
								url,
								type: responseType
							})
						)
					})
				}
			})

			req.on('close', () => {
				if (timeoutId) clearTimeout(timeoutId)
				logger.debug('HTTP/2 request completed')
				client.close()
			})
		} else {
			const requester = isHttps ? httpsRequest : httpRequest
			const req = requester(
				{
					hostname: parsedUrl.hostname,
					port: parsedUrl.port || (isHttps ? 443 : 80),
					path: parsedUrl.pathname + parsedUrl.search,
					method: method.toUpperCase(),
					headers: requestHeaders,
					rejectUnauthorized,
					signal: controller.signal
				},
				res => {
					const status = res.statusCode || 200
					// @ts-ignore - type mismatch in headers
					const responseHeaders = res.headers || {}

					const responseType = type // keep original type

					if (type === 'sockets') {
						controller.signal.removeEventListener('abort', onAbort)
						if (timeoutId) clearTimeout(timeoutId)
						resolve(
							new ResponseMessage(res, {
								status,
								statusText: res.statusMessage || HTTPStatusCode.get(status) || 'OK',
								headers: responseHeaders,
								url,
								type: responseType
							})
						)
					} else {
						/** @type {Uint8Array[]} */
						const chunks = []
						res.on('data', chunk => chunks.push(chunk))
						res.on('end', () => {
							controller.signal.removeEventListener('abort', onAbort)
							if (timeoutId) clearTimeout(timeoutId)
							const buffer = Buffer.concat(chunks)
							resolve(
								new ResponseMessage(buffer, {
									status,
									statusText: res.statusMessage || HTTPStatusCode.get(status) || 'OK',
									headers: responseHeaders,
									url,
									type: responseType
								})
							)
						})
					}
				}
			)

			req.on('error', (err) => {
				if (timeoutId) clearTimeout(timeoutId)
				controller.signal.removeEventListener('abort', onAbort)
				reject(err)
			})

			if (body) {
				if (typeof body === 'string' || body instanceof Buffer) req.write(body)
				else if (typeof body.pipe === 'function') body.pipe(req)
				else req.write(JSON.stringify(body))
			}
			req.end()
		}
	})
}

/**
 * Makes a GET request
 * @param {string} url - The URL to fetch
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<ResponseMessage>} The response
 */
function get(url, options = {}) {
	return fetch(url, { ...options, method: 'GET' })
}

/**
 * Makes a POST request
 * @param {string} url - The URL to fetch
 * @param {Object|Buffer|ReadableStream} body - The request body
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<ResponseMessage>} The response
 */
function post(url, body, options = {}) {
	return fetch(url, { ...options, method: 'POST', body })
}

/**
 * Makes a PUT request
 * @param {string} url - The URL to fetch
 * @param {Object|Buffer|ReadableStream} body - The request body
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<ResponseMessage>} The response
 */
function put(url, body, options = {}) {
	return fetch(url, { ...options, method: 'PUT', body })
}

/**
 * Makes a PATCH request
 * @param {string} url - The URL to fetch
 * @param {Object|Buffer|ReadableStream} body - The request body
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<ResponseMessage>} The response
 */
function patch(url, body, options = {}) {
	return fetch(url, { ...options, method: 'PATCH', body })
}

/**
 * Makes a DELETE request
 * @param {string} url - The URL to fetch
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<ResponseMessage>} The response
 */
function del(url, options = {}) {
	return fetch(url, { ...options, method: 'DELETE' })
}

/**
 * Makes a HEAD request
 * @param {string} url - The URL to fetch
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<ResponseMessage>} The response
 */
function head(url, options = {}) {
	return fetch(url, { ...options, method: 'HEAD' })
}

/**
 * Makes an OPTIONS request
 * @param {string} url - The URL to fetch
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<ResponseMessage>} The response
 */
function options(url, options = {}) {
	return fetch(url, { ...options, method: 'OPTIONS' })
}

/**
 * APIRequest class for handling API requests with default options
 * @class
 * @param {string} baseUrl - The base URL for API requests
 * @param {Object} defaultHeaders - Default headers for all requests
 * @param {Object} options - Additional options
 * @param {boolean} options.rejectUnauthorized - Reject self-signed certificates
 * @param {number} options.timeout - The timeout in milliseconds
 * @param {Object} options.logger - The logger to use
 */
class APIRequest {
	constructor(baseUrl, defaultHeaders = {}, options = {}) {
		this.baseUrl = baseUrl
		this.defaultHeaders = defaultHeaders
		this.options = {
			rejectUnauthorized: options.rejectUnauthorized ?? true,
			timeout: options.timeout || 0,
			ALPNProtocols: options.ALPNProtocols || ['h2', 'http/1.1']
		}
		this.logger = options.logger || console
	}

	/**
	 * Constructs full URL from base and path
	 * @param {string} path - The API endpoint path
	 * @returns {string} The full URL
	 */
	getFullUrl(path) {
		if (!this.baseUrl) {
			throw new Error('baseUrl is not defined')
		}
		try {
			return new URL(path, this.baseUrl).toString()
		} catch (/** @type {unknown} */ error) {
			// @ts-ignore
			throw new Error(`Invalid URL construction: ${error.message}`)
		}
	}

	/**
	 * Makes a GET request
	 * @param {string} path - The API endpoint path
	 * @param {Object} headers - Additional headers
	 * @returns {Promise<ResponseMessage>} The response
	 */
	get(path, headers = {}) {
		const url = this.getFullUrl(path)
		return fetch(url, {
			...this.options,
			method: 'GET',
			headers: { ...this.defaultHeaders, ...headers },
			type: 'json',
			protocol: url.startsWith('https://') ? 'https' : 'http',
			logger: this.logger
		})
	}

	/**
	 * Makes a POST request
	 * @param {string} path - The API endpoint path
	 * @param {Object|Buffer|ReadableStream} body - The request body
	 * @param {Object} headers - Additional headers
	 * @returns {Promise<ResponseMessage>} The response
	 */
	post(path, body, headers = {}) {
		const url = this.getFullUrl(path)
		return fetch(url, {
			...this.options,
			method: 'POST',
			headers: { ...this.defaultHeaders, ...headers },
			body,
			type: 'json',
			protocol: url.startsWith('https://') ? 'https' : 'http',
			logger: this.logger
		})
	}

	/**
	 * Makes a PUT request
	 * @param {string} path - The API endpoint path
	 * @param {Object|Buffer|ReadableStream} body - The request body
	 * @param {Record<string, string>} headers - Additional headers
	 * @returns {Promise<ResponseMessage>} The response
	 */
	put(path, body, headers = {}) {
		const url = this.getFullUrl(path)
		return fetch(url, {
			...this.options,
			method: 'PUT',
			headers: { ...this.defaultHeaders, ...headers },
			body,
			type: 'json',
			protocol: url.startsWith('https://') ? 'https' : 'http',
			logger: this.logger
		})
	}

	/**
	 * Makes a PATCH request
	 * @param {string} path - The API endpoint path
	 * @param {Object|Buffer|ReadableStream} body - The request body
	 * @param {Record<string, string>} headers - Additional headers
	 * @returns {Promise<ResponseMessage>} The response
	 */
	patch(path, body, headers = {}) {
		const url = this.getFullUrl(path)
		return fetch(url, {
			...this.options,
			method: 'PATCH',
			headers: { ...this.defaultHeaders, ...headers },
			body,
			type: 'json',
			protocol: url.startsWith('https://') ? 'https' : 'http',
			logger: this.logger
		})
	}

	/**
	 * Makes a DELETE request
	 * @param {string} path - The API endpoint path
	 * @param {Record<string, string>} headers - Additional headers
	 * @returns {Promise<ResponseMessage>} The response
	 */
	del(path, headers = {}) {
		const url = this.getFullUrl(path)
		return fetch(url, {
			...this.options,
			method: 'DELETE',
			headers: { ...this.defaultHeaders, ...headers },
			type: 'json',
			protocol: url.startsWith('https://') ? 'https' : 'http',
			logger: this.logger
		})
	}
}

export default fetch
export { APIRequest, get, post, put, patch, del, head, options }
