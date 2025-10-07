import { ServerResponse as HttpServerResponse } from 'node:http'
import { Socket } from 'node:net'
import IncomingMessage from './IncomingMessage.js'

/**
 * @extends {HttpServerResponse}
 */
export default class ServerResponse extends HttpServerResponse {
	/** @type {Object} */
	params = {}

	// @todo add jsdoc
	/**
	 *
	 * @param {IncomingMessage} [req]
	 * @param {object} [options]
	 */
	constructor(req = new IncomingMessage(new Socket()), options = {}) {
		super(req)
		this.params = options.params || {}
	}

	/**
	 * Set JSON response.
	 * @param {any} data
	 */
	json(data) {
		this.setHeader('Content-Type', 'application/json')
		this.end(JSON.stringify(data))
	}

	/**
	 * Override writeHead to correctly handle different signatures and set headers.
	 *
	 * Supported signatures:
	 *   writeHead(statusCode, statusMessage, headers)
	 *   writeHead(statusCode, headers)
	 *   writeHead(statusCode, statusMessage)
	 *
	 * @param {number} statusCode
	 * @param {string|object|Array} [statusMessageOrHeaders]
	 * @param {object|Array} [headersOrCallback]
	 */
	writeHead(statusCode, statusMessageOrHeaders, headersOrCallback) {
		/** @type {string|undefined} */
		let statusMessage
		/** @type {object|Array|undefined} */
		let headers

		if (typeof statusMessageOrHeaders === 'string') {
			statusMessage = statusMessageOrHeaders
			headers = headersOrCallback
		} else {
			headers = statusMessageOrHeaders
		}

		// Set headers manually so getHeader works immediately
		if (headers) {
			if (Array.isArray(headers)) {
				// array of [key, value] pairs
				for (const [key, value] of headers) {
					this.setHeader(key, value)
				}
			} else {
				// object mapping
				for (const [key, value] of Object.entries(headers)) {
					this.setHeader(key, value)
				}
			}
		}

		// Let the parent handle status code & optional status message
		return super.writeHead(statusCode, statusMessage)
	}

	end(chunk, encoding, callback) {
		if (!this.headersSent) {
			super.writeHead(this.statusCode, this.statusMessage, this.getHeaders())
		}
		return super.end(chunk, encoding, callback)
	}
}
