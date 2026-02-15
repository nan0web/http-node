import { suite, describe, it } from 'node:test'
import assert from 'node:assert'
import RateLimiter from './RateLimiter.js'

suite('RateLimiter', () => {
	const TIME = 1000

	describe('Rate limiting', () => {
		/**
		 * Create rate limiter
		 * @param {number} [maxAttempts=10] - Maximum attempt rate
		 * @param {number} [windowMs=1000] - Time window in milliseconds
		 * @return {RateLimiter} Rate limiter instance
		 */
		function create(maxAttempts = 10, windowMs = TIME) {
			return new RateLimiter(maxAttempts, windowMs)
		}

		describe('tryAttempt', () => {
			it('should allow single request', async () => {
				const limiter = create()
				assert.ok(await limiter.tryAttempt('127.0.0.1'))
				assert.equal(limiter.registry.get('127.0.0.1').count, 1)
			})

			it('should deny when reaching max attempts', async () => {
				const limiter = create(2)

				assert.ok(await limiter.tryAttempt('127.0.0.1'))
				assert.ok(await limiter.tryAttempt('127.0.0.1'))

				assert.rejects(() => limiter.tryAttempt('127.0.0.1'), { message: 'Too many attempts' })
			})

			it('should reset counter after windowMs without affecting limit', async () => {
				const limiter = create(2, 500)

				assert.ok(await limiter.tryAttempt('127.0.0.1'))
				assert.ok(await limiter.tryAttempt('127.0.0.1'))

				await new Promise((resolve) => setTimeout(resolve, 600))

				assert.ok(await limiter.tryAttempt('127.0.0.1'))
				assert.equal(limiter.registry.get('127.0.0.1').count, 1)
			})
		})

		describe('clear', () => {
			it('should remove IP from registry', async () => {
				const limiter = create()
				await limiter.tryAttempt('127.0.0.1')
				assert.ok(limiter.registry.has('127.0.0.1'))

				limiter.clear('127.0.0.1')
				assert.ok(!limiter.registry.has('127.0.0.1'))
			})
		})
	})
})
