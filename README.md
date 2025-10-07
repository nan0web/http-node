# Nanoweb HTTP Node

Nanoweb HTTP Node is a powerful Node.js package that provides a modern, browser-like fetch API for making HTTP requests in Node.js environments. It includes server and client functionality with middleware support.

## Features

- Browser-like fetch API with full support for GET, POST, PUT, DELETE, PATCH, HEAD, and OPTIONS methods
- Custom Response class with methods like `.text()`, `.json()`, `.arrayBuffer()`, and `.stream()`
- APIRequest class for simplified API interactions with default options
- HTTP server with routing capabilities
- Middleware support for request processing
- Support for HTTP/1.1, HTTP/2, and HTTPS protocols
- Automatic Content-Type header handling based on request body
- Robust error handling for network and HTTP errors
- Brute force protection middleware
- Body parsing middleware for JSON and form data

## Installation

Ensure you have Node.js installed, then install the package using npm:

```bash
npm install @nan0web/http-node
```

## Usage

### Core Fetch API

The core fetch function allows you to make HTTP requests similar to the browser Fetch API:

```js
import fetch from '@nan0web/http-node'

// Make a GET request
const response = await fetch('http://localhost:3000/data')
const data = await response.json()
console.log(data)
```

### HTTP Method Helpers

Convenience methods for common HTTP operations:

```js
import { get, post, put, patch, del, head, options } from '@nan0web/http-node'

// GET request
const getData = await get('http://localhost:3000/data')

// POST request with JSON body
const postData = await post('http://localhost:3000/api/data', { name: 'John' })

// PUT request
const putData = await put('http://localhost:3000/api/data/1', { status: 'active' })

// PATCH request
const patchData = await patch('http://localhost:3000/api/data/1', { partial: true })

// DELETE request
const deleteData = await del('http://localhost:3000/api/data/1')

// HEAD request
const headData = await head('http://localhost:3000/data')

// OPTIONS request
const optionsData = await options('http://localhost:3000/data')
```

### APIRequest Class

Create an API client with base URL and default headers:

```js
import { APIRequest } from '@nan0web/http-node'

// Create API instance with base URL and default headers
const api = new APIRequest('http://localhost:3000/api/', {
  'Authorization': 'Bearer token',
  'X-Custom-Header': 'value'
})

// Make requests using the API instance
const dataResponse = await api.get('data')
const createResponse = await api.post('data', { name: 'John' })
const updateResponse = await api.put('data/1', { status: 'active' })
const deleteResponse = await api.del('data/1')
```

### Response Handling

Handle responses in various formats:

```js
import fetch from '@nan0web/http-node'

const response = await fetch('http://localhost:3000/data')

// Check response status
console.log(response.ok, response.status, response.statusText)

// Get response as text
const text = await response.text()
console.log(text)

// Get response as JSON
const json = await response.json()
console.log(json)

// Get response as Buffer (binary)
const buffer = await response.buffer()
console.log(buffer)

// Get response as ArrayBuffer
const arrayBuffer = await response.arrayBuffer()
console.log(arrayBuffer)

// Get raw stream for streaming responses
const stream = response.stream()
console.log(stream)
```

### HTTP Server

Create and configure an HTTP server with routes:

```js
import { createServer } from '@nan0web/http-node'

// Create server instance
const server = createServer({ port: 3000 })

// Add routes
server.get('/hello', (req, res) => {
  res.end('Hello World!')
})

server.post('/api/data', (req, res) => {
  // req.body is automatically parsed based on Content-Type
  res.json({ received: req.body })
})

server.get('/users/:id', (req, res) => {
  res.json({ userId: req.params.id })
})

// Start server
await server.listen()
console.log('Server running on port 3000')
```

### Middleware Support

Add middleware to process requests before reaching routes:

```js
import { createServer, middlewares } from '@nan0web/http-node'

const server = createServer({ port: 3000 })

// Add built-in body parser middleware
server.use(middlewares.bodyParser())

// Add brute force protection middleware
server.use(middlewares.bruteForce({
  windowMs: 60_000, // 1 minute
  max: 100 // limit each IP to 100 requests per windowMs
}))

// Add custom middleware
server.use(async (req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`)
  await next()
})
```

### Router Class

Use the Router class for more complex routing:

```js
import { Router } from '@nan0web/http-node'

const router = new Router()

router.get('/api/test', (req, res) => {
  res.json({ message: 'test' })
})

router.post('/api/submit', (req, res) => {
  res.json({ submitted: req.body })
})
```

### Error Handling

Handle network and HTTP errors gracefully:

```js
import fetch from '@nan0web/http-node'

try {
  const response = await fetch('http://localhost:3000/invalid')
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  const data = await response.json()
} catch (error) {
  console.error('Fetch error:', error)
}
```

## API Reference

### fetch(url, options)

Core fetch function that returns a ResponseMessage.

**Options:**
- `method`: HTTP method (default: 'GET')
- `headers`: Request headers object
- `body`: Request body (string, Buffer, or Object)
- `type`: Response type ('json', 'binary', 'text', or 'sockets')
- `protocol`: Protocol to use ('http', 'https', or 'http2')
- `ALPNProtocols`: Array of ALPN protocols for HTTP/2
- `rejectUnauthorized`: Whether to reject self-signed certificates
- `timeout`: Request timeout in milliseconds
- `logger`: Logger instance

### APIRequest

Class for creating API clients with default configuration.

**Constructor:**
```js
new APIRequest(baseUrl, defaultHeaders, options)
```

**Methods:**
- `get(path, headers)`: Make GET request
- `post(path, body, headers)`: Make POST request
- `put(path, body, headers)`: Make PUT request
- `patch(path, body, headers)`: Make PATCH request
- `del(path, headers)`: Make DELETE request

### Server

HTTP server class with routing and middleware support.

**Constructor:**
```js
new Server(options)
```

**Methods:**
- `use(middleware)`: Add middleware
- `get(path, handler)`: Add GET route
- `post(path, handler)`: Add POST route
- `put(path, handler)`: Add PUT route
- `delete(path, handler)`: Add DELETE route
- `patch(path, handler)`: Add PATCH route
- `listen()`: Start server
- `close()`: Stop server

### Middlewares

Built-in middleware functions.

**bodyParser()**: Parses request body based on Content-Type
**bruteForce(options)**: Protects against brute force attacks

## License

ISC

## Author

ЯRаСлав YaRaSlove <support@yaro.page>
