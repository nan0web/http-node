import { Alert, render } from '@nan0web/ui-cli'

/**
 * Executes a sequence of steps against the auth server.
 */
export class Runner {
	/**
	 * @param {object} options
	 * @param {string} [options.baseUrl] - Base URL of the server
	 * @param {number} [options.delay=1000] - Delay between steps in ms
	 * @param {boolean} [options.silent=false] - Suppress render output (for testing)
	 * @param {import('../AuthDB.js').default} [options.db] - AuthDB instance for reading verification codes (test mode only)
	 */
	constructor(options = {}) {
		this.baseUrl = options.baseUrl || 'http://localhost:3000'
		this.delay = options.delay !== undefined ? options.delay : 1000
		this.headers = { 'Content-Type': 'application/json' }
		this.token = null
		this.silent = options.silent || false
		this.db = options.db || null
		/** @type {Array<{type: string, label: string, status: number|string, data: any}>} */
		this.results = []
	}

	async sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}

	async run(steps) {
		for (const step of steps) {
			await this.execute(step)
			if (this.delay > 0) {
				await this.sleep(this.delay)
			}
		}
	}

	async execute(step) {
		const { type, label, expect, ...stepParams } = step
		const params = step.params || stepParams

		// Log step start
		if (!this.silent) {
			await render(
				Alert({
					title: `[RUN] ${label || type}`,
					variant: 'info',
					children: JSON.stringify(params || {}, null, 2),
				}),
			)
		}

		try {
			let res
			let data

			switch (type) {
				case 'wait':
					await this.sleep(params.ms)
					break

				case 'signup':
					res = await fetch(`${this.baseUrl}/auth/signup`, {
						method: 'POST',
						headers: this.headers,
						body: JSON.stringify(params),
					})
					data = await res.json()
					break

				case 'verify': {
					// Read verification code from DB (test mode) or use explicit code
					let code = params.code
					if (!code && this.db) {
						const user = await this.db.getUser(params.username)
						code = user?.verificationCode
					}
					if (!code) {
						console.warn(`No verification code available for ${params.username}`)
						this.results.push({ type, label: label || type, status: 'ERROR', data: 'No code' })
						return
					}
					res = await fetch(`${this.baseUrl}/auth/signup/${params.username}`, {
						method: 'PUT',
						headers: this.headers,
						body: JSON.stringify({ code }),
					})
					data = await res.json()
					// Verify returns tokens
					if (data?.accessToken) {
						this.token = data.accessToken
						this.headers['Authorization'] = `Bearer ${this.token}`
					}
					break
				}

				case 'login':
					res = await fetch(`${this.baseUrl}/auth/signin/${params.username}`, {
						method: 'POST',
						headers: this.headers,
						body: JSON.stringify(params), // includes password
					})
					data = await res.json()
					if (data.accessToken) {
						this.token = data.accessToken
						this.headers['Authorization'] = `Bearer ${this.token}`
					}
					break

				case 'logout':
					res = await fetch(`${this.baseUrl}/auth/signin/${params.username}`, {
						method: 'DELETE',
						headers: this.headers,
					})
					// clear token
					this.token = null
					delete this.headers['Authorization']
					if (res.status !== 204) data = await res.json().catch(() => ({}))
					break

				case 'get_private':
					res = await fetch(`${this.baseUrl}/private/${params.path}`, {
						method: 'GET',
						headers: this.headers,
					})
					const text = await res.text()
					try {
						data = JSON.parse(text)
					} catch {
						data = text
					}
					break

				case 'head_private':
					res = await fetch(`${this.baseUrl}/private/${params.path}`, {
						method: 'HEAD',
						headers: this.headers,
					})
					data = { status: res.status }
					break

				case 'post_private':
					res = await fetch(`${this.baseUrl}/private/${params.path}`, {
						method: 'POST',
						headers: this.headers,
						body: JSON.stringify(params.body),
					})
					data = await res.json()
					break

				default:
					console.warn(`Unknown step type: ${type}`)
					return
			}

			// Collect result
			const status = res ? res.status : 'N/A'
			this.results.push({ type, label: label || type, status, data })

			if (!this.silent) {
				console.log(`\x1b[36m[CLIENT]\x1b[0m < ${status} ${JSON.stringify(data)}`)
			}

			const isError = res && !res.ok
			if (isError && expect === 'success' && !this.silent) {
				await render(
					Alert({
						title: 'Unexpected Error',
						variant: 'error',
						children: `Expected success, got ${status}`,
					}),
				)
			}
		} catch (/** @type {any} */ err) {
			this.results.push({ type, label: label || type, status: 'ERROR', data: err.message })
			if (!this.silent) {
				console.error(`\x1b[31m[CLIENT ERROR]\x1b[0m ${err.message}`)
				await render(Alert({ title: 'Execution Failed', variant: 'error', children: err.message }))
			}
		}
	}
}
