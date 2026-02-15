import { ServerResponse as HttpServerResponse } from 'node:http'

/**
 * ServerResponse wraps Node.js http.ServerResponse to provide
 * chainable status() and json() methods for consistent response output.
 * @extends {HttpServerResponse}
 */
class ServerResponse extends HttpServerResponse {
	/** @type {Object} */
	params = {}

	/**
	 * Set response status code (chainable, Express-style)
	 * @param {number} code
	 * @returns {this}
	 */
	status(code) {
		this.statusCode = code
		return this
	}

	/**
	 * Send JSON response
	 * @param {any} data
	 */
	json(data) {
		this.setHeader('Content-Type', 'application/json')
		this.end(JSON.stringify(data))
	}
}

export default ServerResponse
