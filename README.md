# @nan0web/http-node

This document is available in other languages:
- [Ukrainian 🇺🇦](./docs/uk/README.md)

Node.js HTTP client and server built on native modules with minimal dependencies.

|[Status](https://github.com/nan0web/monorepo/blob/main/system.md#написання-сценаріїв)|Documentation|Test coverage|Features|Npm version|
|---|---|---|---|---|
 |🟢 `98.6%` |🧪 [English 🏴󠁧󠁢󠁥󠁮󠁧󠁿](https://github.com/nan0web/http-node/blob/main/README.md)<br />[Українською 🇺🇦](https://github.com/nan0web/http-node/blob/main/docs/uk/README.md) |🟢 `93.4%` |✅ d.ts 📜 system.md 🕹️ playground |— |

## Description

The `@nan0web/http-node` package provides a lightweight, testable HTTP framework for Node.js.
It includes:

- **Client**: Fetch API compatible functions (`fetch`, `get`, `post`, etc.) with HTTP/2 support.
- **Server**: Simple server creation (`createServer`) with routing and middleware.
- **Messages**: Custom `IncomingMessage` and `ResponseMessage` for request/response handling.
- **Middlewares**: Built-in parsers like `bodyParser` and rate limiting (`bruteForce`).
- **Router**: Method-based routing with parameter extraction.

Designed for monorepos and minimal setups, following nan0web philosophy: zero dependencies,
full test coverage, and pure JavaScript with JSDoc typing.

## Installation

How to install with npm?
```bash
npm install @nan0web/http-node
```

How to install with pnpm?
```bash
pnpm add @nan0web/http-node
```

How to install with yarn?
```bash
yarn add @nan0web/http-node
```

## Usage

### Server Creation

Create and start a basic HTTP server with routes.

How to create and start a basic HTTP server?
```js
import { createServer, fetch } from "@nan0web/http-node"
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

```
### Adding Routes

Support for GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS.

How to add routes for different HTTP methods?
```js
import { createServer, post } from "@nan0web/http-node"
import { bodyParser } from "@nan0web/http-node/middlewares"
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

```

How to handle DELETE requests with 204 status?
```js
import { createServer, del } from "@nan0web/http-node"
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

```
### Middleware Usage

Apply global middleware like body parsing.

How to use bodyParser middleware?
```js
import { createServer } from "@nan0web/http-node"
import { bodyParser } from "@nan0web/http-node/middlewares"
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

```

How to use bruteForce rate limiting?
```js
import { createServer } from "@nan0web/http-node"
import { bruteForce } from "@nan0web/http-node/middlewares"
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

```
### Client Requests

Use `fetch` or helpers like `get`, `post`.

How to make a GET request with fetch?
```js
import { fetch, createServer } from "@nan0web/http-node"
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

```

How to use APIRequest for base URL management?
```js
import { APIRequest, createServer } from "@nan0web/http-node"
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

```
### Custom Messages

Extend `IncomingMessage` and `ResponseMessage` for custom handling.
You can import classes directly from a /messages.

How to create a custom IncomingMessage?
```js
import { IncomingMessage } from "@nan0web/http-node/messages"
const socket = { remoteAddress: "127.0.0.1" }
const req = new IncomingMessage(socket, {
	method: "POST",
	url: "/custom",
	headers: { "content-type": "application/json" }
})

console.info(req.method) // "POST"
console.info(req.url) // "/custom"
console.info(req.headers["content-type"] || '') // "application/json"
```

How to create a ResponseMessage with body?
```js
import { ResponseMessage } from "@nan0web/http-node/messages"
const response = new ResponseMessage("Hello from custom response", {
	status: 200,
	statusText: "OK",
	headers: { "content-type": "text/plain" }
})

const text = await response.text()
console.info(text) // "Hello from custom response"
```
### Router Standalone

Use `Router` independently for advanced routing.

How to use Router for parameter extraction?
```js
import { Router } from "@nan0web/http-node/server"
const router = new Router()
let capturedParams = null

router.get("/user/:id", (req, res) => {
	capturedParams = req.params.id
})

const req = { method: "GET", url: "/user/123" }
const res = {}
router.handle(req, res, () => { })

console.info(capturedParams)
```
## API

### Client Functions

- `fetch(url, options)` – Core fetch with options like `method`, `body`, `timeout`, `protocol: 'http2'`.
- `get/post/put/patch/del/head/options(url, body?, options?)` – Convenience methods.
- `APIRequest(baseUrl, defaults)` – Class for API clients with method chaining.

**Options**: `method`, `headers`, `body`, `type` ('json'|'binary'|'sockets'), `protocol`, `timeout`, `rejectUnauthorized`.

### Server

- `createServer(options)` – Creates server instance.
- `Server` class: `.use(middleware)`, `.get/post/put/delete/patch(head|options)(path, handler)`.
- `.listen()` / `.close()` for lifecycle.

### Router

- `new Router()`: `.get/post/.../use(path|middleware)`.
- `.handle(req, res, notFoundHandler)` – Processes request.
- Supports params like `/user/:id` and wildcards `*`.

### Messages

- `IncomingMessage`: Extends Node's with `params`, `body`.
- `ResponseMessage`: Readable stream with `json()`, `text()`, `buffer()`, `status`, `headers`.
- `ServerResponse`: Extends Node's with `.json(data)`, route helpers.

### Middlewares

- `Middlewares.bodyParser()` – Parses JSON/form bodies into `req.body`.
- `Middlewares.bruteForce(options)` – Rate limits by IP/path (e.g., `{ max: 100, windowMs: 60000 }`).

## Java•Script

Uses `d.ts` files for autocompletion

## CLI Playground

How to run playground script?
```bash
# Clone the repository and run the CLI playground
git clone https://github.com/nan0web/http-node.git
cd http-node
npm install
# Run tests or custom playground if available
npm run play
```

## Contributing

How to contribute? - [check here](./CONTRIBUTING.md)

## License

How to license ISC? - [check here](./LICENSE)
