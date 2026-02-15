import { spawn } from 'node:child_process'
import { test } from 'node:test'
import assert from 'node:assert'
import { resolve } from 'node:path'
import process from 'node:process'

const BIN_PATH = resolve(process.cwd(), 'bin/auth-play.js')

test('Play CLI runs demo scenario end-to-end', { timeout: 20_000 }, async () => {
	const child = spawn('node', [BIN_PATH], {
		cwd: process.cwd(),
		env: { ...process.env, AUTH_PORT: '0' },
		stdio: ['pipe', 'pipe', 'pipe'],
	})

	let output = ''
	child.stdout.on('data', (chunk) => {
		output += chunk.toString()
	})
	child.stderr.on('data', () => {})

	/** Poll until output contains needle */
	function waitFor(needle, timeoutMs = 15_000) {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error(`Timeout waiting for "${needle}". Out: ${output.length} chars`))
			}, timeoutMs)
			const interval = setInterval(() => {
				if (output.includes(needle)) {
					clearTimeout(timer)
					clearInterval(interval)
					resolve(undefined)
				}
			}, 100)
		})
	}

	// 1. Wait for Slider, press Enter (accept default 1000ms)
	await waitFor('Select delay')
	await sleep(200)
	child.stdin.write('\r')

	// 2. Wait for Select Scenario, press Enter (pick demo.json)
	await waitFor('Select Scenario')
	await sleep(200)
	child.stdin.write('\r')

	// 3. Wait for Runner to produce output — proves scenario is executing
	await waitFor('[CLIENT]')

	// 4. Wait for Step 5: Logout to appear — near the end of demo scenario
	await waitFor('Step 5: Logout')

	// 5. Wait for 401 — the last step in demo.json
	await waitFor('401')

	// 6. Wait a bit for Pause + menu reloop, then kill
	await sleep(2000)
	child.kill('SIGTERM')
	await new Promise((resolve) => {
		child.on('exit', () => resolve(undefined))
		setTimeout(() => {
			child.kill('SIGKILL')
			resolve(undefined)
		}, 2000)
	})

	// Assertions — verify the full scenario ran
	assert.ok(output.includes('Step 1: Signup'), 'Should show signup step')
	assert.ok(output.includes('Step 1b: Verify'), 'Should show verify step')
	assert.ok(output.includes('Step 2: Login'), 'Should show login step')
	assert.ok(output.includes('Step 3: Create Resource'), 'Should show create step')
	assert.ok(output.includes('Step 4: Read Resource'), 'Should show read step')
	assert.ok(output.includes('Step 5: Logout'), 'Should show logout step')
	assert.ok(output.includes('[CLIENT]'), 'Should contain client output')
})

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms))
}
