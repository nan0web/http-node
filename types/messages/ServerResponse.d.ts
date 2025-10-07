/// <reference types="node" />
/**
 * @extends {HttpServerResponse}
 */
export default class ServerResponse extends HttpServerResponse<import("http").IncomingMessage> {
    /**
     *
     * @param {IncomingMessage} [req]
     * @param {object} [options]
     */
    constructor(req?: IncomingMessage | undefined, options?: object);
    /** @type {Object} */
    params: any;
    /**
     * Set JSON response.
     * @param {any} data
     */
    json(data: any): void;
    /**
     * Override writeHead to correctly handle different signatures and set headers.
     *
     * Supported signatures:
     *   writeHead(statusCode, statusMessage, headers)
     *   writeHead(statusCode, headers)
     *   writeHead(statusCode, statusMessage)
     *
     * @param {number} statusCode
     * @param {string|object|Array} [statusMessageOrHeaders]
     * @param {object|Array} [headersOrCallback]
     */
    writeHead(statusCode: number, statusMessageOrHeaders?: string | object | any[], headersOrCallback?: object | any[]): this;
    end(chunk: any, encoding: any, callback: any): this;
}
import { ServerResponse as HttpServerResponse } from 'node:http';
import IncomingMessage_1 from './IncomingMessage.js';
