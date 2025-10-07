import { describe, before, after, it } from 'node:test'
import assert from 'node:assert/strict'
import { createSecureServer } from 'node:http2'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { readFile } from 'node:fs/promises'
import fetch from './fetch.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('HTTP/2 support', () => {
	let server
	let baseUrl

	const certPath = join(__dirname, 'cert.pem')
	const keyPath = join(__dirname, 'key.pem')

	before(async () => {
		let cert, key

		try {
			// Читаємо сертифікат і ключ з файлів
			cert = await readFile(certPath, 'utf8')
			key = await readFile(keyPath, 'utf8')

			console.log('Cert loaded:', cert.startsWith('-----BEGIN CERTIFICATE-----') ? '✓ Valid PEM' : '✗ Invalid');
			console.log('Key loaded:', key.startsWith('-----BEGIN PRIVATE KEY-----') || key.startsWith('-----BEGIN RSA PRIVATE KEY-----') ? '✓ Valid PEM' : '✗ Invalid');
		} catch (err) {
			console.error('Error loading cert/key files:', err.message)
			console.error('Make sure cert.pem and key.pem are in the project root, generated with OpenSSL.')
			throw new Error('Failed to load certificate files. Generate them with OpenSSL.')
		}

		server = createSecureServer({
			key,
			cert,
			allowHTTP1: true
		})

		server.on('stream', (stream, headers) => {
			const path = headers[':path']
			if (path === '/json') {
				const payload = JSON.stringify({ message: 'Hello from HTTP/2' })
				stream.respond({
					':status': 200,
					'content-type': 'application/json',
					'content-length': Buffer.byteLength(payload)
				})
				stream.end(payload)
			} else {
				stream.respond({ ':status': 404 })
				stream.end('Not Found')
			}
		})

		await new Promise((resolve, reject) => {
			server.listen(0, '127.0.0.1', (err) => {
				if (err) reject(err)
				else resolve(undefined)
			})
		})

		const { port } = server.address()
		baseUrl = `https://localhost:${port}`
		console.log(`Server started on ${baseUrl}`)
	})

	after(async () => {
		if (server) {
			await new Promise(resolve => server.close(resolve))
		}
	})

	it('should fetch JSON over HTTP/2', async () => {
		const res = await fetch(`${baseUrl}/json`, {
			type: 'json',
			protocol: 'http2',
			rejectUnauthorized: false,
			timeout: 5000
		})

		assert.strictEqual(res.ok, true)
		assert.strictEqual(res.status, 200)
		assert.deepStrictEqual(await res.json(), { message: 'Hello from HTTP/2' })
	})
})
