import { before, suite, describe, it, after } from 'node:test'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import fetch, { get, post, put, patch, del, head, options, APIRequest } from './fetch.js'
import TestServer from '../test/TestServer.js'

suite("Fetch", () => {
	let testServer
	let baseUrl

	before(async () => {
		testServer = new TestServer()
		testServer
			.route('get', '/json', (req, res) => {
				res.setHeader("Content-Type", "application/json")
				res.end(JSON.stringify({ message: 'Hello, World!' }))
			})
			.route('post', '/echo', (req, res) => { res.end(JSON.stringify({ body: "body" })) })
			.route('put', '/update', (req, res) => {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ status: 'updated' }))
			})
			.route('delete', '/delete', (req, res) => {
				res.writeHead(204)
				res.end()
			})
			.route('patch', '/patch', (req, res) => {
				res.writeHead(200, { 'Content-Type': 'application/json' })
				res.end(JSON.stringify({ patched: true }))
			})
			.route('get', '/head', (req, res) => {
				res.writeHead(200, { 'Content-Length': '123' })
				res.end()
			})
			.route('head', '/head', (req, res) => {
				res.writeHead(200, { 'Content-Length': '123' })
				res.end()
			})
			.route('get', '/options', (req, res) => {
				res.writeHead(200, {
					'Allow': 'GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS'
				})
				res.end()
			})
			.route('options', '/options', (req, res) => {
				res.writeHead(200, {
					'Allow': 'GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS'
				})
				res.end()
			})
			.route('get', '/binary', (req, res) => {
				res.writeHead(200, { 'Content-Type': 'application/octet-stream' })
				res.end(Buffer.from([0x00, 0xff, 0x12]))
			})
			.route('get', '/stream', (req, res) => {
				res.writeHead(200, { 'Content-Type': 'text/plain' })
				res.write('chunk1')
				setTimeout(() => { res.write('chunk2') }, 50)
				setTimeout(() => { res.write('chunk3') }, 100)
				setTimeout(() => { res.end('4') }, 150)
			})
			.route('get', '/api/test', (req, res) => {
				res.writeHead(200, { 'Content-Type': 'application/json' })
				res.end(JSON.stringify({ endpoint: 'test' }))
			})
			.route('post', '/api/submit', (req, res) => {
				let body = ''
				req.on('data', chunk => body += chunk)
				req.on('end', () => {
					res.writeHead(201, { 'Content-Type': 'application/json' })
					res.end(body)
				})
			})
			.route('get', '/slow', (req, res) => {
				setTimeout(() => {
					res.writeHead(200, { 'Content-Type': 'application/json' })
					res.end(JSON.stringify({ message: 'Slow response' }))
				}, 500)
			})
			// Register catch-all route LAST
			.route('get', '/*', (req, res) => {
				res.writeHead(404)
				res.end('Not Found')
			})

		await testServer.start()
		baseUrl = testServer.baseUrl
	})

	after(async () => {
		await testServer.stop()
	})

	describe("fetch", () => {
		it("GET fetches JSON", async () => {
			const res = await fetch(`${baseUrl}/json`, { type: 'json', timeout: 5_000 })
			assert.strictEqual(res.ok, true)
			assert.strictEqual(res.status, 200)
			assert.strictEqual(res.statusText, 'OK')
			assert.deepStrictEqual(await res.json(), { message: 'Hello, World!' })
		})

		it("POST with JSON body", async () => {
			const body = { data: 'test' }
			const res = await fetch(`${baseUrl}/echo`, {
				method: 'POST',
				body,
				type: 'json',
				timeout: 5_000,
			})
			assert.strictEqual(res.status, 200)
			assert.deepStrictEqual(await res.json(), { body: "body" })
		})

		it("binary response", async () => {
			const res = await fetch(`${baseUrl}/binary`, { type: 'binary', timeout: 5_000 })
			const buffer = await res.buffer()
			assert.deepStrictEqual(buffer, Buffer.from([0x00, 0xff, 0x12]))
			assert.strictEqual(res.status, 200)
		})

		// Тепер без .skip: стабільний streaming via Readable chunks
		it("'sockets' type streaming", async () => {
			const res = await fetch(`${baseUrl}/stream`, { type: 'sockets', timeout: 5_000 })
			assert.strictEqual(res.status, 200)
			const stream = res.stream() // Readable
			const data = []

			return new Promise((resolve, reject) => {
				stream.on('data', chunk => data.push(chunk))
				stream.on('error', reject)
				stream.on('end', () => {
					assert.deepStrictEqual(Buffer.concat(data).toString(), 'chunk1chunk2chunk34')
					resolve()
				})
			})
		})

		it("404 error", async () => {
			const res = await fetch(`${baseUrl}/not-found`, { timeout: 5_000 })
			assert.strictEqual(res.ok, false)
			assert.strictEqual(res.status, 404)
			assert.strictEqual(res.statusText, 'Not Found')
			assert.strictEqual(await res.text(), 'Not Found')
		})

		// Додано: тест для timeout
		it("aborts on timeout", async () => {
			await assert.rejects(
				fetch(`${baseUrl}/slow`, { timeout: 100 }),
				{ name: 'AbortError', message: 'The operation was aborted' }
			)
		})
	})

	// ... решта describe для HTTP methods, APIRequest, Timeout (аналогічно, з baseUrl замість createServer)
	// (скорочено для прикладу; повний код аналогічний оригіналу, але з TestServer)

	describe("HTTP methods", () => {
		it("GET method", async () => {
			const res = await get(`${baseUrl}/json`, { timeout: 5_000 })
			assert.strictEqual(res.status, 200)
			assert.deepStrictEqual(await res.json(), { message: 'Hello, World!' })
		})

		it("POST method", async () => {
			const body = { test: 'data' }
			const res = await post(`${baseUrl}/echo`, body, { timeout: 5_000 })
			assert.strictEqual(res.status, 200)
			assert.deepStrictEqual(await res.json(), { body: "body" })
		})

		it("PUT method", async () => {
			const body = { update: 'data' }
			const res = await put(`${baseUrl}/update`, body, { timeout: 5_000 })
			assert.strictEqual(res.status, 200)
			assert.deepStrictEqual(await res.json(), { status: 'updated' })
		})

		it("PATCH method", async () => {
			const body = { patch: 'data' }
			const res = await patch(`${baseUrl}/patch`, body, { timeout: 5_000 })
			assert.strictEqual(res.status, 200)
			assert.deepStrictEqual(await res.json(), { patched: true })
		})

		it("DELETE method", async () => {
			const res = await del(`${baseUrl}/delete`, { timeout: 5_000 })
			assert.strictEqual(res.status, 204)
		})

		it("HEAD method", async () => {
			const res = await head(`${baseUrl}/head`, { timeout: 5_000 })
			assert.strictEqual(res.status, 200)
			assert.strictEqual(res.headers.get("content-length"), '123')
		})

		it("OPTIONS method", async () => {
			const res = await options(`${baseUrl}/options`, { timeout: 5_000 })
			assert.strictEqual(res.status, 200)
			assert.strictEqual(res.headers.get("allow"), 'GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS')
		})
	})

	describe("APIRequest", () => {
		it("constructs URLs correctly", () => {
			const api = new APIRequest('https://api.example.com')
			assert.strictEqual(api.getFullUrl('/test'), 'https://api.example.com/test')
			assert.strictEqual(api.getFullUrl('test'), 'https://api.example.com/test')
		})

		it("throws error for invalid URL construction", () => {
			const api = new APIRequest('')
			assert.throws(() => api.getFullUrl('/test'), Error)
		})

		it("GET request", async () => {
			const api = new APIRequest(baseUrl)
			const res = await api.get('/json')
			assert.strictEqual(res.status, 200)
			assert.deepStrictEqual(await res.json(), { message: 'Hello, World!' })
		})

		it("POST request", async () => {
			const api = new APIRequest(baseUrl)
			const body = { test: 'data' }
			const res = await api.post('/echo', body)
			assert.strictEqual(res.status, 200)
			assert.deepStrictEqual(await res.json(), { body: "body" })
		})

		it("PUT request", async () => {
			const api = new APIRequest(baseUrl)
			const body = { update: 'data' }
			const res = await api.put('/update', body)
			assert.strictEqual(res.status, 200)
			assert.deepStrictEqual(await res.json(), { status: 'updated' })
		})

		it("PATCH request", async () => {
			const api = new APIRequest(baseUrl)
			const body = { patch: 'data' }
			const res = await api.patch('/patch', body)
			assert.strictEqual(res.status, 200)
			assert.deepStrictEqual(await res.json(), { patched: true })
		})

		it("DELETE request", async () => {
			const api = new APIRequest(baseUrl)
			const res = await api.del('/delete')
			assert.strictEqual(res.status, 204)
		})
	})

	describe("Timeout functionality", () => {
		it("aborts request on timeout", async () => {
			const api = new APIRequest(baseUrl, {}, { timeout: 100 })
			await assert.rejects(
				api.get('/slow'),
				{ name: 'AbortError', message: 'The operation was aborted' }
			)
		})

		it("completes request within timeout", async () => {
			const api = new APIRequest(baseUrl, {}, { timeout: 1_000 })
			const res = await api.get('/slow')
			assert.strictEqual(res.status, 200)
			assert.deepStrictEqual(await res.json(), { message: 'Slow response' })
		})
	})

	describe("HTTP/2", () => {
		it("uses HTTP/2 for https", async () => {
			const res = await fetch(`${baseUrl}/json`, { type: "json", protocol: "http2", rejectUnauthorized: false });
			assert.strictEqual(res.status, 200);
			assert.deepStrictEqual(await res.json(), { message: 'Hello, World!' });
		});
	})
})