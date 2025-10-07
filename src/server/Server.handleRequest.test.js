import { suite, it } from 'node:test'
import assert from 'node:assert'
import {
	setDebugHeader,
	prepareDeleteResponse,
	runMiddlewares,
	handleError,
} from './Server.js'
import IncomingMessage from '../messages/IncomingMessage.js'
import ServerResponse from '../messages/ServerResponse.js'

/**
 * Helper to create a minimal mock response object with support setters.
 * @returns {ServerResponse}
 */
function createMockRes() {
	return new ServerResponse()
}

/**
 * Minimal mock request.
 * @param {string} method
 * @returns {IncomingMessage}
 */
function createMockReq(method) {
	const socket = {}
	return new IncomingMessage(socket, { method, url: '/test' })
}

/* --------------------------------------------------------------------- */
/* setDebugHeader                                                        */
/* --------------------------------------------------------------------- */
suite('setDebugHeader', () => {
	it('adds X-Server-ID header', () => {
		const res = createMockRes()
		const id = 'test-id-123'
		setDebugHeader(res, id)
		assert.strictEqual(res.getHeader('X-Server-ID'), id)
	})
})

/* --------------------------------------------------------------------- */
/* prepareDeleteResponse                                                 */
/* --------------------------------------------------------------------- */
suite('prepareDeleteResponse', () => {
	it('sets 204 for DELETE method', () => {
		const req = createMockReq('DELETE')
		const res = createMockRes()
		prepareDeleteResponse(req, res)
		assert.strictEqual(res.statusCode, 204)
		assert.strictEqual(res.statusMessage, 'No Content')
	})

	it('does not modify response for non‑DELETE', () => {
		const req = createMockReq('GET')
		const res = createMockRes()
		const originalStatus = res.statusCode
		const originalStatusText = res.statusMessage
		prepareDeleteResponse(req, res)
		assert.strictEqual(res.statusCode, originalStatus)
		assert.strictEqual(res.statusMessage, originalStatusText)
	})
})

/* --------------------------------------------------------------------- */
/* runMiddlewares – happy path                                           */
/* --------------------------------------------------------------------- */
suite('runMiddlewares', () => {
	it('executes middlewares in order and then router', async () => {
		const order = []
		const mw1 = async (req, res, next) => {
			order.push('mw1')
			await next()
		}
		const mw2 = async (req, res, next) => {
			order.push('mw2')
			await next()
		}
		/**
		 * @param {IncomingMessage} req
		 * @param {ServerResponse} res
		 */
		const handle = async (req, res) => {
			order.push('router')
			res.statusCode = 404
			res.statusMessage = 'Not Found'
			res.setHeader('Content-Type', 'text/plain')
			res.end('Not Found')
		}
		const req = createMockReq('GET')
		const res = createMockRes()
		await runMiddlewares(req, res, [mw1, mw2], handle)
		assert.deepStrictEqual(order, ['mw1', 'mw2', 'router'])
		// default 404 handling should have been applied
		assert.strictEqual(res.statusCode, 404)
		assert.strictEqual(res.statusMessage, 'Not Found')
		assert.strictEqual(res.getHeader('content-type'), 'text/plain')
		assert.strictEqual(res.outputData[0].data.includes('Not Found'), true)
	})
})

/* --------------------------------------------------------------------- */
/* runMiddlewares – early response from middleware                       */
/* --------------------------------------------------------------------- */
suite('runMiddlewares early response', () => {
	it('stops further processing when middleware ends response', async () => {
		const order = []
		const mw = async (req, res, next) => {
			order.push('mw')
			res.statusCode = 200
			res.end('OK')
			// do NOT call next()
		}
		const routerHandler = async () => {
			order.push('router')
		}
		const req = createMockReq('GET')
		const res = createMockRes()
		await runMiddlewares(req, res, [mw], routerHandler)
		assert.deepStrictEqual(order, ['mw'])
		assert.strictEqual(res.statusCode, 200)
		assert.strictEqual(res.headersSent, true)
	})
})

/* --------------------------------------------------------------------- */
/* handleError                                                          */
/* --------------------------------------------------------------------- */
suite('handleError', () => {
	it('writes generic 500 response and marks headers sent', async () => {
		const err = new Error('Something broke')
		const res = createMockRes()
		await handleError(err, res)
		assert.strictEqual(res.statusCode, 500)
		assert.strictEqual(res.statusMessage, 'Internal Server Error')
		assert.strictEqual(res.headersSent, true)
		assert.strictEqual(res.outputData[0].data.includes('Internal Server Error: Something broke'), true)
		assert.strictEqual(res.getHeader('Content-Type'), 'text/plain')
	})
})
