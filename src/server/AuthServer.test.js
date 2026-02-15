import { suite, describe, it } from 'node:test'
import assert from 'node:assert/strict'

import AuthServer from './AuthServer.js'
import ServerConfig from '../ServerConfig.js'

suite('Auth Server', () => {
	it('should create AuthServer instance', () => {
		const server = new AuthServer({
			db: { cwd: './test-auth-server-data' },
			port: 0,
		})
		assert.ok(server)
		assert.ok(server.db)
	})

	describe('Port selection', () => {
		it('should use configured port range', () => {
			const config = new ServerConfig({ port: [3000, 3001, 3002] })
			const port1 = config.getPort(0)
			const port2 = config.getPort(port1)
			const port3 = config.getPort(port2)

			assert.strictEqual(port1, 3000)
			assert.strictEqual(port2, 3001)
			assert.strictEqual(port3, 3002)

			assert.throws(() => config.getPort(port3), {
				name: 'TypeError',
				message: 'Out of list [ 3000, 3001, 3002 ]',
			})
		})
	})
})
