import { describe, it } from 'node:test'
import { strict as assert } from 'node:assert'
import Router from './Router.js'

describe('Router', () => {
	it('should add routes for different HTTP methods', () => {
		const router = new Router()
		const handler = () => {}

		router.get('/test', handler)
		router.post('/test', handler)
		router.put('/test', handler)
		router.delete('/test', handler)
		router.patch('/test', handler)

		assert.equal(router.routes.GET.length, 1)
		assert.equal(router.routes.POST.length, 1)
		assert.equal(router.routes.PUT.length, 1)
		assert.equal(router.routes.DELETE.length, 1)
		assert.equal(router.routes.PATCH.length, 1)
	})

	it('should convert path to regex pattern with parameters', () => {
		const router = new Router()
		const pattern = router.pathToPattern('/user/:id/profile/:section')

		assert.ok(pattern.regex instanceof RegExp)
		assert.ok(pattern.params.id)
		assert.ok(pattern.params.section)
		assert.equal(Object.keys(pattern.params).length, 2)
	})

	it('should match routes correctly and extract parameters', () => {
		const router = new Router()
		const handler = () => {}
		router.addRoute('GET', '/user/:id/profile/:section', handler)

		const match = router.matchRoute('GET', '/user/123/profile/settings')
		assert.ok(match)
		assert.equal(match.handler, handler)
		assert.equal(match.params.id, '123')
		assert.equal(match.params.section, 'settings')
	})

	it('should handle middleware registration', () => {
		const router = new Router()
		const middleware = () => {}

		router.use(middleware)

		assert.equal(router.middlewares.length, 1)
		assert.equal(router.middlewares[0], middleware)
	})

	it('should handle request with matching route', async () => {
		const router = new Router()
		let called = false
		const handler = async () => {
			called = true
		}
		const notFoundHandler = async () => {
			called = false
		}

		router.get('/hello', handler)

		const req = { method: 'GET', url: '/hello' }
		const res = {}

		await router.handle(req, res, notFoundHandler)

		assert.ok(called)
	})

	it('should call notFoundHandler for unmatched routes', async () => {
		const router = new Router()
		let notFoundCalled = false
		const notFoundHandler = async () => {
			notFoundCalled = true
		}

		const req = { method: 'GET', url: '/unknown' }
		const res = {}

		await router.handle(req, res, notFoundHandler)

		assert.ok(notFoundCalled)
	})

	it('should handle invalid request gracefully', async () => {
		const router = new Router()
		let notFoundCalled = false
		const notFoundHandler = async () => {
			notFoundCalled = true
		}

		const req = {}
		const res = {}

		await router.handle(req, res, notFoundHandler)

		assert.ok(notFoundCalled)
	})
})
