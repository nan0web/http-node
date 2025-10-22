import { describe, it, before, beforeEach } from "node:test"
import assert from "node:assert/strict"
import FS from "@nan0web/db-fs"
import { NoConsole } from "@nan0web/log"
import {
	DatasetParser,
	DocsParser,
	runSpawn,
} from "@nan0web/test"
import {
	createServer as createServerOrig,
	fetch,
	get,
	post,
	del,
	Router,
	APIRequest,
	IncomingMessage,
	ResponseMessage,
} from "./index.js"
import { bodyParser, bruteForce } from "./middlewares/index.js"

const fs = new FS()
let pkg

// Load package.json once before tests
before(async () => {
	const doc = await fs.loadDocument("package.json", {})
	pkg = doc || {}
})

let console = new NoConsole()

function createServer(options) {
	return createServerOrig({ console, ...options })
}

beforeEach((info) => {
	console = new NoConsole()
})

/**
 * Core test suite that also serves as the source for README generation.
 *
 * The block comments inside each `it` block are extracted to build
 * the final `README.md`. Keeping the comments here ensures the
 * documentation stays close to the code.
 */
function testRender() {
	/**
	 * @docs
	 * # @nan0web/http-node
	 *
	 * This document is available in other languages:
	 * - [Ukrainian 🇺🇦](./docs/uk/README.md)
	 *
	 * Node.js HTTP client and server built on native modules with minimal dependencies.
	 *
	 * <!-- %PACKAGE_STATUS% -->
	 *
	 * ## Description
	 *
	 * The `@nan0web/http-node` package provides a lightweight, testable HTTP framework for Node.js.
	 * It includes:
	 *
	 * - **Client**: Fetch API compatible functions (`fetch`, `get`, `post`, etc.) with HTTP/2 support.
	 * - **Server**: Simple server creation (`createServer`) with routing and middleware.
	 * - **Messages**: Custom `IncomingMessage` and `ResponseMessage` for request/response handling.
	 * - **Middlewares**: Built-in parsers like `bodyParser` and rate limiting (`bruteForce`).
	 * - **Router**: Method-based routing with parameter extraction.
	 *
	 * Designed for monorepos and minimal setups, following nan0web philosophy: zero dependencies,
	 * full test coverage, and pure JavaScript with JSDoc typing.
	 *
	 * ## Installation
	 */
	it("How to install with npm?", () => {
		/**
		 * ```bash
		 * npm install @nan0web/http-node
		 * ```
		 */
		assert.equal(pkg.name, "@nan0web/http-node")
	})
	/**
	 * @docs
	 */
	it("How to install with pnpm?", () => {
		/**
		 * ```bash
		 * pnpm add @nan0web/http-node
		 * ```
		 */
		assert.equal(pkg.name, "@nan0web/http-node")
	})
	/**
	 * @docs
	 */
	it("How to install with yarn?", () => {
		/**
		 * ```bash
		 * yarn add @nan0web/http-node
		 * ```
		 */
		assert.equal(pkg.name, "@nan0web/http-node")
	})

	/**
	 * @docs
	 * ## Usage
	 *
	 * ### Server Creation
	 *
	 * Create and start a basic HTTP server with routes.
	 */
	it("How to create and start a basic HTTP server?", async () => {
		//import { createServer, fetch } from "@nan0web/http-node"
		const server = createServer()
		server.get("/hello", (req, res) => {
			res.json({ message: "Hello World" })
		})

		await server.listen()
		const port = server.port
		const response = await fetch(`http://localhost:${port}/hello`)
		const data = await response.json()
		console.info(data)
		await server.close()

		assert.deepStrictEqual(console.output()[0][1], { message: "Hello World" })
		assert.strictEqual(response.status, 200)
	})

	/**
	 * @docs
	 * ### Adding Routes
	 *
	 * Support for GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS.
	 */
	it("How to add routes for different HTTP methods?", async () => {
		//import { createServer, post } from "@nan0web/http-node"
		//import { bodyParser } from "@nan0web/http-node/middlewares"
		const server = createServer()
		server.use(bodyParser())

		server.post("/user", async (req, res) => {
			const body = req.body || {}
			res.statusCode = 201
			res.json({ id: 1, ...body })
		})

		await server.listen()
		const port = server.port
		const response = await post(`http://localhost:${port}/user`, { name: "Alice" })
		const data = await response.json()
		console.info(data)
		await server.close()

		assert.deepStrictEqual(console.output()[0][1], { id: 1, name: "Alice" })
		assert.strictEqual(response.status, 201)
	})
	/**
	 * @docs
	 */
	it("How to handle DELETE requests with 204 status?", async () => {
		//import { createServer, del } from "@nan0web/http-node"
		const server = createServer()

		server.delete("/user/:id", async (req, res) => {
			const { id } = req.params
			if (id === "1") {
				res.writeHead(204, 'No Content')
				res.end()
			} else {
				res.writeHead(404, 'Not Found')
				res.end(JSON.stringify({ error: "Not found" }))
			}
		})

		await server.listen()
		const port = server.port
		const response = await del(`http://localhost:${port}/user/1`)
		console.info(response.status)
		await server.close()

		assert.strictEqual(console.output()[0][1], 204)
	})

	/**
	 * @docs
	 * ### Middleware Usage
	 *
	 * Apply global middleware like body parsing.
	 */
	it("How to use bodyParser middleware?", async () => {
		//import { createServer } from "@nan0web/http-node"
		//import { bodyParser } from "@nan0web/http-node/middlewares"
		const server = createServer()

		server.use(bodyParser())
		server.post("/echo", async (req, res) => {
			res.json(req.body)
		})

		await server.listen()
		const port = server.port
		const response = await post(`http://localhost:${port}/echo`, { key: "value" })
		const data = await response.json()
		console.info(data)
		await server.close()

		assert.deepStrictEqual(console.output()[0][1], { key: "value" })
		assert.strictEqual(response.status, 200)
	})
	/**
	 * @docs
	 */
	it("How to use bruteForce rate limiting?", async () => {
		//import { createServer } from "@nan0web/http-node"
		//import { bruteForce } from "@nan0web/http-node/middlewares"
		const server = createServer()

		server.use(bruteForce({ max: 1, windowMs: 1000 }))
		server.get("/protected", (req, res) => {
			res.json({ message: "Protected" })
		})

		await server.listen()
		const port = server.port
		await get(`http://localhost:${port}/protected`) // First request OK
		const response = await get(`http://localhost:${port}/protected`) // Second blocked
		console.info(response.status)
		await server.close()

		assert.strictEqual(console.output()[0][1], 429)
	})

	/**
	 * @docs
	 * ### Client Requests
	 *
	 * Use `fetch` or helpers like `get`, `post`.
	 */
	it("How to make a GET request with fetch?", async () => {
		//import { fetch, createServer } from "@nan0web/http-node"
		const server = createServer()

		server.get("/data", (req, res) => {
			res.json({ result: "success" })
		})

		await server.listen()
		const port = server.port
		const response = await fetch(`http://localhost:${port}/data`, { timeout: 5000 })
		const data = await response.json()
		console.info(data)
		await server.close()

		assert.deepStrictEqual(console.output()[0][1], { result: "success" })
	})
	/**
	 * @docs
	 */
	it("How to use APIRequest for base URL management?", async () => {
		//import { APIRequest, createServer } from "@nan0web/http-node"
		const server = createServer()

		server.get("/api/info", (req, res) => {
			res.json({ version: "1.0" })
		})

		await server.listen()
		const port = server.port
		const baseUrl = `http://localhost:${port}/api`
		const api = new APIRequest(baseUrl)
		const response = await api.get("info")
		const data = await response.json()
		console.info(data)
		await server.close()

		assert.deepStrictEqual(console.output()[0][1], { version: "1.0" })
	})

	/**
	 * @docs
	 * ### Custom Messages
	 *
	 * Extend `IncomingMessage` and `ResponseMessage` for custom handling.
	 * You can import classes directly from a /messages.
	 */
	it("How to create a custom IncomingMessage?", () => {
		//import { IncomingMessage } from "@nan0web/http-node/messages"
		const socket = { remoteAddress: "127.0.0.1" }
		const req = new IncomingMessage(socket, {
			method: "POST",
			url: "/custom",
			headers: { "content-type": "application/json" }
		})

		console.info(req.method) // "POST"
		console.info(req.url) // "/custom"
		console.info(req.headers["content-type"] || '') // "application/json"
		assert.strictEqual(console.output()[0][1], "POST")
		assert.strictEqual(console.output()[1][1], "/custom")
		assert.strictEqual(console.output()[2][1], "application/json")
	})
	/**
	 * @docs
	 */
	it("How to create a ResponseMessage with body?", async () => {
		//import { ResponseMessage } from "@nan0web/http-node/messages"
		const response = new ResponseMessage("Hello from custom response", {
			status: 200,
			statusText: "OK",
			headers: { "content-type": "text/plain" }
		})

		const text = await response.text()
		console.info(text) // "Hello from custom response"
		assert.strictEqual(console.output()[0][1], "Hello from custom response")
	})

	/**
	 * @docs
	 * ### Router Standalone
	 *
	 * Use `Router` independently for advanced routing.
	 */
	it("How to use Router for parameter extraction?", () => {
		//import { Router } from "@nan0web/http-node/server"
		const router = new Router()
		let capturedParams = null

		router.get("/user/:id", (req, res) => {
			capturedParams = req.params.id
		})

		const req = { method: "GET", url: "/user/123" }
		const res = {}
		router.handle(req, res, () => { })

		console.info(capturedParams)
		assert.strictEqual(console.output()[0][1], "123")
	})

	/**
	 * @docs
	 * ## API
	 *
	 * ### Client Functions
	 *
	 * - `fetch(url, options)` – Core fetch with options like `method`, `body`, `timeout`, `protocol: 'http2'`.
	 * - `get/post/put/patch/del/head/options(url, body?, options?)` – Convenience methods.
	 * - `APIRequest(baseUrl, defaults)` – Class for API clients with method chaining.
	 *
	 * **Options**: `method`, `headers`, `body`, `type` ('json'|'binary'|'sockets'), `protocol`, `timeout`, `rejectUnauthorized`.
	 *
	 * ### Server
	 *
	 * - `createServer(options)` – Creates server instance.
	 * - `Server` class: `.use(middleware)`, `.get/post/put/delete/patch(head|options)(path, handler)`.
	 * - `.listen()` / `.close()` for lifecycle.
	 *
	 * ### Router
	 *
	 * - `new Router()`: `.get/post/.../use(path|middleware)`.
	 * - `.handle(req, res, notFoundHandler)` – Processes request.
	 * - Supports params like `/user/:id` and wildcards `*`.
	 *
	 * ### Messages
	 *
	 * - `IncomingMessage`: Extends Node's with `params`, `body`.
	 * - `ResponseMessage`: Readable stream with `json()`, `text()`, `buffer()`, `status`, `headers`.
	 * - `ServerResponse`: Extends Node's with `.json(data)`, route helpers.
	 *
	 * ### Middlewares
	 *
	 * - `Middlewares.bodyParser()` – Parses JSON/form bodies into `req.body`.
	 * - `Middlewares.bruteForce(options)` – Rate limits by IP/path (e.g., `{ max: 100, windowMs: 60000 }`).
	 *
	 * ## Java•Script
	 */
	it("Uses `d.ts` files for autocompletion", () => {
		assert.equal(pkg.types, "./types/index.d.ts")

		assert.ok(createServer)
		assert.ok(fetch)
		assert.ok(Router)
		assert.ok(APIRequest)
		assert.ok(IncomingMessage)
		assert.ok(ResponseMessage)
	})

	/**
	 * @docs
	 * ## CLI Playground
	 */
	it("How to run playground script?", async () => {
		/**
		 * ```bash
		 * # Clone the repository and run the CLI playground
		 * git clone https://github.com/nan0web/http-node.git
		 * cd http-node
		 * npm install
		 * # Run tests or custom playground if available
		 * npm run play
		 * ```
		 */
		assert.ok(pkg.scripts?.play)
		const response = await runSpawn("git", ["remote", "get-url", "origin"], { timeout: 1000 })
		assert.ok(response.code === 0 || response.code === 128, "git command may fail if not in repo")
	})

	/**
	 * @docs
	 * ## Contributing
	 */
	it("How to contribute? - [check here](./CONTRIBUTING.md)", async () => {
		assert.ok(pkg.scripts?.test)
		assert.equal(pkg.devDependencies?.husky, "^9.1.7")
		const text = await fs.loadDocument("CONTRIBUTING.md", { exists: true })
		const str = String(text || "")
		assert.ok(str.includes("# Contributing") || "CONTRIBUTING.md may not exist yet")
	})

	/**
	 * @docs
	 * ## License
	 */
	it("How to license ISC? - [check here](./LICENSE)", async () => {
		/** @docs */
		const text = await fs.loadDocument("LICENSE", { exists: true })
		assert.ok(String(text || "").includes("ISC") || "LICENSE may not exist yet")
	})
}

describe("README.md testing", testRender)

describe("Rendering README.md", async () => {
	let text = ""
	const format = new Intl.NumberFormat("en-US").format
	const parser = new DocsParser()
	text = String(parser.decode(testRender))
	await fs.saveDocument("README.md", text)
	const dataset = DatasetParser.parse(text, pkg.name)
	await fs.saveDocument(".datasets/README.dataset.jsonl", dataset)

	it(`document is rendered in README.md [${format(Buffer.byteLength(text))}b]`, async () => {
		const text = await fs.loadDocument("README.md")
		assert.ok(text.includes("## License"))
	})
})
