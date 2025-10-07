/** @typedef {import('../server/Server.js').MiddlewareFn} MiddlewareFn */
/** @typedef {import("../messages/ResponseMessage.js").default} ResponseMessage */
/**
 * TestServer для інтеграційних тестів: створює тимчасовий сервер з роутами.
 */
export default class TestServer {
    constructor(options?: {});
    server: import("../server/Server.js").default;
    baseUrl: string | null;
    /**
     * Add a route to the test server
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {string} path - Route path
     * @param {MiddlewareFn} handler - Route handler function
     * @returns {TestServer} This instance for chaining
     */
    route(method: string, path: string, handler: MiddlewareFn): TestServer;
    /**
     * Add middleware to the test server
     * @param {MiddlewareFn} middleware
     * @returns {TestServer} This instance for chaining
     */
    use(middleware: MiddlewareFn): TestServer;
    /**
     * Start the test server
     * @returns {Promise<TestServer>} This instance for chaining
     */
    start(): Promise<TestServer>;
    /**
     * Stop the test server
     * @returns {Promise<void>}
     */
    stop(): Promise<void>;
    /**
     * Make a request to the test server
     * @param {string} path - Request path
     * @param {Object} options - Fetch options
     * @returns {Promise<ResponseMessage>} Response object
     */
    request(path: string, options?: any): Promise<ResponseMessage>;
}
export type MiddlewareFn = import('../server/Server.js').MiddlewareFn;
export type ResponseMessage = import("../messages/ResponseMessage.js").default;
