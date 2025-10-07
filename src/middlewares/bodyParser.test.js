import bodyParser from './bodyParser.js'
import { suite, describe, it } from 'node:test'
import assert from 'node:assert'
import { EventEmitter } from 'node:events'

/**
 * Helper to create a mock request.
 * @param {Object} opts
 * @param {string} [opts.method='POST']
 * @param {Map<string,string>} [opts.headers=new Map()]
 * @param {string} [opts.body='']
 * @returns {EventEmitter & {
 *   method:string,
 *   headers:Map<string,string>,
 *   url?:string,
 *   socket?:{ remoteAddress:string },
 *   body?:any
 * }}
 */
function mockRequest({ method = 'POST', headers = new Map(), body = '' } = {}) {
	const req = new EventEmitter()
	req.method = method
	req.headers = headers

	// Simulate data event asynchronously after a short tick
	process.nextTick(() => {
		if (body) req.emit('data', Buffer.from(body))
		req.emit('end')
	})

	return req
}

/**
 * Minimal mock response (not used by bodyParser)
 */
function mockResponse() {
	return {}
}

/**
 * Executes middleware and resolves when complete.
 * @param {import('node:events').EventEmitter} req
 * @param {any} res
 * @returns {Promise<void>}
 */
async function runMiddleware(req, res) {
	let nextCalled = false
	const next = () => {
		nextCalled = true
	}
	const middleware = bodyParser()
	await middleware(req, res, next)
	return { nextCalled }
}

suite('bodyParser middleware', () => {
	describe('JSON parsing', () => {
		it('parses valid JSON body', async () => {
			const headers = new Map([['content-type', 'application/json']])
			const req = mockRequest({ headers, body: JSON.stringify({ foo: 'bar' }) })
			const { nextCalled } = await runMiddleware(req, mockResponse())

			assert(nextCalled, 'next should be called')
			assert.deepStrictEqual(req.body, { foo: 'bar' })
		})

		it('fallbacks to raw string on invalid JSON', async () => {
			const headers = new Map([['content-type', 'application/json']])
			const req = mockRequest({ headers, body: '{invalid json' })
			const { nextCalled } = await runMiddleware(req, mockResponse())

			assert(nextCalled, 'next should be called')
			assert.strictEqual(req.body, '{invalid json')
		})
	})

	describe('URL-encoded parsing', () => {
		it('parses application/x-www-form-urlencoded body', async () => {
			const headers = new Map([['content-type', 'application/x-www-form-urlencoded']])
			const raw = 'a=1&b=hello%20world'
			const req = mockRequest({ headers, body: raw })
			const { nextCalled } = await runMiddleware(req, mockResponse())

			assert(nextCalled, 'next should be called')
			assert.deepStrictEqual(req.body, { a: '1', b: 'hello world' })
		})
	})

	describe('Other content-types', () => {
		it('returns raw body for unknown content-type', async () => {
			const headers = new Map([['content-type', 'text/plain']])
			const raw = 'plain text body'
			const req = mockRequest({ headers, body: raw })
			const { nextCalled } = await runMiddleware(req, mockResponse())

			assert(nextCalled, 'next should be called')
			assert.strictEqual(req.body, raw)
		})
	})

	describe('Non-body methods', () => {
		it('skips parsing for GET requests', async () => {
			const headers = new Map()
			const req = mockRequest({ method: 'GET', headers, body: 'should be ignored' })
			const { nextCalled } = await runMiddleware(req, mockResponse())

			assert(nextCalled, 'next should be called')
			assert.strictEqual(req.body, undefined)
		})
	})
})