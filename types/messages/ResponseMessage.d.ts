/**
 * Minimal response implementation used by the test suite.
 *
 * It behaves like a `Readable` stream and provides the same
 * surface area as the browser `Response` object (status,
 * statusText, ok, headers, json(), text(), buffer(),
 * arrayBuffer() and stream()).
 *
 * The class can be instantiated with a body (string,
 * Buffer, Uint8Array or a readable stream) and an optional
 * options object containing status, statusText, headers,
 * url and type.
 *
 * @extends Readable
 */
export default class ResponseMessage extends Readable {
    /**
     * @param {any} bodyOrReq – In fetch mode this is the response body.
     * @param {Object} [options={}] Options for fetch mode.
     */
    constructor(bodyOrReq: any, options?: any);
    /** @type {import('node:net').Socket|undefined} */
    socket: import('node:net').Socket | undefined;
    /** @type {number} */
    set status(arg: number);
    /** @type {number} */
    get status(): number;
    /** @type {string} */
    set statusText(arg: string);
    /** @type {string} */
    get statusText(): string;
    /** @type {boolean} */
    get ok(): boolean;
    /** @type {boolean} */
    set headersSent(arg: boolean);
    /** @type {boolean} */
    get headersSent(): boolean;
    /** Mimic ServerResponse.writeHead – set status and mark headers sent. */
    writeHead(statusCode: any, statusMessage: any, headers?: any[]): this;
    /** @type {Map<string,string|string[]>} */
    get headers(): Map<string, string | string[]>;
    /** @type {string} */
    get url(): string;
    /** @type {string} */
    get type(): string;
    /** @param {string} name */
    setHeader(name: string, value: any): void;
    /** @param {string} name */
    getHeader(name: string): string | string[];
    /** @param {string} name */
    removeHeader(name: string): void;
    /** @returns {Object} plain header map */
    getHeaders(): any;
    _read(): void;
    /** @returns {Promise<any>} */
    json(): Promise<any>;
    /** @returns {Promise<string>} */
    text(): Promise<string>;
    /** @returns {Promise<Buffer>} */
    buffer(): Promise<Buffer>;
    /** @returns {Promise<ArrayBuffer>} */
    arrayBuffer(): Promise<ArrayBuffer>;
    /** @returns {any} – returns this instance (compatible with socket streaming). */
    stream(): any;
    /**
     * Assign socket to response (required by Node.js HTTP server)
     * @param {import('node:net').Socket} socket
     */
    assignSocket(socket: import('node:net').Socket): void;
    /**
     * Write data to response
     * @param {string|Buffer} chunk
     * @param {string} [encoding]
     * @param {Function} [callback]
     */
    write(chunk: string | Buffer, encoding?: string | undefined, callback?: Function | undefined): boolean;
    /**
     * End response
     * @param {string|Buffer} [data]
     * @param {string} [encoding]
     * @param {Function} [callback]
     */
    end(data?: string | Buffer | undefined, encoding?: string | undefined, callback?: Function | undefined): this;
    #private;
}
import { Readable } from 'node:stream';
