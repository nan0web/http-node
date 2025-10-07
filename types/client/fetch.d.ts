/// <reference types="node" />
export default fetch;
export type FetchOptions = {
    /**
     * - The HTTP method
     */
    method?: string | undefined;
    /**
     * - The request headers
     */
    headers?: Record<string, string | string[] | undefined> | undefined;
    /**
     * - The request body
     */
    body?: Buffer | ReadableStream | any;
    /**
     * - The response type
     */
    type?: string | undefined;
    /**
     * - The protocol to use (http, https, http2)
     */
    protocol?: string | undefined;
    /**
     * - The ALPNProtocols.
     */
    ALPNProtocols?: string[] | undefined;
    /**
     * - The timeout in milliseconds
     */
    timeout?: number | undefined;
    /**
     * - Reject self-signed certificates
     */
    rejectUnauthorized?: boolean | undefined;
    /**
     * - The logger to use
     */
    logger?: Console | undefined;
    /**
     * - Abort signal.
     */
    signal?: AbortSignal | undefined;
};
/**
 * @typedef {Object} FetchOptions
 * @property {string} [options.method] - The HTTP method
 * @property {Record<string, string|string[]|undefined>} [options.headers] - The request headers
 * @property {Buffer|ReadableStream|Object} [options.body] - The request body
 * @property {string} [options.type] - The response type
 * @property {string} [options.protocol] - The protocol to use (http, https, http2)
 * @property {string[]} [options.ALPNProtocols] - The ALPNProtocols.
 * @property {number} [options.timeout] - The timeout in milliseconds
 * @property {boolean} [options.rejectUnauthorized] - Reject self-signed certificates
 * @property {Console} [options.logger] - The logger to use
 * @property {AbortSignal} [options.signal] - Abort signal.
 */
/**
 * Core fetch function
 * @param {string} url - The URL to fetch
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<SimpleResponse|ResponseMessage>} The response
 */
declare function fetch(url: string, options?: FetchOptions): Promise<SimpleResponse | ResponseMessage>;
/**
 * APIRequest class for handling API requests with default options
 * @class
 * @param {string} baseUrl - The base URL for API requests
 * @param {Object} defaultHeaders - Default headers for all requests
 * @param {Object} options - Additional options
 * @param {boolean} options.rejectUnauthorized - Reject self-signed certificates
 * @param {number} options.timeout - The timeout in milliseconds
 * @param {Object} options.logger - The logger to use
 */
export class APIRequest {
    constructor(baseUrl: any, defaultHeaders?: {}, options?: {});
    baseUrl: any;
    defaultHeaders: {};
    options: {
        rejectUnauthorized: any;
        timeout: any;
        ALPNProtocols: any;
    };
    logger: any;
    /**
     * Constructs full URL from base and path
     * @param {string} path - The API endpoint path
     * @returns {string} The full URL
     */
    getFullUrl(path: string): string;
    /**
     * Makes a GET request
     * @param {string} path - The API endpoint path
     * @param {Object} headers - Additional headers
     * @returns {Promise<SimpleResponse|ResponseMessage>} The response
     */
    get(path: string, headers?: any): Promise<SimpleResponse | ResponseMessage>;
    /**
     * Makes a POST request
     * @param {string} path - The API endpoint path
     * @param {Object|Buffer|ReadableStream} body - The request body
     * @param {Object} headers - Additional headers
     * @returns {Promise<SimpleResponse|ResponseMessage>} The response
     */
    post(path: string, body: any | Buffer | ReadableStream, headers?: any): Promise<SimpleResponse | ResponseMessage>;
    /**
     * Makes a PUT request
     * @param {string} path - The API endpoint path
     * @param {Object|Buffer|ReadableStream} body - The request body
     * @param {Record<string, string>} headers - Additional headers
     * @returns {Promise<SimpleResponse|ResponseMessage>} The response
     */
    put(path: string, body: any | Buffer | ReadableStream, headers?: Record<string, string>): Promise<SimpleResponse | ResponseMessage>;
    /**
     * Makes a PATCH request
     * @param {string} path - The API endpoint path
     * @param {Object|Buffer|ReadableStream} body - The request body
     * @param {Record<string, string>} headers - Additional headers
     * @returns {Promise<SimpleResponse|ResponseMessage>} The response
     */
    patch(path: string, body: any | Buffer | ReadableStream, headers?: Record<string, string>): Promise<SimpleResponse | ResponseMessage>;
    /**
     * Makes a DELETE request
     * @param {string} path - The API endpoint path
     * @param {Record<string, string>} headers - Additional headers
     * @returns {Promise<SimpleResponse|ResponseMessage>} The response
     */
    del(path: string, headers?: Record<string, string>): Promise<SimpleResponse | ResponseMessage>;
}
/**
 * Makes a GET request
 * @param {string} url - The URL to fetch
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<SimpleResponse|ResponseMessage>} The response
 */
