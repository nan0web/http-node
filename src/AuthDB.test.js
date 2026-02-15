import { describe, it, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import AuthDB from './AuthDB.js'
import { User } from '@nan0web/auth-core'
import { rmdirSync } from 'node:fs'

describe('AuthDB', () => {
	/** @type {AuthDB} */
	let db

	beforeEach(async () => {
		db = new AuthDB({ root: './test-auth-data' })
		await db.connect()
	})

	after(async () => {
		const path = db.absolute('.')
		let entry
		for await (entry of db.findStream('.')) {
			if (entry.file.isFile) {
				await db.dropDocument(entry.file.path)
			}
		}
		if (entry.dirs?.size) {
			const dirs = Array.from(entry.dirs.keys())
			dirs.sort((a, b) => b.split('/').length - a.split('/').length)
			for (const dir of dirs) {
				await db.dropDocument(dir)
			}
			rmdirSync(path)
		}
	})

	it('should create and retrieve user', async () => {
		const user = new User({ name: 'test', email: 'test@example.com', roles: ['user'] })
		await db.saveUser(user)
		const retrieved = await db.getUser('test')
		assert.equal(retrieved.name, 'test')
	})

	it('should manage tokens', async () => {
		const user = new User({ name: 'testuser', email: 'token@example.com', roles: ['user'] })
		await db.saveUser(user)

		const tokenPair = {
			accessToken: 'test-access-token',
			refreshToken: 'test-refresh-token',
			accessExpiry: new Date(Date.now() + 3600000),
			refreshExpiry: new Date(Date.now() + 86400000),
		}

		try {
			await db.updateTokens('testuser', tokenPair)
			const retrieved = await db.getUser('testuser')
			assert.ok(retrieved)
		} catch (err) {
			assert.fail(err.stack)
		}
	})
})
