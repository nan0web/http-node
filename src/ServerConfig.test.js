import assert from 'node:assert'
import { suite, describe, it } from 'node:test'
import ServerConfig from './ServerConfig.js'

suite('ServerConfig Tests', () => {
	describe("Basic", () => {
		it('should create ServerConfig with default configuration', () => {
			const config = new ServerConfig()

			assert.deepStrictEqual(config.ports, [0])
			assert.deepStrictEqual(config.ssl, undefined)

			// Properly validate logger method types
			assert.strictEqual(typeof config.logger.log, 'function')
			assert.deepStrictEqual(config instanceof ServerConfig, true)
		})

		it('should accept array of ports', () => {
			const config = new ServerConfig({ port: [1234] })
			const config2 = new ServerConfig({ port: [1234, 5678] })

			assert.deepStrictEqual(config.ports, [1234])
			assert.deepStrictEqual(config2.ports, [1234, 5678])
		})

		it('should parse ports as numbers', () => {
			const config1 = new ServerConfig({ port: '3000' })
			assert.deepStrictEqual(config1.ports, [3000])

			const config2 = new ServerConfig({ port: ['4000', '5000'] })
			assert.deepStrictEqual(config2.ports, [4000, 5000])
		})

		it('should validate ssl configuration structure', () => {
			const config = new ServerConfig({
				ssl: {
					key: '/path/to/privkey.pem',
					cert: '/path/to/cert.pem'
				}
			})

			assert.deepStrictEqual(config.ssl, {
				key: '/path/to/privkey.pem',
				cert: '/path/to/cert.pem'
			})
		})

		it('should test from() helper method', () => {
			const config1 = new ServerConfig()
			const config2 = ServerConfig.from(config1)

			assert.deepStrictEqual(config2, config1)
			assert.ok(config1 == config2)
			assert.ok(config1 === config2)
			assert.ok(ServerConfig.from() != config1)
			assert.ok(ServerConfig.from() != config2)
			assert.ok(ServerConfig.from(config1) === config1)
		})
	})

	describe("getPort()", () => {
		it('should return single port when ports array has one element', () => {
			const config = new ServerConfig({ port: [2000] })
			assert.strictEqual(config.getPort(0), 2000)
			assert.strictEqual(config.getPort(2000), 2000)
			assert.strictEqual(config.getPort(3000), 2000)
		})

		it('should select next port from list after previous', () => {
			const config = new ServerConfig({ port: [3000, 5000, 4000] })
			assert.strictEqual(config.getPort(2000), 3000)
			assert.strictEqual(config.getPort(3000), 4000)
			assert.strictEqual(config.getPort(4000), 5000)
			assert.throws(() => config.getPort(5000), {
				name: 'TypeError',
				message: 'Out of list [ 3000, 4000, 5000 ]',
			})
		})

		it('should handle port ranges correctly', () => {
			const config = new ServerConfig({ port: [1234, 5678] })
			assert.strictEqual(config.getPort(1233), 1235)
			assert.strictEqual(config.getPort(1234), 1235)
			assert.strictEqual(config.getPort(5677), 5678)
			assert.throws(() => config.getPort(5678), {
				name: 'TypeError',
				message: 'Out of range [ 1234 - 5678 ]',
			})
		})

		it('should handle reverse port list', () => {
			const config = new ServerConfig({ port: [5000, 3000] })
			assert.strictEqual(config.port, 3000)
			assert.strictEqual(config.getPort(), 3000)
			assert.strictEqual(config.getPort(3000), 3001)
			assert.throws(() => config.getPort(5000), {
				name: 'TypeError',
				message: 'Out of range [ 3000 - 5000 ]',
			})
		})

		it('should return the same port for single value', () => {
			const config = new ServerConfig({ port: 3000 })
			assert.strictEqual(config.port, 3000)
			assert.strictEqual(config.getPort(), 3000)
			assert.strictEqual(config.getPort(3000), 3000)
			assert.strictEqual(config.getPort(5000), 3000)
			assert.strictEqual(config.getPort(10000), 3000)
		})

		it('should sort port list and return first available', () => {
			const config = new ServerConfig({ port: [5000, 3000, 4000] })
			assert.strictEqual(config.getPort(2000), 3000)
			assert.strictEqual(config.getPort(3000), 4000)
			assert.strictEqual(config.getPort(4000), 5000)
			assert.throws(() => config.getPort(5000), {
				name: 'TypeError',
				message: 'Out of list [ 3000, 4000, 5000 ]',
			})
		})

		it('should throw error when all range ports are used', () => {
			const config = new ServerConfig({ port: [1234, 1235] })
			assert.strictEqual(config.getPort(), 1234)
			assert.strictEqual(config.getPort(1234), 1235)
			assert.throws(() => config.getPort(1235), {
				name: 'TypeError',
				message: 'Out of range [ 1234 - 1235 ]',
			})
		})

		it('should handle sequential port selection', () => {
			const config = new ServerConfig({ port: [3000, 3030] })
			assert.strictEqual(config.getPort(), 3000)
			assert.strictEqual(config.getPort(3000), 3001)
			assert.strictEqual(config.getPort(3001), 3002)
			assert.throws(() => config.getPort(3030), {
				name: 'TypeError',
				message: 'Out of range [ 3000 - 3030 ]'
			})
		})

		it('should handle reverse port range', () => {
			const config = new ServerConfig({ port: [5000, 3000] })
			assert.strictEqual(config.port, 3000)
			assert.strictEqual(config.getPort(), 3000)
			assert.strictEqual(config.getPort(3000), 3001)
			assert.throws(() => config.getPort(5000), {
				name: 'TypeError',
				message: 'Out of range [ 3000 - 5000 ]'
			})
		})
	})
})
