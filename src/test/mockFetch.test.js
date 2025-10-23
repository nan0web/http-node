import { describe, it } from 'node:test'
import { strictEqual, deepStrictEqual } from 'node:assert'
import mockFetch from './mockFetch.js'

describe('mockFetch', () => {
	it('should return a function', () => {
		const fetch = mockFetch([])
		strictEqual(typeof fetch, 'function')
	})

	it('should handle exact route match', async () => {
		const routes = [
			['GET /users', { id: 1, name: 'John' }],
		]
		const fetch = mockFetch(routes)
		const response = await fetch('/users', { method: 'GET' })
		const data = await response.json()
		deepStrictEqual(data, { id: 1, name: 'John' })
		strictEqual(response.ok, true)
		strictEqual(response.status, 200)
	})

	it('should handle method wildcard', async () => {
		const routes = [
			['* /users', { message: 'Method wildcard match' }],
		]
		const fetch = mockFetch(routes)
		const response = await fetch('/users', { method: 'POST' })
		const data = await response.json()
		deepStrictEqual(data, { message: 'Method wildcard match' })
	})

	it('should handle path wildcard', async () => {
		const routes = [
			['GET /items/*', { message: 'Path wildcard match' }],
		]
		const fetch = mockFetch(routes)
		const response = await fetch('/items/123', { method: 'GET' })
		const data = await response.json()
		deepStrictEqual(data, { message: 'Path wildcard match' })
	})

	it('should match all with * *', async () => {
		const routes = [
			['* *', { message: 'Catch all match' }],
		]
		const fetch = mockFetch(routes)
		const response = await fetch('/any/path', { method: 'DELETE' })
		const data = await response.json()
		deepStrictEqual(data, { message: 'Catch all match' })
	})

	it('should match all with *', async () => {
		const routes = [
			['*', { message: 'Catch all match' }],
		]
		const fetch = mockFetch(routes)
		const response = await fetch('/any/path', { method: 'DELETE' })
		const data = await response.json()
		deepStrictEqual(data, { message: 'Catch all match' })
	})

	it('should handle custom status code', async () => {
		const routes = [
			['POST /users', [201, { id: 2, name: 'Jane' }]],
		]
		const fetch = mockFetch(routes)
		const response = await fetch('/users', { method: 'POST' })
		const data = await response.json()
		deepStrictEqual(data, { id: 2, name: 'Jane' })
		strictEqual(response.ok, true)
		strictEqual(response.status, 201)
	})

	it('should return 404 for unmatched route', async () => {
		const routes = []
		const fetch = mockFetch(routes)
		const response = await fetch('/nonexistent', { method: 'GET' })
		const data = await response.json()
		deepStrictEqual(data, { error: 'Not found' })
		strictEqual(response.ok, false)
		strictEqual(response.status, 404)
	})

	it('should handle function-based response', async () => {
		const routes = [
			['GET /dynamic', async () => ({ dynamic: true })],
		]
		const fetch = mockFetch(routes)
		const response = await fetch('/dynamic', { method: 'GET' })
		const data = await response.json()
		deepStrictEqual(data, { dynamic: true })
	})

	it('should handle function-based response returning structured response', async () => {
		const routes = [
			['GET /structured', async () => [418, { message: 'I am a teapot' }]],
		]
		const fetch = mockFetch(routes)
		const response = await fetch('/structured', { method: 'GET' })
		const data = await response.json()
		deepStrictEqual(data, { message: 'I am a teapot' })
		strictEqual(response.ok, false)
		strictEqual(response.status, 418)
	})

	it("should handle HEAD responses", async () => {
		const fetch = mockFetch([
			["HEAD /index.html", { "Content-Type": "text/html" }]
		])
		const response = await fetch("/index.html", { method: "HEAD" })
		strictEqual(response.ok, true)
		strictEqual(response.headers.get("Content-Type"), "text/html")
	})

	it("should handle absolute uris", async () => {
		const fetch = mockFetch([
			["GET https://api.example.com/index.json", { "some": "thing" }],
			["GET http://example.com/i", [201, ["list", "of", 5, "items"]]]
		])
		const r1 = await fetch("https://api.example.com/index.json")
		strictEqual(r1.ok, true)
		deepStrictEqual(await r1.json(), { some: "thing" })
		const r2 = await fetch("http://example.com/i")
		strictEqual(r2.ok, true)
		strictEqual(r2.status, 201)
		const json = await r2.json()
		deepStrictEqual(json, ["list", "of", 5, "items"])
		strictEqual(Array.isArray(json), true)
	})

	describe("Route patterns", () => {
		const routes = [
			["GET /users", { get: "/users" }],
			["* /users", { all: "/users" }],
			["GET /users/*", { get: "/users/" }],
			["GET /private/", { get: "/private/" }],
			["GET /", { get: "/" }],
			["GET *", { get: "*" }],
			["* /", { any: "path", variant: "* /" }],
			["* *", { any: "path", variant: "* *" }],
			["*", { any: "path", variant: "*" }],
		]
		const expectations = [
			["GET /users", routes[0][1]],
			["POST /users", routes[1][1]],
			// ["HEAD /users", routes[1][1]],
			// ["OPTIONS /users", routes[1][1]],
			["DELETE /users", routes[1][1]],
			["POST /users", routes[1][1]],
			["PUT /users", routes[1][1]],
			["PATCH /users", routes[1][1]],
			["GET /users/", routes[2][1]],
			["GET /users/specific", routes[2][1]],
			["GET /private/", routes[3][1]],
			["GET /private/file", routes[3][1]],
			["GET /", routes[4][1]],
			["GET /anything", routes[4][1]],
			["GET no-slash", routes[5][1]],
			["POST /yes", routes[6][1]],
			["POST no", routes[7][1]],
		]
		const fetch = mockFetch(routes)
		for (const [route, exp] of expectations) {
			it("should process route " + route, async () => {
				const [method, ...url] = route.split(" ")
				const response = await fetch(url.join(" "), { method })
				const data = await response.json()
				strictEqual(data, exp)
			})
		}
	})
})
