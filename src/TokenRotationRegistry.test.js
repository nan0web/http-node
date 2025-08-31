import { suite, describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import TokenRotationRegistry from './TokenRotationRegistry.js'

suite('TokenRotationRegistry', () => {
	/** @type {TokenRotationRegistry} */
	let registry
	
	beforeEach(() => {
		registry = new TokenRotationRegistry(1000) // 1 second max age for testing
	})
	
	describe('registerToken', () => {
		it('should register new refresh token', () => {
			registry.registerToken('token1', 'user1')
			assert.ok(registry.has('token1'))
		})
		
		it('should register token with previous token reference', () => {
			registry.registerToken('token1', 'user1')
			registry.registerToken('token2', 'user1', 'token1')
			
			assert.ok(registry.has('token1'))
			assert.ok(registry.has('token2'))
		})
	})
	
	describe('validateToken', () => {
		it('should validate fresh token', () => {
			registry.registerToken('token1', 'user1')
			assert.ok(registry.validateToken('token1', 'user1'))
		})
		
		it('should invalidate expired token', async () => {
			registry.registerToken('token1', 'user1')
			
			// Wait for token to expire
			await new Promise(resolve => setTimeout(resolve, 1001))
			
			assert.equal(registry.validateToken('token1', 'user1'), false)
			assert.equal(registry.has('token1'), false) // Expired token should be auto-removed
		})
		
		it('should invalidate non-existent token', () => {
			assert.equal(registry.validateToken('nonexistent', 'user1'), false)
		})
		
		it('should invalidate token with wrong username', () => {
			registry.registerToken('token1', 'user1')
			assert.equal(registry.validateToken('token1', 'user2'), false)
		})
	})
	
	describe('invalidateToken', () => {
		it('should invalidate single token', () => {
			registry.registerToken('token1', 'user1')
			assert.ok(registry.has('token1'))
			
			registry.invalidateToken('token1')
			assert.equal(registry.has('token1'), false)
		})
		
		it('should invalidate token chain', () => {
			registry.registerToken('token1', 'user1')
			registry.registerToken('token2', 'user1', 'token1')
			registry.registerToken('token3', 'user1', 'token2')
			
			assert.ok(registry.has('token1'))
			assert.ok(registry.has('token2'))
			assert.ok(registry.has('token3'))
			
			registry.invalidateToken('token3')
			assert.equal(registry.has('token1'), false)
			assert.equal(registry.has('token2'), false)
			assert.equal(registry.has('token3'), false)
		})
		
		it('should handle invalidation of non-existent token', () => {
			// Should not throw error
			registry.invalidateToken('nonexistent')
			assert.doesNotThrow(() => registry.invalidateToken('nonexistent'))
		})
	})
	
	describe('clearUserTokens', () => {
		it('should clear all tokens for user', () => {
			registry.registerToken('token1', 'user1')
			registry.registerToken('token2', 'user1')
			registry.registerToken('token3', 'user2')
			
			assert.ok(registry.has('token1'))
			assert.ok(registry.has('token2'))
			assert.ok(registry.has('token3'))
			
			registry.clearUserTokens('user1')
			assert.equal(registry.has('token1'), false)
			assert.equal(registry.has('token2'), false)
			assert.ok(registry.has('token3')) // User2 tokens remain
		})
	})
	
	describe('cleanup', () => {
		it('should remove expired tokens', async () => {
			registry.registerToken('token1', 'user1') // Fresh token
			registry.registerToken('token2', 'user1') // Will expire
			
			// Register expired token
			const expiredEntry = {
				username: 'user1',
				createdAt: new Date(Date.now() - 2000) // 2 seconds old
			}
			registry['_registry'].set('token3', expiredEntry)
			
			assert.ok(registry.has('token1'))
			assert.ok(registry.has('token2'))
			assert.ok(registry.has('token3'))
			
			registry.cleanup()
			assert.ok(registry.has('token1'))
			assert.ok(registry.has('token2'))
			assert.equal(registry.has('token3'), false) // Expired token removed
		})
	})
})