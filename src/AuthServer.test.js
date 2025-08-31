import { suite, describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fetch, { HTTPError } from "@nan0web/http"
import { existsSync, mkdirSync, rmdirSync } from 'node:fs'
import process from 'node:process'
import { resolve } from "node:path"
import { NoLogger } from "@nan0web/log"

import AuthServer from './AuthServer.js'
import BrowserDB from '../src/DB/BrowserDB.js'
import ServerConfig from './ServerConfig.js'
import { AuthClient } from "../src/Auth/index.js"


let testPort = 0
/** @type {AuthServer} */
let server
/** @type {BrowserDB} */
let client

const timeout = 600_000

const ACCESS = {
	ROOT: {
		username: "root",
		password: "root",
		newPassword: "newRootPassword",
	}
}
const TEST_DATA_DIR = "./test-auth-data"

before(async () => {
	// Clean up
	try {
		const testDir = resolve(process.cwd(), TEST_DATA_DIR)
		if (existsSync(testDir)) {
			rmdirSync(testDir, { recursive: true, force: true })
		}
		mkdirSync(testDir, { recursive: true })
	} catch (err) {
		console.error('Setup error:', err)
	}

	server = new AuthServer({
		db: { cwd: TEST_DATA_DIR },
		// range from 3000 - 3030
		port: [3000, 3030]
	})

	await server.start()
	testPort = server.port

	AuthClient.FetchFn = fetch
	AuthClient.DEFAULT_CWD = "http://localhost:" + testPort
	AuthClient.DEFAULT_ROOT = "/"
	AuthClient.DEFAULT_TIMEOUT = timeout
})

after(async () => {
	await server.stop()
})

suite("Auth Server", () => {
	// Run tests sequentially to avoid token conflicts
	it("Step 1: should create root user with default password", async () => {
		const client = await AuthClient.create()
		const result = await client.signIn(ACCESS.ROOT.username, ACCESS.ROOT.password)
		assert.ok(result.token)
		assert.ok(result.token.length > 18)
	})

	it("Step 2: should change root password", async () => {
		const client = await AuthClient.create()
		const forgotResult = await client.forgotPassword(ACCESS.ROOT.username)
		assert.ok(forgotResult)

		// Add delay to ensure user record is updated
		await new Promise(resolve => setTimeout(resolve, 50))

		const user = await server.db.getUser(ACCESS.ROOT.username)
		assert.ok(user.resetCode)

		const resetResult = await client.resetPassword(
			ACCESS.ROOT.username, user.resetCode, ACCESS.ROOT.newPassword
		)
		assert.ok(resetResult.token)
		client.token = resetResult.token
		ACCESS.ROOT.password = ACCESS.ROOT.newPassword
	})

	it("Step 3: should not access root info without proper permissions", async () => {
		const client = await AuthClient.create()
		await assert.rejects(async () => {
			await client.getUser(ACCESS.ROOT.username)
		}, /Authorize to get access/)
	})

	it("Step 4: should access root info after proper authentication", async () => {
		const client = await AuthClient.create()
		await client.signIn(ACCESS.ROOT.username, ACCESS.ROOT.password)
		const user = await client.getUser(ACCESS.ROOT.username)
		assert.ok(user.createdAt)
		assert.ok(user.email)
		assert.ok(!user.toObject().passwordHash)
	})

	it("Step 5: should register new user", async () => {
		const client = await AuthClient.create()
		const result = await client.register({
			username: "testuser",
			password: "testpass123",
			email: "test@example.com"
		})
		assert.equal(result.message, "Verification code sent")
	})

	it("Step 6: should confirm registration and get token", async () => {
		// Add delay to ensure user record is available
		await new Promise(resolve => setTimeout(resolve, 50))

		const user = await server.db.getUser("testuser")
		// const newDb = new BrowserDB({
		// 	cwd: "http://localhost:" + testPort,
		// 	root: "/",
		// 	timeout
		// })
		// await newDb.load()

		const client = await AuthClient.create()
		const result = await client.confirmRegistration("testuser", user.verificationCode)
		assert.ok(result.token)
	})

	it("Step 7: should signIn with valid credentials", async () => {
		const client = await AuthClient.create()
		const result = await client.signIn("testuser", "testpass123")
		assert.ok(result.token)
	})

	it("Step 8: should not signIn with invalid credentials", async () => {
		const client = await AuthClient.create()
		const fn = async () => await client.signIn("testuser", "wrongpass")
		await assert.rejects(fn, /Invalid password or username/)
	})

	it("Step 9: should refresh token", async () => {
		const client = await AuthClient.create()
		await client.signIn(ACCESS.ROOT.username, ACCESS.ROOT.password)

		const oldToken = client.token
		const result = await client.refreshToken(oldToken)
		assert.ok(result.token)
		assert.notEqual(result.token, oldToken)
	})

	it("Step 10: should replace old token when requested", async () => {
		const client = await AuthClient.create()
		await client.signIn(ACCESS.ROOT.username, ACCESS.ROOT.password)
		const oldToken = client.token

		const result = await newDb.refreshToken(oldToken, true)
		assert.ok(result.token)
		assert.notEqual(result.token, oldToken)

		const session = AuthClient.create()
		await assert.rejects(
			() => session.getUser(ACCESS.ROOT.username),
			{ name: 'HTTPError', status: 401 }
		)
	})

	describe("Port selection", () => {
		it("should use configured port range", async () => {
			const config = new ServerConfig({ port: [3000, 3001, 3002] })
			const port1 = config.getPort(0)
			const port2 = config.getPort(port1)
			const port3 = config.getPort(port2)

			assert.strictEqual(port1, 3000)
			assert.strictEqual(port2, 3001)
			assert.strictEqual(port3, 3002)

			assert.throws(() => config.getPort(port3), {
				name: 'TypeError',
				message: 'Out of list [ 3000, 3001, 3002 ]'
			})
		})

		it("should handle port conflicts", async () => {
			// Create a server that will conflict on first port
			const conflictingServer = new AuthServer({
				db: { cwd: TEST_DATA_DIR },
				port: [testPort, 65535],
				Logger: NoLogger
			})
			await conflictingServer.start()

			assert.equal(conflictingServer.port, testPort + 1)

			await conflictingServer.stop()
		})
	})
})
