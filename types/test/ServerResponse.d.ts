export default class ServerResponse extends Writable {
    /**
     * @param {Object} [options]
     * @param {Function} [options.onEnd]
     */
    constructor(options?: {
        onEnd?: Function | undefined;
    } | undefined);
    /** @type {number} */
    statusCode: number;
    /** @type {string} */
    statusMessage: string;
    /** @type {Object.<string, string|string[]>} */
    headers: {
        [x: string]: string | string[];
    };
    /** @type {boolean} */
    headersSent: boolean;
    /** @type {Object} */
    socket: any;
    onEnd: Function;
    /**
     * Встановлює статус і заголовки
     * @param {number} statusCode
     * @param {string} [statusMessage]
     * @param {Object.<string, string|string[]>} [headers]
     * @returns {this}
     */
    writeHead(statusCode: number, statusMessage?: string | undefined, headers?: {
        [x: string]: string | string[];
    } | undefined): this;
    /**
     * @param {any} chunk
     * @param {BufferEncoding} [encoding]
     * @param {(error?: Error | null) => void} [callback]
     * @returns {boolean}
     */
    _write(chunk: any, encoding?: BufferEncoding | undefined, callback?: ((error?: Error | null) => void) | undefined): boolean;
    /**
     * @returns {string}
     */
    get data(): string;
    /**
     * @returns {Buffer}
     */
    get buffer(): Buffer;
    /**
     * @param {any} chunk
     * @param {BufferEncoding | Function} [encoding='utf8']
     * @param {Function} [callback]
     * @returns {this}
     */
    end(chunk: any, encoding?: Function | BufferEncoding | undefined, callback?: Function | undefined): this;
    /**
     * @param {string} name
     * @param {string} value
     */
    setHeader(name: string, value: string): void;
    /**
     * @param {string} name
     * @returns {string|undefined}
     */
    getHeader(name: string): string | undefined;
    /**
     * @param {string} name
     */
    removeHeader(name: string): void;
    /**
     * @returns {Object.<string, string|string[]>}
     */
    getHeaders(): {
        [x: string]: string | string[];
    };
    #private;
}
import { Writable } from 'node:stream';
