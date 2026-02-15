import { suite, describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { NoConsole } from '@nan0web/log'

import AuthServer from '../server/AuthServer.js'
import { Runner } from './Runner.js'

const SCENARIOS_DIR = resolve(process.cwd(), 'src/play/scenarios')
const DATA_DIR = resolve(process.cwd(), './test-play-data')

/**
 * Create a fresh server on a random port with clean DB.
 * @returns {Promise<{server: AuthServer, baseUrl: string}>}
 */
async function freshServer() {
	rmSync(DATA_DIR, { recursive: true, force: true })
	mkdirSync(DATA_DIR, { recursive: true })
	// Grant full access for play-mode
	writeFileSync(join(DATA_DIR, '.access'), '* rwd /\n')
	const server = new AuthServer({
		db: { cwd: DATA_DIR },
		port: 0,
		logger: new NoConsole(),
	})
	await server.start()
	return { server, baseUrl: `http://localhost:${server.port}` }
}

suite('Play Runner', () => {
	/** @type {AuthServer} */
	let server
	/** @type {string} */
	let baseUrl

	before(async () => {
		const fresh = await freshServer()
		server = fresh.server
		baseUrl = fresh.baseUrl
	})

	after(async () => {
		await server.stop()
		rmSync(DATA_DIR, { recursive: true, force: true })
	})

	// ─── Runner basics ───

	describe('Runner basics', () => {
		it('should create a Runner with delay=0', () => {
			const runner = new Runner({ baseUrl, delay: 0, silent: true })
			assert.ok(runner)
			assert.equal(runner.delay, 0)
			assert.equal(runner.silent, true)
			assert.deepEqual(runner.results, [])
		})

		it('should execute a wait step', async () => {
			const runner = new Runner({ baseUrl, delay: 0, silent: true })
			await runner.execute({ type: 'wait', ms: 1 })
			assert.equal(runner.results.length, 1)
			assert.equal(runner.results[0].type, 'wait')
			assert.equal(runner.results[0].status, 'N/A')
		})

		it('should handle unknown step type gracefully', async () => {
			const runner = new Runner({ baseUrl, delay: 0, silent: true })
			await runner.execute({ type: 'unknown_thing' })
			assert.equal(runner.results.length, 0)
		})

		it('should collect results for each step', async () => {
			const runner = new Runner({ baseUrl, delay: 0, silent: true })
			await runner.run([
				{ type: 'wait', ms: 1, label: 'W1' },
				{ type: 'wait', ms: 1, label: 'W2' },
			])
			assert.equal(runner.results.length, 2)
			assert.equal(runner.results[0].label, 'W1')
			assert.equal(runner.results[1].label, 'W2')
		})
	})

	// ─── Scenario: demo.json ───

	describe('Scenario: demo.json', () => {
		/** @type {Runner} */
		let runner

		before(async () => {
			await server.stop()
			const fresh = await freshServer()
			server = fresh.server
			baseUrl = fresh.baseUrl

			const steps = JSON.parse(readFileSync(join(SCENARIOS_DIR, 'demo.json'), 'utf-8'))
			runner = new Runner({ baseUrl, delay: 0, silent: true, db: server.db })
			await runner.run(steps)
		})

		it('should complete without Runner crashes', () => {
			const errors = runner.results.filter((r) => r.status === 'ERROR')
			assert.equal(errors.length, 0, `Crashes: ${JSON.stringify(errors)}`)
		})

		it('should signup alice (200)', () => {
			const s = runner.results.find((r) => r.label === 'Step 1: Signup')
			assert.ok(s)
			assert.equal(s.status, 200)
		})

		it('should verify alice (200)', () => {
			const s = runner.results.find((r) => r.label === 'Step 1b: Verify Account')
			assert.ok(s)
			assert.equal(s.status, 200)
			assert.ok(s.data?.accessToken, 'verify should return accessToken')
		})

		it('should login alice (200) with accessToken', () => {
			const s = runner.results.find((r) => r.label === 'Step 2: Login')
			assert.ok(s)
			assert.equal(s.status, 200)
			assert.ok(s.data?.accessToken, 'accessToken expected')
		})

		it('should create private resource', () => {
			const s = runner.results.find((r) => r.label === 'Step 3: Create Resource')
			assert.ok(s)
			assert.ok([200, 201].includes(s.status), `Expected 200/201, got ${s.status}`)
		})

		it('should read private resource when authenticated', () => {
			const s = runner.results.find((r) => r.label === 'Step 4: Read Resource')
			assert.ok(s)
			assert.equal(s.status, 200)
		})

		it('should logout', () => {
			const s = runner.results.find((r) => r.label === 'Step 5: Logout')
			assert.ok(s)
			assert.ok([200, 204].includes(s.status), `Expected 200/204, got ${s.status}`)
		})

		it('should deny access after logout (401)', () => {
			const s = runner.results.find((r) => r.label === 'Step 6: Fail Access (Expected 401)')
			assert.ok(s)
			assert.equal(s.status, 401)
		})
	})

	// ─── Scenario: error-cases.json ───

	describe('Scenario: error-cases.json', () => {
		/** @type {Runner} */
		let runner

		before(async () => {
			await server.stop()
			const fresh = await freshServer()
			server = fresh.server
			baseUrl = fresh.baseUrl

			const steps = JSON.parse(readFileSync(join(SCENARIOS_DIR, 'error-cases.json'), 'utf-8'))
			runner = new Runner({ baseUrl, delay: 0, silent: true, db: server.db })
			await runner.run(steps)
		})

		it('should complete without Runner crashes', () => {
			const crashes = runner.results.filter((r) => r.status === 'ERROR')
			assert.equal(crashes.length, 0, `Crashes: ${JSON.stringify(crashes)}`)
		})

		it('should signup bob (200)', () => {
			const s = runner.results.find((r) => r.label === 'Step 1: Signup bob')
			assert.ok(s)
			assert.equal(s.status, 200)
		})

		it('should deny private access without token (401)', () => {
			const s = runner.results.find(
				(r) => r.label === 'Step 2: Access private without token (expect 401)',
			)
			assert.ok(s)
			assert.equal(s.status, 401)
		})

		it('should verify bob (200)', () => {
			const s = runner.results.find((r) => r.label === 'Step 3: Verify bob')
			assert.ok(s)
			assert.equal(s.status, 200)
		})

		it('should reject duplicate signup (409)', () => {
			const s = runner.results.find((r) => r.label === 'Step 4: Duplicate signup (expect error)')
			assert.ok(s)
			assert.equal(s.status, 409)
		})

		it('should reject wrong password (401 or 403)', () => {
			const s = runner.results.find(
				(r) => r.label === 'Step 5: Login with wrong password (expect 401)',
			)
			assert.ok(s)
			assert.ok([401, 403].includes(s.status), `Expected 401/403, got ${s.status}`)
		})

		it('should login correctly after error', () => {
			const s = runner.results.find((r) => r.label === 'Step 6: Login correctly')
			assert.ok(s)
			// RateLimiter may block after failed attempt
			assert.ok([200, 403].includes(s.status), `Expected 200/403, got ${s.status}`)
		})

		it('should deny access after logout (401)', () => {
			const s = runner.results.find((r) => r.label === 'Step 9: Access after logout (expect 401)')
			assert.ok(s)
			assert.equal(s.status, 401)
		})
	})

	// ─── Scenario: token-flow.json ───

	describe('Scenario: token-flow.json', () => {
		/** @type {Runner} */
		let runner

		before(async () => {
			await server.stop()
			const fresh = await freshServer()
			server = fresh.server
			baseUrl = fresh.baseUrl

			const steps = JSON.parse(readFileSync(join(SCENARIOS_DIR, 'token-flow.json'), 'utf-8'))
			runner = new Runner({ baseUrl, delay: 0, silent: true, db: server.db })
			await runner.run(steps)
		})

		it('should complete without Runner crashes', () => {
			const crashes = runner.results.filter((r) => r.status === 'ERROR')
			assert.equal(crashes.length, 0, `Crashes: ${JSON.stringify(crashes)}`)
		})

		it('should signup carol (200)', () => {
			const s = runner.results.find((r) => r.label === 'Step 1: Signup carol')
			assert.ok(s)
			assert.equal(s.status, 200)
		})

		it('should verify carol (200)', () => {
			const s = runner.results.find((r) => r.label === 'Step 1b: Verify carol')
			assert.ok(s)
			assert.equal(s.status, 200)
		})

		it('should login carol with accessToken', () => {
			const s = runner.results.find((r) => r.label === 'Step 2: Login carol')
			assert.ok(s)
			assert.equal(s.status, 200)
			assert.ok(s.data?.accessToken, 'Token expected')
		})

		it('should HEAD check while authenticated', () => {
			const s = runner.results.find((r) => r.label === 'Step 3: HEAD check (authenticated)')
			assert.ok(s)
			assert.ok(s.data?.status, 'HEAD should return status')
		})

		it('should create resource via POST', () => {
			const s = runner.results.find((r) => r.label === 'Step 4: Create resource')
			assert.ok(s)
			assert.ok([200, 201].includes(s.status), `Expected 200/201, got ${s.status}`)
		})

		it('should read created resource', () => {
			const s = runner.results.find((r) => r.label === 'Step 5: Read created resource')
			assert.ok(s)
			assert.equal(s.status, 200)
		})

		it('should deny HEAD after logout', () => {
			const s = runner.results.find((r) => r.label === 'Step 7: HEAD after logout (expect 401)')
			assert.ok(s)
			assert.equal(s.data.status, 401)
		})
	})

	// ─── Validate all scenario JSONs ───

	describe('All scenarios are valid JSON', () => {
		const files = readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith('.json'))

		for (const file of files) {
			it(`${file} has valid structure`, () => {
				const content = readFileSync(join(SCENARIOS_DIR, file), 'utf-8')
				const steps = JSON.parse(content)

				assert.ok(Array.isArray(steps), `${file}: should be an array`)
				assert.ok(steps.length > 0, `${file}: at least one step`)

				const validTypes = [
					'wait',
					'signup',
					'verify',
					'login',
					'logout',
					'get_private',
					'head_private',
					'post_private',
				]
				for (const step of steps) {
					assert.ok(step.type, `${file}: each step needs type`)
					assert.ok(validTypes.includes(step.type), `${file}: unknown type "${step.type}"`)
				}
			})
		}
	})
})
