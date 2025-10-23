/**
 * @typedef {Object} MockFetchResponse
 * @property {boolean} ok
 * @property {number} status
 * @property {Map} headers
 * @property {() => Promise<any>} json
 * @property {() => Promise<string>} text
 */
/**
 * Creates a mock fetch function based on the provided routes.
 * @param {Array<[string, (Object|Array|Function)]>} routes - Route patterns with their corresponding responses.
 * @returns {(url: string, options: object) => Promise<MockFetchResponse>} An async function that mimics the fetch API.
 *
 * @example
 * const routes = [
 *   ['GET /users', { id: 1, name: 'John Doe' }],
 *   ['GET /users', { id: 1, name: 'John Doe' }, [["Accept", "application/json"]]],
 *   ['POST /users', [201, { id: 2, name: 'Jane Smith' }]],
 *   ['POST /users', [201, { id: 2, name: 'Jane Smith' }], [["Accept", "application/json"]]],
 * ];
 * const fetch = mockFetch(routes);
 * const response = await fetch('/users');
 * const data = await response.json();
 */
export default function mockFetch(routes) {
	return async (url, options = {}) => {
		const corsHeaders = [
			['Access-Control-Allow-Origin', '*'],
			['Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,HEAD'],
			['Access-Control-Allow-Headers', options.headers?.['Content-Type'] || '*']
		]
		const method = options.method || 'GET'
		const isAbsolute = /^(https?:)?\/\//.test(url)
		const path = isAbsolute ? new URL(url).pathname : url.replace(/^(?:\/\/|[^/])*(\/.*)/, '$1')
		const route = method + ' ' + (isAbsolute ? url : path)
		for (const [pattern, response, head = []] of routes) {
			const [m, u] = pattern.split(" ")
			let match = pattern === route
			if (!match) {
				if (pattern.includes("*")) {
					if ("*" === m && (!u || "*" === u)) {
						match = true
					}
					else if ("*" === m) {
						if (u.endsWith("/")) {
							match = path.startsWith(u)
						}
						else if (u.endsWith("*")) {
							match = path.startsWith(u.slice(0, -1))
						}
						else {
							match = u === path
						}
					}
					else if ("*" === u) {
						match = method === m
					}
					else if (u.endsWith("*")) {
						match = path.startsWith(u.slice(0, -1))
					}
				}
				if (!match && u && u.endsWith("/")) {
					match = (method === m || "*" === m) && path.startsWith(u)
				}
			} else {
				if (u.endsWith("/")) {
					match = path.startsWith(u)
				}
			}
			if (match) {
				const r = "function" === typeof response ? await response(options) : response
				let [status, data] = Array.isArray(r) ? r : [200, r]
				let ok = status >= 200 && status < 300
				const headers = new Map([...corsHeaders, ...head])
				if ("function" === typeof data) {
					const resolved = await data(method, url, options)
					if (undefined !== resolved.ok && "function" === typeof resolved.json) {
						return resolved
					}
					if (undefined !== resolved.ok && "function" === typeof resolved.text) {
						return resolved
					}
					if (undefined === resolved.ok) {
						data = resolved
					} else {
						ok = resolved.ok
						status = resolved.status ?? status
						data = resolved.data
					}
				}
				if (method === "HEAD" && data) {
					const arr = typeof data === "object" ? Object.entries(data) : data
					for (const [key, value] of arr) {
						headers.set(key, value)
					}
					data = ""
				}
				return {
					ok,
					status,
					headers,
					json: async () => data,
					text: async () => JSON.stringify(data),
				}
			}
		}
		return {
			ok: false,
			status: 404,
			headers: {
				get: () => undefined,
			},
			json: async () => ({ error: 'Not found' }),
			text: async () => '{"error": "Not found"}',
		}
	}
}
