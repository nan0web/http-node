import { createServer as createHttpServer } from "node:http"
import { suite, describe, it } from 'node:test'
import assert from 'node:assert'
import fetch from "../client/fetch.js"
import createServer from "./index.js"
import { NoConsole } from "@nan0web/log"

// Helper для available port (з await close)
const getAvailablePort = async () => {
	return new Promise((resolve) => {
		const server = createHttpServer()
		server.listen(0, 'localhost', () => {
			const addr = server.address()
			const port = Number(addr?.port || 0)
			server.close(() => resolve(port))
		})
	})
}

const testCases = [
	{
		method: "GET",
		path: "/index.json",
		expected: { key: "value" },
		description: "should return JSON data for GET request"
	},
	{
		method: "POST",
		path: "/index.json",
		body: { data: "test" }, // Додаємо body для POST/PUT/PATCH
		expected: { ok: "saved" },
		description: "should handle POST request and return success"
	},
	{
		method: "DELETE",
		path: "/index.json",
		expected: { ok: "deleted" },
		description: "should handle DELETE request and return success",
		status: 204
	},
	{
		method: "PUT",
		path: "/index.json",
		body: { update: "data" },
		expected: { ok: "updated" },
		description: "should handle PUT request and return success"
	},
	{
		method: "PATCH",
		path: "/index.json",
		body: { patch: "data" },
		expected: { ok: "patched" },
		description: "should handle PATCH request and return success"
	}
]

suite("Server scenarios", () => {
	describe("Basic HTTP methods", () => {
		for (const { method, path, expected, body, description, status = 200 } of testCases) {
			it(description, async () => {
				const port = await getAvailablePort()
				const server = createServer({ port, logger: new NoConsole() })

				// Register route
				server[method.toLowerCase()](path, async (req, res) => {
					if (method === 'DELETE') {
						// Для DELETE використовуємо статус 204 без тіла відповіді
						res.writeHead(204, 'No Content')
						res.end()
					} else {
						res.setHeader('Content-Type', 'application/json')
						res.status = status
						res.json(expected)
					}
				})

				await server.listen() // Await listen

				const uri = `http://localhost:${port}${path}`
				const options = { method, timeout: 1000 }
				if (body) options.body = JSON.stringify(body)

				const response = await fetch(uri, options)

				assert.strictEqual(response.status, status)
				if (status !== 204) {
					const data = await response.json()
					assert.deepStrictEqual(data, expected)
				}

				await server.close()
			})
		}
	})

	describe.skip("Route handling", () => {
		// @todo add tests
	})

	describe.skip("Body parsing", () => {
		// @todo add tests
	})

	describe.skip("Error handling", () => {
		// @todo add tests
	})

	describe.skip("Middleware execution order", () => {
		// @todo add tests
	})
})
