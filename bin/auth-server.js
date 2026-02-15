#!/usr/bin/env node
import AuthServer from '../src/server/AuthServer.js'
import Logger from '@nan0web/log'
import { Alert, render } from '@nan0web/ui-cli'
import { mkdirSync } from 'node:fs'
import process from 'node:process'
import { resolve } from 'node:path'

const DATA_DIR = process.env.AUTH_DATA_DIR || './auth-data'
const PORT = process.env.AUTH_PORT || '3000'

async function main() {
	const dataDir = resolve(process.cwd(), DATA_DIR)
	mkdirSync(dataDir, { recursive: true })

	const server = new AuthServer({
		db: { cwd: dataDir },
		port: Number(PORT),
		logger: Logger.from('debug'),
	})

	await server.start()

	const port = server.port

	const routes = [
		'POST   /auth/signup              Register new user',
		'PUT    /auth/signup/:username     Confirm registration',
		'DELETE /auth/signup/:username     Delete account',
		'',
		'POST   /auth/signin/:username     Sign in',
		'DELETE /auth/signin/:username     Sign out',
		'PUT    /auth/refresh/:token        Refresh token',
		'',
		'POST   /auth/forgot/:username     Request reset code',
		'PUT    /auth/forgot/:username     Reset password',
		'',
		'GET    /auth/signin/:username     Get user',
		'GET    /auth/info                  List users',
		'GET    /auth/info/:username        User details',
		'GET    /auth/access/info           Access rules',
		'',
		'GET    /private/*                  Private access',
		'HEAD   /private/*                  Check access (200/403/404)',
		'POST   /private/*                  Private write',
		'DELETE /private/*                  Private delete',
	].join('\n')

	const info = [`http://localhost:${port}`, `📂 ${dataDir}`, '', routes].join('\n')

	await render(
		Alert({
			title: `🔐 Auth Server :${port}`,
			variant: 'success',
			children: info,
		}),
	)

	process.on('SIGINT', async () => {
		await render(
			Alert({
				title: 'Shutdown',
				variant: 'info',
				children: 'Server stopped',
			}),
		)
		await server.stop()
		process.exit(0)
	})
}

main().catch(async (err) => {
	await render(
		Alert({
			title: 'Failed to start',
			variant: 'error',
			children: err.message,
		}),
	)
	process.exit(1)
})