export function get(url: string, options?: FetchOptions): Promise<SimpleResponse | ResponseMessage>;
/**
 * Makes a POST request
 * @param {string} url - The URL to fetch
 * @param {Object|Buffer|ReadableStream} body - The request body
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<SimpleResponse|ResponseMessage>} The response
 */
export function post(url: string, body: any | Buffer | ReadableStream, options?: FetchOptions): Promise<SimpleResponse | ResponseMessage>;
/**
 * Makes a PUT request
 * @param {string} url - The URL to fetch
 * @param {Object|Buffer|ReadableStream} body - The request body
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<SimpleResponse|ResponseMessage>} The response
 */
export function put(url: string, body: any | Buffer | ReadableStream, options?: FetchOptions): Promise<SimpleResponse | ResponseMessage>;
/**
 * Makes a PATCH request
 * @param {string} url - The URL to fetch
 * @param {Object|Buffer|ReadableStream} body - The request body
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<SimpleResponse|ResponseMessage>} The response
 */
export function patch(url: string, body: any | Buffer | ReadableStream, options?: FetchOptions): Promise<SimpleResponse | ResponseMessage>;
/**
 * Makes a DELETE request
 * @param {string} url - The URL to fetch
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<SimpleResponse|ResponseMessage>} The response
 */
export function del(url: string, options?: FetchOptions): Promise<SimpleResponse | ResponseMessage>;
/**
 * Makes a HEAD request
 * @param {string} url - The URL to fetch
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<SimpleResponse|ResponseMessage>} The response
 */
export function head(url: string, options?: FetchOptions): Promise<SimpleResponse | ResponseMessage>;
/**
 * Makes an OPTIONS request
 * @param {string} url - The URL to fetch
 * @param {FetchOptions} options - The fetch options
 * @returns {Promise<SimpleResponse|ResponseMessage>} The response
 */
export function options(url: string, options?: FetchOptions): Promise<SimpleResponse | ResponseMessage>;
import { Buffer } from 'node:buffer';
/**
 * SimpleResponse mimics the interface expected by the test suite.
 *
 * @class
 * @param {Uint8Array|Buffer|string|any} body - The raw response body.
 * @param {Object} options
 * @param {number} options.status - HTTP status code.
 * @param {string} options.statusText - HTTP status text.
 * @param {Object} options.headers - Normalised response headers.
 * @param {string} options.url - Request URL.
 * @param {string} options.type - Response type (json, binary, sockets, …).
 */
declare class SimpleResponse {
    constructor(body: any, { status, statusText, headers, url, type }: {
        status: any;
        statusText: any;
        headers: any;
        url: any;
        type: any;
    });
    _body: any;
    status: any;
    statusText: any;
    headers: Map<string, any>;
    url: any;
    type: any;
    ok: boolean;
    /** @returns {Promise<any>} */
    json(): Promise<any>;
    /** @returns {Promise<string>} */
    text(): Promise<string>;
    /** @returns {Promise<Buffer>} */
    buffer(): Promise<Buffer>;
    /** @returns {any} – for sockets streaming */
    stream(): any;
}
import ResponseMessage from '../messages/ResponseMessage.js';
