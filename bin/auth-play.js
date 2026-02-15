#!/usr/bin/env node
import { resolve, join } from 'node:path'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import AuthServer from '../src/server/AuthServer.js'
import { Slider, render } from '@nan0web/ui-cli'
import process from 'node:process'
import { PlayApp } from '../src/play/App.js'

// Logger proxy to prefix server logs
const createLogger = () => ({
	debug: (...args) => console.log('\x1b[35m[SERVER]\x1b[0m', ...args),
	info: (...args) => console.log('\x1b[35m[SERVER]\x1b[0m', ...args),
	error: (...args) => console.log('\x1b[31m[SERVER ERROR]\x1b[0m', ...args),
	warn: (...args) => console.log('\x1b[33m[SERVER WARN]\x1b[0m', ...args),
	from: () => createLogger(),
})

async function startServer(port, dataDir) {
	const server = new AuthServer({
		db: { cwd: dataDir },
		port,
		logger: createLogger(),
	})
	await server.start()
	return server
}

async function main() {
	// 1. UI: Select delay
	let delay = 1000
	try {
		const delayResult = await render(
			Slider({
				message: 'Select delay between requests (ms)',
				min: 0,
				max: 5000,
				initial: 1000,
				step: 100,
			}),
		)

		if (delayResult && typeof delayResult === 'object' && 'value' in delayResult) {
			delay = Number(delayResult.value)
		} else {
			delay = Number(delayResult)
		}

		if (isNaN(delay)) delay = 1000
	} catch (e) {
		console.log('Using default delay: 1000ms')
	}

	// 2. Start Server
	const envPort = process.env.AUTH_PORT
	const PORT = envPort !== undefined ? Number(envPort) : 3002
	const DATA_DIR = resolve(process.cwd(), './play-data')
	rmSync(DATA_DIR, { recursive: true, force: true }) // Clean previous runs
	mkdirSync(DATA_DIR, { recursive: true })

	console.log('\nStarting Play Server on port', PORT, 'with delay', delay, 'ms...\n')
	// Grant full access for all authenticated users in play mode
	writeFileSync(join(DATA_DIR, '.access'), '* rwd /\n')
	const server = await startServer(PORT, DATA_DIR)

	try {
		const app = new PlayApp(server, server.logger)
		// Override runner delay with selected one
		app.runner.delay = delay

		await app.main()
	} catch (err) {
		console.error(err)
	} finally {
		console.log('\nStopping server...')
		await server.stop()
		process.exit(0)
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
