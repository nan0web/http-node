import { Readable } from 'node:stream'
import { HTTPStatusCode } from "@nan0web/http"

/**
 * Minimal response implementation used by the test suite.
 *
 * It behaves like a `Readable` stream and provides the same
 * surface area as the browser `Response` object (status,
 * statusText, ok, headers, json(), text(), buffer(),
 * arrayBuffer() and stream()).
 *
 * The class can be instantiated with a body (string,
 * Buffer, Uint8Array or a readable stream) and an optional
 * options object containing status, statusText, headers,
 * url and type.
 *
 * @extends Readable
 */
export default class ResponseMessage extends Readable {
	/** @type {boolean} */
	#headersSent = false
	/** @type {number} */
	#status = 200
	/** @type {string} */
	#statusText = 'OK'
	/** @type {any} */
	#body = null
	/** @type {string} */
	#url = ''
	/** @type {string} */
	#type = 'default'
	/** @type {Object.<string,string|string[]>} */
	#headers = {}
	/** @type {boolean} */
	#pushed = false
	/** @type {import('node:net').Socket|undefined} */
	socket = undefined

	/**
	 * @param {any} bodyOrReq – In fetch mode this is the response body.
	 * @param {Object} [options={}] Options for fetch mode.
	 */
	constructor(bodyOrReq, options = {}) {
		super()
		// Legacy mode (not used in the current tests) – treat the argument as a
		// Node ServerResponse. We simply store it as the body.
		if (typeof bodyOrReq?.socket !== 'undefined' && typeof bodyOrReq?.assignSocket === 'function') {
			// @todo cover with a test
			this.#body = bodyOrReq
			return
		}
		// Fetch mode
		this.#body = bodyOrReq
		const {
			status = 200,
			statusText = 'OK',
			headers = {},
			url = '',
			type = 'default',
		} = options
		this.#status = Number(status)
		this.#statusText = String(statusText)
		this.#url = String(url)
		this.#type = String(type)
		this.#headers = { ...headers }
	}

	// -----------------------------------------------------------------
	// Basic status handling
	// -----------------------------------------------------------------
	/** @type {number} */
	get status() {
		return this.#status
	}
	/** @type {number} */
	set status(value) {
		this.#status = Number(value)
		const key = `CODE_${value}`
		this.statusText = HTTPStatusCode[key] || "Unknown"
	}

	/** @type {string} */
	get statusText() {
		return this.#statusText
	}
	/** @type {string} */
	set statusText(value) {
		this.#statusText = String(value)
	}

	/** @type {boolean} */
	get ok() {
		return this.#status >= 200 && this.#status < 300
	}

	/** @type {boolean} */
	get headersSent() {
		return this.#headersSent
	}
	/** @type {boolean} */
	set headersSent(v) {
		// @todo cover with a test
		this.#headersSent = Boolean(v)
	}

	/** Mimic ServerResponse.writeHead – set status and mark headers sent. */
	writeHead(statusCode, statusMessage, headers = []) {
		this.#status = Number(statusCode)
		if (typeof statusMessage === 'string') this.#statusText = statusMessage
		if (Array.isArray(headers)) {
			// @ts-ignore
			headers.forEach(([k, v]) => this.setHeader(k, v))
		} else if (typeof headers === 'object') {
			Object.entries(headers).forEach(([k, v]) => this.setHeader(k, v))
		}
		this.#headersSent = true
		return this
	}

