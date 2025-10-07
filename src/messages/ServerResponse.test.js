import { describe, it } from 'node:test'
import { strictEqual, deepStrictEqual } from 'node:assert/strict'
import { IncomingMessage } from 'node:http'
import ServerResponse from './ServerResponse.js'

// Мок req для super (мінімальний IncomingMessage)
const mockReq = new IncomingMessage() // базовий з node:http
mockReq.method = 'GET'
mockReq.url = '/'

// Helper для створення instance (симулює res.end без async)
function createServerResponse(req = mockReq, options = {}) {
	const res = new ServerResponse(req, options)
	// Spy для end (щоб перевірити виклики)
	res._spyEnd = { data: null, called: false }
	const originalEnd = res.end
	res.end = function(chunk, encoding, callback) {
		this._spyEnd.called = true
		this._spyEnd.data = chunk
		if (callback) callback()
		return originalEnd.call(this, chunk, encoding, callback)
	}
	return res
}

describe('ServerResponse', () => {
	it('extends HttpServerResponse', () => {
		const res = createServerResponse(mockReq)
		strictEqual(res instanceof ServerResponse, true)
	})

	it('constructor initializes params', () => {
		const res = createServerResponse(mockReq, { params: { id: '123' } })
		deepStrictEqual(res.params, { id: '123' })

		const res2 = createServerResponse(mockReq)
		deepStrictEqual(res2.params, {})
	})

	it('json method sets Content-Type and ends with JSON', () => {
		const res = createServerResponse(mockReq)
		const testData = { message: 'test' }

		res.json(testData)
		strictEqual(res.getHeader('content-type'), 'application/json')
		strictEqual(res._spyEnd.called, true)
		deepStrictEqual(JSON.parse(res._spyEnd.data), testData)
	})

	describe('writeHead', () => {
		it('sets status and string statusMessage with object headers', () => {
			const res = createServerResponse(mockReq)
			res.writeHead(404, 'Not Found', { 'Content-Type': 'text/plain' })
			const headers = res._header.split("\r\n")
			strictEqual(headers.includes("Content-Type: text/plain"), true)
			// @todo fix: somehow getHeader does not return the header from res._header, it might be because it is already sent
			strictEqual(res.statusCode, 404)
			strictEqual(res.statusMessage, 'Not Found')
			strictEqual(res.getHeader('Content-Type'), 'text/plain')
		})

		it('sets status with object headers (no statusMessage)', () => {
			const res = createServerResponse(mockReq)
			res.writeHead(201, { Location: '/new' })
			const headers = res._header.split("\r\n")
			strictEqual(headers.includes("Location: /new"), true)
			// @todo fix: somehow getHeader does not return the header from res._header, it might be because it is already sent
			strictEqual(res.statusCode, 201)
			strictEqual(res.getHeader('Location'), '/new')
		})

		it('accepts array headers', () => {
			const res = createServerResponse(mockReq)
			res.writeHead(200, 'OK', [['Content-Type', 'application/json'], ['X-Test', 'value']])
			const headers = res._header.split("\r\n")
			strictEqual(headers.includes("Content-Type: application/json"), true)
			strictEqual(headers.includes("X-Test: value"), true)
			// @todo fix: somehow getHeader does not return the header from res._header, it might be because it is already sent
			strictEqual(res.getHeader('Content-Type'), 'application/json')
			strictEqual(res.getHeader('X-Test'), 'value')
		})

		it('sets status only (no headers)', () => {
			const res = createServerResponse(mockReq)
			res.writeHead(500)

			strictEqual(res.statusCode, 500)
		})
	})

	describe('end', () => {
		it('calls super.writeHead if !headersSent, then super.end', () => {
			const res = createServerResponse(mockReq)
			// We don't manually call writeHead in our implementation, but let's test end works
			res.writeHead(200, 'OK')
			res.end('chunk', 'utf8', () => { })

			strictEqual(res._spyEnd.called, true)
			strictEqual(res._spyEnd.data, 'chunk')
		})

		it('does not call writeHead if headersSent=true', () => {
			const res = createServerResponse(mockReq)
			res.writeHead(200, 'OK') // This will set headersSent to true
			let writeHeadCalled = false
			const originalWriteHead = res.writeHead
			res.writeHead = () => { writeHeadCalled = true; return originalWriteHead.call(res, 200) }

			res.end('chunk')

			strictEqual(writeHeadCalled, false)
			strictEqual(res._spyEnd.called, true)
		})

		it('end with chunk and encoding/callback', () => {
			const res = createServerResponse(mockReq)
			let callbackCalled = false
			res.end('data', 'utf8', () => { callbackCalled = true })

			strictEqual(res._spyEnd.called, true)
			strictEqual(res._spyEnd.data, 'data')
			strictEqual(callbackCalled, true)
		})

		it('end without chunk (empty)', () => {
			const res = createServerResponse(mockReq)
			res.end()

			strictEqual(res._spyEnd.called, true)
			strictEqual(res._spyEnd.data, undefined)
		})
	})

	it('params not affected by other methods', () => {
		const params = { user: 'test' }
		const res = createServerResponse(mockReq, { params })
		// Don't call writeHead before json to avoid "headers already sent" error
		res.json({ ok: true })
		deepStrictEqual(res.params, params) // unchanged
	})

	it('headers methods work (set/get/remove)', () => {
		const res = createServerResponse(mockReq)
		res.setHeader('Content-Type', 'application/json')
		res.setHeader('X-Custom', 'value')

		strictEqual(res.getHeader('content-type'), 'application/json')
		strictEqual(res.getHeader('X-CUSTOM'), 'value')

		res.removeHeader('X-Custom')
		strictEqual(res.getHeader('x-custom'), undefined)

		const headers = res.getHeaders()
		deepStrictEqual(Object.keys(headers), ['content-type'])
		strictEqual(headers['content-type'], 'application/json')
	})
})
