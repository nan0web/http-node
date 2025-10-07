import { describe, suite, it } from 'node:test'
import assert from 'node:assert/strict'
import bruteForce from './bruteForce.js'
import TestServer from "../test/TestServer.js"

suite("bruteForce middleware", () => {
	describe("allow/block", () => {
		it('allows under limit, blocks over', async () => {
			const mw = bruteForce({ windowMs: 1000, max: 1 })
			const testServer = new TestServer()
			let blockCalled = 0
			testServer
				.use(mw)
				.route('get', '/test', (req, res) => res.end('OK'))
			await testServer.start()
			const url = testServer.baseUrl + '/test'

			const res1 = await fetch(url)
			assert.strictEqual(await res1.text(), 'OK')
			assert.strictEqual(res1.status, 200)

			const res2 = await fetch(url)
			assert.strictEqual(res2.status, 429)
			assert.strictEqual(res2.statusText, 'Too Many Requests')
			assert.strictEqual(await res2.text(), 'Too Many Requests')
			blockCalled++

			await testServer.stop()
			assert.strictEqual(blockCalled, 1)
		})

		it('custom handler', async () => {
			let customCalled = 0
			const mw = bruteForce({
				windowMs: 1000,
				max: 1,
				handler: (req, res, next) => {
					customCalled++
					res.writeHead(403, 'Forbidden', [
						['Content-Type', 'text/plain']
					])
					res.end('Custom block')
					// Don't call next() after ending response
				}
			})
			const testServer = new TestServer()
			testServer.use(mw).route('get', '/test', (req, res) => res.end('OK'))
			await testServer.start()

			await testServer.request('/test')
			const res = await testServer.request('/test')
			assert.strictEqual(res.status, 403)
			assert.strictEqual(await res.text(), 'Custom block')

			await testServer.stop()
			assert.strictEqual(customCalled, 1)
		})
	})
})