	/** @type {Map<string,string|string[]>} */
	get headers() {
		// @ts-ignore
		const entries = Object.entries(this.#headers).map(([k, v]) => {
			k = k.toLowerCase()
			if (Array.isArray(v)) return [k, v]
			if (typeof v === 'undefined') return [k, '']
			return [k, String(v)]
		})
		// @ts-ignore
		return new Map(entries)
	}
	/** @type {string} */
	get url() {
		// @todo cover with a test
		return this.#url
	}
	/** @type {string} */
	get type() {
		// @todo cover with a test
		return this.#type
	}

	// -----------------------------------------------------------------
	// Header helpers (mimic ServerResponse API)
	// -----------------------------------------------------------------
	/** @param {string} name */
	setHeader(name, value) {
		this.#headers[name.toLowerCase()] = value
	}
	/** @param {string} name */
	getHeader(name) {
		return this.#headers[name.toLowerCase()]
	}
	/** @param {string} name */
	removeHeader(name) {
		delete this.#headers[name.toLowerCase()]
	}
	/** @returns {Object} plain header map */
	getHeaders() {
		return { ...this.#headers }
	}

	// -----------------------------------------------------------------
	// Readable implementation – emit stored body when read.
	// -----------------------------------------------------------------
	_read() {
		if (this.#pushed) return
		this.#pushed = true
		const body = this.#body

		if (typeof body === 'string') {
			this.push(body)
			this.push(null)
		} else if (Buffer.isBuffer(body)) {
			this.push(body)
			this.push(null)
		} else if (body instanceof Uint8Array) {
			this.push(Buffer.from(body))
			this.push(null)
		} else if (body && typeof body.read === 'function') {
			// Forward data from the provided readable stream.
			body.on('data', (chunk) => this.push(chunk))
			body.on('end', () => this.push(null))
			body.on('error', (err) => this.destroy(err))
		} else if (body !== null && body !== undefined) {
			// @todo cover with a test
			this.push(String(body))
			this.push(null)
		} else {
			this.push(null)
		}
	}

	// -----------------------------------------------------------------
	// Parsing helpers – operate on the stored body.
	// -----------------------------------------------------------------
	/** @returns {Promise<any>} */
	async json() {
		const txt = await this.text()
		if (!txt) {
			return {}
		}
		return JSON.parse(txt)
	}

	/** @returns {Promise<string>} */
	async text() {
		if (typeof this.#body === 'string') return this.#body
		if (Buffer.isBuffer(this.#body)) return this.#body.toString()
		if (this.#body instanceof Uint8Array) return Buffer.from(this.#body).toString()
		if (this.#body && typeof this.#body.read === 'function') {
			// @todo cover with a test
			const chunks = []
			for await (const chunk of this.#body) chunks.push(chunk)
			return Buffer.concat(chunks).toString()
		}
		if (this.#body !== null && this.#body !== undefined) {
			// @todo cover with a test
			return String(this.#body)
		}
		// @todo cover with a test
		return ''
	}

	/** @returns {Promise<Buffer>} */
	async buffer() {
		if (Buffer.isBuffer(this.#body)) return this.#body
		if (this.#body instanceof Uint8Array) return Buffer.from(this.#body)
		const txt = await this.text()
		return Buffer.from(txt)
	}

	/** @returns {Promise<ArrayBuffer>} */
	async arrayBuffer() {
		// @todo cover with a test
		const buf = await this.buffer()
		return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
	}

	/** @returns {any} – returns this instance (compatible with socket streaming). */
	stream() {
		return this
	}

	// -----------------------------------------------------------------
	// Node.js HTTP server compatibility methods
	// -----------------------------------------------------------------
	/**
	 * Assign socket to response (required by Node.js HTTP server)
	 * @param {import('node:net').Socket} socket
	 */
	assignSocket(socket) {
		this.socket = socket
	}

	/**
	 * Write data to response
	 * @param {string|Buffer} chunk
	 * @param {string} [encoding]
	 * @param {Function} [callback]
	 */
	write(chunk, encoding, callback) {
		// Store the chunk to be used in _read method
		if (!this.#body && chunk) {
			this.#body = chunk
		}
		if (callback) callback()
		return true
	}

	/**
	 * End response
	 * @param {string|Buffer} [data]
	 * @param {string} [encoding]
	 * @param {Function} [callback]
	 */
	end(data, encoding, callback) {
		// If data is provided, store it
		if (data !== undefined) {
			this.#body = data
		}
		// Mark headers as sent if not already done
		if (!this.#headersSent) {
			// @ts-ignore
			this.writeHead(this.#status, this.#statusText, this.#headers)
		}
		// Push the data and end the stream
		this._read()
		if (callback) callback()
		return this
	}
}
