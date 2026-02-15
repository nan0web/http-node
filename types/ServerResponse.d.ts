/// <reference types="node" />
export default ServerResponse;
/**
 * ServerResponse wraps Node.js http.ServerResponse to provide
 * chainable status() and json() methods for consistent response output.
 * @extends {HttpServerResponse}
 */
declare class ServerResponse extends HttpServerResponse<import("http").IncomingMessage> {
    constructor(req: import("http").IncomingMessage);
    /** @type {Object} */
    params: any;
    /**
     * Set response status code (chainable, Express-style)
     * @param {number} code
     * @returns {this}
     */
    status(code: number): this;
    /**
     * Send JSON response
     * @param {any} data
     */
    json(data: any): void;
}
import { ServerResponse as HttpServerResponse } from 'node:http';
